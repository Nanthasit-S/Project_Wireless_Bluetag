import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { SeenTag } from '../../types/bluetag';

type TagManagerSectionProps = {
  tags: SeenTag[];
  selectedTagId: string;
  tagNicknames: Record<string, string>;
  onPickTag: (tagId: string) => void;
  onSaveNickname: (tagId: string, nickname: string) => void;
};

export function TagManagerSection({
  tags,
  selectedTagId,
  tagNicknames,
  onPickTag,
  onSaveNickname,
}: TagManagerSectionProps) {
  const selectedTag = tags.find((tag) => tag.tagId === selectedTagId) ?? tags[0] ?? null;
  const [nicknameDraft, setNicknameDraft] = useState('');

  useEffect(() => {
    setNicknameDraft(selectedTag ? tagNicknames[selectedTag.tagId] ?? '' : '');
  }, [selectedTag, tagNicknames]);

  return (
    <View className="rounded-[30px] border border-slate-200 bg-white/95 p-5 gap-4">
      <View className="gap-1">
        <Text className="text-slate-950 text-[24px] font-bold">จัดการ BlueTag</Text>
        <Text className="text-slate-600 text-sm">ตั้งชื่อเล่นให้จำง่าย แล้วดูข้อมูลของแท็กที่เลือกได้จากตรงนี้</Text>
      </View>

      {selectedTag ? (
        <>
          <View className="rounded-[24px] bg-slate-50 border border-slate-200 px-4 py-4 gap-2">
            <Text className="text-slate-500 text-xs font-semibold">แท็กที่เลือกอยู่</Text>
            <Text className="text-slate-950 text-lg font-bold">{selectedTag.name}</Text>
            <Text className="text-slate-500 text-sm">{selectedTag.tagId}</Text>
            <Text className="text-slate-600 text-sm">
              RSSI {selectedTag.rssi} · แบต {selectedTag.battery ?? '-'} · เจอล่าสุด {selectedTag.lastSeen}
            </Text>
          </View>

          <View className="gap-2">
            <Text className="text-slate-700 text-sm font-semibold">ชื่อเล่น</Text>
            <TextInput
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base"
              placeholder="เช่น กุญแจบ้าน / กระเป๋า / รถ"
              value={nicknameDraft}
              onChangeText={setNicknameDraft}
            />
            <View className="flex-row gap-2">
              <Pressable
                className="flex-1 items-center rounded-2xl bg-slate-950 px-4 py-3"
                style={({ pressed }) => (pressed ? { opacity: 0.82 } : null)}
                onPress={() => onSaveNickname(selectedTag.tagId, nicknameDraft)}
              >
                <Text className="font-semibold text-white">บันทึกชื่อเล่น</Text>
              </Pressable>
              <Pressable
                className="items-center rounded-2xl border border-slate-300 bg-white px-4 py-3"
                style={({ pressed }) => (pressed ? { opacity: 0.76 } : null)}
                onPress={() => {
                  setNicknameDraft('');
                  onSaveNickname(selectedTag.tagId, '');
                }}
              >
                <Text className="font-semibold text-slate-700">ล้างชื่อ</Text>
              </Pressable>
            </View>
          </View>
        </>
      ) : (
        <View className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 gap-2">
          <Text className="text-slate-900 text-base font-bold">ยังไม่มีแท็กให้จัดการ</Text>
          <Text className="text-slate-500 text-sm">ลองสแกนก่อน พอเจอ BlueTag แล้วส่วนนี้จะขึ้นมาให้ตั้งชื่อเล่นได้ทันที</Text>
        </View>
      )}

      {tags.length > 0 ? (
        <View className="gap-2">
          <Text className="text-slate-700 text-sm font-semibold">แท็กที่เจอ</Text>
          {tags.map((tag) => {
            const active = selectedTag?.tagId === tag.tagId;
            return (
              <Pressable
                key={tag.tagId}
                className={`rounded-2xl border px-4 py-3 ${active ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-slate-50'}`}
                style={({ pressed }) => (pressed ? { opacity: 0.8 } : null)}
                onPress={() => onPickTag(tag.tagId)}
              >
                <Text className="text-slate-900 text-sm font-bold">{tag.name}</Text>
                <Text className="text-slate-500 text-xs">{tag.tagId}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
