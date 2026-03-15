import type { PostgresDatabase } from '../db/PostgresDatabase';
import type { TagLocationRecord } from '../types/domain';

export interface LocationHistoryRow {
  id: string | number;
  tag_id: string;
  web_id: string | null;
  estimated_latitude: number | null;
  estimated_longitude: number | null;
  estimate_source: string | null;
  recorded_at: string;
  write_reason: string | null;
}

export interface WebIdTagRow {
  tag_id: string;
  web_id: string;
  binding_updated_at: string;
  estimated_latitude: number | null;
  estimated_longitude: number | null;
  estimate_source: string | null;
  location_updated_at: string | null;
  sample_count: number | string | null;
}

export class TagRepository {
  public constructor(private readonly database: PostgresDatabase) {}

  public async findByTagId(tagId: string): Promise<TagLocationRecord | null> {
    const result = await this.database.query<TagLocationRecord>(
      `
        select tag_id, estimated_latitude, estimated_longitude, estimate_source, updated_at, sample_count
        from tag_locations
        where tag_id = $1
        limit 1
      `,
      [tagId],
    );

    return result.rows[0] || null;
  }

  public async listRecent(limit: number): Promise<TagLocationRecord[]> {
    const result = await this.database.query<TagLocationRecord>(
      `
        select tag_id, estimated_latitude, estimated_longitude, estimate_source, updated_at, sample_count
        from tag_locations
        order by updated_at desc
        limit $1
      `,
      [limit],
    );

    return result.rows;
  }

  public async upsertTagLocation(params: {
    tagId: string;
    estimatedLatitude: number | null;
    estimatedLongitude: number | null;
    estimateSource: string;
    updatedAt: string;
    ownerUserId: string;
    sampleCount: number;
  }): Promise<TagLocationRecord> {
    const result = await this.database.query<TagLocationRecord>(
      `
        insert into tag_locations (
          tag_id,
          estimated_latitude,
          estimated_longitude,
          estimate_source,
          updated_at,
          owner_user_id,
          sample_count
        )
        values ($1, $2, $3, $4, $5, $6, $7)
        on conflict (tag_id) do update set
          estimated_latitude = excluded.estimated_latitude,
          estimated_longitude = excluded.estimated_longitude,
          estimate_source = excluded.estimate_source,
          updated_at = excluded.updated_at,
          owner_user_id = excluded.owner_user_id,
          sample_count = excluded.sample_count
        returning tag_id, estimated_latitude, estimated_longitude, estimate_source, updated_at, sample_count
      `,
      [
        params.tagId,
        params.estimatedLatitude,
        params.estimatedLongitude,
        params.estimateSource,
        params.updatedAt,
        params.ownerUserId,
        params.sampleCount,
      ],
    );

    return result.rows[0];
  }

  public async insertLocationHistory(params: {
    tagId: string;
    estimatedLatitude: number | null;
    estimatedLongitude: number | null;
    estimateSource: string;
    recordedAt: string;
    ownerUserId: string;
    writeReason: string;
  }): Promise<void> {
    await this.database.query(
      `
        insert into tag_location_history (
          tag_id,
          web_id,
          estimated_latitude,
          estimated_longitude,
          estimate_source,
          recorded_at,
          owner_user_id,
          write_reason
        )
        values (
          $1,
          (
            select b.web_id
            from tag_bindings b
            where b.tag_id = $1 and b.owner_user_id = $6
            limit 1
          ),
          $2,
          $3,
          $4,
          $5,
          $6,
          $7
        )
      `,
      [
        params.tagId,
        params.estimatedLatitude,
        params.estimatedLongitude,
        params.estimateSource,
        params.recordedAt,
        params.ownerUserId,
        params.writeReason,
      ],
    );
  }

  public async listLocationHistory(params: {
    ownerUserId: string;
    webId: string;
    tagId?: string;
    cursorRecordedAt?: string;
    cursorId?: number;
    limit: number;
  }): Promise<LocationHistoryRow[]> {
    const values: unknown[] = [params.ownerUserId, params.webId];
    let tagFilterSql = '';
    if (params.tagId) {
      values.push(params.tagId);
      tagFilterSql = ` and h.tag_id = $${values.length}`;
    }

    let cursorSql = '';
    if (params.cursorRecordedAt) {
      values.push(params.cursorRecordedAt, params.cursorId ?? 0);
      cursorSql = ` and (h.recorded_at, h.id) < ($${values.length - 1}::timestamptz, $${values.length}::bigint)`;
    }

    values.push(params.limit);

    const result = await this.database.query<LocationHistoryRow>(
      `
        select
          h.id,
          h.tag_id,
          h.web_id,
          h.estimated_latitude,
          h.estimated_longitude,
          h.estimate_source,
          h.recorded_at,
          h.write_reason
        from tag_location_history h
        where h.owner_user_id = $1
          and h.web_id = $2
          ${tagFilterSql}
          ${cursorSql}
        order by h.recorded_at desc, h.id desc
        limit $${values.length}
      `,
      values,
    );

    return result.rows;
  }

  public async listTagsByWebId(ownerUserId: string, webId: string): Promise<WebIdTagRow[]> {
    const result = await this.database.query<WebIdTagRow>(
      `
        select
          b.tag_id,
          b.web_id,
          b.updated_at as binding_updated_at,
          l.estimated_latitude,
          l.estimated_longitude,
          l.estimate_source,
          l.updated_at as location_updated_at,
          l.sample_count
        from tag_bindings b
        left join tag_locations l
          on l.tag_id = b.tag_id
        where b.owner_user_id = $1 and b.web_id = $2
        order by b.updated_at desc, b.tag_id asc
      `,
      [ownerUserId, webId],
    );

    return result.rows;
  }
}
