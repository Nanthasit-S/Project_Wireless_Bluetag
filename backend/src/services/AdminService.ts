import type { FastifyError } from 'fastify';
import { AdminRepository } from '../repositories/AdminRepository';
import { UserRepository } from '../repositories/UserRepository';
import { hashWebId } from '../utils/hash';
import { AuditLogService } from './AuditLogService';

function createHttpError(statusCode: number, message: string): FastifyError {
  const error = new Error(message) as FastifyError;
  error.statusCode = statusCode;
  return error;
}

export class AdminService {
  public constructor(
    private readonly users: UserRepository,
    private readonly adminRepository: AdminRepository,
    private readonly auditLogs: AuditLogService,
  ) {}

  public async listUsers() {
    const rows = await this.users.listAll();
    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
    }));
  }

  public async updateUserRole(actorUserId: string, userId: string, role: 'user' | 'admin') {
    const targetUser = await this.users.findById(userId);
    if (!targetUser) {
      throw createHttpError(404, 'user not found');
    }

    if (actorUserId === userId && role === 'user') {
      throw createHttpError(400, 'cannot remove your own admin role');
    }

    if (targetUser.role === 'admin' && role === 'user') {
      const users = await this.users.listAll();
      const adminCount = users.filter((user) => user.role === 'admin').length;
      if (adminCount <= 1) {
        throw createHttpError(400, 'cannot remove the last admin');
      }
    }

    const user = await this.users.updateRole(userId, role);
    if (!user) {
      throw createHttpError(404, 'user not found');
    }

    await this.auditLogs.write({
      actorUserId,
      action: 'admin.user_role_updated',
      targetType: 'user',
      targetId: userId,
      details: { role },
    });

    return user;
  }

  public async deleteUser(actorUserId: string, userId: string) {
    const targetUser = await this.users.findById(userId);
    if (!targetUser) {
      throw createHttpError(404, 'user not found');
    }

    if (actorUserId === userId) {
      throw createHttpError(400, 'cannot delete your own account');
    }

    if (targetUser.role === 'admin') {
      const users = await this.users.listAll();
      const adminCount = users.filter((user) => user.role === 'admin').length;
      if (adminCount <= 1) {
        throw createHttpError(400, 'cannot delete the last admin');
      }
    }

    const deletedUser = await this.users.deleteById(userId);
    if (!deletedUser) {
      throw createHttpError(404, 'user not found');
    }

    await this.auditLogs.write({
      actorUserId,
      action: 'admin.user_deleted',
      targetType: 'user',
      targetId: userId,
      details: {
        email: deletedUser.email,
        name: deletedUser.name,
        role: deletedUser.role,
      },
    });

    return deletedUser;
  }

  public async listBindingMismatches() {
    const rows = await this.adminRepository.listBindingStates();

    return rows.map((row) => {
      const expectedHash = hashWebId(row.web_id);
      const boardHash = row.board_web_id_hash ?? null;
      const lockState = row.board_lock_state ?? 'unbound';

      let mismatchState: 'matched' | 'backend_only' | 'board_only' | 'mismatch';
      if (!boardHash && lockState === 'unbound') {
        mismatchState = 'backend_only';
      } else if (boardHash && lockState === 'locked' && boardHash === expectedHash) {
        mismatchState = 'matched';
      } else if (boardHash && lockState === 'locked' && boardHash !== expectedHash) {
        mismatchState = 'mismatch';
      } else {
        mismatchState = 'board_only';
      }

      return {
        tag_id: row.tag_id,
        web_id: row.web_id,
        expected_web_id_hash: expectedHash,
        board_web_id_hash: boardHash,
        board_lock_state: lockState,
        mismatch_state: mismatchState,
        board_synced_at: row.board_synced_at == null ? null : typeof row.board_synced_at === 'string' ? row.board_synced_at : row.board_synced_at.toISOString(),
        updated_at: typeof row.updated_at === 'string' ? row.updated_at : row.updated_at.toISOString(),
        owner: {
          user_id: row.owner_user_id,
          email: row.owner_email,
          name: row.owner_name,
        },
      };
    });
  }

  public async clearTagState(actorUserId: string, tagId: string) {
    await this.adminRepository.clearTagState(tagId);
    await this.auditLogs.write({
      actorUserId,
      action: 'admin.tag_state_cleared',
      targetType: 'tag',
      targetId: tagId,
      details: null,
    });

    return { ok: true, tag_id: tagId };
  }
}
