import { BlurView } from 'expo-blur';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { DesktopDashboardActions, DesktopDashboardViewModel } from '../../../types/appViewModels';

interface RoleManagementPanelProps {
  viewModel: DesktopDashboardViewModel;
  actions: DesktopDashboardActions;
}

type RoleTab = 'overview' | 'users';
type UserRole = 'user' | 'admin';

const PAGE_SIZE = 5;
const DROPDOWN_WIDTH = 240;

const textStyles = StyleSheet.create({
  eyebrow: { fontFamily: 'Sarabun_700Bold' },
  heading: { fontFamily: 'Sarabun_700Bold' },
  body: { fontFamily: 'Sarabun_400Regular' },
  semibold: { fontFamily: 'Sarabun_600SemiBold' },
  bold: { fontFamily: 'Sarabun_700Bold' },
  confirmCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderColor: 'rgba(203, 213, 225, 0.95)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.18,
    shadowRadius: 34,
    elevation: 12,
    overflow: 'hidden',
  },
  confirmBackdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
  },
  confirmBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#eff6ff',
  },
  confirmMetaCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 20,
  },
  confirmGhostButton: {
    backgroundColor: '#e2e8f0',
    borderRadius: 18,
  },
  confirmPrimaryButton: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
  },
  confirmDangerButton: {
    backgroundColor: '#dc2626',
    borderRadius: 18,
  },
  confirmBody: {
    gap: 6,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmMetaWrap: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  confirmActionButton: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownOption: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  dropdownOptionHover: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
  },
  dropdownOptionActive: {
    borderColor: '#94a3b8',
    backgroundColor: '#ffffff',
  },
});

