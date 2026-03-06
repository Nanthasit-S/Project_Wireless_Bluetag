import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { PermissionsAndroid, Platform, SafeAreaView, ScrollView } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import { Buffer } from 'buffer';

import {
  BATTERY_LEVEL_UUID,
  BATTERY_SVC_UUID,
  BLE_RING_UUID,
  BLE_SVC_UUID,
  DEFAULT_BACKEND_BASE,
  IAS_ALERT_UUID,
  IAS_SVC_UUID,
  KNOWN_RING_CANDIDATES,
} from './src/constants/bluetooth';
import { HeaderCard } from './src/components/dashboard/HeaderCard';
import { MapSection } from './src/components/dashboard/MapSection';
import { NearbySection } from './src/components/dashboard/NearbySection';
import { RingSection } from './src/components/dashboard/RingSection';
import { ScanSection } from './src/components/dashboard/ScanSection';
import type { LocalTagLocation, SeenTag, TagSummary } from './src/types/bluetag';
import {
  characteristicCanWrite,
  formatDistanceMeters,
  hasKnownRingService,
  inferTagIdFromDevice,
  looksLikeBlueTagName,
  normalizeUuid,
  parseBlueTagManufacturerData,
  rssiZone,
  sleep,
} from './src/utils/bluetag';

function toBlueTagDisplayName(tagId: string) {
  const suffix = tagId.replace(/^BTAG[-_]?/i, '').trim();
  return suffix ? `BlueTag-${suffix}` : 'BlueTag';
}

