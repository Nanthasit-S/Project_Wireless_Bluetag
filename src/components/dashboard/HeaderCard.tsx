import { Text, View } from 'react-native';

type HeaderCardProps = {
  bleState: string;
  isScanning: boolean;
  deviceCount: number;
};

export function HeaderCard({ bleState, isScanning, deviceCount }: HeaderCardProps) {
  return (
    <View className="rounded-2xl bg-material-card border border-material-line p-4 gap-2">
      <Text className="text-material-text text-2xl font-bold">BlueTag Finder</Text>
      <Text className="text-material-muted text-xs">
        Material style dashboard for Scan, Ring, Map, and Nearby devices
      </Text>
      <View className="flex-row flex-wrap gap-2">
        <Text className="text-material-primary bg-material-chip rounded-full px-3 py-1 text-[11px] font-semibold">
          BLE: {bleState}
        </Text>
        <Text className="text-material-primary bg-material-chip rounded-full px-3 py-1 text-[11px] font-semibold">
          {isScanning ? 'Scanning' : 'Idle'}
        </Text>
        <Text className="text-material-primary bg-material-chip rounded-full px-3 py-1 text-[11px] font-semibold">
          Devices: {deviceCount}
        </Text>
      </View>
    </View>
  );
}
