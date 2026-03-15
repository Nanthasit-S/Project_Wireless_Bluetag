import type { FastifyError } from 'fastify';
import { BindingRepository } from '../repositories/BindingRepository';
import { AuditLogService } from './AuditLogService';
import { WebIdService } from './WebIdService';

function createHttpError(statusCode: number, message: string): FastifyError {
  const error = new Error(message) as FastifyError;
  error.statusCode = statusCode;
  return error;
}

export class BindingService {
  public constructor(
    private readonly bindings: BindingRepository,
    private readonly webIds: WebIdService,
    private readonly auditLogs: AuditLogService,
  ) {}

  private toBindingResponse(row: { tag_id: string; web_id: string; updated_at: string | Date }) {
    return {
      tag_id: row.tag_id,
      web_id: row.web_id,
      updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
      board_web_id_hash: 'board_web_id_hash' in row ? (row as { board_web_id_hash?: string | null }).board_web_id_hash ?? null : null,
      board_lock_state: 'board_lock_state' in row ? (row as { board_lock_state?: string | null }).board_lock_state ?? null : null,
      board_synced_at:
        'board_synced_at' in row
          ? (() => {
              const value = (row as { board_synced_at?: string | Date | null }).board_synced_at;
              if (value == null) return null;
              return value instanceof Date ? value.toISOString() : value;
            })()
          : null,
    };
  }

  public list(ownerUserId: string) {
    return this.bindings.listByOwner(ownerUserId).then((rows) => rows.map((row) => this.toBindingResponse(row)));
  }

  public async save(ownerUserId: string, tagId: string, webId: string) {
    if (!tagId || !webId) {
      throw createHttpError(400, 'tag_id and web_id are required');
    }

    await this.webIds.assertOwned(ownerUserId, webId);
    const existing = await this.bindings.findByTagId(tagId);

    if (existing) {
      if (existing.owner_user_id && existing.owner_user_id !== ownerUserId) {
        throw createHttpError(409, 'tag_id already bound by another account');
      }

      if (existing.web_id !== webId) {
        throw createHttpError(409, 'tag_id is already bound, unbind it first');
      }

      return this.toBindingResponse(existing);
    }

    const binding = await this.bindings.upsert(tagId, webId, ownerUserId);
    await this.auditLogs.write({
      actorUserId: ownerUserId,
      action: 'binding.created',
      targetType: 'tag_binding',
      targetId: tagId,
      details: { web_id: webId },
    });
    return this.toBindingResponse(binding);
  }

  public async remove(ownerUserId: string, tagId: string) {
    if (!tagId) {
      throw createHttpError(400, 'tag_id is required');
    }

    const deleted = await this.bindings.delete(tagId, ownerUserId);
    if (!deleted) {
      throw createHttpError(404, 'binding not found');
    }

    await this.auditLogs.write({
      actorUserId: ownerUserId,
      action: 'binding.removed',
      targetType: 'tag_binding',
      targetId: tagId,
      details: null,
    });
  }

  public async syncBoardState(params: {
    ownerUserId: string;
    tagId: string;
    webId: string;
    boardWebIdHash: string | null;
    boardLockState: 'locked' | 'unbound';
  }) {
    if (!params.tagId || !params.webId) {
      throw createHttpError(400, 'tag_id and web_id are required');
    }

    const existing = await this.bindings.findByTagId(params.tagId);
    if (!existing || existing.owner_user_id !== params.ownerUserId || existing.web_id !== params.webId) {
      throw createHttpError(404, 'binding not found');
    }

    const updated = await this.bindings.updateBoardState(params);
    if (!updated) {
      throw createHttpError(404, 'binding not found');
    }

    await this.auditLogs.write({
      actorUserId: params.ownerUserId,
      action: 'binding.board_state_synced',
      targetType: 'tag_binding',
      targetId: params.tagId,
      details: {
        web_id: params.webId,
        board_web_id_hash: params.boardWebIdHash,
        board_lock_state: params.boardLockState,
      },
    });

    return this.toBindingResponse(updated);
  }

  public async technicianReset(ownerUserId: string, tagId: string) {
    if (!tagId) {
      throw createHttpError(400, 'tag_id is required');
    }

    const updated = await this.bindings.technicianReset(tagId, ownerUserId);
    if (!updated) {
      throw createHttpError(404, 'binding not found');
    }

    await this.auditLogs.write({
      actorUserId: ownerUserId,
      action: 'binding.technician_reset',
      targetType: 'tag_binding',
      targetId: tagId,
      details: null,
    });

    return this.toBindingResponse(updated);
  }
}
