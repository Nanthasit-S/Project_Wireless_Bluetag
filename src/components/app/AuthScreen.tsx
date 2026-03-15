import { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import type { AuthScreenActions, AuthScreenViewModel } from '../../types/appViewModels';
import { BackgroundOrbs } from './BackgroundOrbs';
import { styles } from '../../styles/appStyles';

interface AuthScreenProps {
  viewModel: AuthScreenViewModel;
  actions: AuthScreenActions;
}

function passwordStrengthStrengthProgressToOpacity(progress: Animated.Value, index: number) {
  return progress.interpolate({
    inputRange: [index, index + 0.15, index + 1],
    outputRange: [0.2, 1, 1],
    extrapolate: 'clamp',
  });
}

function passwordStrengthProgressToWidth(progress: Animated.Value, index: number) {
  return progress.interpolate({
    inputRange: [index, index + 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });
}

function getPasswordChecks(password: string) {
  return [
    { key: 'length', label: 'อย่างน้อย 8 ตัว', pass: password.length >= 8 },
    { key: 'upper', label: 'มีตัวพิมพ์ใหญ่', pass: /[A-Z]/.test(password) },
    { key: 'lower', label: 'มีตัวพิมพ์เล็ก', pass: /[a-z]/.test(password) },
    { key: 'number', label: 'มีตัวเลข', pass: /\d/.test(password) },
    { key: 'symbol', label: 'มีอักขระพิเศษ', pass: /[^A-Za-z0-9]/.test(password) },
  ];
}

function getPasswordStrength(password: string) {
  const checks = getPasswordChecks(password);
  const passedCount = checks.filter((item) => item.pass).length;

  if (!password) {
    return { label: 'ยังไม่ได้กรอก', color: '#cbd5e1', level: 0, checks };
  }
  if (passedCount <= 2) {
    return { label: 'ยังอ่อนอยู่', color: '#f97316', level: 1, checks };
  }
  if (passedCount <= 4) {
    return { label: 'โอเคแล้ว', color: '#0ea5e9', level: 2, checks };
  }
  return { label: 'แข็งแรงมาก', color: '#16a34a', level: 3, checks };
}

export function AuthScreen({ viewModel, actions }: AuthScreenProps) {
  const { authReady, fontsLoaded, authDesktop, authMode, authEmail, authPassword, authName, authBusy, authError } = viewModel;
  const { onChangeEmail, onChangePassword, onChangeName, onSubmit, onToggleMode } = actions;
  const { width, height } = useWindowDimensions();
  const isCompactMobile = !authDesktop && width < 420;
  const isShortScreen = height < 760;
  const scrollRef = useRef<ScrollView | null>(null);

  const modeProgress = useRef(new Animated.Value(authMode === 'register' ? 1 : 0)).current;
  const busyPulse = useRef(new Animated.Value(0)).current;
  const [loginHovered, setLoginHovered] = useState(false);
  const [registerHovered, setRegisterHovered] = useState(false);
  const [submitHovered, setSubmitHovered] = useState(false);
  const [switchHovered, setSwitchHovered] = useState(false);
  const passwordMeterVisible = authMode === 'register' && authPassword.trim().length > 0;
  const passwordMeterProgress = useRef(new Animated.Value(passwordMeterVisible ? 1 : 0)).current;
  const passwordStrengthProgress = useRef(new Animated.Value(0)).current;
  const passwordStrength = useMemo(() => getPasswordStrength(authPassword), [authPassword]);

  useEffect(() => {
    Animated.timing(modeProgress, {
      toValue: authMode === 'register' ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [authMode, modeProgress]);

  useEffect(() => {
    Animated.timing(passwordMeterProgress, {
      toValue: passwordMeterVisible ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [passwordMeterProgress, passwordMeterVisible]);

  useEffect(() => {
    Animated.timing(passwordStrengthProgress, {
      toValue: passwordStrength.level,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [passwordStrength.level, passwordStrengthProgress]);

  useEffect(() => {
    if (!authBusy) {
      busyPulse.stopAnimation();
      busyPulse.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(busyPulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(busyPulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [authBusy, busyPulse]);

  const registerFieldHeight = modeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 84],
  });
  const registerFieldOpacity = modeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const registerFieldTranslateY = modeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 0],
  });
  const passwordMeterHeight = passwordMeterProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 134],
  });
  const passwordMeterOpacity = passwordMeterProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const passwordMeterTranslateY = passwordMeterProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 0],
  });
  const contentTranslateY = modeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 4],
  });

  const buttonScale = busyPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.985],
  });
  const buttonGlowOpacity = busyPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.16, 0.36],
  });
  const loadingBarTranslate = busyPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [-160, 220],
  });

  const handleFocusField = () => {
    if (authDesktop) return;

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 120, animated: true });
    });
  };

  if (!authReady || !fontsLoaded) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-material-bg">
        <BackgroundOrbs />
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const heroSection = (
    <View
      style={[
        styles.authHero,
        authDesktop && styles.authHeroDesktop,
        !authDesktop && styles.authHeroMobile,
        isCompactMobile && styles.authHeroCompact,
      ]}
    >
      <View style={styles.heroBadge}>
        <Text style={styles.heroBadgeText}>BlueTag</Text>
      </View>

      <View style={[styles.authHeroContent, isCompactMobile && styles.authHeroContentCompact]}>
        <Text style={[styles.authBrand, !authDesktop && styles.authBrandMobile, isCompactMobile && styles.authBrandCompact]}>BlueTag</Text>
        <Text style={[styles.authTitle, !authDesktop && styles.authTitleMobile, isCompactMobile && styles.authTitleCompact]}>
          ดูแท็กแต่ละตัวได้ง่ายขึ้นจากหน้าเดียว
        </Text>
        <Text style={[styles.authCopy, !authDesktop && styles.authCopyMobile, isCompactMobile && styles.authCopyCompact]}>
          ล็อกอินเข้าไปแล้วค่อยดูตำแหน่งย้อนหลัง เช็กสถานะ และจัดการ Web ID ต่อได้เลย
        </Text>
      </View>

      <View style={styles.authHeroDivider} />
    </View>
  );

  const submitButton = (
    <Animated.View
      style={[
        styles.authSubmitShell,
        authBusy && {
          transform: [{ scale: buttonScale }],
        },
      ]}
    >
      {authBusy ? (
        <>
          <Animated.View style={[styles.authSubmitGlow, { opacity: buttonGlowOpacity }]} />
          <Animated.View style={[styles.authSubmitBeam, { transform: [{ translateX: loadingBarTranslate }] }]} />
        </>
      ) : null}

      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          authBusy && styles.primaryButtonDisabled,
          submitHovered ? { opacity: 0.9 } : null,
          pressed ? { opacity: 0.72 } : null,
        ]}
        disabled={authBusy}
        onHoverIn={() => setSubmitHovered(true)}
        onHoverOut={() => setSubmitHovered(false)}
        onPress={onSubmit}
      >
        <View style={styles.authSubmitContent}>
          {authBusy ? <ActivityIndicator size="small" color="#f8fafc" /> : null}
          <Text style={styles.primaryButtonText}>
            {authBusy ? 'กำลังดำเนินการ...' : authMode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );

  const cardSection = (
    <View
      style={[
        styles.authCard,
        authDesktop && styles.authCardDesktop,
        !authDesktop && styles.authCardMobile,
        isCompactMobile && styles.authCardCompact,
      ]}
    >
      <View style={styles.authModeSwitch}>
        <Pressable
          style={({ pressed }) => [
            styles.authModePill,
            authMode === 'login' && styles.authModePillActive,
            loginHovered ? { opacity: 0.88 } : null,
            pressed ? { opacity: 0.62 } : null,
          ]}
          disabled={authBusy || authMode === 'login'}
          onHoverIn={() => setLoginHovered(true)}
          onHoverOut={() => setLoginHovered(false)}
          onPress={authMode === 'register' ? onToggleMode : undefined}
        >
          <Text style={[styles.authModeText, isCompactMobile && styles.authModeTextCompact, authMode === 'login' && styles.authModeTextActive]}>
            เข้าสู่ระบบ
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.authModePill,
            authMode === 'register' && styles.authModePillActive,
            registerHovered ? { opacity: 0.88 } : null,
            pressed ? { opacity: 0.62 } : null,
          ]}
          disabled={authBusy || authMode === 'register'}
          onHoverIn={() => setRegisterHovered(true)}
          onHoverOut={() => setRegisterHovered(false)}
          onPress={authMode === 'login' ? onToggleMode : undefined}
        >
          <Text style={[styles.authModeText, isCompactMobile && styles.authModeTextCompact, authMode === 'register' && styles.authModeTextActive]}>
            สมัครสมาชิก
          </Text>
        </Pressable>
      </View>

      <Animated.View
        style={[
          styles.authCardHeader,
          !authDesktop && styles.authCardHeaderMobile,
          isCompactMobile && styles.authCardHeaderCompact,
          { transform: [{ translateY: contentTranslateY }] },
        ]}
      >
        <Text style={styles.authEyebrow}>{authMode === 'login' ? 'เข้าใช้งาน' : 'สมัครใช้งาน'}</Text>
        <Text style={[styles.authCardTitle, !authDesktop && styles.authCardTitleMobile, isCompactMobile && styles.authCardTitleCompact]}>
          {authMode === 'login' ? 'ยินดีต้อนรับกลับ' : 'สร้างบัญชีใหม่'}
        </Text>
        <Text style={[styles.authCardCopy, isCompactMobile && styles.authCardCopyCompact]}>
          {authMode === 'login' ? 'กรอกอีเมลกับรหัสผ่านเพื่อเข้าใช้งาน' : 'กรอกข้อมูลสั้น ๆ แล้วเริ่มใช้งานได้เลย'}
        </Text>
      </Animated.View>

      <Animated.View style={[styles.authFormFields, { transform: [{ translateY: contentTranslateY }] }]}>
        <View style={styles.authFieldGroup}>
          <Text style={styles.authFieldLabel}>อีเมล</Text>
          <TextInput
            style={styles.authInput}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="next"
            placeholder="email@bluetag.local"
            placeholderTextColor="#94a3b8"
            value={authEmail}
            onChangeText={onChangeEmail}
            onFocus={handleFocusField}
            editable={!authBusy}
          />
        </View>

        <Animated.View
          style={[
            styles.authAnimatedField,
            {
              height: registerFieldHeight,
              opacity: registerFieldOpacity,
              transform: [{ translateY: registerFieldTranslateY }],
            },
          ]}
          pointerEvents={authMode === 'register' ? 'auto' : 'none'}
        >
          <View style={styles.authFieldGroup}>
            <Text style={styles.authFieldLabel}>ชื่อที่ใช้แสดง</Text>
            <TextInput
              style={styles.authInput}
              placeholder="ชื่อของคุณ"
              placeholderTextColor="#94a3b8"
              returnKeyType="next"
              value={authName}
              onChangeText={onChangeName}
              onFocus={handleFocusField}
              editable={authMode === 'register' && !authBusy}
            />
          </View>
        </Animated.View>

        <View style={styles.authFieldGroup}>
          <View style={styles.authFieldHeader}>
            <Text style={styles.authFieldLabel}>รหัสผ่าน</Text>
            <Text style={styles.authFieldHint}>{authMode === 'register' ? 'อย่างน้อย 8 ตัวอักษร' : 'อย่าลืมกรอกให้ครบ'}</Text>
          </View>
          <TextInput
            style={styles.authInput}
            secureTextEntry
            placeholder="กรอกรหัสผ่าน"
            placeholderTextColor="#94a3b8"
            returnKeyType="done"
            value={authPassword}
            onChangeText={onChangePassword}
            onFocus={handleFocusField}
            onSubmitEditing={onSubmit}
            editable={!authBusy}
          />
        </View>

        <Animated.View
          style={[
            styles.authAnimatedField,
            {
              height: passwordMeterHeight,
              opacity: passwordMeterOpacity,
              transform: [{ translateY: passwordMeterTranslateY }],
            },
          ]}
          pointerEvents={passwordMeterVisible ? 'auto' : 'none'}
        >
          <View style={styles.passwordStrengthCard}>
            <View style={styles.passwordStrengthHeader}>
              <Text style={styles.passwordStrengthLabel}>ความแข็งแรงของรหัสผ่าน</Text>
              <Text style={[styles.passwordStrengthBadge, { color: passwordStrength.color }]}>{passwordStrength.label}</Text>
            </View>
            <View style={styles.passwordStrengthTrack}>
              {[0, 1, 2].map((index) => (
                <View
                  key={index}
                  style={styles.passwordStrengthSegment}
                >
                  <Animated.View
                    style={[
                      styles.passwordStrengthSegmentFill,
                      {
                        backgroundColor: passwordStrength.color,
                        width: passwordStrengthProgressToWidth(passwordStrengthProgress, index),
                        opacity: passwordStrengthStrengthProgressToOpacity(passwordStrengthProgress, index),
                      },
                    ]}
                  />
                </View>
              ))}
            </View>
            <View style={styles.passwordStrengthChecklist}>
              {passwordStrength.checks.slice(0, 4).map((item) => (
                <View key={item.key} style={[styles.passwordStrengthItemCard, isCompactMobile && styles.passwordStrengthItemCardCompact]}>
                  <Text style={[styles.passwordStrengthItem, item.pass ? styles.passwordStrengthItemPass : null]}>
                    {item.pass ? 'ผ่าน' : 'ยังไม่ครบ'} · {item.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>
      </Animated.View>

      {!authDesktop ? <View style={styles.authMobileSpacer} /> : null}

      {authError ? (
        <View style={styles.authErrorBox}>
          <Text style={styles.authErrorText}>{authError}</Text>
        </View>
      ) : null}

      {submitButton}

      <Pressable
        style={({ pressed }) => [styles.authSwitchLink, switchHovered ? { opacity: 0.86 } : null, pressed ? { opacity: 0.72 } : null]}
        disabled={authBusy}
        onHoverIn={() => setSwitchHovered(true)}
        onHoverOut={() => setSwitchHovered(false)}
        onPress={onToggleMode}
      >
        <Text style={styles.authSwitchLinkText}>
          {authMode === 'login' ? 'ยังไม่มีบัญชี? สมัครตรงนี้ได้เลย' : 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ'}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-material-bg">
      <StatusBar style="dark" />
      <BackgroundOrbs />
      <KeyboardAvoidingView
        style={styles.authKeyboardShell}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <View style={styles.authLayoutFrame}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.authScrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            bounces={false}
          >
            <View
              style={[
                styles.authShell,
                authDesktop && styles.authShellDesktop,
                !authDesktop && styles.authShellMobile,
                isCompactMobile && styles.authShellCompact,
                isShortScreen && styles.authShellShort,
              ]}
            >
              {authDesktop ? (
                <>
                  {heroSection}
                  {cardSection}
                </>
              ) : (
                cardSection
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
