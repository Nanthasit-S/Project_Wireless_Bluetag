// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useLocationHistory } from '../../src/hooks/backend/useLocationHistory';

describe('useLocationHistory', () => {
  it('loads history and sets pagination cursor', async () => {
    const authorizedFetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        web_id: 'WEB-1',
        tag_id: 'BT-1',
        pagination: {
          limit: 8,
          has_more: true,
          next_cursor: { recorded_at: '2026-03-15T10:00:00.000Z', id: 42 },
        },
        items: [
          {
            id: 1,
            tag_id: 'BT-1',
            web_id: 'WEB-1',
            estimated_latitude: 13.7,
            estimated_longitude: 100.5,
            estimate_source: 'backend',
            recorded_at: '2026-03-15T10:05:00.000Z',
            write_reason: 'moved',
          },
        ],
      }),
    });

    const { result } = renderHook(() =>
      useLocationHistory({
        authToken: 'token-1',
        backendBase: 'http://127.0.0.1:8000',
        selectedWebId: 'WEB-1',
        authorizedFetch,
        onUnauthorized: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.loadLocationHistory({ tagId: 'BT-1' });
    });

    expect(authorizedFetch).toHaveBeenCalledWith('http://127.0.0.1:8000/api/web-ids/WEB-1/location-history?limit=8&tag_id=BT-1');
    expect(result.current.locationHistoryItems).toHaveLength(1);
    expect(result.current.locationHistoryCursor).toEqual({ recorded_at: '2026-03-15T10:00:00.000Z', id: 42 });
  });

  it('appends history items when loading more', async () => {
    const authorizedFetch = vi
      .fn()
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          web_id: 'WEB-1',
          tag_id: 'BT-1',
          pagination: { limit: 8, has_more: true, next_cursor: { recorded_at: '2026-03-15T10:00:00.000Z', id: 2 } },
          items: [
            {
              id: 1,
              tag_id: 'BT-1',
              web_id: 'WEB-1',
              estimated_latitude: 13.7,
              estimated_longitude: 100.5,
              estimate_source: 'backend',
              recorded_at: '2026-03-15T10:05:00.000Z',
              write_reason: 'moved',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          web_id: 'WEB-1',
          tag_id: 'BT-1',
          pagination: { limit: 8, has_more: false, next_cursor: null },
          items: [
            {
              id: 2,
              tag_id: 'BT-1',
              web_id: 'WEB-1',
              estimated_latitude: 13.71,
              estimated_longitude: 100.51,
              estimate_source: 'backend',
              recorded_at: '2026-03-15T09:55:00.000Z',
              write_reason: 'interval_elapsed',
            },
          ],
        }),
      });

    const { result } = renderHook(() =>
      useLocationHistory({
        authToken: 'token-1',
        backendBase: 'http://127.0.0.1:8000',
        selectedWebId: 'WEB-1',
        authorizedFetch,
        onUnauthorized: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.loadLocationHistory({ tagId: 'BT-1' });
      await result.current.loadLocationHistory({
        tagId: 'BT-1',
        append: true,
        cursor: { recorded_at: '2026-03-15T10:00:00.000Z', id: 2 },
      });
    });

    expect(result.current.locationHistoryItems.map((item) => item.id)).toEqual([1, 2]);
    expect(result.current.locationHistoryCursor).toBeNull();
  });

  it('delegates unauthorized responses to the provided handler', async () => {
    const onUnauthorized = vi.fn();
    const authorizedFetch = vi.fn().mockResolvedValue({
      status: 401,
      ok: false,
    });

    const { result } = renderHook(() =>
      useLocationHistory({
        authToken: 'token-1',
        backendBase: 'http://127.0.0.1:8000',
        selectedWebId: 'WEB-1',
        authorizedFetch,
        onUnauthorized,
      }),
    );

    await act(async () => {
      await result.current.loadLocationHistory({ tagId: 'BT-1' });
    });

    expect(onUnauthorized).toHaveBeenCalled();
    expect(result.current.locationHistoryItems).toEqual([]);
  });
});