export default function App() {
  const managerRef = useRef<BleManager | null>(null);
  const knownDeviceToTagRef = useRef<Record<string, string>>({});
  const manualOffUntilRef = useRef(0);
  const manualRingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastLocationFetchAtRef = useRef(0);
  const batteryReadAtRef = useRef<Record<string, number>>({});
  const batteryReadInFlightRef = useRef<Record<string, boolean>>({});
  const autoRingRef = useRef<{ inFlight: boolean; lastMode: 0 | 1 | 2 | null; lastSentAt: number }>({
    inFlight: false,
    lastMode: null,
    lastSentAt: 0,
  });

  const [bleReady, setBleReady] = useState(false);
  const [bleState, setBleState] = useState('Unknown');
  const [isScanning, setIsScanning] = useState(false);
  const [autoRingEnabled, setAutoRingEnabled] = useState(true);
  const [tags, setTags] = useState<Record<string, SeenTag>>({});
  const [targetTag, setTargetTag] = useState('');
  const [backendBase, setBackendBase] = useState(DEFAULT_BACKEND_BASE);
  const [mapTag, setMapTag] = useState<TagSummary | null>(null);
  const [localTagLocations, setLocalTagLocations] = useState<Record<string, LocalTagLocation>>({});
  const [phoneLocation, setPhoneLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [message, setMessage] = useState('Ready');

  const tagList = useMemo(() => Object.values(tags).sort((a, b) => b.rssi - a.rssi), [tags]);

  const targetSeen = useMemo(() => {
    if (!targetTag.trim()) return tagList[0] ?? null;
    return tagList.find((x) => x.tagId === targetTag.trim().toUpperCase()) ?? null;
  }, [tagList, targetTag]);

  const mapQueryTag = useMemo(() => {
    if (targetTag.trim()) return targetTag.trim().toUpperCase();
    return targetSeen?.tagId ?? '';
  }, [targetSeen?.tagId, targetTag]);

  useEffect(() => {
    try {
      managerRef.current = new BleManager();
      setBleReady(true);
      const sub = managerRef.current.onStateChange((state) => {
        setBleState(state);
      }, true);
      return () => {
        sub.remove();
        managerRef.current?.destroy();
      };
    } catch {
      setBleReady(false);
      setMessage('BLE native module unavailable. Use Development Build (npx expo run:android), not Expo Go.');
    }
    return undefined;
  }, []);

  useEffect(() => {
    void (async () => {
      if (Platform.OS === 'web') return;
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        let granted = permission.granted;
        if (!granted) {
          const asked = await Location.requestForegroundPermissionsAsync();
          granted = asked.granted;
        }
        if (!granted) return;

        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown?.coords) {
          setPhoneLocation({ latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude });
          return;
        }

        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setPhoneLocation({ latitude: current.coords.latitude, longitude: current.coords.longitude });
      } catch {
        // Ignore.
      }
    })();
  }, []);

  useEffect(() => {
    setMapTag(null);
  }, [mapQueryTag]);

  useEffect(() => {
    const timer = setInterval(async () => {
      if (!mapQueryTag) return;
      const trimmedBase = backendBase.trim();
      const isLocalhostForDevice =
        Platform.OS !== 'web' && /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/i.test(trimmedBase);
      if (isLocalhostForDevice) return;

      try {
        const res = await fetch(`${trimmedBase}/api/tags`);
        if (!res.ok) return;
        const list = (await res.json()) as TagSummary[];
        const found = list.find((t) => t.tag_id === mapQueryTag) ?? null;
        setMapTag(found);
      } catch {
        // Ignore transient API errors.
      }
    }, 4000);

    return () => clearInterval(timer);
  }, [backendBase, mapQueryTag]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!isScanning) return;
      const now = Date.now();
      setTags((prev) => {
        const next: Record<string, SeenTag> = {};
        for (const [key, value] of Object.entries(prev)) {
          if (now - value.lastSeenMs <= 20000) {
            next[key] = value;
          }
        }
        return next;
      });
    }, 1500);

    return () => clearInterval(timer);
  }, [isScanning]);

  async function requestBlePermissions() {
    if (Platform.OS !== 'android') return true;
    const perms = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
    return Object.values(perms).every((x) => x === PermissionsAndroid.RESULTS.GRANTED);
  }

  async function captureLocalTagLocation(tagId: string) {
    if (Platform.OS === 'web') return;
    const now = Date.now();
    if (now - lastLocationFetchAtRef.current < 5000) return;
    lastLocationFetchAtRef.current = now;

    try {
      const permission = await Location.getForegroundPermissionsAsync();
      let granted = permission.granted;
      if (!granted) {
        const asked = await Location.requestForegroundPermissionsAsync();
        granted = asked.granted;
      }
      if (!granted) return;

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPhoneLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      setLocalTagLocations((prev) => ({
        ...prev,
        [tagId]: {
          tagId,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          updatedAt: new Date().toLocaleTimeString(),
        },
      }));
    } catch {
      // Ignore transient location failures.
    }
  }

  function decodeBatteryLevel(base64Value?: string | null) {
    if (!base64Value) return null;
    try {
      const bytes = Buffer.from(base64Value, 'base64');
      if (bytes.length < 1) return null;
      const value = bytes[0];
      if (!Number.isFinite(value) || value > 100) return null;
      return value;
    } catch {
      return null;
    }
  }

  async function readBatteryFromConnectedDevice(device: Device, tagId: string) {
    try {
      const characteristic = await device.readCharacteristicForService(BATTERY_SVC_UUID, BATTERY_LEVEL_UUID);
      const battery = decodeBatteryLevel(characteristic.value);
      if (battery == null) return null;
      setTags((prev) => {
        const current = prev[tagId];
        if (!current || current.battery === battery) return prev;
        return {
          ...prev,
          [tagId]: {
            ...current,
            battery,
          },
        };
      });
      return battery;
    } catch {
      return null;
    }
  }

  async function refreshBatteryForTag(deviceId: string, tagId: string, options?: { force?: boolean }) {
    if (!managerRef.current) return;
    const now = Date.now();
    const lastReadAt = batteryReadAtRef.current[deviceId] ?? 0;
    if (!options?.force && now - lastReadAt < 45000) return;
    if (batteryReadInFlightRef.current[deviceId]) return;

    batteryReadInFlightRef.current[deviceId] = true;
    try {
      let d: Device = await managerRef.current.connectToDevice(deviceId, { timeout: 10000 });
      d = await d.discoverAllServicesAndCharacteristics();
      const battery = await readBatteryFromConnectedDevice(d, tagId);
      if (battery != null) {
        batteryReadAtRef.current[deviceId] = Date.now();
      }
    } catch {
      // Ignore transient battery read failures.
    } finally {
      try {
        await managerRef.current.cancelDeviceConnection(deviceId);
      } catch {
        // Ignore if already disconnected.
      }
      batteryReadInFlightRef.current[deviceId] = false;
    }
  }

  async function startScan() {
    const ok = await requestBlePermissions();
    if (!ok) {
      setMessage('Bluetooth permission denied');
      return;
    }

    if (!bleReady || !managerRef.current) {
      setMessage('BLE not ready. Build and run native app with `npx expo run:android`.');
      return;
    }

    if (bleState !== 'PoweredOn') {
      setMessage(`Bluetooth state: ${bleState}. Trying scan anyway...`);
    }

    knownDeviceToTagRef.current = {};
    setMessage('Scanning...');
    setIsScanning(true);

    managerRef.current.startDeviceScan(null, { allowDuplicates: true }, (error, device) => {
      if (error) {
        setMessage(`Scan error: ${error.message}`);
        setIsScanning(false);
        return;
      }
      if (!device) return;

      const parsed = parseBlueTagManufacturerData(device.manufacturerData);
      const inferredTagId = inferTagIdFromDevice(device);
      const serviceMatched = hasKnownRingService(device);
      const nameMatched = looksLikeBlueTagName(device);
      const cachedTagId = knownDeviceToTagRef.current[device.id];
      const tagId = inferredTagId ?? parsed?.tagId ?? cachedTagId ?? (serviceMatched || nameMatched ? 'BTAG-000001' : null);
      if (!tagId) return;

      knownDeviceToTagRef.current[device.id] = tagId;
      void captureLocalTagLocation(tagId);
      if (parsed?.battery == null) {
        void refreshBatteryForTag(device.id, tagId);
      }

      setTags((prev) => {
        const prevTag = prev[tagId];
        const nextRssiRaw = device.rssi ?? -120;
        const smoothedRssi = prevTag ? Math.round(prevTag.rssi * 0.7 + nextRssiRaw * 0.3) : nextRssiRaw;
        const fallbackName = toBlueTagDisplayName(tagId);

        return {
          ...prev,
          [tagId]: {
            deviceId: device.id,
            tagId,
            name: device.name || device.localName || prevTag?.name || fallbackName,
            rssi: smoothedRssi,
            battery: parsed?.battery ?? prevTag?.battery ?? null,
            counter: parsed?.counter ?? prevTag?.counter ?? null,
            lastSeen: new Date().toLocaleTimeString(),
            lastSeenMs: Date.now(),
          },
        };
      });
    });
  }

  function stopScan() {
    managerRef.current?.stopDeviceScan();
    setIsScanning(false);
    setMessage('Scan stopped');
  }

  function stopManualRingLoop() {
    if (manualRingTimerRef.current) {
      clearInterval(manualRingTimerRef.current);
      manualRingTimerRef.current = null;
    }
  }

  async function writeRing(
    mode: 0 | 1 | 2,
    options?: { silent?: boolean; targetDeviceId?: string; targetTagId?: string },
  ) {
    const explicitTarget =
      options?.targetDeviceId != null
        ? {
            deviceId: options.targetDeviceId,
            tagId: options.targetTagId ?? options.targetDeviceId,
          }
        : null;
    const target = explicitTarget ?? targetSeen;

    if (!target) {
      setMessage('No target tag selected/found');
      return false;
    }

    try {
      if (!options?.silent) {
        setMessage(`Connecting to ${target.tagId}...`);
      }
      if (!managerRef.current) {
        setMessage('BLE not ready');
        return false;
      }

      let d: Device = await managerRef.current.connectToDevice(target.deviceId, { timeout: 12000 });
      d = await d.discoverAllServicesAndCharacteristics();
      const battery = await readBatteryFromConnectedDevice(d, target.tagId);
      if (battery != null) {
        batteryReadAtRef.current[target.deviceId] = Date.now();
      }
      const payload = Buffer.from([mode]).toString('base64');
      const services = await d.services();

      const candidates: {
        serviceUuid: string;
        characteristicUuid: string;
        canWriteWithResponse: boolean;
        canWriteWithoutResponse: boolean;
      }[] = [];

      for (const known of KNOWN_RING_CANDIDATES) {
        candidates.push({
          serviceUuid: known.serviceUuid,
          characteristicUuid: known.characteristicUuid,
          canWriteWithResponse: true,
          canWriteWithoutResponse: true,
        });
      }

      for (const service of services) {
        const chars = await d.characteristicsForService(service.uuid);
        for (const char of chars) {
          const normalizedChar = normalizeUuid(char.uuid);
          const canWriteWithResponse = Boolean(char.isWritableWithResponse);
          const canWriteWithoutResponse = Boolean(char.isWritableWithoutResponse);
          const writable = canWriteWithResponse || canWriteWithoutResponse;

          if (normalizedChar === normalizeUuid(IAS_ALERT_UUID) || normalizedChar === normalizeUuid(BLE_RING_UUID)) {
            candidates.push({
              serviceUuid: service.uuid,
              characteristicUuid: char.uuid,
              canWriteWithResponse,
              canWriteWithoutResponse,
            });
            continue;
          }

          const normalizedService = normalizeUuid(service.uuid);
          const likelyRingService =
            normalizedService === normalizeUuid(IAS_SVC_UUID) || normalizedService === normalizeUuid(BLE_SVC_UUID);

          if (likelyRingService && writable) {
            candidates.push({
              serviceUuid: service.uuid,
              characteristicUuid: char.uuid,
              canWriteWithResponse,
              canWriteWithoutResponse,
            });
          }
        }
      }

      if (candidates.length === 0) {
        for (const service of services) {
          const chars = await d.characteristicsForService(service.uuid);
          for (const char of chars) {
            if (!characteristicCanWrite(char)) continue;
            candidates.push({
              serviceUuid: service.uuid,
              characteristicUuid: char.uuid,
              canWriteWithResponse: Boolean(char.isWritableWithResponse),
              canWriteWithoutResponse: Boolean(char.isWritableWithoutResponse),
            });
          }
        }
      }

      if (candidates.length === 0) {
        for (const service of services) {
          const chars = await d.characteristicsForService(service.uuid);
          for (const char of chars) {
            candidates.push({
              serviceUuid: service.uuid,
              characteristicUuid: char.uuid,
              canWriteWithResponse: true,
              canWriteWithoutResponse: true,
            });
          }
        }
      }

      if (candidates.length === 0) {
        candidates.push(
          {
            serviceUuid: IAS_SVC_UUID,
            characteristicUuid: IAS_ALERT_UUID,
            canWriteWithResponse: true,
            canWriteWithoutResponse: true,
          },
          {
            serviceUuid: BLE_SVC_UUID,
            characteristicUuid: BLE_RING_UUID,
            canWriteWithResponse: true,
            canWriteWithoutResponse: true,
          },
        );
      }

      let sent = false;
      let lastError: unknown = null;

      for (const candidate of candidates) {
        try {
          if (candidate.canWriteWithResponse) {
            await d.writeCharacteristicWithResponseForService(candidate.serviceUuid, candidate.characteristicUuid, payload);
            sent = true;
            break;
          }
        } catch (errWithResponse) {
          lastError = errWithResponse;
        }

        try {
          if (candidate.canWriteWithoutResponse || !candidate.canWriteWithResponse) {
            await d.writeCharacteristicWithoutResponseForService(candidate.serviceUuid, candidate.characteristicUuid, payload);
            sent = true;
            break;
          }
        } catch (errWithoutResponse) {
          lastError = errWithoutResponse;
        }
      }

      if (!sent) {
        const available: string[] = [];
        for (const service of services) {
          const chars = await d.characteristicsForService(service.uuid);
          for (const char of chars) {
            available.push(`${service.uuid}:${char.uuid}`);
          }
        }
        throw new Error(
          `No writable ring characteristic. Last error: ${
            lastError instanceof Error ? lastError.message : 'unknown'
          }. Available: ${available.slice(0, 8).join(', ')}${available.length > 8 ? ' ...' : ''}`,
        );
      }

      setMessage(`Ring command sent (${mode})`);
      return true;
    } catch (e) {
      setMessage(`Ring failed: ${e instanceof Error ? e.message : 'unknown error'}`);
      return false;
    } finally {
      if (managerRef.current) {
        try {
          await managerRef.current.cancelDeviceConnection(target.deviceId);
        } catch {
          // Ignore if already disconnected.
        }
      }
    }
  }

  async function forceRingOff() {
    stopManualRingLoop();
    autoRingRef.current.inFlight = false;
    autoRingRef.current.lastMode = 0;
    autoRingRef.current.lastSentAt = Date.now();

    const pool = Object.values(tags);
    const targets = targetSeen ? [targetSeen, ...pool.filter((t) => t.deviceId !== targetSeen.deviceId)] : pool;

    let sent = false;
    if (targets.length > 0) {
      for (let round = 0; round < 3; round += 1) {
        for (const t of targets) {
          const ok = await writeRing(0, { silent: true, targetDeviceId: t.deviceId, targetTagId: t.tagId });
          sent = sent || ok;
        }
        await sleep(120);
      }
    } else {
      sent = await writeRing(0, { silent: true });
    }

    setMessage(sent ? 'Ring OFF' : 'Ring OFF failed');
  }

  function handleManualOff() {
    setAutoRingEnabled(false);
    manualOffUntilRef.current = Date.now() + 4000;
    managerRef.current?.stopDeviceScan();
    setIsScanning(false);
    void forceRingOff();
  }

  function handleToggleAutoRing() {
    setAutoRingEnabled((prev) => {
      const next = !prev;
      if (next) stopManualRingLoop();
      if (!next) {
        void forceRingOff();
      }
      return next;
    });
  }

  function handleManualRing(mode: 1 | 2) {
    stopManualRingLoop();
    setAutoRingEnabled(false);
    const intervalMs = mode === 2 ? 900 : 1800;
    void writeRing(mode);
    manualRingTimerRef.current = setInterval(() => {
      void writeRing(mode, { silent: true });
    }, intervalMs);
  }

  useEffect(() => {
    if (!autoRingEnabled || !bleReady) return;

    const tick = async () => {
      if (Date.now() < manualOffUntilRef.current) return;
      const now = Date.now();
      if (autoRingRef.current.inFlight) return;

      if (!isScanning || !targetSeen) {
        if (autoRingRef.current.lastMode !== 0 || now - autoRingRef.current.lastSentAt > 3000) {
          autoRingRef.current.inFlight = true;
          try {
            const ok = await writeRing(0, { silent: true });
            if (ok) {
              autoRingRef.current.lastMode = 0;
              autoRingRef.current.lastSentAt = Date.now();
            }
          } finally {
            autoRingRef.current.inFlight = false;
          }
        }
        return;
      }

      const intervalMs = 900;
      const shouldSendByInterval = now - autoRingRef.current.lastSentAt >= intervalMs;
      const modeChanged = autoRingRef.current.lastMode !== 2;
      if (!shouldSendByInterval && !modeChanged) return;

      autoRingRef.current.inFlight = true;
      try {
        const ok = await writeRing(2, { silent: true });
        if (ok) {
          autoRingRef.current.lastMode = 2;
          autoRingRef.current.lastSentAt = Date.now();
          setMessage(`Auto ring FAST | ${targetSeen.tagId} | RSSI ${targetSeen.rssi}`);
        }
      } finally {
        autoRingRef.current.inFlight = false;
      }
    };

    void tick();
    const timer = setInterval(() => {
      void tick();
    }, 900);

    return () => clearInterval(timer);
  }, [autoRingEnabled, bleReady, isScanning, targetSeen]);

  useEffect(() => {
    return () => stopManualRingLoop();
  }, []);

  const localLocationForTarget = mapQueryTag ? localTagLocations[mapQueryTag] ?? null : null;

  const mapLat = localLocationForTarget?.latitude ?? mapTag?.estimated_latitude ?? phoneLocation?.latitude ?? 16.4419;
  const mapLng = localLocationForTarget?.longitude ?? mapTag?.estimated_longitude ?? phoneLocation?.longitude ?? 102.8350;
  const targetDistance = targetSeen ? formatDistanceMeters(targetSeen.rssi) : '-';

  const targetSummary = targetSeen
    ? `${targetSeen.tagId} | RSSI ${targetSeen.rssi} | ${targetDistance} | ${rssiZone(targetSeen.rssi)} | ${targetSeen.lastSeen}`
    : 'No BlueTag detected yet';

  const mapSummary =
    mapTag?.estimated_latitude != null && mapTag?.estimated_longitude != null
      ? `${mapTag.estimated_latitude.toFixed(6)}, ${mapTag.estimated_longitude.toFixed(6)} (${mapTag.estimate_source ?? 'n/a'})`
      : localLocationForTarget
        ? `${localLocationForTarget.latitude.toFixed(6)}, ${localLocationForTarget.longitude.toFixed(
            6,
          )} (from iPhone BLE scan @ ${localLocationForTarget.updatedAt})`
        : 'No tag location yet';

  const mapMarkers = useMemo(() => {
    const markers: {
      tagId: string;
      name: string;
      latitude: number;
      longitude: number;
      rssi: number;
      battery: number | null;
      lastSeen: string;
      source: string;
    }[] = [];

    for (const tag of tagList) {
      const local = localTagLocations[tag.tagId];
      if (local) {
        markers.push({
          tagId: tag.tagId,
          name: tag.name,
          latitude: local.latitude,
          longitude: local.longitude,
          rssi: tag.rssi,
          battery: tag.battery,
          lastSeen: tag.lastSeen,
          source: `local @ ${local.updatedAt}`,
        });
        continue;
      }

      if (mapQueryTag === tag.tagId && mapTag?.estimated_latitude != null && mapTag?.estimated_longitude != null) {
        markers.push({
          tagId: tag.tagId,
          name: tag.name,
          latitude: mapTag.estimated_latitude,
          longitude: mapTag.estimated_longitude,
          rssi: tag.rssi,
          battery: tag.battery,
          lastSeen: tag.lastSeen,
          source: `backend (${mapTag.estimate_source ?? 'n/a'})`,
        });
      }
    }

    return markers;
  }, [localTagLocations, mapQueryTag, mapTag, tagList]);

  const showLocalhostWarning =
    Platform.OS !== 'web' && /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/i.test(backendBase.trim());

  return (
    <SafeAreaView className="flex-1 bg-material-bg">
      <StatusBar style="dark" />
      <ScrollView contentContainerClassName="px-4 pt-3 pb-8 gap-3">
        <HeaderCard bleState={bleState} isScanning={isScanning} deviceCount={tagList.length} />

        <ScanSection
          bleReady={bleReady}
          isScanning={isScanning}
          autoRingEnabled={autoRingEnabled}
          targetTag={targetTag}
          message={message}
          targetSummary={targetSummary}
          onStartScan={startScan}
          onStopScan={stopScan}
          onToggleAutoRing={handleToggleAutoRing}
          onChangeTargetTag={setTargetTag}
        />

        <RingSection
          onOff={handleManualOff}
          onSlow={() => handleManualRing(1)}
          onFast={() => handleManualRing(2)}
        />

        <MapSection
          mapLat={mapLat}
          mapLng={mapLng}
          selectedTagId={mapQueryTag}
          selectedTagLabel={targetSeen ? `${targetSeen.name} (${targetSeen.tagId})` : targetTag || 'BlueTag-000001'}
          mapMarkers={mapMarkers}
          mapSummary={mapSummary}
          showLocalhostWarning={showLocalhostWarning}
        />

        <NearbySection
          tags={tagList}
          formatDistanceMeters={formatDistanceMeters}
          rssiZone={rssiZone}
          onPickTag={setTargetTag}
        />

      </ScrollView>
    </SafeAreaView>
  );
}
