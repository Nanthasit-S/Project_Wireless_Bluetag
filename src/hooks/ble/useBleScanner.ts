import { useEffect, useMemo, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { BATTERY_LEVEL_UUID, BATTERY_SVC_UUID } from '../../constants/bluetooth';
import type { LocalTagLocation, SeenTag } from '../../types/bluetag';
import { formatThaiTime } from '../../utils/time';
import {
  deriveStableTagId,
  hasKnownRingService,
  inferTagIdFromDevice,
  looksLikeBlueTagName,
  parseBlueTagManufacturerData,
} from '../../utils/bluetag';

const BLE_ACTIVE_WINDOW_MS = 4500;
const BLE_UI_RETENTION_MS = 60000;

function toBlueTagDisplayName(tagId: string) {
  const suffix = tagId.replace(/^BTAG[-_]?/i, '').trim();
  return suffix ? `BlueTag-${suffix}` : 'BlueTag';
}

export function useBleScanner() {
  const managerRef = useRef<BleManager | null>(null);
  const knownDeviceToTagRef = useRef<Record<string, string>>({});
  const loggedDeviceIdsRef = useRef<Record<string, boolean>>({});
  const lastLocationFetchAtRef = useRef(0);
  const batteryReadAtRef = useRef<Record<string, number>>({});
  const batteryReadInFlightRef = useRef<Record<string, boolean>>({});

  const [bleReady, setBleReady] = useState(false);
  const [bleState, setBleState] = useState('Unknown');
  const [isScanning, setIsScanning] = useState(false);
  const [tags, setTags] = useState<Record<string, SeenTag>>({});
  const [tagNicknames, setTagNicknames] = useState<Record<string, string>>({});
  const [targetTag, setTargetTag] = useState('');
  const [connectedTagId, setConnectedTagId] = useState('');
  const [localTagLocations, setLocalTagLocations] = useState<Record<string, LocalTagLocation>>({});
  const [phoneLocation, setPhoneLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [message, setMessage] = useState('พร้อมใช้งาน');

  const tagList = useMemo(() => Object.values(tags).sort((a, b) => b.rssi - a.rssi), [tags]);
  const activeTagIds = useMemo(() => {
    const now = Date.now();
    return new Set(tagList.filter((item) => now - item.lastSeenMs <= BLE_ACTIVE_WINDOW_MS).map((item) => item.tagId));
  }, [tagList]);
  const targetSeen = useMemo(() => {
    if (!targetTag.trim()) return null;
    return tagList.find((item) => item.tagId === targetTag.trim().toUpperCase() && activeTagIds.has(item.tagId)) ?? null;
  }, [activeTagIds, tagList, targetTag]);
  const connectedSeen = useMemo(() => {
    if (!connectedTagId.trim()) return null;
    return tagList.find((item) => item.tagId === connectedTagId.trim().toUpperCase() && activeTagIds.has(item.tagId)) ?? null;
  }, [activeTagIds, connectedTagId, tagList]);

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
      setMessage('BLE ใช้ไม่ได้ในโหมดนี้ ลองเปิดผ่าน native app แทน');
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
        // Ignore location failures.
      }
    })();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!isScanning) return;
      const now = Date.now();
      setTags((prev) => {
        const next: Record<string, SeenTag> = {};
        for (const [key, value] of Object.entries(prev)) {
          if (now - value.lastSeenMs <= BLE_UI_RETENTION_MS) {
            next[key] = value;
          }
        }
        return next;
      });
    }, 800);

    return () => clearInterval(timer);
  }, [isScanning]);

  useEffect(() => {
    if (!isScanning || !managerRef.current) return;

    const restartTimer = setInterval(() => {
      if (!managerRef.current) return;

      try {
        managerRef.current.stopDeviceScan();
      } catch {
        // Ignore restart failures.
      }

      managerRef.current.startDeviceScan(null, { allowDuplicates: true }, (error, device) => {
        if (error) {
          setMessage(`สแกนไม่สำเร็จ: ${error.message}`);
          setIsScanning(false);
          return;
        }
        if (!device) return;

        if (!loggedDeviceIdsRef.current[device.id]) {
          loggedDeviceIdsRef.current[device.id] = true;
          console.log('[BLE_SCAN_RAW]', {
            id: device.id,
            name: device.name ?? '',
            localName: device.localName ?? '',
            serviceUUIDs: device.serviceUUIDs ?? [],
            manufacturerData: device.manufacturerData ? `${device.manufacturerData.slice(0, 40)}...` : '',
            rssi: device.rssi ?? null,
          });
        }

        const parsed = parseBlueTagManufacturerData(device.manufacturerData);
        const inferredTagId = inferTagIdFromDevice(device);
        const serviceMatched = hasKnownRingService(device);
        const nameMatched = looksLikeBlueTagName(device);
        const cachedTagId = knownDeviceToTagRef.current[device.id];
        const tagId =
          inferredTagId ??
          parsed?.tagId ??
          cachedTagId ??
          (serviceMatched || nameMatched ? deriveStableTagId(device.id || device.name || device.localName || '') : null);

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
              name: tagNicknames[tagId] || prevTag?.name || device.name || device.localName || fallbackName,
              rssi: smoothedRssi,
              battery: parsed?.battery ?? prevTag?.battery ?? null,
              counter: parsed?.counter ?? prevTag?.counter ?? null,
              lastSeen: formatThaiTime(new Date()),
              lastSeenMs: Date.now(),
            },
          };
        });
      });
    }, 12000);

    return () => clearInterval(restartTimer);
  }, [isScanning, tagNicknames]);

  async function persistTagNicknames(nextNicknames: Record<string, string>) {
    setTagNicknames(nextNicknames);
  }

  async function setTagNickname(tagId: string, nickname: string) {
    const normalizedTagId = tagId.trim().toUpperCase();
    const trimmedNickname = nickname.trim();
    const nextNicknames = { ...tagNicknames };

    if (trimmedNickname) {
      nextNicknames[normalizedTagId] = trimmedNickname;
    } else {
      delete nextNicknames[normalizedTagId];
    }

    await persistTagNicknames(nextNicknames);

    setTags((prev) => {
      const current = prev[normalizedTagId];
      if (!current) return prev;
      return {
        ...prev,
        [normalizedTagId]: {
          ...current,
          name: trimmedNickname || toBlueTagDisplayName(normalizedTagId),
        },
      };
    });
  }

  async function requestBlePermissions() {
    if (Platform.OS !== 'android') return true;
    const perms = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
    return Object.values(perms).every((value) => value === PermissionsAndroid.RESULTS.GRANTED);
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
          updatedAt: formatThaiTime(new Date()),
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
      let device: Device = await managerRef.current.connectToDevice(deviceId, { timeout: 10000 });
      device = await device.discoverAllServicesAndCharacteristics();
      const battery = await readBatteryFromConnectedDevice(device, tagId);
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
    const hasPermission = await requestBlePermissions();
    if (!hasPermission) {
      setMessage('ยังไม่ได้รับสิทธิ์ Bluetooth');
      return;
    }

    if (!bleReady || !managerRef.current) {
      setMessage('BLE ยังไม่พร้อม ลองเปิดผ่าน native app');
      return;
    }

    if (bleState !== 'PoweredOn') {
      setMessage(`ตอนนี้ Bluetooth อยู่ในสถานะ ${bleState}`);
    } else {
      setMessage('กำลังสแกน...');
    }

    knownDeviceToTagRef.current = {};
    try {
      managerRef.current.stopDeviceScan();
    } catch {
      // Ignore if there is no active scan yet.
    }
    setIsScanning(true);

    managerRef.current.startDeviceScan(null, { allowDuplicates: true }, (error, device) => {
      if (error) {
        setMessage(`สแกนไม่สำเร็จ: ${error.message}`);
        setIsScanning(false);
        return;
      }
      if (!device) return;

      if (!loggedDeviceIdsRef.current[device.id]) {
        loggedDeviceIdsRef.current[device.id] = true;
        console.log('[BLE_SCAN_RAW]', {
          id: device.id,
          name: device.name ?? '',
          localName: device.localName ?? '',
          serviceUUIDs: device.serviceUUIDs ?? [],
          manufacturerData: device.manufacturerData ? `${device.manufacturerData.slice(0, 40)}...` : '',
          rssi: device.rssi ?? null,
        });
      }

      const parsed = parseBlueTagManufacturerData(device.manufacturerData);
      const inferredTagId = inferTagIdFromDevice(device);
      const serviceMatched = hasKnownRingService(device);
      const nameMatched = looksLikeBlueTagName(device);
      const cachedTagId = knownDeviceToTagRef.current[device.id];
      const tagId =
        inferredTagId ??
        parsed?.tagId ??
        cachedTagId ??
        (serviceMatched || nameMatched ? deriveStableTagId(device.id || device.name || device.localName || '') : null);

      if (!tagId) return;

      console.log('[BLE_SCAN_MATCH]', {
        id: device.id,
        tagId,
        inferredTagId,
        parsedTagId: parsed?.tagId ?? null,
        serviceMatched,
        nameMatched,
        rssi: device.rssi ?? null,
      });

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
            name: tagNicknames[tagId] || prevTag?.name || device.name || device.localName || fallbackName,
            rssi: smoothedRssi,
            battery: parsed?.battery ?? prevTag?.battery ?? null,
            counter: parsed?.counter ?? prevTag?.counter ?? null,
            lastSeen: formatThaiTime(new Date()),
            lastSeenMs: Date.now(),
          },
        };
      });
    });
  }

  async function refreshScan() {
    setTags({});
    setMessage('รีเฟรชรายการ BlueTag...');
    await startScan();
  }

  function stopScan() {
    managerRef.current?.stopDeviceScan();
    setIsScanning(false);
    setMessage('หยุดสแกนแล้ว');
  }

  function resetScannerState() {
    managerRef.current?.stopDeviceScan();
    setIsScanning(false);
    setTags({});
    setTargetTag('');
    setConnectedTagId('');
    setLocalTagLocations({});
    setMessage('พร้อมใช้งาน');
  }

  function connectToTag(tagId: string) {
    const normalizedTagId = tagId.trim().toUpperCase();
    if (!normalizedTagId) {
      setConnectedTagId('');
      setMessage('ยังไม่ได้เลือก BlueTag');
      return;
    }

    setTargetTag(normalizedTagId);
    setConnectedTagId(normalizedTagId);
    setMessage(`เชื่อม BlueTag ${normalizedTagId} แล้ว`);
  }

  function disconnectFromTag() {
    setConnectedTagId('');
    setMessage('ตัดการเชื่อมต่อ BlueTag แล้ว');
  }

  return {
    managerRef,
    bleReady,
    bleState,
    isScanning,
    setIsScanning,
    tags,
    tagList,
    activeTagIds,
    tagNicknames,
    setTags,
    setTagNickname,
    targetTag,
    setTargetTag,
    targetSeen,
    connectedTagId,
    connectedSeen,
    connectToTag,
    disconnectFromTag,
    localTagLocations,
    phoneLocation,
    message,
    setMessage,
    startScan,
    refreshScan,
    stopScan,
    readBatteryFromConnectedDevice,
    resetScannerState,
  };
}
