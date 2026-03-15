import { Button, Text, View } from 'react-native';

type RingSectionProps = {
  onOff: () => void;
  onSlow: () => void;
  onFast: () => void;
};

export function RingSection({ onOff, onSlow, onFast }: RingSectionProps) {
  return (
    <View className="rounded-2xl bg-material-card border border-material-line p-3 gap-2.5">
      <Text className="text-material-text text-[18px] font-bold">ควบคุมการส่งเสียง</Text>
      <Text className="text-material-muted text-sm">สั่งให้ BlueTag ส่งเสียงเพื่อค้นหาได้อย่างรวดเร็ว</Text>
      <View className="flex-row justify-between gap-2.5">
        <Button title="ปิด" onPress={onOff} />
        <Button title="ช้า" onPress={onSlow} />
        <Button title="เร็ว" onPress={onFast} />
      </View>
    </View>
  );
}
