import { Platform, View } from 'react-native';
import { styles } from '../../styles/appStyles';

export function BackgroundOrbs() {
  if (Platform.OS !== 'web') return null;

  return (
    <View pointerEvents="none" style={styles.backgroundLayer}>
      <View style={[styles.orb, styles.orbPrimary]} />
      <View style={[styles.orb, styles.orbWarm]} />
      <View style={[styles.orb, styles.orbSoft]} />
    </View>
  );
}
