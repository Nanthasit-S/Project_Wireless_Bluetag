import type { PostgresDatabase } from '../db/PostgresDatabase';
import type { BindingRecord } from '../types/domain';

export class BindingRepository {
  public constructor(private readonly database: PostgresDatabase) {}

  public async findByTagId(tagId: string): Promise<BindingRecord | null> {
    const result = await this.database.query<BindingRecord>(
      `
        select tag_id, web_id, owner_user_id, updated_at, board_web_id_hash, board_lock_state, board_synced_at
        from tag_bindings
        where tag_id = $1
        limit 1
      `,
      [tagId],
    );

    return result.rows[0] ?? null;
  }

  public async listByOwner(ownerUserId: string): Promise<BindingRecord[]> {
    const result = await this.database.query<BindingRecord>(
      `
        select tag_id, web_id, updated_at, board_web_id_hash, board_lock_state, board_synced_at
        from tag_bindings
        where owner_user_id = $1
        order by updated_at desc, tag_id asc
      `,
      [ownerUserId],
    );

    return result.rows;
  }

  public async upsert(tagId: string, webId: string, ownerUserId: string): Promise<BindingRecord> {
    const result = await this.database.query<BindingRecord>(
      `
        insert into tag_bindings (tag_id, web_id, owner_user_id, updated_at)
        values ($1, $2, $3, now())
        on conflict (tag_id) do update set
          web_id = excluded.web_id,
          owner_user_id = excluded.owner_user_id,
          updated_at = now()
        returning tag_id, web_id, owner_user_id, updated_at, board_web_id_hash, board_lock_state, board_synced_at
      `,
      [tagId, webId, ownerUserId],
    );

    return result.rows[0];
  }

  public async updateBoardState(params: {
    tagId: string;
    ownerUserId: string;
    webId: string;
    boardWebIdHash: string | null;
    boardLockState: 'locked' | 'unbound';
  }): Promise<BindingRecord | null> {
    const result = await this.database.query<BindingRecord>(
      `
        update tag_bindings
        set
          board_web_id_hash = $4,
          board_lock_state = $5,
          board_synced_at = now(),
          updated_at = now()
        where tag_id = $1 and owner_user_id = $2 and web_id = $3
        returning tag_id, web_id, owner_user_id, updated_at, board_web_id_hash, board_lock_state, board_synced_at
      `,
      [params.tagId, params.ownerUserId, params.webId, params.boardWebIdHash, params.boardLockState],
    );

    return result.rows[0] ?? null;
  }

  public async delete(tagId: string, ownerUserId: string): Promise<boolean> {
    const result = await this.database.query<{ tag_id: string }>(
      `
        delete from tag_bindings
        where tag_id = $1 and owner_user_id = $2
        returning tag_id
      `,
      [tagId, ownerUserId],
    );

    return Boolean(result.rowCount);
  }

  public async technicianReset(tagId: string, ownerUserId: string): Promise<BindingRecord | null> {
    const result = await this.database.query<BindingRecord>(
      `
        with deleted as (
          delete from tag_bindings
          where tag_id = $1 and owner_user_id = $2
          returning tag_id, web_id, owner_user_id, updated_at
        )
        select
          tag_id,
          web_id,
          owner_user_id,
          updated_at,
          null::text as board_web_id_hash,
          'unbound'::text as board_lock_state,
          now() as board_synced_at
        from deleted
      `,
      [tagId, ownerUserId],
    );

    return result.rows[0] ?? null;
  }
}
