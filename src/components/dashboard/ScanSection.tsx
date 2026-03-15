import { Button, Text, TextInput, View } from 'react-native';

type ScanSectionProps = {
  bleReady: boolean;
  isScanning: boolean;
  autoRingEnabled: boolean;
  targetTag: string;
  message: string;
  targetSummary: string;
  disableBleActions?: boolean;
  allowTargetInput?: boolean;
  showAutoRingToggle?: boolean;
  restrictionNote?: string;
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
  disableBleActions = false,
  allowTargetInput = true,
  showAutoRingToggle = true,
  restrictionNote,
  onStartScan,
  onStopScan,
  onToggleAutoRing,
  onChangeTargetTag,
}: ScanSectionProps) {
  return (
    <View className="rounded-2xl bg-material-card border border-material-line p-3 gap-2.5">
      <Text className="text-material-text text-[18px] font-bold">ตั้งค่าการสแกน</Text>
      <Text className="text-material-muted text-sm">เริ่มหรือหยุดการสแกน Bluetooth และเลือก BlueTag เป้าหมาย</Text>
      {!bleReady ? (
        <Text className="text-slate-600 text-sm">BLE ใช้งานได้บน native build เท่านั้น ให้รัน `npx expo run:android`</Text>
      ) : null}
      <View className="flex-row justify-between gap-2.5">
        <Button
          title={isScanning ? 'กำลังสแกน...' : 'เริ่มสแกน'}
          onPress={onStartScan}
          disabled={isScanning || disableBleActions}
        />
        <Button title="หยุด" onPress={onStopScan} disabled={disableBleActions} />
      </View>
      {showAutoRingToggle ? (
        <Button
          title={`ส่งเสียงอัตโนมัติ: ${autoRingEnabled ? 'เปิด' : 'ปิด'}`}
          onPress={onToggleAutoRing}
          disabled={disableBleActions}
        />
      ) : null}
      <TextInput
        className="bg-slate-50 text-slate-900 border border-slate-300 rounded-lg px-3 py-2"
        placeholder="กรอก ID ของ BlueTag เช่น BTAG-59ADE300"
        placeholderTextColor="#94a3b8"
        value={targetTag}
        onChangeText={onChangeTargetTag}
        autoCapitalize="characters"
        editable={allowTargetInput}
      />
      {restrictionNote ? <Text className="text-amber-700 text-xs">{restrictionNote}</Text> : null}
      <Text className="text-slate-900 text-sm font-semibold">{message}</Text>
      <Text className="text-slate-600 text-sm">{targetSummary}</Text>
      <Text className="text-slate-600 text-xs">{'กติกาส่งเสียงอัตโนมัติ: RSSI >= -65 = เร็ว, -78..-66 = ช้า, ต่ำกว่า -78 = ปิด'}</Text>
    </View>
  );
}
