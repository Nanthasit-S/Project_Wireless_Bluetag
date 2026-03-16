import type { FastifyError } from 'fastify';
import type { AppConfig } from '../config/AppConfig';
import { TagRepository } from '../repositories/TagRepository';
import type { TagLocationRecord, TagWriteDecision, TagWriteInput } from '../types/domain';
import { haversineMeters } from '../utils/geo';
import { nowIso, parseOptionalNumber } from '../utils/parsers';

function createHttpError(statusCode: number, message: string): FastifyError {
  const error = new Error(message) as FastifyError;
  error.statusCode = statusCode;
  return error;
}

function toTagResponseRow(row: TagLocationRecord) {
  const updatedAt =
    typeof row.updated_at === 'string'
      ? row.updated_at
      : new Date(row.updated_at as unknown as string | number | Date).toISOString();

  return {
    tag_id: row.tag_id,
    nickname: row.nickname ?? null,
    estimated_latitude: row.estimated_latitude == null ? null : Number(row.estimated_latitude),
    estimated_longitude: row.estimated_longitude == null ? null : Number(row.estimated_longitude),
    estimate_source: row.estimate_source,
    battery_percent: row.battery_percent == null ? null : Number(row.battery_percent),
    updated_at: updatedAt,
  };
}

export class TagService {
  private readonly tagByIdCache = new Map<string, TagLocationRecord>();
  private readonly tagOwnerCache = new Map<string, string | null>();
  private readonly tagsListCacheByOwner = new Map<string, { rows: TagLocationRecord[]; at: number }>();

  public constructor(
    private readonly config: AppConfig,
    private readonly tags: TagRepository,
  ) {}

  public async listTags(ownerUserId: string) {
    const cached = this.tagsListCacheByOwner.get(ownerUserId);
    const age = cached ? Date.now() - cached.at : Number.POSITIVE_INFINITY;
    if (cached && cached.rows.length > 0 && age < this.config.tagsCacheTtlMs) {
      return cached.rows.map(toTagResponseRow);
    }

    const rows = await this.tags.listRecent(this.config.tagsListLimit, ownerUserId);
    this.tagsListCacheByOwner.set(ownerUserId, { rows, at: Date.now() });
    return rows.map(toTagResponseRow);
  }

  public async getCachedOrFetch(tagId: string, ownerUserId: string): Promise<TagLocationRecord | null> {
    const cached = this.tagByIdCache.get(tagId);
    const cachedOwner = this.tagOwnerCache.get(tagId);
    if (cached && cachedOwner === ownerUserId) {
      return cached;
    }

    const row = await this.tags.findByTagId(tagId, ownerUserId);
    if (row) {
      this.tagByIdCache.set(tagId, row);
      this.tagOwnerCache.set(tagId, ownerUserId);
    }

    return row;
  }

  public shouldWriteTag(existing: TagLocationRecord | null, incoming: TagWriteInput): TagWriteDecision {
    if (!existing) {
      return { write: true, reason: 'new' };
    }

    const ageMs = Date.now() - (Date.parse(existing.updated_at || '0') || 0);
    if ((existing.estimate_source || '') !== (incoming.estimate_source || '')) {
      return { write: true, reason: 'source_changed' };
    }
    if (
      incoming.battery_percent != null &&
      Number(existing.battery_percent ?? NaN) !== Number(incoming.battery_percent)
    ) {
      return { write: true, reason: 'battery_changed' };
    }

    const prevLat = parseOptionalNumber(existing.estimated_latitude);
    const prevLng = parseOptionalNumber(existing.estimated_longitude);
    const nextLat = parseOptionalNumber(incoming.estimated_latitude);
    const nextLng = parseOptionalNumber(incoming.estimated_longitude);

    if (prevLat == null || prevLng == null || nextLat == null || nextLng == null) {
      if (ageMs >= this.config.tagWriteMinIntervalMs) {
        return { write: true, reason: 'interval_elapsed' };
      }

      return { write: false, reason: 'throttled_no_coords' };
    }

    if (haversineMeters(prevLat, prevLng, nextLat, nextLng) >= this.config.tagMoveMinMeters) {
      return { write: true, reason: 'moved' };
    }

    if (ageMs >= this.config.tagSameLocationWriteIntervalMs) {
      return { write: true, reason: 'same_location_refresh' };
    }

    return { write: false, reason: 'throttled' };
  }

