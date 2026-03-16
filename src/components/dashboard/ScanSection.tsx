import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type ScanSectionProps = {
  bleReady: boolean;
  isScanning: boolean;
  autoRingEnabled: boolean;
  targetTag: string;
  connectedTagId: string;
  message: string;
  targetSummary: string;
  disableBleActions?: boolean;
  allowTargetInput?: boolean;
  showAutoRingToggle?: boolean;
  showConnectAction?: boolean;
  restrictionNote?: string;
  onStartScan: () => void;
  onStopScan: () => void;
  onConnectTarget: () => void;
  onDisconnectTarget: () => void;
  onToggleAutoRing: () => void;
  onChangeTargetTag: (value: string) => void;
};

export function ScanSection({
  bleReady,
  isScanning,
  autoRingEnabled,
  targetTag,
  connectedTagId,
  message,
  targetSummary,
  disableBleActions = false,
  allowTargetInput = true,
  showAutoRingToggle = true,
  showConnectAction = true,
  restrictionNote,
  onStartScan,
  onStopScan,
  onConnectTarget,
  onDisconnectTarget,
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
      <View style={styles.buttonRow}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryAction,
            (isScanning || disableBleActions) && styles.disabledAction,
            pressed ? styles.pressedAction : null,
          ]}
          disabled={isScanning || disableBleActions}
          onPress={onStartScan}
        >
          <Text style={styles.primaryActionText}>{isScanning ? 'กำลังสแกน...' : 'เริ่มสแกน'}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.secondaryAction, disableBleActions && styles.disabledAction, pressed ? styles.pressedAction : null]}
          disabled={disableBleActions}
          onPress={onStopScan}
        >
          <Text style={styles.secondaryActionText}>หยุด</Text>
        </Pressable>
      </View>
      {showConnectAction ? (
        <View style={styles.buttonRow}>
          <Pressable
            style={({ pressed }) => [styles.primaryAction, (!targetTag.trim() || disableBleActions) && styles.disabledAction, pressed ? styles.pressedAction : null]}
            disabled={!targetTag.trim() || disableBleActions}
            onPress={onConnectTarget}
          >
            <Text style={styles.primaryActionText}>{connectedTagId ? 'เชื่อมใหม่' : 'Connect'}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondaryAction, (!connectedTagId || disableBleActions) && styles.disabledAction, pressed ? styles.pressedAction : null]}
            disabled={!connectedTagId || disableBleActions}
            onPress={onDisconnectTarget}
          >
            <Text style={styles.secondaryActionText}>Disconnect</Text>
          </Pressable>
        </View>
      ) : null}
      {showAutoRingToggle ? (
        <Pressable
          style={({ pressed }) => [styles.secondaryWideAction, disableBleActions && styles.disabledAction, pressed ? styles.pressedAction : null]}
          disabled={disableBleActions}
          onPress={onToggleAutoRing}
        >
          <Text style={styles.secondaryActionText}>{`ส่งเสียงอัตโนมัติ: ${autoRingEnabled ? 'เปิด' : 'ปิด'}`}</Text>
        </Pressable>
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

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  primaryAction: {
    flexGrow: 1,
    minWidth: 140,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#0f172a',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  secondaryAction: {
    flexGrow: 1,
    minWidth: 100,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  secondaryWideAction: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryActionText: {
    color: '#f8fafc',
    fontSize: 15,
    fontFamily: 'Sarabun_700Bold',
  },
  secondaryActionText: {
    color: '#0f172a',
    fontSize: 15,
    fontFamily: 'Sarabun_600SemiBold',
  },
  disabledAction: {
    opacity: 0.5,
  },
  pressedAction: {
    opacity: 0.78,
  },
});
