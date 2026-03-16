import type { FastifyError } from 'fastify';
import { TagRepository } from '../repositories/TagRepository';
import { WebIdService } from './WebIdService';

function createHttpError(statusCode: number, message: string): FastifyError {
  const error = new Error(message) as FastifyError;
  error.statusCode = statusCode;
  return error;
}

export class HistoryService {
  public constructor(
    private readonly tags: TagRepository,
    private readonly webIds: WebIdService,
  ) {}

  public async list(params: {
    ownerUserId: string;
    webId: string;
    tagId?: string;
    limit: number;
    cursorRecordedAt?: string;
    cursorId?: number;
  }) {
    if (!params.webId) {
      throw createHttpError(400, 'web_id is required');
    }

    if (params.cursorRecordedAt && !Date.parse(params.cursorRecordedAt)) {
      throw createHttpError(400, 'cursor_recorded_at is invalid');
    }

    await this.webIds.assertOwned(params.ownerUserId, params.webId);

    const rows = await this.tags.listLocationHistory({
      ownerUserId: params.ownerUserId,
      webId: params.webId,
      tagId: params.tagId,
      cursorRecordedAt: params.cursorRecordedAt,
      cursorId: params.cursorId,
      limit: params.limit + 1,
    });

    const hasMore = rows.length > params.limit;
    const items = hasMore ? rows.slice(0, params.limit) : rows;
    const lastRow = items[items.length - 1] || null;
    const toTimestamp = (value: string | Date | null | undefined) => {
      if (value == null) return null;
      return typeof value === 'string' ? value : value.toISOString();
    };

    return {
      web_id: params.webId,
      tag_id: params.tagId || null,
      pagination: {
        limit: params.limit,
        has_more: hasMore,
        next_cursor:
          hasMore && lastRow
            ? {
                recorded_at: toTimestamp(lastRow.recorded_at),
                id: Number(lastRow.id),
              }
            : null,
      },
      items: items.map((row) => ({
        id: Number(row.id),
        tag_id: row.tag_id,
        web_id: row.web_id,
        estimated_latitude: row.estimated_latitude == null ? null : Number(row.estimated_latitude),
        estimated_longitude: row.estimated_longitude == null ? null : Number(row.estimated_longitude),
        estimate_source: row.estimate_source,
        recorded_at: toTimestamp(row.recorded_at),
        write_reason: row.write_reason,
      })),
    };
  }
}
