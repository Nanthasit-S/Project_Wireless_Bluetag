import { Buffer } from 'buffer';
import { KNOWN_RING_SERVICE_UUIDS } from '../constants/bluetooth';
import type { ParsedManufacturerData } from '../types/bluetag';

export function parseBlueTagManufacturerData(base64Data?: string | null): ParsedManufacturerData | null {
  if (!base64Data) return null;
  const bytes = Buffer.from(base64Data, 'base64');
  if (bytes.length < 14) return null;

  let offset = 0;
  if (bytes.length >= 16 && bytes[0] === 0x34 && bytes[1] === 0x12) {
    offset = 2;
  }
  if (bytes.length < offset + 14) return null;
  if (
    bytes[offset] !== 0x42 ||
    bytes[offset + 1] !== 0x54 ||
    bytes[offset + 2] !== 0x41 ||
    bytes[offset + 3] !== 0x47
  ) {
    return null;
  }

  const battery = bytes[offset + 5];
  const counter =
    (bytes[offset + 6] << 24) |
    (bytes[offset + 7] << 16) |
    (bytes[offset + 8] << 8) |
    bytes[offset + 9];
  const hash =
    ((bytes[offset + 10] << 24) >>> 0) |
    (bytes[offset + 11] << 16) |
    (bytes[offset + 12] << 8) |
    bytes[offset + 13];
  const tagId = `BTAG-${hash.toString(16).toUpperCase().padStart(8, '0')}`;

  return { tagId, battery, counter };
}

export function inferTagIdFromDevice(device: { id: string; name?: string | null; localName?: string | null }) {
  const candidateName = device.name || device.localName || '';
  const normalizedName = candidateName.trim().toUpperCase();
  if (/^BTAG[-_][A-Z0-9]+$/.test(normalizedName)) {
    return normalizedName.replace(/_/g, '-');
  }
  if (normalizedName.includes('BLUETAG')) {
    return deriveStableTagId(device.id || normalizedName);
  }
  return null;
}

export function deriveStableTagId(seed: string) {
  const normalized = seed.trim().toUpperCase();
  if (!normalized) return null;

  let hash = 2166136261;
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `BTAG-${(hash >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
}

export function normalizeUuid(uuid: string) {
  return uuid.replace(/-/g, '').toLowerCase();
}

export function hasKnownRingService(device: { serviceUUIDs?: string[] | null }) {
  if (!device.serviceUUIDs?.length) return false;
  const known = new Set(KNOWN_RING_SERVICE_UUIDS.map((uuid) => normalizeUuid(uuid)));
  return device.serviceUUIDs.some((uuid) => known.has(normalizeUuid(uuid)));
}

export function looksLikeBlueTagName(device: { name?: string | null; localName?: string | null }) {
  const text = `${device.name ?? ''} ${device.localName ?? ''}`.toUpperCase();
  return text.includes('BTAG') || text.includes('BLUETAG');
}

export function characteristicCanWrite(char: {
  isWritableWithResponse?: boolean | null;
  isWritableWithoutResponse?: boolean | null;
}) {
  return Boolean(char.isWritableWithResponse || char.isWritableWithoutResponse);
}

export function rssiZone(rssi: number) {
  if (rssi >= -70) return 'NEAR';
  if (rssi >= -82) return 'MEDIUM';
  return 'FAR';
}

export function estimateDistanceMeters(rssi: number, txPower = -59, pathLoss = 2.2) {
  if (!Number.isFinite(rssi)) return null;
  const ratio = (txPower - rssi) / (10 * pathLoss);
  const meters = 10 ** ratio;
  if (!Number.isFinite(meters)) return null;
  return Math.max(0.2, Math.min(50, meters));
}

export function formatDistanceMeters(rssi: number) {
  const d = estimateDistanceMeters(rssi);
  if (d == null) return '~? m';
  if (d < 1) return `~${d.toFixed(2)} m`;
  if (d < 10) return `~${d.toFixed(1)} m`;
  return `~${Math.round(d)} m`;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