export function RoleManagementPanel({ viewModel, actions }: RoleManagementPanelProps) {
  const [activeTab, setActiveTab] = useState<RoleTab>('users');
  const [currentPage, setCurrentPage] = useState(1);
  const [updatingUserId, setUpdatingUserId] = useState('');
  const [openDropdownUserId, setOpenDropdownUserId] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 96, left: 24 });
  const [confirmingChange, setConfirmingChange] = useState<{ userId: string; role: UserRole } | null>(null);
  const [deletingUserId, setDeletingUserId] = useState('');
  const [hoveredRoleKey, setHoveredRoleKey] = useState('');
  const dropdownProgress = useRef(new Animated.Value(0)).current;
  const confirmProgress = useRef(new Animated.Value(0)).current;
  const triggerRefs = useRef<Record<string, View | null>>({});
  const { width: screenWidth } = useWindowDimensions();

  const totalUsers = viewModel.adminUsers.length;
  const adminCount = useMemo(() => viewModel.adminUsers.filter((user) => user.role === 'admin').length, [viewModel.adminUsers]);
  const userCount = totalUsers - adminCount;
  const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));

  const pagedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return viewModel.adminUsers.slice(start, start + PAGE_SIZE);
  }, [currentPage, viewModel.adminUsers]);

  const pageNumbers = useMemo(() => Array.from({ length: totalPages }, (_, index) => index + 1), [totalPages]);
  const activeDropdownUser = useMemo(
    () => viewModel.adminUsers.find((user) => user.id === openDropdownUserId) ?? null,
    [openDropdownUserId, viewModel.adminUsers],
  );
  const confirmUser = useMemo(
    () => viewModel.adminUsers.find((user) => user.id === confirmingChange?.userId) ?? null,
    [confirmingChange?.userId, viewModel.adminUsers],
  );
  const deleteUser = useMemo(() => viewModel.adminUsers.find((user) => user.id === deletingUserId) ?? null, [deletingUserId, viewModel.adminUsers]);

  const closeDropdown = () => {
    setOpenDropdownUserId('');
    setHoveredRoleKey('');
  };

  const closeConfirm = () => setConfirmingChange(null);
  const closeDeleteConfirm = () => setDeletingUserId('');

  const openDropdown = (userId: string) => {
    const trigger = triggerRefs.current[userId];
    if (!trigger) {
      setOpenDropdownUserId(userId);
      return;
    }

    trigger.measureInWindow((x, y, width, height) => {
      const nextLeft = Math.min(Math.max(12, x + width - DROPDOWN_WIDTH), Math.max(12, screenWidth - DROPDOWN_WIDTH - 12));
      setDropdownPosition({
        top: y + height + 8,
        left: nextLeft,
      });
      setOpenDropdownUserId(userId);
    });
  };

  const handleChangePage = (page: number) => {
    setCurrentPage(page);
    closeDropdown();
  };

  const handleChangeTab = (tab: RoleTab) => {
    setActiveTab(tab);
    closeDropdown();
    closeConfirm();
    closeDeleteConfirm();
    if (tab === 'users') {
      setCurrentPage(1);
    }
  };

  const requestRoleChange = (userId: string, role: UserRole) => {
    setConfirmingChange({ userId, role });
    closeDropdown();
  };

  const requestDeleteUser = (userId: string) => {
    setDeletingUserId(userId);
    closeDropdown();
  };

  const handleUpdateRole = async () => {
    if (!confirmingChange || updatingUserId) return;
    setUpdatingUserId(confirmingChange.userId);
    try {
      await actions.onAdminUserRoleUpdate(confirmingChange.userId, confirmingChange.role);
    } finally {
      setUpdatingUserId('');
      closeConfirm();
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUserId || updatingUserId) return;
    setUpdatingUserId(deletingUserId);
    try {
      await actions.onAdminDeleteUser(deletingUserId);
    } finally {
      setUpdatingUserId('');
      closeDeleteConfirm();
    }
  };

  useEffect(() => {
    Animated.timing(dropdownProgress, {
      toValue: openDropdownUserId ? 1 : 0,
      duration: openDropdownUserId ? 180 : 140,
      easing: openDropdownUserId ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [dropdownProgress, openDropdownUserId]);

  useEffect(() => {
    Animated.timing(confirmProgress, {
      toValue: confirmingChange || deletingUserId ? 1 : 0,
      duration: confirmingChange || deletingUserId ? 200 : 140,
      easing: confirmingChange || deletingUserId ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [confirmProgress, confirmingChange, deletingUserId]);

  return (
    <View className="gap-4">
      <View className="rounded-[30px] border border-slate-200 bg-white/95 p-5 gap-3">
        <Text style={textStyles.eyebrow} className="text-slate-500 text-xs font-semibold uppercase tracking-[1px]">
          Role management
        </Text>
        <Text style={textStyles.heading} className="text-slate-950 text-[28px] font-bold">
          จัดการสิทธิ์ผู้ใช้
        </Text>
        <Text style={textStyles.body} className="text-slate-600 text-sm leading-6">
          แอดมินสามารถดูภาพรวมบัญชีทั้งหมด แล้วกำหนดสิทธิ์ของแต่ละคนจากหน้านี้ได้เลย
        </Text>
      </View>

      <View className="rounded-[28px] border border-slate-200 bg-white/95 p-5 gap-4">
        <View className="flex-row flex-wrap gap-2">
          <Pressable
            className={`rounded-full px-4 py-2 ${activeTab === 'overview' ? 'bg-slate-950' : 'bg-slate-100'}`}
            style={({ pressed }) => (pressed ? { opacity: 0.82 } : null)}
            onPress={() => handleChangeTab('overview')}
          >
            <Text style={activeTab === 'overview' ? textStyles.bold : textStyles.semibold} className={`text-sm ${activeTab === 'overview' ? 'text-white' : 'text-slate-900'}`}>
              ภาพรวม
            </Text>
          </Pressable>

          <Pressable
            className={`rounded-full px-4 py-2 ${activeTab === 'users' ? 'bg-slate-950' : 'bg-slate-100'}`}
            style={({ pressed }) => (pressed ? { opacity: 0.82 } : null)}
            onPress={() => handleChangeTab('users')}
          >
            <Text style={activeTab === 'users' ? textStyles.bold : textStyles.semibold} className={`text-sm ${activeTab === 'users' ? 'text-white' : 'text-slate-900'}`}>
              รายชื่อผู้ใช้
            </Text>
          </Pressable>

          <Pressable className="ml-auto rounded-full bg-slate-100 px-4 py-2" style={({ pressed }) => (pressed ? { opacity: 0.82 } : null)} onPress={actions.onReloadAdminData}>
            <Text style={textStyles.semibold} className="text-sm text-slate-900">
              รีโหลด
            </Text>
          </Pressable>
        </View>

        {activeTab === 'overview' ? (
          <View className="flex-row flex-wrap gap-3">
            <View className="min-w-[180px] flex-1 rounded-[24px] bg-slate-100 px-4 py-4 gap-1">
              <Text style={textStyles.eyebrow} className="text-xs uppercase tracking-[1px] text-slate-500">
                ผู้ใช้ทั้งหมด
              </Text>
              <Text style={textStyles.heading} className="text-[28px] text-slate-950">
                {totalUsers}
              </Text>
            </View>

            <View className="min-w-[180px] flex-1 rounded-[24px] bg-emerald-50 px-4 py-4 gap-1">
              <Text style={textStyles.eyebrow} className="text-xs uppercase tracking-[1px] text-emerald-700">
                Admin
              </Text>
              <Text style={textStyles.heading} className="text-[28px] text-emerald-950">
                {adminCount}
              </Text>
            </View>

            <View className="min-w-[180px] flex-1 rounded-[24px] bg-sky-50 px-4 py-4 gap-1">
              <Text style={textStyles.eyebrow} className="text-xs uppercase tracking-[1px] text-sky-700">
                User
              </Text>
              <Text style={textStyles.heading} className="text-[28px] text-sky-950">
                {userCount}
              </Text>
            </View>
          </View>
        ) : null}

        {activeTab === 'users' ? (
          <View className="gap-4">
            {pagedUsers.map((user) => {
              const isUpdatingThisUser = updatingUserId === user.id;

              return (
                <View key={user.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 gap-3">
                  <View className="flex-row flex-wrap items-start justify-between gap-3">
                    <View className="gap-1">
                      <Text style={textStyles.bold} className="text-base text-slate-950">
                        {user.name}
                      </Text>
                      <Text style={textStyles.body} className="text-sm text-slate-600">
                        {user.email}
                      </Text>
                    </View>

                    <View className={`rounded-full px-3 py-2 ${user.role === 'admin' ? 'bg-emerald-100' : 'bg-slate-200'}`}>
                      <Text style={textStyles.bold} className={`text-xs uppercase tracking-[1px] ${user.role === 'admin' ? 'text-emerald-900' : 'text-slate-700'}`}>
                        role: {user.role}
                      </Text>
                    </View>
                  </View>

                  <View className="gap-2">
                    <Text style={textStyles.eyebrow} className="text-xs uppercase tracking-[1px] text-slate-500">
                      กำหนดสิทธิ์
                    </Text>
                    <View className="flex-row flex-wrap items-center gap-2">
                      <View ref={(node) => { triggerRefs.current[user.id] = node; }} className="self-start">
                        <Pressable
                          className="min-w-[170px] flex-row items-center justify-between rounded-full border border-slate-200 bg-white px-4 py-2.5"
                          style={({ pressed }) => (pressed ? { opacity: 0.82 } : null)}
                          disabled={Boolean(updatingUserId)}
                          onPress={() => openDropdown(user.id)}
                        >
                          <Text style={textStyles.semibold} className="text-sm text-slate-900">
                            {isUpdatingThisUser ? 'กำลังอัปเดต...' : user.role}
                          </Text>
                          <Text style={textStyles.bold} className="text-sm text-slate-600">
                            ▾
                          </Text>
                        </Pressable>
                      </View>

                      <Pressable
                        className="rounded-full border border-rose-200 bg-white px-4 py-2.5"
                        style={({ pressed }) => (pressed ? { opacity: 0.82 } : null)}
                        disabled={Boolean(updatingUserId)}
                        onPress={() => requestDeleteUser(user.id)}
                      >
                        <Text style={textStyles.semibold} className="text-sm text-rose-600">
                          ลบผู้ใช้
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  <View className="rounded-2xl bg-white px-3 py-3">
                    <Text style={textStyles.body} className="text-sm text-slate-600">
                      แอดมินสามารถกำหนดสิทธิ์ของผู้ใช้คนนี้ได้จาก dropdown ด้านบน โดยระบบจะกันไม่ให้ลบ admin คนสุดท้ายออก
                    </Text>
                  </View>
                </View>
              );
            })}

            <View className="flex-row flex-wrap items-center gap-2">
              <Text style={textStyles.semibold} className="mr-2 text-sm text-slate-600">
                หน้า
              </Text>
              {pageNumbers.map((page) => (
                <Pressable
                  key={page}
                  className={`rounded-full px-4 py-2 ${page === currentPage ? 'bg-slate-950' : 'bg-slate-100'}`}
                  style={({ pressed }) => (pressed ? { opacity: 0.82 } : null)}
                  onPress={() => handleChangePage(page)}
                >
                  <Text style={page === currentPage ? textStyles.bold : textStyles.semibold} className={`text-sm ${page === currentPage ? 'text-white' : 'text-slate-900'}`}>
                    {page}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      <Modal transparent visible={Boolean(activeDropdownUser)} animationType="fade" onRequestClose={closeDropdown}>
        <View className="flex-1">
          <BlurView intensity={18} tint="light" style={StyleSheet.absoluteFillObject} />
          <View className="absolute inset-0 bg-slate-50/20" />
          <Pressable className="absolute inset-0" onPress={closeDropdown} />

          {activeDropdownUser ? (
            <Animated.View
              style={{
                position: 'absolute',
                width: DROPDOWN_WIDTH,
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                opacity: dropdownProgress,
                transform: [
                  {
                    translateY: dropdownProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-8, 0],
                    }),
                  },
                  {
                    scale: dropdownProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.98, 1],
                    }),
                  },
                ],
              }}
            >
              <View className="rounded-[24px] border border-slate-200 bg-white p-3 gap-2 shadow-lg">
                <View className="rounded-[18px] bg-slate-50 px-4 py-3 gap-1">
                  <Text style={textStyles.bold} className="text-sm text-slate-950">
                    {activeDropdownUser.name}
                  </Text>
                  <Text style={textStyles.body} className="text-xs text-slate-500">
                    เลือกสิทธิ์ที่ต้องการให้บัญชีนี้
                  </Text>
                </View>

                {(['user', 'admin'] as UserRole[]).map((role) => {
                  const active = activeDropdownUser.role === role;
                  const hovered = hoveredRoleKey === `${activeDropdownUser.id}-${role}`;

                  return (
                    <Pressable
                      key={role}
                      style={({ pressed }) => [
                        textStyles.dropdownOption,
                        active ? textStyles.dropdownOptionActive : null,
                        hovered ? textStyles.dropdownOptionHover : null,
                        hovered && !active ? { transform: [{ scale: 1.01 }] } : null,
                        pressed ? { opacity: 0.82 } : null,
                      ]}
                      onHoverIn={() => setHoveredRoleKey(`${activeDropdownUser.id}-${role}`)}
                      onHoverOut={() => setHoveredRoleKey('')}
                      disabled={Boolean(updatingUserId)}
                      onPress={() => requestRoleChange(activeDropdownUser.id, role)}
                    >
                      <Text style={active ? textStyles.bold : textStyles.semibold} className="text-sm text-slate-900">
                        {role}
                      </Text>
                      <Text style={textStyles.body} className="text-xs text-slate-500">
                        {role === 'admin' ? 'เข้าเมนูแอดมินได้' : 'ใช้งานระบบทั่วไป'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>
          ) : null}
        </View>
      </Modal>

      <Modal transparent visible={Boolean(confirmingChange && confirmUser)} animationType="none" onRequestClose={closeConfirm}>
        <View className="flex-1 items-center justify-center px-5">
          <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFillObject} />
          <Pressable style={[StyleSheet.absoluteFillObject, textStyles.confirmBackdrop]} onPress={closeConfirm} />

          {confirmingChange && confirmUser ? (
            <Animated.View
              style={[
                textStyles.confirmCard,
                {
                  opacity: confirmProgress,
                  transform: [
                    {
                      translateY: confirmProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [16, 0],
                      }),
                    },
                    {
                      scale: confirmProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.97, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={textStyles.confirmBadge}>
                <Text style={textStyles.eyebrow} className="text-xs uppercase tracking-[1px] text-sky-700">
                  ยืนยันก่อนเปลี่ยนสิทธิ์
                </Text>
              </View>
              <View style={textStyles.confirmBody}>
                <Text style={textStyles.heading} className="text-[24px] text-slate-950">
                  เปลี่ยน role ของ {confirmUser.name} ใช่ไหม
                </Text>
                <Text style={textStyles.body} className="text-sm leading-6 text-slate-600">
                  ถ้ากดยืนยัน บัญชีนี้จะถูกเปลี่ยนเป็น <Text style={textStyles.bold}>{confirmingChange.role}</Text> ทันที
                </Text>
              </View>

              <View style={[textStyles.confirmMetaCard, textStyles.confirmMetaWrap]}>
                <Text style={textStyles.semibold} className="text-sm text-slate-900">
                  {confirmUser.email}
                </Text>
                <Text style={textStyles.body} className="text-xs text-slate-500">
                  role ตอนนี้: {confirmUser.role}
                </Text>
              </View>

              <View style={textStyles.confirmActions}>
                <Pressable
                  style={({ pressed }) => [textStyles.confirmGhostButton, textStyles.confirmActionButton, pressed ? { opacity: 0.82 } : null]}
                  onPress={closeConfirm}
                >
                  <Text style={textStyles.semibold} className="text-sm text-slate-700">
                    ยกเลิก
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [textStyles.confirmPrimaryButton, textStyles.confirmActionButton, pressed ? { opacity: 0.82 } : null]}
                  onPress={() => void handleUpdateRole()}
                >
                  <Text style={textStyles.bold} className="text-sm text-white">
                    ยืนยัน
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          ) : null}
        </View>
      </Modal>

      <Modal transparent visible={Boolean(deletingUserId && deleteUser)} animationType="none" onRequestClose={closeDeleteConfirm}>
        <View className="flex-1 items-center justify-center px-5">
          <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFillObject} />
          <Pressable style={[StyleSheet.absoluteFillObject, textStyles.confirmBackdrop]} onPress={closeDeleteConfirm} />

          {deleteUser ? (
            <Animated.View
              style={[
                textStyles.confirmCard,
                {
                  opacity: confirmProgress,
                  transform: [
                    {
                      translateY: confirmProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [16, 0],
                      }),
                    },
                    {
                      scale: confirmProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.97, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={textStyles.confirmBadge}>
                <Text style={textStyles.eyebrow} className="text-xs uppercase tracking-[1px] text-rose-700">
                  ยืนยันก่อนลบผู้ใช้
                </Text>
              </View>
              <View style={textStyles.confirmBody}>
                <Text style={textStyles.heading} className="text-[24px] text-slate-950">
                  ลบผู้ใช้ {deleteUser.name} ใช่ไหม
                </Text>
                <Text style={textStyles.body} className="text-sm leading-6 text-slate-600">
                  ถ้ากดยืนยัน บัญชีนี้รวมถึงรหัสเชื่อมต่อและการผูกแท็กของเขาจะถูกลบออกจากระบบทันที
                </Text>
              </View>

              <View style={[textStyles.confirmMetaCard, textStyles.confirmMetaWrap]}>
                <Text style={textStyles.semibold} className="text-sm text-slate-900">
                  {deleteUser.email}
                </Text>
                <Text style={textStyles.body} className="text-xs text-slate-500">
                  role ตอนนี้: {deleteUser.role}
                </Text>
              </View>

              <View style={textStyles.confirmActions}>
                <Pressable
                  style={({ pressed }) => [textStyles.confirmGhostButton, textStyles.confirmActionButton, pressed ? { opacity: 0.82 } : null]}
                  onPress={closeDeleteConfirm}
                >
                  <Text style={textStyles.semibold} className="text-sm text-slate-700">
                    ยกเลิก
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [textStyles.confirmDangerButton, textStyles.confirmActionButton, pressed ? { opacity: 0.82 } : null]}
                  onPress={() => void handleDeleteUser()}
                >
                  <Text style={textStyles.bold} className="text-sm text-white">
                    ลบผู้ใช้
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
