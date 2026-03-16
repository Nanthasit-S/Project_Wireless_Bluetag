# BlueTag Auth API

Backend ตัวนี้ใช้ `Fastify + TypeScript + PostgreSQL` และจัดโครงสร้างเป็นชั้นดังนี้:

- `src/config` สำหรับ env/config
- `src/db` สำหรับ database และ schema bootstrap
- `src/repositories` สำหรับ query access
- `src/services` สำหรับ business logic แบบ class-based
- `src/routes` สำหรับจัดกลุ่ม API path

## Setup

```bash
cd backend
npm install
copy .env.example .env
```

Fill `.env` values from Supabase project settings.

## Create table (run in Supabase SQL Editor)

```sql
create table if not exists public.tag_locations (
  tag_id text primary key,
  estimated_latitude double precision null,
  estimated_longitude double precision null,
  estimate_source text null,
  updated_at timestamptz not null default now(),
  owner_user_id uuid null references auth.users(id) on delete set null,
  sample_count bigint not null default 0
);

create index if not exists idx_tag_locations_updated_at on public.tag_locations(updated_at desc);
```

## API

- `POST /api/auth/register` body `{ email, password, name }`
- `POST /api/auth/login` body `{ email, password }`
- `GET /api/auth/me` with Bearer token
- `GET /api/tags` with Bearer token
- `POST /api/tags` with Bearer token
  - body: `{ tag_id, estimated_latitude, estimated_longitude, estimate_source }`
  - uses throttle + movement threshold before writing to DB

## Anti-DB-growth controls

- `TAG_WRITE_MIN_INTERVAL_MS`: minimum interval between writes for the same tag
- `TAG_MOVE_MIN_METERS`: only write if moved more than this distance (if coordinates exist)
- `TAGS_CACHE_TTL_MS`: cache `GET /api/tags` result in memory
- `TAG_RETENTION_DAYS`: delete stale rows older than N days
- `TAG_CLEANUP_INTERVAL_MS`: cleanup job interval

## Run

```bash
npm run dev
```

Build production:

```bash
npm run build
npm start
```

## Deploy notes

- Deploy this backend on Render/Railway/Fly.io.
- Set all environment variables from `.env.example`.
- Use `npm install` and `npm start`.
