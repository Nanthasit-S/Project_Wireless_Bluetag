import { Pressable, Text, TextInput, View } from 'react-native';

interface UserSettingsPanelProps {
  backendBase: string;
  onChangeBackendBase: (value: string) => void;
  onRefreshProfile: () => void;
  onLogout: () => void;
}

export function UserSettingsPanel({
  backendBase,
  onChangeBackendBase,
  onRefreshProfile,
  onLogout,
}: UserSettingsPanelProps) {
  return (
    <View className="rounded-[30px] border border-slate-200 bg-white/95 p-5 gap-4">
      <View className="gap-1">
        <Text className="text-slate-950 text-[28px] font-bold">ตั้งค่า</Text>
        <Text className="text-slate-600 text-sm">ปรับค่าที่ใช้กับแอปจากตรงนี้ได้เลย</Text>
      </View>

      <View className="gap-2 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
        <Text className="text-slate-700 text-sm font-semibold">Backend URL</Text>
        <TextInput
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base"
          placeholder="http://192.168.x.x:8000"
          value={backendBase}
          onChangeText={onChangeBackendBase}
          autoCapitalize="none"
        />
        <Text className="text-slate-500 text-xs">ถ้าเปิดจากมือถือจริง ให้ใช้ IP ของคอม ไม่ใช่ localhost</Text>
      </View>

      <View className="flex-row gap-3">
        <Pressable className="flex-1 items-center rounded-2xl border border-slate-300 bg-white px-4 py-3" style={({ pressed }) => (pressed ? { opacity: 0.76 } : null)} onPress={onRefreshProfile}>
          <Text className="text-slate-700 font-semibold">โหลดข้อมูลใหม่</Text>
        </Pressable>
        <Pressable className="flex-1 items-center rounded-2xl bg-slate-950 px-4 py-3" style={({ pressed }) => (pressed ? { opacity: 0.82 } : null)} onPress={onLogout}>
          <Text className="text-white font-semibold">ออกจากระบบ</Text>
        </Pressable>
      </View>
    </View>
  );
}
