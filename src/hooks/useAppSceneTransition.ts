import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

type AppScene = 'auth' | 'dashboard';

type SceneTransitionCopy = {
  label: string;
  copy: string;
};

const loginCopy: SceneTransitionCopy = {
  label: 'กำลังเข้าสู่ระบบ',
  copy: 'รอสักครู่ เดี๋ยวระบบจะพาเข้าไปที่หน้าหลักให้เลย',
};

const registerCopy: SceneTransitionCopy = {
  label: 'กำลังสร้างบัญชี',
  copy: 'รอสักครู่ เดี๋ยวระบบจะพาเข้าไปที่หน้าหลักให้เลย',
};

const logoutCopy: SceneTransitionCopy = {
  label: 'กำลังออกจากระบบ',
  copy: 'กำลังพากลับไปหน้าเข้าสู่ระบบให้เรียบร้อย',
};

function getTransitionCopy(hasToken: boolean, authMode: 'login' | 'register'): SceneTransitionCopy {
  if (!hasToken) {
    return logoutCopy;
  }

  return authMode === 'login' ? loginCopy : registerCopy;
}

export function useAppSceneTransition(params: {
  authReady: boolean;
  fontsLoaded: boolean;
  authBusy: boolean;
  authToken: string;
  authMode: 'login' | 'register';
  authError: string;
}) {
  const { authReady, fontsLoaded, authBusy, authToken, authMode, authError } = params;
  const sceneProgress = useRef(new Animated.Value(0)).current;
  const overlayProgress = useRef(new Animated.Value(0)).current;
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isTransitioningRef = useRef(false);

  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayCopy, setOverlayCopy] = useState<SceneTransitionCopy>(loginCopy);
  const [renderedScene, setRenderedScene] = useState<AppScene>('auth');

  const clearTimers = () => {
    for (const timer of timersRef.current) {
      clearTimeout(timer);
    }
    timersRef.current = [];
  };

  const animateSceneIn = () => {
    sceneProgress.setValue(0);
    Animated.timing(sceneProgress, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const openOverlay = (copy: SceneTransitionCopy) => {
    setOverlayCopy(copy);
    setOverlayVisible(true);
    overlayProgress.setValue(0);
    Animated.timing(overlayProgress, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeOverlay = () => {
    Animated.timing(overlayProgress, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setOverlayVisible(false);
      isTransitioningRef.current = false;
    });
  };

  useEffect(() => {
    if (!fontsLoaded || !authReady) return;
    animateSceneIn();
  }, [authReady, fontsLoaded]);

  useEffect(() => {
    if (!authReady || !fontsLoaded) return;

    const nextScene: AppScene = authToken ? 'dashboard' : 'auth';

    if (nextScene !== renderedScene && !isTransitioningRef.current) {
      clearTimers();
      isTransitioningRef.current = true;
      openOverlay(getTransitionCopy(Boolean(authToken), authMode));

      timersRef.current.push(
        setTimeout(() => {
          setRenderedScene(nextScene);
          animateSceneIn();
        }, 380),
      );

      timersRef.current.push(
        setTimeout(() => {
          closeOverlay();
        }, 760),
      );

      return;
    }

    if (renderedScene === 'auth' && authBusy && !isTransitioningRef.current) {
      openOverlay(getTransitionCopy(true, authMode));
      return;
    }

    if (renderedScene === 'auth' && !authBusy && !authToken && overlayVisible && !isTransitioningRef.current) {
      closeOverlay();
    }

    if (renderedScene === 'auth' && !authBusy && !authToken && authError && overlayVisible) {
      closeOverlay();
    }
  }, [authBusy, authError, authMode, authReady, authToken, fontsLoaded, overlayVisible, renderedScene]);

  useEffect(() => () => clearTimers(), []);

  return {
    renderedScene,
    sceneProgress,
    overlayProgress,
    overlayVisible,
    overlayLabel: overlayCopy.label,
    overlayDescription: overlayCopy.copy,
  };
}
