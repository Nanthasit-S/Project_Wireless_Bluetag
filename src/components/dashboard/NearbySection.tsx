import { Text, TouchableOpacity, View } from 'react-native';
import type { SeenTag } from '../../types/bluetag';

type NearbySectionProps = {
  tags: SeenTag[];
  formatDistanceMeters: (rssi: number) => string;
  rssiZone: (rssi: number) => string;
  onPickTag: (tagId: string) => void;
};

export function NearbySection({ tags, formatDistanceMeters, rssiZone, onPickTag }: NearbySectionProps) {
  return (
    <View className="rounded-2xl bg-material-card border border-material-line p-3 gap-2.5">
      <Text className="text-material-text text-[17px] font-bold">4) Nearby BlueTags</Text>
      <Text className="text-material-muted text-xs">Tap an item to set as current target tag.</Text>
      {tags.map((t) => (
        <TouchableOpacity key={t.tagId} onPress={() => onPickTag(t.tagId)} className="border-t border-material-line pt-2">
          <Text className="text-material-text font-bold">{t.tagId}</Text>
          <Text className="text-slate-600 text-xs">
            RSSI {t.rssi} | {formatDistanceMeters(t.rssi)} | {rssiZone(t.rssi)} | Battery {t.battery ?? '-'}
          </Text>
        </TouchableOpacity>
      ))}
      {tags.length === 0 ? <Text className="text-slate-600 text-xs">No tags yet</Text> : null}
    </View>
  );
}
