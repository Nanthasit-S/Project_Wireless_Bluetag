import { Text, TouchableOpacity, View } from 'react-native';
import type { SeenTag } from '../../types/bluetag';

type NearbySectionProps = {
  tags: SeenTag[];
  formatDistanceMeters: (rssi: number) => string;
  rssiZone: (rssi: number) => string;
  onPickTag: (tagId: string) => void;
  onConnectTag?: (tagId: string) => void;
  connectedTagId?: string;
  tagBindings?: Record<string, string>;
};

export function NearbySection({ tags, formatDistanceMeters, rssiZone, onPickTag, onConnectTag, connectedTagId = '', tagBindings = {} }: NearbySectionProps) {
  return (
    <View className="rounded-2xl bg-material-card border border-material-line p-3 gap-2.5">
      <Text className="text-material-text text-[18px] font-bold">BlueTag ที่อยู่ใกล้</Text>
      <Text className="text-material-muted text-sm">แตะรายการเพื่อเลือกบนแผนที่ แล้วกด Connect ก่อนค่อยควบคุม</Text>
      {tags.map((t) => (
        <TouchableOpacity key={t.tagId} onPress={() => onPickTag(t.tagId)} className="border-t border-material-line pt-2">
          <Text className="text-material-text font-bold">{t.tagId}{connectedTagId === t.tagId ? ' • Connected' : ''}</Text>
          <Text className="text-slate-600 text-sm">
            RSSI {t.rssi} | {formatDistanceMeters(t.rssi)} | {rssiZone(t.rssi)} | แบตเตอรี่ {t.battery ?? '-'}
          </Text>
          <Text className="text-slate-500 text-xs">Web ID: {tagBindings[t.tagId] ?? 'ยังไม่ผูก'}</Text>
          {onConnectTag ? (
            <Text className="text-sky-700 text-xs mt-1">{connectedTagId === t.tagId ? 'เชื่อมต่อแล้ว' : 'แตะอีกครั้งหรือกด Connect เพื่อควบคุม'}</Text>
          ) : null}
        </TouchableOpacity>
      ))}
      {tags.length === 0 ? <Text className="text-slate-600 text-sm">ยังไม่พบ BlueTag</Text> : null}
    </View>
  );
}
