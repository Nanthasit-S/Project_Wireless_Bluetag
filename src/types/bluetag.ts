export type SeenTag = {
  deviceId: string;
  tagId: string;
  name: string;
  rssi: number;
  battery: number | null;
  counter: number | null;
  lastSeen: string;
  lastSeenMs: number;
};

export type TagSummary = {
  tag_id: string;
  nickname?: string | null;
  estimated_latitude: number | null;
  estimated_longitude: number | null;
  estimate_source: string | null;
  updated_at?: string;
};

export type WebIdRecord = {
  web_id: string;
  created_at: string;
};

export type TagBindingRecord = {
  tag_id: string;
  web_id: string;
  updated_at: string;
  board_web_id_hash?: string | null;
  board_lock_state?: string | null;
  board_synced_at?: string | null;
};

export type TagBindingAccessRecord = {
  tag_id: string;
  access: 'unbound' | 'bound_to_my_web_id' | 'bound_to_other_account';
  web_id: string | null;
  board_lock_state?: string | null;
  board_web_id_hash?: string | null;
};

export type WebIdTagOverview = {
  tag_id: string;
  nickname?: string | null;
  web_id: string;
  binding_updated_at: string;
  estimated_latitude: number | null;
  estimated_longitude: number | null;
  estimate_source: string | null;
  location_updated_at: string | null;
  sample_count: number;
};

export type LocationHistoryCursor = {
  recorded_at: string;
  id: number;
};

export type LocationHistoryItem = {
  id: number;
  tag_id: string;
  web_id: string | null;
  estimated_latitude: number | null;
  estimated_longitude: number | null;
  estimate_source: string | null;
  recorded_at: string;
  write_reason: string | null;
};

export type LocationHistoryResponse = {
  web_id: string;
  tag_id: string | null;
  pagination: {
    limit: number;
    has_more: boolean;
    next_cursor: LocationHistoryCursor | null;
  };
  items: LocationHistoryItem[];
};

export type AdminUserRecord = {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
};

export type AdminAuditLogRecord = {
  id: number;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  created_at: string;
  actor: {
    id: string | null;
    email: string | null;
    name: string | null;
  };
};

export type AdminBindingMismatchRecord = {
  tag_id: string;
  web_id: string;
  expected_web_id_hash: string;
  board_web_id_hash: string | null;
  board_lock_state: string;
  mismatch_state: 'matched' | 'backend_only' | 'board_only' | 'mismatch';
  board_synced_at: string | null;
  updated_at: string;
  owner: {
    user_id: string;
    email: string;
    name: string;
  };
};

export type LocalTagLocation = {
  tagId: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
};

export type ParsedManufacturerData = {
  tagId: string;
  battery: number;
  counter: number;
};

export type RingCandidate = {
  serviceUuid: string;
  characteristicUuid: string;
};
