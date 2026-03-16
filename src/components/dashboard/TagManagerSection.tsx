import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import type { SeenTag } from '../../types/bluetag';

type TagManagerSectionProps = {
  tags: SeenTag[];
  selectedTagId: string;
  tagNicknames: Record<string, string>;
  onPickTag: (tagId: string) => void;
  onSaveNickname: (tagId: string, nickname: string) => Promise<boolean>;
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
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; body: string } | null>(null);

  useEffect(() => {
    setNicknameDraft(selectedTag ? tagNicknames[selectedTag.tagId] ?? '' : '');
  }, [selectedTag, tagNicknames]);

  async function handleSaveNickname(nextNickname: string) {
    if (!selectedTag || saving) return;

    setSaving(true);
    const trimmedNickname = nextNickname.trim();
    const saved = await onSaveNickname(selectedTag.tagId, trimmedNickname);
    setSaving(false);

    if (saved) {
      setFeedback({
        title: trimmedNickname ? 'บันทึกชื่อเล่นแล้ว' : 'ล้างชื่อเล่นแล้ว',
        body: trimmedNickname
          ? `${selectedTag.tagId} จะใช้ชื่อเล่นว่า "${trimmedNickname}" และเว็บจะอัปเดตตามให้อัตโนมัติ`
          : `${selectedTag.tagId} ถูกล้างชื่อเล่นแล้ว และเว็บจะอัปเดตตามให้อัตโนมัติ`,
      });
      return;
    }

    setFeedback({
      title: 'บันทึกไม่สำเร็จ',
      body: 'ยังส่งชื่อเล่นขึ้นเซิร์ฟเวอร์ไม่ได้ ลองกดอีกครั้งหรือเช็กการเชื่อมต่อ backend',
    });
  }

  return (
    <View className="rounded-[30px] border border-slate-200 bg-white/95 p-5 gap-4">
      <View className="gap-1">
        <Text className="text-slate-950 text-[24px] font-bold">จัดการ BlueTag</Text>
        <Text className="text-slate-600 text-sm">ตั้งชื่อเล่นให้จำง่ายสำหรับ BlueTag ที่เลือกจากรายการด้านบน</Text>
      </View>

      {selectedTag ? (
        <>
          <View className="gap-2">
            <Text className="text-slate-700 text-sm font-semibold">ชื่อเล่นของ {selectedTag.tagId}</Text>
            <TextInput
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base"
              placeholder="เช่น กุญแจบ้าน / กระเป๋า / รถ"
              value={nicknameDraft}
              onChangeText={setNicknameDraft}
            />
            <View className="flex-row flex-wrap gap-2">
              <Pressable
                className="flex-1 min-w-[140px] items-center rounded-2xl bg-slate-950 px-4 py-3"
                style={({ pressed }) => (pressed ? { opacity: 0.82 } : null)}
                onPress={() => {
                  void handleSaveNickname(nicknameDraft);
                }}
              >
                <Text className="font-semibold text-white">{saving ? 'กำลังบันทึก...' : 'บันทึกชื่อเล่น'}</Text>
              </Pressable>
              <Pressable
                className="min-w-[110px] items-center rounded-2xl border border-slate-300 bg-white px-4 py-3"
                style={({ pressed }) => (pressed ? { opacity: 0.76 } : null)}
                onPress={() => {
                  setNicknameDraft('');
                  void handleSaveNickname('');
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

      <Modal transparent visible={Boolean(feedback)} animationType="fade">
        <View className="flex-1 items-center justify-center bg-slate-950/45 px-6">
          <View className="w-full max-w-[360px] rounded-[28px] border border-slate-200 bg-white px-5 py-5 gap-4">
            <View className="gap-1">
              <Text className="text-slate-950 text-xl font-bold">{feedback?.title}</Text>
              <Text className="text-slate-600 text-sm">{feedback?.body}</Text>
            </View>
            <Pressable
              className="items-center rounded-2xl bg-slate-950 px-4 py-3"
              style={({ pressed }) => (pressed ? { opacity: 0.82 } : null)}
              onPress={() => setFeedback(null)}
            >
              <Text className="font-semibold text-white">ตกลง</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
