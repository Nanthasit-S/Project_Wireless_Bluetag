import { BlurView } from 'expo-blur';
import { Animated, Modal, Pressable, Text, View } from 'react-native';
import { styles } from '../../styles/appStyles';
import { TransitionLoadingDots } from './TransitionLoadingDots';

interface AppTransitionOverlayProps {
  visible: boolean;
  progress: Animated.Value;
  label: string;
  description: string;
}

export function AppTransitionOverlay({ visible, progress, label, description }: AppTransitionOverlayProps) {
  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.routeLoadingModalRoot}>
        <BlurView intensity={28} tint="light" style={styles.routeLoadingBlurLayer} />
        <View style={styles.routeLoadingShadeLayer} />
        <Pressable style={styles.profileMenuCloseLayer} />

        <Animated.View
          style={[
            styles.routeLoadingCard,
            {
              opacity: progress,
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                },
                {
                  scale: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.96, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <TransitionLoadingDots />
          <Text style={styles.routeLoadingTitle}>{label}</Text>
          <Text style={styles.routeLoadingCopy}>{description}</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}
