import type { RingCandidate } from '../types/bluetag';

export const BLE_SVC_UUID = '0000fff0-0000-1000-8000-00805f9b34fb';
export const BLE_RING_UUID = '0000fff1-0000-1000-8000-00805f9b34fb';
export const IAS_SVC_UUID = '00001802-0000-1000-8000-00805f9b34fb';
export const IAS_ALERT_UUID = '00002a06-0000-1000-8000-00805f9b34fb';
export const BATTERY_SVC_UUID = '0000180f-0000-1000-8000-00805f9b34fb';
export const BATTERY_LEVEL_UUID = '00002a19-0000-1000-8000-00805f9b34fb';
export const LEGACY_BLUETAG_SVC_UUID = '12345678-1234-1234-1234-1234567890ab';
export const LEGACY_BLUETAG_RING_UUID = 'abcd1234-5678-90ab-cdef-1234567890ab';
export const BLE_SLEEP_MODE_OFF_OPCODE = 0xa0;
export const BLE_SLEEP_MODE_ON_OPCODE = 0xa1;
export const BLE_FACTORY_RESET_OPCODE = 0xfa;

export const HAS_GOOGLE_MAPS_API_KEY = Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim());
export const DEFAULT_BACKEND_BASE =
  process.env.EXPO_PUBLIC_BACKEND_BASE_URL?.trim().replace(/\/+$/, '') || 'http://103.216.159.209';

export const KNOWN_RING_SERVICE_UUIDS = [
  BLE_SVC_UUID,
  IAS_SVC_UUID,
  LEGACY_BLUETAG_SVC_UUID,
  '9fa480e0-4967-4542-9390-d343dc5d04ae',
  '00001910-0000-1000-8000-00805f9b34fb',
];

export const KNOWN_RING_CANDIDATES: RingCandidate[] = [
  {
    serviceUuid: '9fa480e0-4967-4542-9390-d343dc5d04ae',
    characteristicUuid: 'af0badb1-5b99-43cd-917a-a77bc549e3cc',
  },
  {
    serviceUuid: '9fa480e0-4967-4542-9390-d343dc5d04ae',
    characteristicUuid: '8667556c-9a37-4c91-84ed-54ee27d90049',
  },
  {
    serviceUuid: '8667556c-9a37-4c91-84ed-54ee27d90049',
    characteristicUuid: '8667556c-9a37-4c91-84ed-54ee27d90049',
  },
  {
    serviceUuid: '00001910-0000-1000-8000-00805f9b34fb',
    characteristicUuid: '00002b10-0000-1000-8000-00805f9b34fb',
  },
  {
    serviceUuid: '00001910-0000-1000-8000-00805f9b34fb',
    characteristicUuid: '00002b11-0000-1000-8000-00805f9b34fb',
  },
  {
    serviceUuid: LEGACY_BLUETAG_SVC_UUID,
    characteristicUuid: LEGACY_BLUETAG_RING_UUID,
  },
];
