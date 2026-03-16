import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { BleManager, Device } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import {
  BLE_FACTORY_RESET_OPCODE,
  BLE_RING_UUID,
  BLE_SLEEP_MODE_OFF_OPCODE,
  BLE_SLEEP_MODE_ON_OPCODE,
  BLE_SVC_UUID,
  IAS_ALERT_UUID,
  IAS_SVC_UUID,
  KNOWN_RING_CANDIDATES,
} from '../../constants/bluetooth';
import type { SeenTag } from '../../types/bluetag';
import { characteristicCanWrite, normalizeUuid, sleep } from '../../utils/bluetag';

interface UseRingControlParams {
  managerRef: MutableRefObject<BleManager | null>;
  bleReady: boolean;
  isScanning: boolean;
  setIsScanning: (value: boolean) => void;
  targetTag: string;
  connectedTagId: string;
  targetSeen: SeenTag | null;
  tags: Record<string, SeenTag>;
  readBatteryFromConnectedDevice: (device: Device, tagId: string) => Promise<number | null>;
  setMessage: (message: string) => void;
}

export function useRingControl({
  managerRef,
  bleReady,
  isScanning,
  setIsScanning,
  targetTag,
  connectedTagId,
  targetSeen,
  tags,
  readBatteryFromConnectedDevice,
  setMessage,
}: UseRingControlParams) {
  const COMMAND_BURST_COUNT = 3;
  const COMMAND_BURST_GAP_MS = 140;
  const AUTO_RING_CADENCE_MS = 900;
  const AUTO_RING_OFF_RETRY_MS = 1200;
  const manualOffUntilRef = useRef(0);
  const manualRingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAutoRingTargetRef = useRef<{ deviceId: string; tagId: string } | null>(null);
  const lastSleepSyncRef = useRef<{ deviceId: string; enabled: boolean } | null>(null);
  const autoRingRef = useRef<{ inFlight: boolean; lastMode: 0 | 1 | 2 | null; lastSentAt: number }>({
    inFlight: false,
    lastMode: null,
    lastSentAt: 0,
  });
  const batteryReadAtRef = useRef<Record<string, number>>({});
  const [autoRingEnabled, setAutoRingEnabled] = useState(false);

  function stopManualRingLoop() {
    if (manualRingTimerRef.current) {
      clearInterval(manualRingTimerRef.current);
      manualRingTimerRef.current = null;
    }
  }

  function resolveCachedTarget() {
    const normalizedConnectedTagId = connectedTagId.trim().toUpperCase();
    if (normalizedConnectedTagId && tags[normalizedConnectedTagId]) {
      return tags[normalizedConnectedTagId];
    }

    const normalizedTargetTag = targetTag.trim().toUpperCase();
    if (normalizedTargetTag && tags[normalizedTargetTag]) {
      return tags[normalizedTargetTag];
    }

    return null;
  }

  async function writeRing(
    mode: number,
    options?: { silent?: boolean; targetDeviceId?: string; targetTagId?: string },
  ) {
    const explicitTarget =
      options?.targetDeviceId != null
        ? {
            deviceId: options.targetDeviceId,
            tagId: options.targetTagId ?? options.targetDeviceId,
          }
        : null;
    const target = explicitTarget ?? targetSeen ?? resolveCachedTarget();

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
      const payload = Buffer.from([mode & 0xff]).toString('base64');
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

      if (mode === 2) {
        lastAutoRingTargetRef.current = {
          deviceId: target.deviceId,
          tagId: target.tagId,
        };
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

  async function burstWriteRing(
    mode: number,
    options?: {
      silent?: boolean;
      targetDeviceId?: string;
      targetTagId?: string;
      count?: number;
      gapMs?: number;
    },
  ) {
    const count = Math.max(1, Math.min(4, options?.count ?? COMMAND_BURST_COUNT));
    const gapMs = Math.max(60, options?.gapMs ?? COMMAND_BURST_GAP_MS);
    let sent = false;

    for (let index = 0; index < count; index += 1) {
      const ok = await writeRing(mode, {
        silent: options?.silent ?? index > 0,
        targetDeviceId: options?.targetDeviceId,
        targetTagId: options?.targetTagId,
      });
      sent = sent || ok;

      if (index < count - 1) {
        await sleep(gapMs);
      }
    }

    return sent;
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
      for (const t of targets) {
        const ok = await burstWriteRing(0, {
          silent: true,
          targetDeviceId: t.deviceId,
          targetTagId: t.tagId,
        });
        sent = sent || ok;
      }
    } else {
      sent = await burstWriteRing(0, { silent: true });
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
      if (next) {
        stopManualRingLoop();
        manualOffUntilRef.current = 0;
        autoRingRef.current.inFlight = false;
        autoRingRef.current.lastMode = null;
        autoRingRef.current.lastSentAt = 0;
      }
      if (!next) {
        void forceRingOff();
      }
      return next;
    });
  }

  async function syncSleepModeForTarget(enabled: boolean, explicitTarget?: { deviceId: string; tagId: string } | null) {
    const target =
      explicitTarget ??
      targetSeen ??
      lastAutoRingTargetRef.current;

    if (!target) return false;
    if (
      lastSleepSyncRef.current?.deviceId === target.deviceId &&
      lastSleepSyncRef.current.enabled === enabled
    ) {
      return true;
    }

    const opcode = enabled ? BLE_SLEEP_MODE_OFF_OPCODE : BLE_SLEEP_MODE_ON_OPCODE;
    const ok = await burstWriteRing(opcode, {
      silent: true,
      targetDeviceId: target.deviceId,
      targetTagId: target.tagId,
    });

    if (ok) {
      lastSleepSyncRef.current = {
        deviceId: target.deviceId,
        enabled,
      };
      setMessage(enabled ? 'Auto Ring active -> keep board awake' : 'Auto Ring off -> board can sleep');
    }
    return ok;
  }

  function handleManualRing(mode: 1 | 2) {
    stopManualRingLoop();
    setAutoRingEnabled(false);
    const intervalMs = mode === 2 ? 600 : 1400;
    void burstWriteRing(mode, { count: 3 });
    manualRingTimerRef.current = setInterval(() => {
      void burstWriteRing(mode, { silent: true, count: 2, gapMs: 110 });
    }, intervalMs);
  }

  async function handleFactoryReset(targetDeviceId?: string, targetTagId?: string) {
    stopManualRingLoop();
    autoRingRef.current.inFlight = false;
    autoRingRef.current.lastMode = null;
    autoRingRef.current.lastSentAt = 0;

    const ok = await burstWriteRing(BLE_FACTORY_RESET_OPCODE, {
      silent: false,
      targetDeviceId,
      targetTagId,
    });
    if (ok) {
      setMessage(`Factory reset sent to ${targetTagId ?? targetSeen?.tagId ?? 'BlueTag'}`);
    }
    return ok;
  }

  useEffect(() => {
    if (!autoRingEnabled || !bleReady) return;

    const tick = async () => {
      if (Date.now() < manualOffUntilRef.current) return;
      const now = Date.now();
      if (autoRingRef.current.inFlight) return;
      if (!isScanning || !targetSeen) {
        if (autoRingRef.current.lastMode !== 0 || now - autoRingRef.current.lastSentAt > AUTO_RING_OFF_RETRY_MS) {
          autoRingRef.current.inFlight = true;
          try {
            const fallbackTarget = lastAutoRingTargetRef.current;
            const ok = await burstWriteRing(0, {
              silent: true,
              targetDeviceId: fallbackTarget?.deviceId,
              targetTagId: fallbackTarget?.tagId,
              count: 2,
              gapMs: 100,
            });
            if (ok) {
              autoRingRef.current.lastMode = 0;
              autoRingRef.current.lastSentAt = Date.now();
              lastAutoRingTargetRef.current = null;
            }
          } finally {
            autoRingRef.current.inFlight = false;
          }
        }
        return;
      }

      const intervalMs = AUTO_RING_CADENCE_MS;
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
    }, AUTO_RING_CADENCE_MS);

    return () => clearInterval(timer);
  }, [autoRingEnabled, bleReady, isScanning, targetSeen]);

  useEffect(() => {
    if (!bleReady) return;
    void syncSleepModeForTarget(autoRingEnabled);
  }, [autoRingEnabled, bleReady, targetSeen]);

  useEffect(() => () => stopManualRingLoop(), []);

  function resetRingControl() {
    stopManualRingLoop();
    setAutoRingEnabled(false);
  }

  return {
    autoRingEnabled,
    handleToggleAutoRing,
    handleManualOff,
    handleManualRing,
    handleFactoryReset,
    syncSleepModeForTarget,
    resetRingControl,
  };
}
