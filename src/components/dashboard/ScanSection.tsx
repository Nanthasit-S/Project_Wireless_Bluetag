import { Button, Text, TextInput, View } from 'react-native';

type ScanSectionProps = {
  bleReady: boolean;
  isScanning: boolean;
  autoRingEnabled: boolean;
  targetTag: string;
  message: string;
  targetSummary: string;
  onStartScan: () => void;
  onStopScan: () => void;
  onToggleAutoRing: () => void;
  onChangeTargetTag: (value: string) => void;
};

export function ScanSection({
  bleReady,
  isScanning,
  autoRingEnabled,
  targetTag,
  message,
  targetSummary,
  onStartScan,
  onStopScan,
  onToggleAutoRing,
  onChangeTargetTag,
}: ScanSectionProps) {
  return (
    <View className="rounded-2xl bg-material-card border border-material-line p-3 gap-2.5">
      <Text className="text-material-text text-[17px] font-bold">1) Scan Control</Text>
      <Text className="text-material-muted text-xs">Start/stop Bluetooth scan and choose target tag.</Text>
      {!bleReady ? (
        <Text className="text-slate-600 text-xs">BLE needs native development build. Run `npx expo run:android`.</Text>
      ) : null}
      <View className="flex-row justify-between gap-2.5">
        <Button title={isScanning ? 'Scanning...' : 'Start Scan'} onPress={onStartScan} disabled={isScanning} />
        <Button title="Stop" onPress={onStopScan} />
      </View>
      <Button title={`Auto Ring: ${autoRingEnabled ? 'ON' : 'OFF'}`} onPress={onToggleAutoRing} />
      <TextInput
        className="bg-slate-50 text-slate-900 border border-slate-300 rounded-lg px-3 py-2"
        placeholder="Target tag (e.g. BTAG-59ADE300)"
        placeholderTextColor="#94a3b8"
        value={targetTag}
        onChangeText={onChangeTargetTag}
        autoCapitalize="characters"
      />
      <Text className="text-slate-900 text-xs font-semibold">{message}</Text>
      <Text className="text-slate-600 text-xs">{targetSummary}</Text>
      <Text className="text-slate-600 text-xs">Auto Ring rule: RSSI ≥ -65 = Fast, -78..-66 = Slow, below -78 = Off</Text>
    </View>
  );
}
