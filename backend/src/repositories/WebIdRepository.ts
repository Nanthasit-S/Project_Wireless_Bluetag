import type { PostgresDatabase } from '../db/PostgresDatabase';
import type { WebIdRecord } from '../types/domain';

export class WebIdRepository {
  public constructor(private readonly database: PostgresDatabase) {}

  public async listByOwner(ownerUserId: string): Promise<WebIdRecord[]> {
    const result = await this.database.query<WebIdRecord>(
      `
        select web_id, created_at
        from web_ids
        where owner_user_id = $1
        order by created_at asc, web_id asc
      `,
      [ownerUserId],
    );

    return result.rows;
  }

  public async findByWebId(webId: string): Promise<WebIdRecord | null> {
    const result = await this.database.query<WebIdRecord>(
      'select web_id, owner_user_id, created_at from web_ids where web_id = $1 limit 1',
      [webId],
    );

    return result.rows[0] || null;
  }

  public async findOwned(webId: string, ownerUserId: string): Promise<WebIdRecord | null> {
    const result = await this.database.query<WebIdRecord>(
      `
        select web_id, created_at
        from web_ids
        where web_id = $1 and owner_user_id = $2
        limit 1
      `,
      [webId, ownerUserId],
    );

    return result.rows[0] || null;
  }

  public async create(webId: string, ownerUserId: string): Promise<WebIdRecord> {
    const result = await this.database.query<WebIdRecord>(
      `
        insert into web_ids (web_id, owner_user_id)
        values ($1, $2)
        returning web_id, created_at
      `,
      [webId, ownerUserId],
    );

    return result.rows[0];
  }
}
