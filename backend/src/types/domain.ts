export type UserRole = 'user' | 'admin';

export interface JwtUserPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface UserWithPasswordRecord extends UserRecord {
  password_hash: string;
}

export interface TagLocationRecord {
  tag_id: string;
  estimated_latitude: number | null;
  estimated_longitude: number | null;
  estimate_source: string | null;
  updated_at: string;
  sample_count?: number | string | null;
}

export interface TagWriteInput {
  tag_id: string;
  estimated_latitude: number | null;
  estimated_longitude: number | null;
  estimate_source: string;
}

export interface TagWriteDecision {
  write: boolean;
  reason: 'new' | 'source_changed' | 'interval_elapsed' | 'throttled_no_coords' | 'moved' | 'throttled';
}

export interface WebIdRecord {
  web_id: string;
  created_at: string;
  owner_user_id?: string;
}

export interface BindingRecord {
  tag_id: string;
  web_id: string;
  updated_at: string;
  owner_user_id?: string;
  board_web_id_hash?: string | null;
  board_lock_state?: string | null;
  board_synced_at?: string | null;
}

export interface AuditLogRecord {
  id: number | string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown> | null;
  created_at: string | Date;
  actor_user_id?: string | null;
  actor_email?: string | null;
  actor_name?: string | null;
}
