import { useEffect, useRef, useState } from 'react';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { Animated, Easing, Modal, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { HeaderCard } from '../dashboard/HeaderCard';
import type { DashboardScreenActions, DashboardScreenViewModel, DashboardView } from '../../types/appViewModels';
import { BackgroundOrbs } from './BackgroundOrbs';
import { DashboardTopBar } from './dashboard/DashboardTopBar';
import { DesktopDashboardSections } from './dashboard/DesktopDashboardSections';
import { MobileDashboardSections } from './dashboard/MobileDashboardSections';
import { UserProfilePanel } from './dashboard/UserProfilePanel';
import { UserSettingsPanel } from './dashboard/UserSettingsPanel';
import { AdminToolsPanel } from './dashboard/AdminToolsPanel';
import { TransitionLoadingDots } from './TransitionLoadingDots';
import { styles } from '../../styles/appStyles';

interface DashboardScreenProps {
  viewModel: DashboardScreenViewModel;
  actions: DashboardScreenActions;
}

const viewLoadingLabel: Record<DashboardView, string> = {
  dashboard: 'กำลังเปิดหน้าหลัก',
  profile: 'กำลังเปิดโปรไฟล์',
  settings: 'กำลังเปิดหน้าตั้งค่า',
  admin: 'กำลังเปิดหน้าแอดมิน',
};

export function DashboardScreen({ viewModel, actions }: DashboardScreenProps) {
  const [currentView, setCurrentView] = useState<DashboardView>('dashboard');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeLoadingLabel, setRouteLoadingLabel] = useState(viewLoadingLabel.dashboard);
  const topProgress = useRef(new Animated.Value(0)).current;
  const sectionProgress = useRef(new Animated.Value(0)).current;
  const logoutConfirmProgress = useRef(new Animated.Value(0)).current;
  const routeOverlayProgress = useRef(new Animated.Value(0)).current;
  const routeTransitionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routeFinishTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    topProgress.setValue(0);
    sectionProgress.setValue(0);
    Animated.stagger(90, [
      Animated.timing(topProgress, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sectionProgress, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [sectionProgress, topProgress]);

  useEffect(() => {
    sectionProgress.setValue(0);
    Animated.timing(sectionProgress, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [currentView, sectionProgress]);

  useEffect(() => {
    Animated.timing(logoutConfirmProgress, {
      toValue: logoutConfirmOpen ? 1 : 0,
      duration: logoutConfirmOpen ? 220 : 160,
      easing: logoutConfirmOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [logoutConfirmOpen, logoutConfirmProgress]);

  useEffect(() => {
    if (routeLoading) {
      routeOverlayProgress.setValue(0);
      Animated.timing(routeOverlayProgress, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(routeOverlayProgress, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [routeLoading, routeOverlayProgress]);

  useEffect(() => {
    if (!viewModel.canAccessAdminTools && currentView === 'admin') {
      setCurrentView('dashboard');
    }
  }, [currentView, viewModel.canAccessAdminTools]);

  useEffect(() => {
    return () => {
      if (routeTransitionTimeout.current) {
        clearTimeout(routeTransitionTimeout.current);
      }
      if (routeFinishTimeout.current) {
        clearTimeout(routeFinishTimeout.current);
      }
    };
  }, []);

  const handleChangeView = (view: DashboardView) => {
    setProfileMenuOpen(false);

    if (view === 'admin' && !viewModel.canAccessAdminTools) {
      return;
    }

    if (routeLoading || currentView === view) {
      return;
    }

    if (routeTransitionTimeout.current) {
      clearTimeout(routeTransitionTimeout.current);
    }
    if (routeFinishTimeout.current) {
      clearTimeout(routeFinishTimeout.current);
    }

    setRouteLoadingLabel(viewLoadingLabel[view]);
    setRouteLoading(true);

    routeTransitionTimeout.current = setTimeout(() => {
      setCurrentView(view);
    }, 520);

    routeFinishTimeout.current = setTimeout(() => {
      setRouteLoading(false);
    }, 700);
  };

  const handleRequestLogout = () => {
    setProfileMenuOpen(false);
    setLogoutConfirmOpen(true);
  };

  const handleConfirmLogout = () => {
    setLogoutConfirmOpen(false);
    actions.onLogout();
  };

  return (
    <SafeAreaView className="flex-1 bg-material-bg">
      <StatusBar style="dark" />
      <BackgroundOrbs />
      <View style={styles.dashboardShell}>
        <ScrollView contentContainerStyle={[styles.scrollShell, { maxWidth: viewModel.dashboardMaxWidth }]}>
          <Animated.View
            style={[
              styles.topBarLayer,
              {
                opacity: topProgress,
                transform: [
                  {
                    translateY: topProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [14, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <DashboardTopBar
              currentView={currentView}
              currentUserName={viewModel.currentUserName}
              currentUserEmail={viewModel.currentUserEmail}
              canAccessAdminTools={viewModel.canAccessAdminTools}
              menuOpen={profileMenuOpen}
              onChangeView={handleChangeView}
              onCloseMenu={() => setProfileMenuOpen(false)}
              onToggleMenu={() => setProfileMenuOpen((current) => !current)}
              onLogout={handleRequestLogout}
            />
          </Animated.View>

          <Animated.View
            style={{
              opacity: topProgress,
              transform: [
                {
                  translateY: topProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                },
              ],
            }}
          >
            <HeaderCard />
          </Animated.View>

          <Animated.View
            style={{
              opacity: sectionProgress,
              transform: [
                {
                  translateY: sectionProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [24, 0],
                  }),
                },
              ],
            }}
          >
            {currentView === 'dashboard' ? (
              <>
                {viewModel.isDesktopWeb ? (
                  <DesktopDashboardSections viewModel={viewModel.desktop} actions={actions} />
                ) : (
                  <MobileDashboardSections viewModel={viewModel.mobile} actions={actions} />
                )}
              </>
            ) : null}

            {currentView === 'profile' ? (
              <UserProfilePanel
                currentUserName={viewModel.currentUserName}
                currentUserEmail={viewModel.currentUserEmail}
                currentConnectionCode={viewModel.currentConnectionCode}
              />
            ) : null}

            {currentView === 'settings' ? (
              <UserSettingsPanel
                backendBase={viewModel.backendBase}
                onChangeBackendBase={actions.onChangeBackendBase}
                onRefreshProfile={actions.onRefreshCurrentUser}
                onLogout={handleRequestLogout}
              />
            ) : null}

            {currentView === 'admin' && viewModel.canAccessAdminTools ? (
              <AdminToolsPanel viewModel={viewModel.desktop} actions={actions} />
            ) : null}

          </Animated.View>
        </ScrollView>

        <Modal transparent visible={routeLoading} animationType="none">
          <View style={styles.routeLoadingModalRoot}>
            <BlurView intensity={14} tint="light" style={styles.routeLoadingBlurLayer} />
            <View style={styles.routeLoadingShadeLayer} />
            <Animated.View
              style={[
                styles.routeLoadingCard,
                {
                  opacity: routeOverlayProgress,
                  transform: [
                    {
                      translateY: routeOverlayProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [16, 0],
                      }),
                    },
                    {
                      scale: routeOverlayProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.97, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TransitionLoadingDots />
              <Text style={styles.routeLoadingTitle}>{routeLoadingLabel}</Text>
              <Text style={styles.routeLoadingCopy}>รอสักครู่ เดี๋ยวหน้าถัดไปจะขึ้นให้ทันที</Text>
            </Animated.View>
          </View>
        </Modal>

        <Modal transparent visible={logoutConfirmOpen} animationType="none" onRequestClose={() => setLogoutConfirmOpen(false)}>
          <View style={styles.logoutModalRoot}>
            <BlurView intensity={16} tint="light" style={styles.logoutModalBlurLayer} />
            <Pressable style={styles.logoutModalShade} onPress={() => setLogoutConfirmOpen(false)} />

            <Animated.View
              style={[
                styles.logoutModalCard,
                {
                  opacity: logoutConfirmProgress,
                  transform: [
                    {
                      translateY: logoutConfirmProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [18, 0],
                      }),
                    },
                    {
                      scale: logoutConfirmProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.96, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.logoutModalBadge}>
                <Text style={styles.logoutModalBadgeText}>ยืนยันก่อนออก</Text>
              </View>
              <View style={styles.logoutModalBody}>
                <Text style={styles.logoutModalTitle}>จะออกจากระบบตอนนี้ใช่ไหม</Text>
                <Text style={styles.logoutModalCopy}>ถ้าออกตอนนี้ ระบบจะพากลับไปหน้าเข้าสู่ระบบทันที</Text>
              </View>
              <View style={styles.logoutModalActions}>
                <Pressable
                  style={({ pressed }) => [styles.logoutModalGhostButton, pressed ? styles.logoutModalGhostButtonPressed : null]}
                  onPress={() => setLogoutConfirmOpen(false)}
                >
                  <Text style={styles.logoutModalGhostText}>อยู่ต่อ</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.logoutModalDangerButton, pressed ? styles.logoutModalDangerButtonPressed : null]}
                  onPress={handleConfirmLogout}
                >
                  <Text style={styles.logoutModalDangerText}>ออกจากระบบ</Text>
                </Pressable>
              </View>
            </Animated.View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
