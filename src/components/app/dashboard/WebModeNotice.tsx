import { Text, View } from 'react-native';

interface WebModeNoticeProps {
  webModeLabel: string;
}

export function WebModeNotice({ webModeLabel }: WebModeNoticeProps) {
  return (
    <View className="rounded-[24px] border border-sky-200 bg-sky-50/90 p-4 gap-2">
      <Text className="text-sky-950 text-sm font-bold">{webModeLabel}</Text>
      <Text className="text-sky-800 text-xs leading-5">
        บนเว็บเอาไว้ดูตำแหน่งกับภาพรวมเป็นหลัก ถ้าจะสแกน BLE หรือสั่งให้แท็กส่งเสียง ให้ใช้แอปในเครื่องจะครบกว่าครับ
      </Text>
    </View>
  );
}
