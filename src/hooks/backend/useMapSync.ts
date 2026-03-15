import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { LocalTagLocation, TagSummary } from '../../types/bluetag';

interface UseMapSyncParams {
  authToken: string;
  backendBase: string;
  mapQueryTag: string;
  localTagLocations: Record<string, LocalTagLocation>;
  onUnauthorized: () => Promise<void>;
}

export function useMapSync({
  authToken,
  backendBase,
  mapQueryTag,
  localTagLocations,
  onUnauthorized,
}: UseMapSyncParams) {
  const lastBackendSyncAtRef = useRef<Record<string, number>>({});
  const [mapTag, setMapTag] = useState<TagSummary | null>(null);

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

        try {
          const res = await fetch(`${base}/api/tags`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              tag_id: row.tagId,
              estimated_latitude: row.latitude,
              estimated_longitude: row.longitude,
              estimate_source: 'mobile_ble_scan',
            }),
          });
          if (res.status === 401) {
            await onUnauthorized();
            return;
          }
        } catch {
          // Ignore transient upload failures.
        }
      }
    }, 4000);

    return () => clearInterval(timer);
  }, [authToken, backendBase, localTagLocations]);

  return {
    mapTag,
    setMapTag,
  };
}
