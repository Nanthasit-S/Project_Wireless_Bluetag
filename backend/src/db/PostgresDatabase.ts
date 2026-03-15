import { Pool, type QueryResult, type QueryResultRow } from 'pg';
import type { AppConfig } from '../config/AppConfig';

export class PostgresDatabase {
  private readonly pool: Pool;

  public constructor(config: AppConfig) {
    this.pool = new Pool({
      host: config.pgHost,
      port: config.pgPort,
      user: config.pgUser,
      password: config.pgPassword,
      database: config.pgDatabase,
      ssl: config.pgSslMode === 'require' ? { rejectUnauthorized: false } : false,
    });
  }

  public query<Row extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<Row>> {
    return this.pool.query<Row>(text, values);
  }

  public async healthCheck(): Promise<void> {
    await this.pool.query('select 1');
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}
