import { Pressable, Text, View } from 'react-native';
import type { LocationHistoryItem } from '../../types/bluetag';

type LocationHistoryPanelProps = {
  title: string;
  items: LocationHistoryItem[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  selectedItemId?: number | null;
  onSelectItem?: (item: LocationHistoryItem) => void;
  onLoadMore?: () => void;
};

function formatCoord(value: number | null) {
  return value == null ? '-' : value.toFixed(6);
}

function formatAbsoluteThai(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;

  try {
    return new Intl.DateTimeFormat('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Bangkok',
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

function formatRelativeThai(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;

  const diffMs = date.getTime() - Date.now();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  try {
    const rtf = new Intl.RelativeTimeFormat('th-TH', { numeric: 'auto' });
    if (Math.abs(diffMs) < hour) {
      return rtf.format(Math.round(diffMs / minute), 'minute');
    }
    if (Math.abs(diffMs) < day) {
      return rtf.format(Math.round(diffMs / hour), 'hour');
    }
    return rtf.format(Math.round(diffMs / day), 'day');
  } catch {
    return formatAbsoluteThai(input);
  }
}

function HistorySkeleton() {
  return (
    <View className="gap-3">
      {[0, 1, 2].map((item) => (
        <View key={item} className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 gap-2">
          <View className="h-4 w-32 rounded-full bg-slate-200" />
          <View className="h-3 w-40 rounded-full bg-slate-200" />
          <View className="h-3 w-52 rounded-full bg-slate-200" />
          <View className="h-3 w-28 rounded-full bg-slate-200" />
        </View>
      ))}
    </View>
  );
}

export function LocationHistoryPanel({
  title,
  items,
  loading,
  loadingMore,
  hasMore,
  selectedItemId,
  onSelectItem,
  onLoadMore,
}: LocationHistoryPanelProps) {
  return (
    <View className="rounded-[30px] border border-slate-200 bg-white/95 p-4 gap-4">
      <View className="gap-1">
        <Text className="text-slate-950 text-[22px] font-bold">ประวัติล่าสุด</Text>
        <Text className="text-slate-500 text-sm">{title}</Text>
      </View>

      {loading ? (
        <HistorySkeleton />
      ) : items.length === 0 ? (
        <View className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 gap-2">
          <Text className="text-slate-900 text-base font-bold">ยังไม่มีอะไรให้ดูตอนนี้</Text>
          <Text className="text-slate-500 text-sm leading-5">
            ถ้ายังไม่มีข้อมูล แปลว่ายังไม่มีตำแหน่งถูกบันทึกเข้ามา พอมีข้อมูลวิ่งเข้าเมื่อไร รายการย้อนหลังจะขึ้นตรงนี้เอง
          </Text>
        </View>
      ) : (
        items.map((item, index) => {
          const active = selectedItemId === item.id;
          return (
            <Pressable
              key={item.id}
              className={`rounded-[24px] border px-4 py-4 gap-1.5 ${active ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-slate-50'}`}
              style={({ pressed }) => (pressed ? { opacity: 0.8 } : null)}
              disabled={item.estimated_latitude == null || item.estimated_longitude == null}
              onPress={() => onSelectItem?.(item)}
            >
              <Text className="text-slate-900 text-sm font-bold">
                #{index + 1} {item.tag_id}
              </Text>
              <Text className="text-slate-600 text-xs">
                {formatCoord(item.estimated_latitude)}, {formatCoord(item.estimated_longitude)}
              </Text>
              <Text className="text-slate-500 text-xs">
                เวลา {formatAbsoluteThai(item.recorded_at)} · {formatRelativeThai(item.recorded_at)}
              </Text>
              <Text className="text-slate-500 text-xs">ที่มา {item.estimate_source ?? '-'}</Text>
              <Text className="text-slate-500 text-xs">เหตุผลที่บันทึก {item.write_reason ?? '-'}</Text>
              {item.estimated_latitude != null && item.estimated_longitude != null ? (
                <Text className="text-sky-700 text-xs font-semibold">แตะเพื่อย้ายแผนที่มาจุดนี้</Text>
              ) : (
                <Text className="text-slate-400 text-xs">รายการนี้ยังไม่มีพิกัด</Text>
              )}
            </Pressable>
          );
        })
      )}

      {hasMore ? (
        <Pressable
          className="items-center rounded-2xl border border-slate-300 bg-white px-4 py-3"
          style={({ pressed }) => (pressed ? { opacity: 0.76 } : null)}
          disabled={loadingMore}
          onPress={onLoadMore}
        >
          <Text className="text-slate-700 font-semibold">{loadingMore ? 'กำลังดึงเพิ่ม...' : 'ดูย้อนหลังเพิ่ม'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
