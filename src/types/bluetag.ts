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
  estimated_latitude: number | null;
  estimated_longitude: number | null;
  estimate_source: string | null;
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
