import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { styles } from '../../styles/appStyles';

export function TransitionLoadingDots() {
  const progressValues = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    const animations = progressValues.map((progress, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 120),
          Animated.timing(progress, {
            toValue: 1,
            duration: 420,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(progress, {
            toValue: 0,
            duration: 420,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.delay(120),
        ]),
      ),
    );

    animations.forEach((animation) => animation.start());

    return () => {
      animations.forEach((animation) => animation.stop());
      progressValues.forEach((progress) => progress.stopAnimation());
    };
  }, [progressValues]);

  return (
    <View style={styles.routeLoadingDots}>
      {progressValues.map((progress, index) => {
        const palette = [styles.routeLoadingDotPrimary, styles.routeLoadingDotSoft, styles.routeLoadingDotWarm];

        return (
          <Animated.View
            key={index}
            style={[
              styles.routeLoadingDot,
              palette[index],
              {
                opacity: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.45, 1],
                }),
                transform: [
                  {
                    translateY: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [2, -6],
                    }),
                  },
                  {
                    scale: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.92, 1.12],
                    }),
                  },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}
