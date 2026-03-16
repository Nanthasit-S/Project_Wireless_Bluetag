import type { PostgresDatabase } from '../db/PostgresDatabase';

export interface AdminBindingStateRow {
  tag_id: string;
  web_id: string;
  owner_user_id: string;
  owner_email: string;
  owner_name: string;
  board_web_id_hash: string | null;
  board_lock_state: string | null;
  board_synced_at: string | Date | null;
  updated_at: string | Date;
}

export class AdminRepository {
  public constructor(private readonly database: PostgresDatabase) {}

  public async listBindingStates(): Promise<AdminBindingStateRow[]> {
    const result = await this.database.query<AdminBindingStateRow>(
      `
        select
          b.tag_id,
          b.web_id,
          b.owner_user_id,
          u.email as owner_email,
          u.name as owner_name,
          b.board_web_id_hash,
          b.board_lock_state,
          b.board_synced_at,
          b.updated_at
        from tag_bindings b
        inner join app_users u
          on u.id = b.owner_user_id
        order by b.updated_at desc, b.tag_id asc
      `,
    );

    return result.rows;
  }

  public async clearTagState(tagId: string) {
    await this.database.query('delete from tag_location_history where tag_id = $1', [tagId]);
    await this.database.query('delete from tag_locations where tag_id = $1', [tagId]);
    await this.database.query('delete from tag_bindings where tag_id = $1', [tagId]);
  }
}
