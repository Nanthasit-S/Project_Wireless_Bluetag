import { StyleSheet, Text, View } from 'react-native';

type HeaderCardProps = {
};

export function HeaderCard({}: HeaderCardProps) {
  return (
    <View className="rounded-[30px] border border-slate-200 bg-white/95 p-5 gap-4 shadow-sm">
      <View className="gap-2">
        <Text className="text-[30px] text-slate-950 font-bold" style={styles.heading}>
          BlueTag Tracking
        </Text>
        <Text className="text-sm text-slate-600" style={styles.body}>
          หน้าเดียวดูได้ทั้งสถานะอุปกรณ์ แผนที่ และประวัติตำแหน่ง ถ้ามีแท็กเมื่อไร ข้อมูลจะขึ้นตรงนี้ทันที
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
});
