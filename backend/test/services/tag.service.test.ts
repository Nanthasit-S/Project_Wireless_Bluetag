import { describe, expect, it } from 'vitest';
import type { AppConfig } from '../../src/config/AppConfig';
import { TagService } from '../../src/services/TagService';

function createService() {
  const config = {
    tagWriteMinIntervalMs: 15000,
    tagMoveMinMeters: 30,
    tagSameLocationWriteIntervalMs: 300000,
    tagsCacheTtlMs: 5000,
    tagsListLimit: 300,
  } as AppConfig;

  const repository = {
    listRecent: async () => [],
    findByTagId: async () => null,
    upsertTagLocation: async () => {
      throw new Error('not needed');
    },
    insertLocationHistory: async () => undefined,
  };

  return new TagService(config, repository as never);
}

describe('TagService.shouldWriteTag', () => {
  it('writes new tags immediately', () => {
    const service = createService();

    const decision = service.shouldWriteTag(null, {
      tag_id: 'BT-1',
      estimated_latitude: 13.1,
      estimated_longitude: 100.1,
      estimate_source: 'mobile',
    });

    expect(decision).toEqual({ write: true, reason: 'new' });
  });

  it('throttles small movements inside the min interval', () => {
    const service = createService();
    const updatedAt = new Date(Date.now() - 1000).toISOString();

    const decision = service.shouldWriteTag(
      {
        tag_id: 'BT-1',
        estimated_latitude: 13.7563,
        estimated_longitude: 100.5018,
        estimate_source: 'mobile',
        updated_at: updatedAt,
        sample_count: 1,
      },
      {
        tag_id: 'BT-1',
        estimated_latitude: 13.75631,
        estimated_longitude: 100.50181,
        estimate_source: 'mobile',
      },
    );

    expect(decision).toEqual({ write: false, reason: 'throttled' });
  });

  it('writes when the tag has moved far enough', () => {
    const service = createService();
    const updatedAt = new Date(Date.now() - 1000).toISOString();

    const decision = service.shouldWriteTag(
      {
        tag_id: 'BT-1',
        estimated_latitude: 13.7563,
        estimated_longitude: 100.5018,
        estimate_source: 'mobile',
        updated_at: updatedAt,
        sample_count: 1,
      },
      {
        tag_id: 'BT-1',
        estimated_latitude: 13.757,
        estimated_longitude: 100.5025,
        estimate_source: 'mobile',
      },
    );

    expect(decision).toEqual({ write: true, reason: 'moved' });
  });

  it('does not rewrite the same location just because the short interval elapsed', () => {
    const service = createService();
    const updatedAt = new Date(Date.now() - 20000).toISOString();

    const decision = service.shouldWriteTag(
      {
        tag_id: 'BT-1',
        estimated_latitude: 13.7563,
        estimated_longitude: 100.5018,
        estimate_source: 'mobile',
        updated_at: updatedAt,
        sample_count: 4,
      },
      {
        tag_id: 'BT-1',
        estimated_latitude: 13.7563,
        estimated_longitude: 100.5018,
        estimate_source: 'mobile',
      },
    );

    expect(decision).toEqual({ write: false, reason: 'throttled' });
  });

  it('refreshes the same location only after the longer same-location interval', () => {
    const service = createService();
    const updatedAt = new Date(Date.now() - 301000).toISOString();

    const decision = service.shouldWriteTag(
      {
        tag_id: 'BT-1',
        estimated_latitude: 13.7563,
        estimated_longitude: 100.5018,
        estimate_source: 'mobile',
        updated_at: updatedAt,
        sample_count: 4,
      },
      {
        tag_id: 'BT-1',
        estimated_latitude: 13.7563,
        estimated_longitude: 100.5018,
        estimate_source: 'mobile',
      },
    );

    expect(decision).toEqual({ write: true, reason: 'same_location_refresh' });
  });
});
