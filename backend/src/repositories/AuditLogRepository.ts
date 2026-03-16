import type { PostgresDatabase } from '../db/PostgresDatabase';
import type { AuditLogRecord } from '../types/domain';

export class AuditLogRepository {
  public constructor(private readonly database: PostgresDatabase) {}

  public async insert(params: {
    actorUserId: string;
    action: string;
    targetType: string;
    targetId: string;
    details?: Record<string, unknown> | null;
  }) {
    await this.database.query(
      `
        insert into audit_logs (actor_user_id, action, target_type, target_id, details)
        values ($1, $2, $3, $4, $5::jsonb)
      `,
      [params.actorUserId, params.action, params.targetType, params.targetId, JSON.stringify(params.details ?? {})],
    );
  }

  public async list(limit: number): Promise<AuditLogRecord[]> {
    const result = await this.database.query<AuditLogRecord>(
      `
        select
          l.id,
          l.action,
          l.target_type,
          l.target_id,
          l.details,
          l.created_at,
          u.id as actor_user_id,
          u.email as actor_email,
          u.name as actor_name
        from audit_logs l
        left join app_users u
          on u.id = l.actor_user_id
        order by l.created_at desc, l.id desc
        limit $1
      `,
      [limit],
    );

    return result.rows;
  }
}
