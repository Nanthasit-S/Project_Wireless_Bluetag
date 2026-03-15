import { Pressable, StyleSheet, Text, View } from 'react-native';

type RingSectionProps = {
  targetTagId?: string;
  autoRingEnabled?: boolean;
  onOff: () => void;
  onSlow: () => void;
  onToggleAutoRing: () => void;
};

export function RingSection({ targetTagId, autoRingEnabled = false, onOff, onSlow, onToggleAutoRing }: RingSectionProps) {
  return (
    <View className="rounded-2xl bg-material-card border border-material-line p-3 gap-2.5">
      <Text className="text-material-text text-[18px] font-bold">ควบคุมการส่งเสียง</Text>
      <Text className="text-material-muted text-sm">
        {targetTagId
          ? `BlueTag ${targetTagId} ยังถูกควบคุมได้ ถ้ามันยังอยู่ในระยะและผูกกับบัญชีนี้อยู่ แม้ตอนนี้จะยังไม่ได้ Connect`
          : 'สั่งให้ BlueTag ส่งเสียงเพื่อค้นหาได้อย่างรวดเร็ว'}
      </Text>
      <Pressable
        style={({ pressed }) => [styles.autoActionPressable, pressed ? styles.pressedAction : null]}
        onPress={onToggleAutoRing}
      >
        {({ pressed }) => (
          <View style={[styles.autoActionSurface, autoRingEnabled ? styles.autoActionSurfaceEnabled : null, pressed ? styles.autoActionSurfacePressed : null]}>
            <Text style={styles.autoActionText}>{autoRingEnabled ? 'ส่งเสียงอัตโนมัติ: เปิด' : 'ส่งเสียงอัตโนมัติ: ปิด'}</Text>
            <Text style={styles.autoActionCaption}>
              {autoRingEnabled
                ? 'เปิดอยู่ตอนนี้ ถ้า BlueTag ที่ผูกไว้กลับมาอยู่ในระยะ ระบบจะสั่งเสียงให้อัตโนมัติแม้ยังไม่ได้ Connect'
                : 'แตะเพื่อให้ระบบเริ่มสั่งเสียงอัตโนมัติเมื่อ BlueTag ที่ผูกไว้กลับมาอยู่ในระยะ'}
            </Text>
          </View>
        )}
      </Pressable>
      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [styles.actionPressable, pressed ? styles.pressedAction : null]}
          onPress={onOff}
        >
          {({ pressed }) => (
            <View style={[styles.stopAction, styles.actionSurface, styles.stopActionSurface, pressed ? styles.stopActionSurfacePressed : null]}>
              <Text style={styles.stopActionText}>ปิด</Text>
            </View>
          )}
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionPressable, pressed ? styles.pressedAction : null]}
          onPress={onSlow}
        >
          {({ pressed }) => (
            <View style={[styles.slowAction, styles.actionSurface, styles.slowActionSurface, pressed ? styles.slowActionSurfacePressed : null]}>
              <Text style={styles.slowActionText}>ช้า</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  autoActionPressable: {
    borderRadius: 18,
  },
  autoActionSurface: {
    minHeight: 70,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    shadowColor: '#1d4ed8',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 3,
  },
  autoActionSurfaceEnabled: {
    borderColor: '#86efac',
    backgroundColor: '#dcfce7',
    shadowColor: '#166534',
  },
  autoActionSurfacePressed: {
    transform: [{ scale: 0.985 }],
  },
  autoActionText: {
    color: '#0f172a',
    fontSize: 15,
    fontFamily: 'Sarabun_700Bold',
  },
  autoActionCaption: {
    marginTop: 4,
    color: '#334155',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Sarabun_600SemiBold',
  },
  actionPressable: {
    flexGrow: 1,
    minWidth: 88,
    borderRadius: 16,
  },
  actionSurface: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  stopAction: {
    backgroundColor: '#dc2626',
    shadowColor: '#7f1d1d',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    elevation: 4,
  },
  slowAction: {
    backgroundColor: '#f59e0b',
    shadowColor: '#b45309',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    elevation: 4,
  },
  stopActionSurface: {
    borderWidth: 1,
    borderColor: '#fca5a5',
    backgroundColor: '#dc2626',
  },
  stopActionSurfacePressed: {
    backgroundColor: '#b91c1c',
    borderColor: '#fecaca',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 1,
  },
  slowActionSurface: {
    borderWidth: 1,
    borderColor: '#fde68a',
    backgroundColor: '#f59e0b',
  },
  slowActionSurfacePressed: {
    backgroundColor: '#d97706',
    borderColor: '#fef3c7',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 1,
  },
  stopActionText: {
    color: '#fff1f2',
    fontSize: 15,
    fontFamily: 'Sarabun_700Bold',
  },
  slowActionText: {
    color: '#451a03',
    fontSize: 15,
    fontFamily: 'Sarabun_700Bold',
  },
  pressedAction: {
    transform: [{ scale: 0.96 }],
  },
});
