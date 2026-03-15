import type { AppConfig } from '../config/AppConfig';
import type { PostgresDatabase } from './PostgresDatabase';

export class SchemaManager {
  public constructor(
    private readonly database: PostgresDatabase,
    private readonly config: AppConfig,
  ) {}

  public async ensureSchema(): Promise<void> {
    await this.database.query(`
      create extension if not exists pgcrypto;

      create table if not exists app_users (
        id uuid primary key default gen_random_uuid(),
        email text not null unique,
        password_hash text not null,
        name text not null,
        role text not null default 'user',
        created_at timestamptz not null default now()
      );

      alter table app_users add column if not exists role text not null default 'user';

      create table if not exists tag_locations (
        tag_id text primary key,
        nickname text null,
        estimated_latitude double precision null,
        estimated_longitude double precision null,
        estimate_source text null,
        updated_at timestamptz not null default now(),
        owner_user_id uuid null references app_users(id) on delete set null,
        sample_count bigint not null default 0
      );

      create index if not exists idx_tag_locations_updated_at
        on tag_locations(updated_at desc);

      alter table tag_locations add column if not exists nickname text null;

      create table if not exists tag_location_history (
        id bigserial primary key,
        tag_id text not null,
        web_id text null,
        estimated_latitude double precision null,
        estimated_longitude double precision null,
        estimate_source text null,
        recorded_at timestamptz not null default now(),
        owner_user_id uuid null references app_users(id) on delete set null,
        write_reason text null
      );

      create index if not exists idx_tag_location_history_owner_recorded
        on tag_location_history(owner_user_id, recorded_at desc);

      create index if not exists idx_tag_location_history_web_recorded
        on tag_location_history(web_id, recorded_at desc);

      create index if not exists idx_tag_location_history_tag_recorded
        on tag_location_history(tag_id, recorded_at desc);

      create table if not exists web_ids (
        id uuid primary key default gen_random_uuid(),
        web_id text not null unique,
        owner_user_id uuid not null references app_users(id) on delete cascade,
        created_at timestamptz not null default now()
      );

      create table if not exists tag_bindings (
        tag_id text primary key,
        web_id text not null references web_ids(web_id) on delete cascade,
        owner_user_id uuid not null references app_users(id) on delete cascade,
        board_web_id_hash text null,
        board_lock_state text not null default 'unbound',
        board_synced_at timestamptz null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create index if not exists idx_tag_bindings_web_id
        on tag_bindings(web_id);

      alter table tag_bindings add column if not exists board_web_id_hash text null;
      alter table tag_bindings add column if not exists board_lock_state text not null default 'unbound';
      alter table tag_bindings add column if not exists board_synced_at timestamptz null;

      create table if not exists audit_logs (
        id bigserial primary key,
        actor_user_id uuid null references app_users(id) on delete set null,
        action text not null,
        target_type text not null,
        target_id text not null,
        details jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      );

      create index if not exists idx_audit_logs_created_at
        on audit_logs(created_at desc);
    `);
  }

  public async cleanupOldRows(): Promise<void> {
    if (this.config.tagRetentionDays <= 0) {
      return;
    }

    await this.database.query(
      `
        delete from tag_locations
        where updated_at < now() - ($1::int * interval '1 day')
      `,
      [this.config.tagRetentionDays],
    );

    await this.database.query(
      `
        delete from tag_location_history
        where recorded_at < now() - ($1::int * interval '1 day')
      `,
      [this.config.tagRetentionDays],
    );
  }
}
