import type { ComponentProps } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import type { DesktopDashboardActions, DesktopDashboardViewModel } from '../../../types/appViewModels';
import { UsbSerialTestSection } from '../../dashboard/UsbSerialTestSection';
import { RoleManagementPanel } from './RoleManagementPanel';

interface AdminToolsPanelProps {
  viewModel: DesktopDashboardViewModel;
  actions: DesktopDashboardActions;
}

type AdminTab = 'board' | 'roles' | 'mismatch' | 'audit';
type AdminTextVariant = 'body' | 'semibold' | 'bold' | 'eyebrow' | 'heading';

const MISMATCH_PAGE_SIZE = 4;
const AUDIT_PAGE_SIZE = 5;

const adminTabs: Array<{ key: AdminTab; label: string; hint: string }> = [
  { key: 'board', label: 'บอร์ด', hint: 'USB, bind, reset' },
  { key: 'roles', label: 'สิทธิ์ผู้ใช้', hint: 'ดูและปรับ role' },
  { key: 'mismatch', label: 'สถานะไม่ตรง', hint: 'เช็ก board กับ backend' },
  { key: 'audit', label: 'กิจกรรม', hint: 'ดูย้อนหลังการใช้งาน' },
];

const textStyles = StyleSheet.create({
  body: { fontFamily: 'Sarabun_400Regular' },
  semibold: { fontFamily: 'Sarabun_600SemiBold' },
  bold: { fontFamily: 'Sarabun_700Bold' },
  eyebrow: { fontFamily: 'Sarabun_700Bold' },
  heading: { fontFamily: 'Sarabun_700Bold' },
});

function AdminText({
  variant = 'body',
  style,
  ...props
}: ComponentProps<typeof Text> & { variant?: AdminTextVariant }) {
  return <Text {...props} style={[textStyles[variant], style]} />;
}

function Pagination({
  currentPage,
  totalPages,
  onChange,
}: {
  currentPage: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <View className="flex-row flex-wrap items-center gap-2">
      <AdminText variant="semibold" className="mr-2 text-sm text-slate-600">
        หน้า
      </AdminText>
      {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
        <Pressable
          key={page}
          className={`rounded-full px-4 py-2 ${page === currentPage ? 'bg-slate-950' : 'bg-slate-100'}`}
          style={({ pressed }) => (pressed ? { opacity: 0.82 } : null)}
          onPress={() => onChange(page)}
        >
          <AdminText variant="semibold" className={`text-sm ${page === currentPage ? 'text-white' : 'text-slate-900'}`}>
            {page}
          </AdminText>
        </Pressable>
      ))}
    </View>
  );
}

