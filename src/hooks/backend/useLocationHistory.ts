import { useEffect, useState } from 'react';
import type { LocationHistoryCursor, LocationHistoryItem, LocationHistoryResponse } from '../../types/bluetag';

interface UseLocationHistoryParams {
  authToken: string;
  backendBase: string;
  selectedWebId: string;
  authorizedFetch: (input: string, init?: RequestInit) => Promise<Response>;
  onUnauthorized: () => Promise<void>;
}

export function useLocationHistory({
  authToken,
  backendBase,
  selectedWebId,
  authorizedFetch,
  onUnauthorized,
}: UseLocationHistoryParams) {
  const [locationHistoryItems, setLocationHistoryItems] = useState<LocationHistoryItem[]>([]);
  const [locationHistoryCursor, setLocationHistoryCursor] = useState<LocationHistoryCursor | null>(null);
  const [locationHistoryLoading, setLocationHistoryLoading] = useState(false);
  const [locationHistoryLoadingMore, setLocationHistoryLoadingMore] = useState(false);
  const [historyFocus, setHistoryFocus] = useState<{
    id: number;
    tagId: string;
    latitude: number;
    longitude: number;
    recordedAt: string;
  } | null>(null);

  useEffect(() => {
    if (authToken) return;
    setLocationHistoryItems([]);
    setLocationHistoryCursor(null);
    setHistoryFocus(null);
  }, [authToken]);

  async function loadLocationHistory(options?: {
    append?: boolean;
    cursor?: LocationHistoryCursor | null;
    webId?: string;
    tagId?: string;
  }) {
    const webId = (options?.webId ?? selectedWebId).trim().toUpperCase();
    const tagId = (options?.tagId ?? '').trim().toUpperCase();

    if (!authToken || !webId) {
      setLocationHistoryItems([]);
      setLocationHistoryCursor(null);
      return;
    }

    const base = backendBase.trim();
    if (!base) {
      setLocationHistoryItems([]);
      setLocationHistoryCursor(null);
      return;
    }

    const searchParams = new URLSearchParams({ limit: '8' });
    if (tagId) searchParams.set('tag_id', tagId);
    if (options?.cursor?.recorded_at) {
      searchParams.set('cursor_recorded_at', options.cursor.recorded_at);
      searchParams.set('cursor_id', String(options.cursor.id));
    }

    if (options?.append) {
      setLocationHistoryLoadingMore(true);
    } else {
      setLocationHistoryLoading(true);
    }

    try {
      const res = await authorizedFetch(
        `${base}/api/web-ids/${encodeURIComponent(webId)}/location-history?${searchParams.toString()}`,
      );
      if (res.status === 401) {
        await onUnauthorized();
        return;
      }
      if (res.status === 404) {
        setLocationHistoryItems([]);
        setLocationHistoryCursor(null);
        return;
      }
      if (!res.ok) {
        throw new Error('failed_to_load_location_history');
      }

      const data = (await res.json()) as LocationHistoryResponse;
      setLocationHistoryItems((prev) => (options?.append ? [...prev, ...data.items] : data.items));
      setLocationHistoryCursor(data.pagination.next_cursor);
      if (!options?.append) {
        setHistoryFocus((prev) => (prev && prev.tagId === tagId ? prev : null));
      }
    } finally {
      setLocationHistoryLoading(false);
      setLocationHistoryLoadingMore(false);
    }
  }

  function handleSelectHistoryItem(item: LocationHistoryItem) {
    if (item.estimated_latitude == null || item.estimated_longitude == null) return;

    setHistoryFocus({
      id: item.id,
      tagId: item.tag_id,
      latitude: item.estimated_latitude,
      longitude: item.estimated_longitude,
      recordedAt: item.recorded_at,
    });
  }

  return {
    locationHistoryItems,
    locationHistoryCursor,
    locationHistoryLoading,
    locationHistoryLoadingMore,
    historyFocus,
    setHistoryFocus,
    loadLocationHistory,
    handleSelectHistoryItem,
  };
}
