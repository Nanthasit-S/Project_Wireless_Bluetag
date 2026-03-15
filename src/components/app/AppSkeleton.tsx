import { StatusBar } from 'expo-status-bar';
import { Animated, Easing, SafeAreaView, View } from 'react-native';
import { useEffect, useRef } from 'react';
import { BackgroundOrbs } from './BackgroundOrbs';
import { styles } from '../../styles/appStyles';

function SkeletonBlock({ style }: { style?: object }) {
  return <View style={[styles.skeletonBlock, style]} />;
}

export function AppSkeleton() {
  const shimmer = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 0.72,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(shimmer, {
          toValue: 0.35,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  return (
    <SafeAreaView className="flex-1 bg-material-bg">
      <StatusBar style="dark" />
      <BackgroundOrbs />
      <Animated.View style={[styles.skeletonShell, { opacity: shimmer }]}>
        <View style={styles.skeletonHero}>
          <SkeletonBlock style={styles.skeletonBadge} />
          <SkeletonBlock style={styles.skeletonTitlePrimary} />
          <SkeletonBlock style={styles.skeletonTitleSecondary} />
          <SkeletonBlock style={styles.skeletonCopy} />
          <SkeletonBlock style={styles.skeletonCopyShort} />
          <View style={styles.skeletonMetricRow}>
            <SkeletonBlock style={styles.skeletonMetricCard} />
            <SkeletonBlock style={styles.skeletonMetricCard} />
            <SkeletonBlock style={styles.skeletonMetricCard} />
          </View>
        </View>

        <View style={styles.skeletonCard}>
          <SkeletonBlock style={styles.skeletonModeSwitch} />
          <SkeletonBlock style={styles.skeletonFormTitle} />
          <SkeletonBlock style={styles.skeletonCopy} />
          <SkeletonBlock style={styles.skeletonInput} />
          <SkeletonBlock style={styles.skeletonInput} />
          <SkeletonBlock style={styles.skeletonButton} />
          <SkeletonBlock style={styles.skeletonLink} />
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
