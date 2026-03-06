import { Button, Text, View } from 'react-native';

type RingSectionProps = {
  onOff: () => void;
  onSlow: () => void;
  onFast: () => void;
};

export function RingSection({ onOff, onSlow, onFast }: RingSectionProps) {
  return (
    <View className="rounded-2xl bg-material-card border border-material-line p-3 gap-2.5">
      <Text className="text-material-text text-[17px] font-bold">2) Ring Control</Text>
      <Text className="text-material-muted text-xs">Manual ring commands for finding the tag quickly.</Text>
      <View className="flex-row justify-between gap-2.5">
        <Button title="Off" onPress={onOff} />
        <Button title="Slow" onPress={onSlow} />
        <Button title="Fast" onPress={onFast} />
      </View>
    </View>
  );
}