export function AdminToolsPanel({ viewModel, actions }: AdminToolsPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('board');
  const [mismatchPage, setMismatchPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const transition = useRef(new Animated.Value(1)).current;

  const mismatchTotalPages = Math.max(1, Math.ceil(viewModel.adminBindingMismatches.length / MISMATCH_PAGE_SIZE));
  const auditTotalPages = Math.max(1, Math.ceil(viewModel.adminAuditLogs.length / AUDIT_PAGE_SIZE));

  const pagedMismatches = useMemo(() => {
    const start = (mismatchPage - 1) * MISMATCH_PAGE_SIZE;
    return viewModel.adminBindingMismatches.slice(start, start + MISMATCH_PAGE_SIZE);
  }, [mismatchPage, viewModel.adminBindingMismatches]);

  const pagedAuditLogs = useMemo(() => {
    const start = (auditPage - 1) * AUDIT_PAGE_SIZE;
    return viewModel.adminAuditLogs.slice(start, start + AUDIT_PAGE_SIZE);
  }, [auditPage, viewModel.adminAuditLogs]);

  useEffect(() => {
    setMismatchPage(1);
  }, [viewModel.adminBindingMismatches.length]);

  useEffect(() => {
    setAuditPage(1);
  }, [viewModel.adminAuditLogs.length]);

  useEffect(() => {
    transition.setValue(0);
    Animated.timing(transition, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activeTab, transition]);

  return (
    <View className="gap-4">
      <View className="rounded-[30px] border border-slate-200 bg-white/95 p-5 gap-4">
        <View className="gap-1">
          <AdminText variant="eyebrow" className="text-slate-500 text-xs uppercase tracking-[1px]">
            Admin tools
          </AdminText>
          <AdminText variant="heading" className="text-slate-950 text-[28px]">
            หน้าจัดการบอร์ดและระบบ
          </AdminText>
          <AdminText variant="body" className="text-slate-600 text-sm leading-6">
            แยกงานสำคัญออกเป็นแท็บแล้ว จะเช็กบอร์ด ดูสิทธิ์ผู้ใช้ ไล่สถานะไม่ตรง หรือเปิด log ย้อนหลัง กดสลับดูเป็นส่วน ๆ ได้เลย
          </AdminText>
        </View>

        <View className="flex-row flex-wrap gap-3">
          <View className="min-w-[180px] flex-1 rounded-[24px] bg-sky-50 px-4 py-4 gap-1">
            <AdminText variant="eyebrow" className="text-xs uppercase tracking-[1px] text-sky-700">
              บอร์ดที่เช็กได้
            </AdminText>
            <AdminText variant="heading" className="text-[26px] text-sky-950">
              {Object.keys(viewModel.tagBindings).length}
            </AdminText>
          </View>
          <View className="min-w-[180px] flex-1 rounded-[24px] bg-emerald-50 px-4 py-4 gap-1">
            <AdminText variant="eyebrow" className="text-xs uppercase tracking-[1px] text-emerald-700">
              ผู้ใช้ทั้งหมด
            </AdminText>
            <AdminText variant="heading" className="text-[26px] text-emerald-950">
              {viewModel.adminUsers.length}
            </AdminText>
          </View>
          <View className="min-w-[180px] flex-1 rounded-[24px] bg-amber-50 px-4 py-4 gap-1">
            <AdminText variant="eyebrow" className="text-xs uppercase tracking-[1px] text-amber-700">
              สถานะไม่ตรง
            </AdminText>
            <AdminText variant="heading" className="text-[26px] text-amber-950">
              {viewModel.adminBindingMismatches.filter((item) => item.mismatch_state !== 'matched').length}
            </AdminText>
          </View>
          <View className="min-w-[180px] flex-1 rounded-[24px] bg-slate-100 px-4 py-4 gap-1">
            <AdminText variant="eyebrow" className="text-xs uppercase tracking-[1px] text-slate-500">
              Audit log
            </AdminText>
            <AdminText variant="heading" className="text-[26px] text-slate-950">
              {viewModel.adminAuditLogs.length}
            </AdminText>
          </View>
        </View>
      </View>

      <View className="rounded-[28px] border border-slate-200 bg-white/95 p-5 gap-4">
        <View className="flex-row flex-wrap gap-2">
          {adminTabs.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <Pressable
                key={tab.key}
                className={`rounded-full px-4 py-3 ${active ? 'bg-slate-950' : 'bg-slate-100'}`}
                style={({ pressed }) => (pressed ? { opacity: 0.82, transform: [{ scale: 0.988 }] } : null)}
                onPress={() => setActiveTab(tab.key)}
              >
                <AdminText variant="semibold" className={`text-sm ${active ? 'text-white' : 'text-slate-900'}`}>
                  {tab.label}
                </AdminText>
                <AdminText variant="body" className={`text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                  {tab.hint}
                </AdminText>
              </Pressable>
            );
          })}

          <Pressable className="ml-auto rounded-full bg-slate-100 px-4 py-3" style={({ pressed }) => (pressed ? { opacity: 0.82 } : null)} onPress={actions.onReloadAdminData}>
            <AdminText variant="semibold" className="text-sm text-slate-900">
              รีโหลดข้อมูล
            </AdminText>
          </Pressable>
        </View>

        <Animated.View
          style={{
            opacity: transition,
            transform: [
              {
                translateY: transition.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0],
                }),
              },
            ],
          }}
        >
          {activeTab === 'board' ? (
            <View className="gap-4">
              <View className="rounded-[24px] bg-slate-50 px-4 py-4 gap-2">
                <AdminText variant="eyebrow" className="text-[12px] uppercase tracking-[1px] text-slate-500">
                  Board flow
                </AdminText>
                <AdminText variant="heading" className="text-[22px] text-slate-950">
                  เชื่อมบอร์ด เช็ก hash แล้วค่อย bind
                </AdminText>
                <AdminText variant="body" className="text-sm leading-6 text-slate-600">
                  แท็บนี้รวม USB test mode, sync board state และ factory reset ไว้ด้วยกัน เวลาจะตรวจรับบอร์ดหรือไล่ปัญหาใช้งานจากจุดนี้ได้เลย
                </AdminText>
              </View>

              <UsbSerialTestSection
                selectedWebId={viewModel.selectedWebId}
                boundWebIdByTagId={viewModel.tagBindings}
                canManageTechnicianMode={viewModel.canManageTechnicianMode}
                onAssignTag={actions.onAssignTag}
                onUnassignTag={actions.onUnassignTag}
                onSyncBoardState={actions.onSyncBoardState}
                onTechnicianResetTag={actions.onTechnicianResetTag}
              />
            </View>
          ) : null}

          {activeTab === 'roles' ? <RoleManagementPanel viewModel={viewModel} actions={actions} /> : null}

          {activeTab === 'mismatch' ? (
            <View className="gap-4">
              <View className="rounded-[24px] bg-amber-50 px-4 py-4 gap-2">
                <AdminText variant="eyebrow" className="text-[12px] uppercase tracking-[1px] text-amber-700">
                  Mismatch monitor
                </AdminText>
                <AdminText variant="heading" className="text-[22px] text-slate-950">
                  เช็กสถานะบอร์ดกับ backend
                </AdminText>
                <AdminText variant="body" className="text-sm leading-6 text-slate-600">
                  ถ้า hash ในบอร์ดกับในระบบไม่ตรงกัน หรือฝั่งใดฝั่งหนึ่งค้างอยู่ จะเห็นจากหน้านี้เลย
                </AdminText>
              </View>

              <View className="gap-3">
                {pagedMismatches.length === 0 ? (
                  <View className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6">
                    <AdminText variant="body" className="text-sm text-slate-600">
                      ตอนนี้ยังไม่มีรายการให้เช็ก
                    </AdminText>
                  </View>
                ) : (
                  pagedMismatches.map((item) => (
                    <View key={`${item.tag_id}-${item.web_id}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 gap-3">
                      <View className="gap-1">
                        <AdminText variant="bold" className="text-base text-slate-950">
                          {item.tag_id}
                        </AdminText>
                        <AdminText variant="body" className="text-sm text-slate-600">
                          {item.web_id}
                        </AdminText>
                      </View>
                      <AdminText
                        variant="semibold"
                        className={`text-sm ${
                          item.mismatch_state === 'matched'
                            ? 'text-emerald-700'
                            : item.mismatch_state === 'mismatch'
                              ? 'text-rose-700'
                              : 'text-amber-700'
                        }`}
                      >
                        {item.mismatch_state === 'matched'
                          ? 'สถานะตรงกัน'
                          : item.mismatch_state === 'mismatch'
                            ? 'hash ในบอร์ดกับ backend ไม่ตรงกัน'
                            : item.mismatch_state === 'backend_only'
                              ? 'backend มี binding แต่บอร์ดยังไม่ล็อก'
                              : 'บอร์ดมีสถานะค้าง แต่ backend ไม่ตรง'}
                      </AdminText>
                      <AdminText variant="body" className="text-xs text-slate-500">
                        expected {item.expected_web_id_hash} • board {item.board_web_id_hash || '-'}
                      </AdminText>
                    </View>
                  ))
                )}
              </View>

              <Pagination currentPage={mismatchPage} totalPages={mismatchTotalPages} onChange={setMismatchPage} />
            </View>
          ) : null}

          {activeTab === 'audit' ? (
            <View className="gap-4">
              <View className="rounded-[24px] bg-sky-50 px-4 py-4 gap-2">
                <AdminText variant="eyebrow" className="text-[12px] uppercase tracking-[1px] text-sky-700">
                  Audit log
                </AdminText>
                <AdminText variant="heading" className="text-[22px] text-slate-950">
                  ไล่กิจกรรมย้อนหลังจากจุดเดียว
                </AdminText>
                <AdminText variant="body" className="text-sm leading-6 text-slate-600">
                  ใช้ดูว่าใคร bind, reset, sync board state หรือเปลี่ยนสิทธิ์เมื่อไรบ้าง เวลาไล่ปัญหาจะกลับมาดูจากหน้านี้ได้เร็วขึ้น
                </AdminText>
              </View>

              <View className="gap-3">
                {pagedAuditLogs.length === 0 ? (
                  <View className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6">
                    <AdminText variant="body" className="text-sm text-slate-600">
                      ตอนนี้ยังไม่มี log ให้ดู
                    </AdminText>
                  </View>
                ) : (
                  pagedAuditLogs.map((log) => (
                    <View key={log.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 gap-1">
                      <AdminText variant="bold" className="text-sm text-slate-950">
                        {log.action}
                      </AdminText>
                      <AdminText variant="body" className="text-xs text-slate-600">
                        {log.target_type} • {log.target_id}
                      </AdminText>
                      <AdminText variant="body" className="text-xs text-slate-500">
                        {log.actor.email || log.actor.name || 'system'} • {new Date(log.created_at).toLocaleString('th-TH')}
                      </AdminText>
                    </View>
                  ))
                )}
              </View>

              <Pagination currentPage={auditPage} totalPages={auditTotalPages} onChange={setAuditPage} />
            </View>
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
}
