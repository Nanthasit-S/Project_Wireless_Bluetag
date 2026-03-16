import type { FastifyError } from 'fastify';
import { TagRepository } from '../repositories/TagRepository';
import { WebIdRepository } from '../repositories/WebIdRepository';

function createHttpError(statusCode: number, message: string): FastifyError {
  const error = new Error(message) as FastifyError;
  error.statusCode = statusCode;
  return error;
}

export class WebIdService {
  public constructor(
    private readonly webIds: WebIdRepository,
    private readonly tags: TagRepository,
  ) {}

  private toWebIdResponse(row: { web_id: string; created_at: string | Date }) {
    return {
      web_id: row.web_id,
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    };
  }

  private toTimestamp(value: string | Date | null | undefined) {
    if (value == null) return null;
    return value instanceof Date ? value.toISOString() : String(value);
  }

  public list(ownerUserId: string) {
    return this.webIds.listByOwner(ownerUserId).then((rows) => rows.map((row) => this.toWebIdResponse(row)));
  }

  public async create(ownerUserId: string, webId: string) {
    if (!webId) {
      throw createHttpError(400, 'web_id is required');
    }

    const existing = await this.webIds.findByWebId(webId);
    if (existing) {
      if (existing.owner_user_id !== ownerUserId) {
        throw createHttpError(409, 'web_id already exists');
      }

      return { statusCode: 200 as const, body: this.toWebIdResponse(existing) };
    }

    const created = await this.webIds.create(webId, ownerUserId);
    return { statusCode: 201 as const, body: this.toWebIdResponse(created) };
  }

  public async assertOwned(ownerUserId: string, webId: string): Promise<void> {
    const found = await this.webIds.findOwned(webId, ownerUserId);
    if (!found) {
      throw createHttpError(404, 'web_id not found');
    }
  }

  public async listTags(ownerUserId: string, webId: string) {
    await this.assertOwned(ownerUserId, webId);
    const rows = await this.tags.listTagsByWebId(ownerUserId, webId);

    return {
      web_id: webId,
      tags: rows.map((row) => ({
        tag_id: row.tag_id,
        nickname: row.nickname ?? null,
        web_id: row.web_id,
        binding_updated_at: this.toTimestamp(row.binding_updated_at),
        estimated_latitude: row.estimated_latitude == null ? null : Number(row.estimated_latitude),
        estimated_longitude: row.estimated_longitude == null ? null : Number(row.estimated_longitude),
        estimate_source: row.estimate_source,
        battery_percent: row.battery_percent == null ? null : Number(row.battery_percent),
        location_updated_at: this.toTimestamp(row.location_updated_at),
        sample_count: row.sample_count == null ? 0 : Number(row.sample_count),
      })),
    };
  }
}
