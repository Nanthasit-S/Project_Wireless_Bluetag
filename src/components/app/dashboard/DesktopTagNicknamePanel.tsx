import { BlurView } from 'expo-blur';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { TagOptionViewModel } from '../../../types/appViewModels';

interface DesktopTagNicknamePanelProps {
  tags: TagOptionViewModel[];
  selectedTagId: string;
  onPickTag: (tagId: string) => void;
  onSaveNickname: (tagId: string, nickname: string) => void;
}

function formatLastSeen(value: string) {
  if (!value || value === '-') return 'ยังไม่มีเวลาอัปเดต';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DesktopTagNicknamePanel({
  tags,
  selectedTagId,
  onPickTag,
  onSaveNickname,
}: DesktopTagNicknamePanelProps) {
  const selectedTag = tags.find((tag) => tag.tagId === selectedTagId) ?? tags[0] ?? null;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [nicknameOpen, setNicknameOpen] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState('');

  const modalProgress = useRef(new Animated.Value(0)).current;
  const nicknameProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setNicknameDraft(selectedTag?.name ?? '');
  }, [selectedTag]);

  useEffect(() => {
    if (!selectedTag) {
      setPickerOpen(false);
      setNicknameOpen(false);
    }
  }, [selectedTag]);

  useEffect(() => {
    Animated.timing(modalProgress, {
      toValue: pickerOpen ? 1 : 0,
      duration: pickerOpen ? 220 : 170,
      easing: pickerOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [modalProgress, pickerOpen]);

  useEffect(() => {
    Animated.timing(nicknameProgress, {
      toValue: nicknameOpen ? 1 : 0,
      duration: nicknameOpen ? 220 : 160,
      easing: nicknameOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [nicknameOpen, nicknameProgress]);

  if (!selectedTag) {
    return (
      <View className="rounded-[28px] border border-slate-200 bg-white/95 p-5 gap-4">
        <View className="gap-1">
          <Text className="text-[22px] font-bold text-slate-950" style={styles.heading}>
            ไม่พบ BlueTag ที่เชื่อมต่อ
          </Text>
          <Text className="text-sm text-slate-600" style={styles.body}>
            ตอนนี้ยังไม่มีแท็กที่ผูกกับบัญชีนี้ พอมีการเชื่อมต่อเมื่อไร รายการแท็กจะขึ้นตรงนี้เอง
          </Text>
        </View>

        <View className="rounded-[24px] border border-sky-200 bg-sky-50/80 p-4 gap-3">
          <View className="gap-1">
            <Text className="text-xs font-semibold uppercase tracking-[1px] text-sky-700" style={styles.label}>
              สถานะตอนนี้
            </Text>
            <Text className="text-lg text-slate-950" style={styles.heading}>
              ยังไม่มีแท็กให้เลือก
            </Text>
            <Text className="text-sm text-slate-600" style={styles.body}>
              ถ้าเชื่อม BlueTag กับบัญชีนี้แล้ว ส่วนเลือกแท็กและตั้งชื่อเล่นจะพร้อมใช้งานทันที
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <>
      <View className="rounded-[28px] border border-slate-200 bg-white/95 p-5 gap-4">
        <View className="gap-1">
          <Text className="text-[22px] font-bold text-slate-950" style={styles.heading}>
            เลือก BlueTag
          </Text>
          <Text className="text-sm text-slate-600" style={styles.body}>
            เลือกแท็กที่อยากดูจากตรงนี้ แล้วค่อยเปิดส่วนชื่อเล่นเมื่อต้องการแก้ไข
          </Text>
        </View>

        <Animated.View
          style={[
            styles.selectionCard,
            {
              transform: [
                {
                  scale: modalProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0.992],
                  }),
                },
              ],
            },
          ]}
        >
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1 gap-1">
              <Text className="text-xs font-semibold uppercase tracking-[1px] text-emerald-700" style={styles.label}>
                แท็กที่เลือกอยู่
              </Text>
              <Text className="text-[22px] font-bold text-slate-950" style={styles.heading}>
                {selectedTag.name}
              </Text>
              <Text className="text-sm text-slate-500" style={styles.body}>
                {selectedTag.tagId}
              </Text>
            </View>

            <Pressable
              className={`rounded-full px-4 py-2 ${pickerOpen ? 'bg-emerald-700' : 'bg-white'}`}
              style={({ pressed }) => (pressed ? { opacity: 0.84, transform: [{ scale: 0.98 }] } : null)}
              onPress={() => setPickerOpen(true)}
            >
              <Text className={`text-sm font-semibold ${pickerOpen ? 'text-white' : 'text-emerald-800'}`} style={styles.buttonText}>
                เลือกแท็ก
              </Text>
            </Pressable>
          </View>

          <View className="flex-row gap-2">
            <View className="flex-1 rounded-[18px] bg-white/85 px-3 py-3">
              <Text className="text-[11px] font-semibold text-slate-500" style={styles.label}>
                สัญญาณ
              </Text>
              <Text className="text-sm font-bold text-slate-900" style={styles.value}>
                RSSI {selectedTag.rssi}
              </Text>
            </View>

            <View className="flex-1 rounded-[18px] bg-white/85 px-3 py-3">
              <Text className="text-[11px] font-semibold text-slate-500" style={styles.label}>
                อัปเดตล่าสุด
              </Text>
              <Text className="text-sm font-bold text-slate-900" style={styles.value}>
                {formatLastSeen(selectedTag.lastSeen)}
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.nicknameCard,
            {
              borderColor: nicknameProgress.interpolate({
                inputRange: [0, 1],
                outputRange: ['rgba(196,181,253,0.8)', 'rgba(109,40,217,0.28)'],
              }) as unknown as string,
            },
          ]}
        >
          <Pressable
            className="flex-row items-center justify-between gap-3"
            style={({ pressed }) => (pressed ? { opacity: 0.86, transform: [{ scale: 0.992 }] } : null)}
            onPress={() => setNicknameOpen((current) => !current)}
          >
            <View className="flex-1 gap-1">
              <Text className="text-sm font-bold text-violet-950" style={styles.value}>
                เปลี่ยนชื่อเล่น
              </Text>
              <Text className="text-xs text-violet-700" style={styles.caption}>
                ตอนนี้ใช้ชื่อว่า {selectedTag.name}
              </Text>
            </View>

            <Animated.View
              style={[
                styles.nicknameToggleChip,
                {
                  backgroundColor: nicknameProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['#ffffff', '#6d28d9'],
                  }) as unknown as string,
                  transform: [
                    {
                      scale: nicknameProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.02],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Animated.Text
                style={[
                  styles.nicknameToggleText,
                  {
                    color: nicknameProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['#5b21b6', '#ffffff'],
                    }) as unknown as string,
                  },
                ]}
              >
                {nicknameOpen ? 'ซ่อน' : 'เปิด'}
              </Animated.Text>
            </Animated.View>
          </Pressable>

          <Animated.View
            style={{
              opacity: nicknameProgress,
              maxHeight: nicknameProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 220],
              }),
              transform: [
                {
                  translateY: nicknameProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-8, 0],
                  }),
                },
              ],
              overflow: 'hidden',
            }}
            pointerEvents={nicknameOpen ? 'auto' : 'none'}
          >
            <View className="gap-3 pt-3">
              <TextInput
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base"
                style={styles.input}
                placeholder="เช่น กุญแจบ้าน / กระเป๋า / รถ"
                placeholderTextColor="#94a3b8"
                value={nicknameDraft}
                onChangeText={setNicknameDraft}
              />

              <View className="flex-row gap-2">
                <Pressable
                  className="flex-1 items-center rounded-2xl bg-violet-700 px-4 py-3"
                  style={({ pressed }) => (pressed ? { opacity: 0.82, transform: [{ scale: 0.992 }] } : null)}
                  onPress={() => onSaveNickname(selectedTag.tagId, nicknameDraft.trim())}
                >
                  <Text className="font-semibold text-white" style={styles.buttonText}>
                    บันทึกชื่อเล่น
                  </Text>
                </Pressable>

                <Pressable
                  className="items-center rounded-2xl border border-slate-300 bg-white px-4 py-3"
                  style={({ pressed }) => (pressed ? { opacity: 0.76, transform: [{ scale: 0.992 }] } : null)}
                  onPress={() => {
                    setNicknameDraft('');
                    onSaveNickname(selectedTag.tagId, '');
                  }}
                >
                  <Text className="font-semibold text-slate-700" style={styles.buttonText}>
                    ล้างชื่อ
                  </Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </View>

      <Modal transparent visible={pickerOpen} animationType="none" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalRoot}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.modalBackdropLayer,
              {
                opacity: modalProgress,
              },
            ]}
          >
            <BlurView intensity={16} tint="light" style={styles.modalBlur} />
            <View style={styles.modalShade} />
          </Animated.View>
          <Pressable style={styles.modalCloseLayer} onPress={() => setPickerOpen(false)} />

          <View style={styles.modalCenter}>
            <Animated.View
              style={[
                styles.modalCard,
                {
                  opacity: modalProgress,
                  transform: [
                    {
                      translateY: modalProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [18, 0],
                      }),
                    },
                    {
                      scale: modalProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.96, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderMeta}>
                  <Text style={styles.modalTitle}>เลือก BlueTag</Text>
                  <Text style={styles.modalCopy}>เลือกแท็กที่อยากดู แล้วแผนที่จะโฟกัสตามให้เอง</Text>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.modalCloseButton, pressed ? styles.modalCloseButtonPressed : null]}
                  onPress={() => setPickerOpen(false)}
                >
                  <Text style={styles.modalCloseText}>ปิด</Text>
                </Pressable>
              </View>

              <View style={styles.modalList}>
                {tags.map((tag) => {
                  const active = tag.tagId === selectedTag.tagId;
                  return (
                    <Pressable
                      key={tag.tagId}
                      style={({ pressed }) => [
                        styles.modalItem,
                        active ? styles.modalItemActive : null,
                        pressed ? styles.modalItemPressed : null,
                      ]}
                      onPress={() => {
                        setPickerOpen(false);
                        onPickTag(tag.tagId);
                      }}
                    >
                      <View style={styles.modalItemTopRow}>
                        <View style={styles.modalItemMeta}>
                          <Text style={[styles.modalItemName, active ? styles.modalItemNameActive : null]}>{tag.name}</Text>
                          <Text style={styles.modalItemId}>{tag.tagId}</Text>
                        </View>
                        <View style={[styles.modalItemBadge, active ? styles.modalItemBadgeActive : null]}>
                          <Text style={[styles.modalItemBadgeText, active ? styles.modalItemBadgeTextActive : null]}>RSSI {tag.rssi}</Text>
                        </View>
                      </View>
                      <Text style={styles.modalItemTime}>{formatLastSeen(tag.lastSeen)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontFamily: 'Sarabun_700Bold',
  },
  body: {
    fontFamily: 'Sarabun_400Regular',
  },
  label: {
    fontFamily: 'Sarabun_600SemiBold',
  },
  value: {
    fontFamily: 'Sarabun_700Bold',
  },
  caption: {
    fontFamily: 'Sarabun_400Regular',
  },
  input: {
    fontFamily: 'Sarabun_400Regular',
  },
  buttonText: {
    fontFamily: 'Sarabun_600SemiBold',
  },
  selectionCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.42)',
    backgroundColor: 'rgba(236, 253, 245, 0.8)',
    padding: 16,
    gap: 12,
  },
  nicknameCard: {
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: 'rgba(245, 243, 255, 0.8)',
    padding: 16,
    gap: 0,
  },
  nicknameToggleChip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  nicknameToggleText: {
    fontSize: 14,
    fontFamily: 'Sarabun_600SemiBold',
  },
  modalRoot: {
    flex: 1,
  },
  modalBackdropLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  modalBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  modalShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(248, 250, 252, 0.16)',
  },
  modalCloseLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.24)',
    backgroundColor: 'rgba(255,255,255,0.96)',
    padding: 16,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalHeaderMeta: {
    flex: 1,
    gap: 4,
  },
  modalTitle: {
    color: '#0f172a',
    fontSize: 24,
    lineHeight: 30,
    fontFamily: 'Sarabun_700Bold',
  },
  modalCopy: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Sarabun_400Regular',
  },
  modalCloseButton: {
    borderRadius: 999,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  modalCloseButtonPressed: {
    backgroundColor: '#e2e8f0',
    transform: [{ scale: 0.98 }],
  },
  modalCloseText: {
    color: '#334155',
    fontSize: 13,
    fontFamily: 'Sarabun_700Bold',
  },
  modalList: {
    gap: 10,
  },
  modalItem: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  modalItemActive: {
    borderColor: '#34d399',
    backgroundColor: '#ecfdf5',
  },
  modalItemPressed: {
    backgroundColor: '#f8fafc',
    transform: [{ scale: 0.992 }],
  },
  modalItemTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalItemMeta: {
    flex: 1,
    gap: 2,
  },
  modalItemName: {
    color: '#0f172a',
    fontSize: 16,
    fontFamily: 'Sarabun_700Bold',
  },
  modalItemNameActive: {
    color: '#065f46',
  },
  modalItemId: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: 'Sarabun_400Regular',
  },
  modalItemBadge: {
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  modalItemBadgeActive: {
    backgroundColor: '#10b981',
  },
  modalItemBadgeText: {
    color: '#475569',
    fontSize: 11,
    fontFamily: 'Sarabun_700Bold',
  },
  modalItemBadgeTextActive: {
    color: '#ffffff',
  },
  modalItemTime: {
    color: '#475569',
    fontSize: 12,
    fontFamily: 'Sarabun_400Regular',
  },
});
