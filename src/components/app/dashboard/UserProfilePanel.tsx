import { StyleSheet, Text, View } from 'react-native';

interface UserProfilePanelProps {
  currentUserName: string;
  currentUserEmail: string;
  currentConnectionCode: string;
}

export function UserProfilePanel({
  currentUserName,
  currentUserEmail,
  currentConnectionCode,
}: UserProfilePanelProps) {
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

      <View className="rounded-[26px] bg-slate-950 px-5 py-5 gap-2">
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
    </View>
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
  heroValue: {
    fontFamily: 'Sarabun_700Bold',
  },
});
