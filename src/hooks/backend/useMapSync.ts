import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import type { LocalTagLocation, TagSummary } from '../../types/bluetag';

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6_371_000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface UseMapSyncParams {
  authToken: string;
  backendBase: string;
  mapQueryTag: string;
  localTagLocations: Record<string, LocalTagLocation>;
  authorizedFetch: (input: string, init?: RequestInit) => Promise<Response>;
  onUnauthorized: () => Promise<void>;
}

export function useMapSync({
  authToken,
  backendBase,
  mapQueryTag,
  localTagLocations,
  authorizedFetch,
  onUnauthorized,
}: UseMapSyncParams) {
  const lastBackendSyncAtRef = useRef<Record<string, number>>({});
  const lastConnectSyncRef = useRef<Record<string, { at: number; latitude: number; longitude: number }>>({});
  const [mapTag, setMapTag] = useState<TagSummary | null>(null);

  async function uploadTagLocation(params: {
    tagId: string;
    latitude: number;
    longitude: number;
    estimateSource: string;
  }) {
    const base = backendBase.trim();
    if (!authToken || !base) return false;

    try {
      const res = await fetch(`${base}/api/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          tag_id: params.tagId,
          estimated_latitude: params.latitude,
          estimated_longitude: params.longitude,
          estimate_source: params.estimateSource,
        }),
      });
      if (res.status === 401) {
        await onUnauthorized();
        return false;
      }
      if (!res.ok) return false;

      if (mapQueryTag === params.tagId) {
        setMapTag((current) => ({
          tag_id: params.tagId,
          estimated_latitude: params.latitude,
          estimated_longitude: params.longitude,
          estimate_source: params.estimateSource,
        }));
      }

      return true;
    } catch {
      return false;
    }
  }

  async function recordConnectedTagLastSeen(tagId: string) {
    const normalizedTagId = tagId.trim().toUpperCase();
    if (!normalizedTagId || !authToken) return false;

    try {
      const permission = await Location.getForegroundPermissionsAsync();
      let granted = permission.granted;
      if (!granted) {
        const asked = await Location.requestForegroundPermissionsAsync();
        granted = asked.granted;
      }
      if (!granted) return false;

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const previous = lastConnectSyncRef.current[normalizedTagId];
      const ageMs = previous ? Date.now() - previous.at : Number.POSITIVE_INFINITY;
      const movedMeters = previous ? haversineMeters(previous.latitude, previous.longitude, latitude, longitude) : Number.POSITIVE_INFINITY;

      if (previous && ageMs < 120000 && movedMeters < 25) {
        return false;
      }

      const uploaded = await uploadTagLocation({
        tagId: normalizedTagId,
        latitude,
        longitude,
        estimateSource: 'mobile_connect_last_seen',
      });

      if (uploaded) {
        lastConnectSyncRef.current[normalizedTagId] = { at: Date.now(), latitude, longitude };
      }

      return uploaded;
    } catch {
      return false;
    }
  }

  async function saveTagNickname(tagId: string, nickname: string) {
    const normalizedTagId = tagId.trim().toUpperCase();
    const base = backendBase.trim();
    if (!normalizedTagId || !authToken || !base) return false;

    try {
      const res = await authorizedFetch(`${base}/api/tags/${encodeURIComponent(normalizedTagId)}/nickname`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nickname: nickname.trim() || null,
        }),
      });
      if (res.status === 401) {
        await onUnauthorized();
        return false;
      }

      return res.ok;
    } catch {
      return false;
    }
  }

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
        const res = await fetch(`${trimmedBase}/api/tags`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        });
        if (res.status === 401) {
          await onUnauthorized();
          return;
        }
        if (!res.ok) return;
        const list = (await res.json()) as TagSummary[];
        const found = list.find((t) => t.tag_id === mapQueryTag) ?? null;
        setMapTag(found);
      } catch {
        // Ignore transient API errors.
      }
    }, 4000);

    return () => clearInterval(timer);
  }, [authToken, backendBase, mapQueryTag]);

  useEffect(() => {
    const timer = setInterval(async () => {
      if (!authToken) return;
      const base = backendBase.trim();
      if (!base) return;

      const rows = Object.values(localTagLocations);
      for (const row of rows) {
        const lastSyncedAt = lastBackendSyncAtRef.current[row.tagId] ?? 0;
        if (Date.now() - lastSyncedAt < 5000) continue;
        lastBackendSyncAtRef.current[row.tagId] = Date.now();

        await uploadTagLocation({
          tagId: row.tagId,
          latitude: row.latitude,
          longitude: row.longitude,
          estimateSource: 'mobile_ble_scan',
        });
      }
    }, 4000);

    return () => clearInterval(timer);
  }, [authToken, backendBase, localTagLocations]);

  return {
    mapTag,
    setMapTag,
    recordConnectedTagLastSeen,
    saveTagNickname,
  };
}
