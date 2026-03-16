import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ProfileBoundTagViewModel } from '../../../types/appViewModels';

interface UserProfilePanelProps {
  currentUserName: string;
  currentUserEmail: string;
  currentConnectionCode: string;
  boundTags: ProfileBoundTagViewModel[];
  onLogout: () => void;
  showLogout?: boolean;
}

function getProfileInitials(name: string, email: string) {
  const source = name.trim() || email.trim() || 'BT';
  const chunks = source
    .split(/[\s@._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (chunks.length >= 2) {
    return `${chunks[0][0] ?? ''}${chunks[1][0] ?? ''}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export function UserProfilePanel({
  currentUserName,
  currentUserEmail,
  currentConnectionCode,
  boundTags,
  onLogout,
  showLogout = true,
}: UserProfilePanelProps) {
  const initials = getProfileInitials(currentUserName, currentUserEmail);

  return (
    <View className="rounded-[30px] border border-slate-200 bg-white/95 p-5 gap-4">
      <View className="gap-1">
        <Text className="text-slate-950 text-[28px] font-bold" style={styles.heading}>
          โปรไฟล์ของคุณ
        </Text>
        <Text className="text-slate-600 text-sm" style={styles.body}>
          ข้อมูลหลักของบัญชีที่กำลังใช้งานอยู่ตอนนี้
        </Text>
      </View>

      <View className="rounded-[26px] bg-slate-950 px-5 py-5 gap-4">
        <View style={styles.heroRow}>
          <View style={styles.profileAvatar}>
            <View style={styles.profileAvatarGlow} />
            <Text style={styles.profileAvatarText}>{initials}</Text>
          </View>

          <View style={styles.heroMeta}>
            <Text className="text-slate-400 text-xs font-semibold" style={styles.label}>
              บัญชีที่ใช้งาน
            </Text>
            <Text className="text-white text-[24px] font-bold" style={styles.heroValue}>
              {currentUserName || 'ยังไม่มีชื่อ'}
            </Text>
            <Text className="text-slate-300 text-sm" style={styles.body}>
              {currentUserEmail || 'ยังไม่มีอีเมล'}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 gap-1">
          <Text className="text-slate-500 text-xs font-semibold" style={styles.label}>
            ชื่อที่ใช้แสดง
          </Text>
          <Text className="text-slate-900 text-base font-bold" style={styles.value}>
            {currentUserName || '-'}
          </Text>
        </View>

        <View className="flex-1 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 gap-1">
          <Text className="text-slate-500 text-xs font-semibold" style={styles.label}>
            อีเมล
          </Text>
          <Text className="text-slate-900 text-base font-bold" style={styles.value}>
            {currentUserEmail || '-'}
          </Text>
        </View>
      </View>

      <View className="rounded-[22px] border border-sky-200 bg-sky-50 px-4 py-4 gap-1">
        <Text className="text-sky-700 text-xs font-semibold" style={styles.label}>
          รหัสเชื่อมต่อ
        </Text>
        <Text className="text-sky-950 text-base font-bold" style={styles.value}>
          {currentConnectionCode || 'ยังไม่มี'}
        </Text>
        <Text className="text-sky-800 text-sm" style={styles.body}>
          รหัสนี้ใช้เชื่อม BlueTag ของบัญชีนี้กับระบบ
        </Text>
      </View>

      <View style={styles.boundTagsSection}>
        <View style={styles.boundTagsHeader}>
          <Text className="text-slate-950 text-[22px] font-bold" style={styles.heading}>
            BlueTag ที่ผูกอยู่
          </Text>
          <Text className="text-slate-500 text-sm" style={styles.body}>
            {boundTags.length} เครื่อง
          </Text>
        </View>

        {boundTags.length === 0 ? (
          <View style={styles.emptyTagsCard}>
            <Text className="text-slate-900 text-base font-bold" style={styles.value}>
              ยังไม่มี BlueTag ที่ผูกอยู่
            </Text>
            <Text className="text-slate-600 text-sm" style={styles.body}>
              เมื่อมีการผูก BlueTag เข้ากับรหัสเชื่อมต่อนี้ รายการและรายละเอียดจะขึ้นตรงนี้ทันที
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.boundTagsList}>
            {boundTags.map((tag) => (
              <View key={tag.tagId} style={styles.boundTagCard}>
                <View style={styles.boundTagTopRow}>
                  <View style={styles.boundTagIdentity}>
                    <Text className="text-slate-950 text-lg font-bold" style={styles.value}>
                      {tag.name}
                    </Text>
                    <Text className="text-slate-500 text-xs font-semibold" style={styles.label}>
                      {tag.tagId}
                    </Text>
                  </View>
                  <View style={styles.boundTagBadge}>
                    <Text style={styles.boundTagBadgeText}>{tag.rssi != null ? `${tag.rssi} dBm` : 'Bound'}</Text>
                  </View>
                </View>

                <View style={styles.boundTagMetaGrid}>
                  <View style={styles.boundTagMetaItem}>
                    <Text style={styles.boundTagMetaLabel}>ชื่อเล่น</Text>
                    <Text style={styles.boundTagMetaValue}>{tag.nickname || 'ยังไม่ได้ตั้ง'}</Text>
                  </View>
                  <View style={styles.boundTagMetaItem}>
                    <Text style={styles.boundTagMetaLabel}>แบตเตอรี่ประมาณ</Text>
                    <Text style={styles.boundTagMetaValue}>{tag.battery != null ? `${tag.battery}%` : '-'}</Text>
                  </View>
                  <View style={styles.boundTagMetaItem}>
                    <Text style={styles.boundTagMetaLabel}>เจอล่าสุด</Text>
                    <Text style={styles.boundTagMetaValue}>{tag.lastSeen || '-'}</Text>
                  </View>
                  <View style={styles.boundTagMetaItem}>
                    <Text style={styles.boundTagMetaLabel}>ตำแหน่ง</Text>
                    <Text style={styles.boundTagMetaValue}>
                      {tag.latitude != null && tag.longitude != null ? `${tag.latitude.toFixed(4)}, ${tag.longitude.toFixed(4)}` : 'ยังไม่มี'}
                    </Text>
                  </View>
                </View>

                <View style={styles.boundTagFooter}>
                  <Text style={styles.boundTagFooterText}>Source: {tag.estimateSource}</Text>
                  <Text style={styles.boundTagFooterText}>จำนวนครั้งที่อัปเดต: {tag.sampleCount}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {showLogout ? (
        <Pressable
          className="items-center rounded-[22px] bg-rose-600 px-4 py-4"
          style={({ pressed }) => (pressed ? { opacity: 0.82 } : null)}
          onPress={onLogout}
        >
          <Text className="text-white text-base font-semibold" style={styles.value}>
            ออกจากระบบ
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  heroMeta: {
    flex: 1,
    gap: 2,
  },
  profileAvatar: {
    position: 'relative',
    width: 72,
    height: 72,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#166534',
    overflow: 'hidden',
  },
  profileAvatarGlow: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    top: -8,
    right: -4,
  },
  profileAvatarText: {
    color: '#f8fafc',
    fontSize: 26,
    fontFamily: 'Sarabun_700Bold',
  },
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
  heroValue: {
    fontFamily: 'Sarabun_700Bold',
  },
  boundTagsSection: {
    gap: 12,
  },
  boundTagsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  emptyTagsCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 4,
  },
  boundTagsList: {
    gap: 12,
    paddingRight: 4,
  },
  boundTagCard: {
    width: 288,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#dbeafe',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  boundTagTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  boundTagIdentity: {
    flex: 1,
    gap: 2,
  },
  boundTagBadge: {
    borderRadius: 999,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  boundTagBadgeText: {
    color: '#166534',
    fontSize: 12,
    fontFamily: 'Sarabun_700Bold',
  },
  boundTagMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  boundTagMetaItem: {
    width: '48%',
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  boundTagMetaLabel: {
    color: '#64748b',
    fontSize: 11,
    fontFamily: 'Sarabun_600SemiBold',
  },
  boundTagMetaValue: {
    color: '#0f172a',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Sarabun_700Bold',
  },
  boundTagFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  boundTagFooterText: {
    color: '#475569',
    fontSize: 11,
    fontFamily: 'Sarabun_600SemiBold',
  },
});
