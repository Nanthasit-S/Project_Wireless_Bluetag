import { useEffect } from 'react';
import { Animated, Text, TextInput, useWindowDimensions } from 'react-native';
import { Sarabun_400Regular, Sarabun_600SemiBold, Sarabun_700Bold, useFonts } from '@expo-google-fonts/sarabun';
import { AppSkeleton } from './src/components/app/AppSkeleton';
import { AppTransitionOverlay } from './src/components/app/AppTransitionOverlay';
import { AuthScreen } from './src/components/app/AuthScreen';
import { DashboardScreen } from './src/components/app/DashboardScreen';
import { useBackendController } from './src/hooks/useBackendController';
import { useBleController } from './src/hooks/useBleController';
import { useAppSceneTransition } from './src/hooks/useAppSceneTransition';
import { useAppViewModels } from './src/hooks/useAppViewModels';

export default function App() {
  const { width } = useWindowDimensions();
  const [fontsLoaded] = useFonts({
    Sarabun_400Regular,
    Sarabun_600SemiBold,
    Sarabun_700Bold,
  });

  const ble = useBleController();
  const mapQueryTag = ble.targetTag.trim() ? ble.targetTag.trim().toUpperCase() : ble.targetSeen?.tagId ?? '';
  const backend = useBackendController({
    mapQueryTag,
    localTagLocations: ble.localTagLocations,
    resetBleSession: ble.resetBleSession,
    setMessage: ble.setMessage,
  });

  const { authViewModel, authActions, dashboardViewModel, dashboardActions, isDesktopWeb, desktopSelectedTagId } = useAppViewModels({
    width,
    backend,
    ble,
    fontsLoaded,
  });

  const { renderedScene, sceneProgress, overlayProgress, overlayVisible, overlayLabel, overlayDescription } = useAppSceneTransition({
    authReady: backend.authReady,
    fontsLoaded,
    authBusy: backend.authBusy,
    authToken: backend.authToken,
    authMode: backend.authMode,
    authError: backend.authError,
  });

  useEffect(() => {
    if (!fontsLoaded) return;

    const textComponent = Text as typeof Text & { defaultProps?: { style?: unknown } };
    const textInputComponent = TextInput as typeof TextInput & { defaultProps?: { style?: unknown } };

    textComponent.defaultProps = {
      ...textComponent.defaultProps,
      style: [{ fontFamily: 'Sarabun_400Regular' }, textComponent.defaultProps?.style],
    };
    textInputComponent.defaultProps = {
      ...textInputComponent.defaultProps,
      style: [{ fontFamily: 'Sarabun_400Regular' }, textInputComponent.defaultProps?.style],
    };
  }, [fontsLoaded]);

  useEffect(() => {
    if (!isDesktopWeb || !backend.authToken) return;

    void backend.loadLocationHistory({
      webId: backend.selectedWebId,
      tagId: desktopSelectedTagId,
    }).catch(() => {
      ble.setMessage('Failed to load location history');
    });
  }, [isDesktopWeb, backend.authToken, backend.selectedWebId, desktopSelectedTagId]);

  if (!backend.authReady || !fontsLoaded) {
    return <AppSkeleton />;
  }

  const sceneAnimatedStyle = {
    opacity: sceneProgress,
    transform: [
      {
        translateY: sceneProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
      {
        scale: sceneProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.985, 1],
        }),
      },
    ],
  };

  return (
    <>
      {renderedScene === 'auth' ? (
        <Animated.View style={[{ flex: 1 }, sceneAnimatedStyle]}>
          <AuthScreen viewModel={authViewModel} actions={authActions} />
        </Animated.View>
      ) : (
        <Animated.View style={[{ flex: 1 }, sceneAnimatedStyle]}>
          <DashboardScreen viewModel={dashboardViewModel} actions={dashboardActions} />
        </Animated.View>
      )}

      <AppTransitionOverlay
        visible={overlayVisible}
        progress={overlayProgress}
        label={overlayLabel}
        description={overlayDescription}
      />
    </>
  );
}
