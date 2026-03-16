import { AuditLogRepository } from '../repositories/AuditLogRepository';

export class AuditLogService {
  public constructor(private readonly auditLogs: AuditLogRepository) {}

  public async write(params: {
    actorUserId: string;
    action: string;
    targetType: string;
    targetId: string;
    details?: Record<string, unknown> | null;
  }) {
    await this.auditLogs.insert(params);
  }

  public async list(limit = 50) {
    const rows = await this.auditLogs.list(limit);
    return rows.map((row) => ({
      id: Number(row.id),
      action: row.action,
      target_type: row.target_type,
      target_id: row.target_id,
      details: row.details ?? {},
      created_at: typeof row.created_at === 'string' ? row.created_at : row.created_at.toISOString(),
      actor: {
        id: row.actor_user_id ?? null,
        email: row.actor_email ?? null,
        name: row.actor_name ?? null,
      },
    }));
  }
}
