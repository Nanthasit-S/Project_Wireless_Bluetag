import { useEffect, useMemo, useState } from 'react';
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
        <View key={item} className="rounded-[20px] border border-slate-200 bg-slate-50 px-3 py-3 gap-2">
          <View className="h-3.5 w-28 rounded-full bg-slate-200" />
          <View className="h-3 w-36 rounded-full bg-slate-200" />
          <View className="h-3 w-44 rounded-full bg-slate-200" />
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
  const itemsPerPage = 5;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
  const visibleItems = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return items.slice(start, start + itemsPerPage);
  }, [items, page]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setPage(1);
  }, [title]);

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
        <>
          <View className="gap-2.5">
            {visibleItems.map((item, index) => {
              const order = (page - 1) * itemsPerPage + index + 1;
          const active = selectedItemId === item.id;
          return (
            <Pressable
              key={item.id}
              className={`rounded-[20px] border px-3 py-3 gap-2 ${active ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-slate-50'}`}
              style={({ pressed }) => (pressed ? { opacity: 0.84, transform: [{ scale: 0.995 }] } : null)}
              disabled={item.estimated_latitude == null || item.estimated_longitude == null}
              onPress={() => onSelectItem?.(item)}
            >
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1 gap-1">
                  <Text className="text-slate-900 text-sm font-bold">
                    #{order} {item.tag_id}
                  </Text>
                  <Text className="text-slate-500 text-[11px]">
                    {formatAbsoluteThai(item.recorded_at)} · {formatRelativeThai(item.recorded_at)}
                  </Text>
                </View>
                <View className={`rounded-full px-2.5 py-1 ${active ? 'bg-sky-200' : 'bg-slate-200'}`}>
                  <Text className={`text-[10px] font-semibold ${active ? 'text-sky-800' : 'text-slate-700'}`}>
                    {item.estimate_source ?? 'unknown'}
                  </Text>
                </View>
              </View>

              <Text className="text-slate-700 text-xs">
                {formatCoord(item.estimated_latitude)}, {formatCoord(item.estimated_longitude)}
              </Text>

              <View className="flex-row items-center justify-between gap-3">
                <Text className="text-slate-500 text-[11px] flex-1">
                  เหตุผล {item.write_reason ?? '-'}
                </Text>
                <Text className={`text-[11px] font-semibold ${item.estimated_latitude != null && item.estimated_longitude != null ? 'text-sky-700' : 'text-slate-400'}`}>
                  {item.estimated_latitude != null && item.estimated_longitude != null ? 'แตะเพื่อดูบนแผนที่' : 'ยังไม่มีพิกัด'}
                </Text>
              </View>
            </Pressable>
          );
            })}
          </View>

          {totalPages > 1 ? (
            <View className="flex-row items-center justify-between gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-3 py-3">
              <Pressable
                className={`rounded-2xl px-3 py-2 ${page <= 1 ? 'bg-slate-200' : 'bg-white border border-slate-300'}`}
                style={({ pressed }) => (pressed && page > 1 ? { opacity: 0.78 } : null)}
                disabled={page <= 1}
                onPress={() => setPage((current) => Math.max(1, current - 1))}
              >
                <Text className={`text-sm font-semibold ${page <= 1 ? 'text-slate-400' : 'text-slate-700'}`}>ก่อนหน้า</Text>
              </Pressable>

              <Text className="text-slate-600 text-sm">
                หน้า {page} / {totalPages}
              </Text>

              <Pressable
                className={`rounded-2xl px-3 py-2 ${page >= totalPages ? 'bg-slate-200' : 'bg-white border border-slate-300'}`}
                style={({ pressed }) => (pressed && page < totalPages ? { opacity: 0.78 } : null)}
                disabled={page >= totalPages}
                onPress={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                <Text className={`text-sm font-semibold ${page >= totalPages ? 'text-slate-400' : 'text-slate-700'}`}>ถัดไป</Text>
              </Pressable>
            </View>
          ) : null}
        </>
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
