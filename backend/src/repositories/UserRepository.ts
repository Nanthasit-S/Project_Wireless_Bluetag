import type { PostgresDatabase } from '../db/PostgresDatabase';
import type { UserRecord, UserWithPasswordRecord } from '../types/domain';

export class UserRepository {
  public constructor(private readonly database: PostgresDatabase) {}

  public async findByEmail(email: string): Promise<UserWithPasswordRecord | null> {
    const result = await this.database.query<UserWithPasswordRecord>(
      'select id, email, name, role, password_hash from app_users where email = $1 limit 1',
      [email],
    );

    return result.rows[0] || null;
  }

  public async findById(id: string): Promise<UserRecord | null> {
    const result = await this.database.query<UserRecord>(
      'select id, email, name, role from app_users where id = $1 limit 1',
      [id],
    );

    return result.rows[0] || null;
  }

  public async create(email: string, passwordHash: string, name: string): Promise<UserRecord> {
    const result = await this.database.query<UserRecord>(
      `
        insert into app_users (email, password_hash, name)
        values ($1, $2, $3)
        returning id, email, name, role
      `,
      [email, passwordHash, name],
    );

    return result.rows[0];
  }

  public async updateRole(userId: string, role: 'user' | 'admin'): Promise<UserRecord | null> {
    const result = await this.database.query<UserRecord>(
      `
        update app_users
        set role = $2
        where id = $1
        returning id, email, name, role
      `,
      [userId, role],
    );

    return result.rows[0] ?? null;
  }

  public async listAll(): Promise<UserRecord[]> {
    const result = await this.database.query<UserRecord>(
      `
        select id, email, name, role
        from app_users
        order by created_at desc, email asc
      `,
    );

    return result.rows;
  }

  public async deleteById(userId: string): Promise<UserRecord | null> {
    const result = await this.database.query<UserRecord>(
      `
        delete from app_users
        where id = $1
        returning id, email, name, role
      `,
      [userId],
    );

    return result.rows[0] ?? null;
  }
}