  public async storeTagLocation(params: {
    tagId: string;
    nickname?: string | null;
    estimatedLatitude: number | null;
    estimatedLongitude: number | null;
    estimateSource: string;
    batteryPercent: number | null;
    ownerUserId: string;
  }): Promise<
    | {
        statusCode: 200;
        body:
          | {
          stored: false;
          reason: 'throttled_no_coords' | 'throttled';
          cached: ReturnType<typeof toTagResponseRow> | null;
        }
          | {
              stored: true;
              reason: 'source_changed' | 'battery_changed' | 'interval_elapsed' | 'same_location_refresh' | 'moved';
              tag: ReturnType<typeof toTagResponseRow>;
              sample_count: number;
            };
      }
    | {
        statusCode: 201;
        body: {
          stored: true;
          reason: 'new';
          tag: ReturnType<typeof toTagResponseRow>;
          sample_count: number;
        };
      }
  > {
    if (!params.tagId) {
      throw createHttpError(400, 'tag_id is required');
    }

    const existingAnyOwner = await this.tags.findByTagIdAnyOwner(params.tagId);
    if (existingAnyOwner?.owner_user_id && existingAnyOwner.owner_user_id !== params.ownerUserId) {
      throw createHttpError(403, 'tag_id นี้เป็นของผู้ใช้อื่น');
    }

    const existing = await this.getCachedOrFetch(params.tagId, params.ownerUserId);
    const incoming: TagWriteInput = {
      tag_id: params.tagId,
      estimated_latitude: params.estimatedLatitude,
      estimated_longitude: params.estimatedLongitude,
      estimate_source: params.estimateSource,
      battery_percent: params.batteryPercent,
    };
    const decision = this.shouldWriteTag(existing, incoming);

    if (!decision.write) {
      return {
        statusCode: 200 as const,
        body: {
          stored: false,
          reason: decision.reason as 'throttled_no_coords' | 'throttled',
          cached: existing ? toTagResponseRow(existing) : null,
        },
      };
    }

    const row = await this.tags.upsertTagLocation({
      tagId: params.tagId,
      nickname: params.nickname ?? existing?.nickname ?? null,
      estimatedLatitude: params.estimatedLatitude,
      estimatedLongitude: params.estimatedLongitude,
      estimateSource: params.estimateSource,
      batteryPercent: params.batteryPercent,
      updatedAt: nowIso(),
      ownerUserId: params.ownerUserId,
      sampleCount: Number(existing?.sample_count || 0) + 1,
    });

    if (decision.reason !== 'battery_changed') {
      await this.tags.insertLocationHistory({
        tagId: params.tagId,
        estimatedLatitude: params.estimatedLatitude,
        estimatedLongitude: params.estimatedLongitude,
        estimateSource: params.estimateSource,
        recordedAt: row.updated_at,
        ownerUserId: params.ownerUserId,
        writeReason: decision.reason,
      });
    }

    this.tagByIdCache.set(params.tagId, row);
    this.tagOwnerCache.set(params.tagId, params.ownerUserId);
    this.tagsListCacheByOwner.delete(params.ownerUserId);

    if (existing) {
      return {
        statusCode: 200 as const,
        body: {
          stored: true,
          reason: decision.reason as 'source_changed' | 'battery_changed' | 'interval_elapsed' | 'same_location_refresh' | 'moved',
          tag: toTagResponseRow(row),
          sample_count: Number(row.sample_count || 0),
        },
      };
    }

    return {
      statusCode: 201 as const,
      body: {
        stored: true,
        reason: 'new' as const,
        tag: toTagResponseRow(row),
        sample_count: Number(row.sample_count || 0),
      },
    };
  }

  public async saveNickname(params: { tagId: string; nickname: string | null; ownerUserId: string }) {
    if (!params.tagId) {
      throw createHttpError(400, 'tag_id is required');
    }

    const existingAnyOwner = await this.tags.findByTagIdAnyOwner(params.tagId);
    if (existingAnyOwner?.owner_user_id && existingAnyOwner.owner_user_id !== params.ownerUserId) {
      throw createHttpError(403, 'tag_id นี้เป็นของผู้ใช้อื่น');
    }

    const row = await this.tags.updateNickname({
      tagId: params.tagId,
      nickname: params.nickname,
      ownerUserId: params.ownerUserId,
    });

    this.tagByIdCache.set(params.tagId, row);
    this.tagOwnerCache.set(params.tagId, params.ownerUserId);
    this.tagsListCacheByOwner.delete(params.ownerUserId);

    return {
      statusCode: 200 as const,
      body: {
        saved: true as const,
        tag: toTagResponseRow(row),
      },
    };
  }
}
