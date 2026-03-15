import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { MapSection } from '../../dashboard/MapSection';
import { NearbySection } from '../../dashboard/NearbySection';
import { RingSection } from '../../dashboard/RingSection';
import { TagManagerSection } from '../../dashboard/TagManagerSection';
import type { MobileDashboardActions, MobileDashboardViewModel } from '../../../types/appViewModels';

interface MobileDashboardSectionsProps {
  viewModel: MobileDashboardViewModel;
  actions: MobileDashboardActions;
}

export function MobileDashboardSections({ viewModel, actions }: MobileDashboardSectionsProps) {
  const { width } = useWindowDimensions();
  const isCompactMobile = width < 420;
  const pulse = useRef(new Animated.Value(0)).current;
  const autoScanStartedRef = useRef(false);
  const [pendingConnectTagId, setPendingConnectTagId] = useState('');
  const [disconnectConfirmOpen, setDisconnectConfirmOpen] = useState(false);
  const [factoryResetConfirmOpen, setFactoryResetConfirmOpen] = useState(false);
  const [factoryResetDropdownOpen, setFactoryResetDropdownOpen] = useState(false);
  const shouldAutoScan = !viewModel.isWeb && viewModel.shouldShowBleControl && !viewModel.connectedTagId;
  const showConnectedUi = Boolean(viewModel.connectedTagId);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1500,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    if (!shouldAutoScan) {
      autoScanStartedRef.current = false;
      return;
    }
    if (!viewModel.bleReady || viewModel.isScanning || autoScanStartedRef.current) return;

    autoScanStartedRef.current = true;
    actions.onStartScan();
  }, [actions, shouldAutoScan, viewModel.bleReady, viewModel.isScanning]);

  const primaryPulseStyle = {
    transform: [
      {
        scale: pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0.92, 1.08],
        }),
      },
    ],
    opacity: pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.72, 1],
    }),
  };

  const secondaryPulseStyle = {
    transform: [
      {
        scale: pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [1.02, 1.28],
        }),
      },
    ],
    opacity: pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.22, 0],
    }),
  };

  const pendingConnectTag = pendingConnectTagId
    ? viewModel.tagList.find((tag) => tag.tagId === pendingConnectTagId) ?? null
    : null;
  return (
    <>
      {!showConnectedUi ? (
        <View style={[styles.scanHero, isCompactMobile && styles.scanHeroCompact]}>
          <View pointerEvents="none" style={styles.scanHeroGlowBlue} />
          <View pointerEvents="none" style={styles.scanHeroGlowGold} />

          <View pointerEvents="none" style={styles.radarWrap}>
            <Animated.View pointerEvents="none" style={[styles.radarPulseOuter, secondaryPulseStyle]} />
            <Animated.View pointerEvents="none" style={[styles.radarPulseInner, primaryPulseStyle]} />
            <View style={styles.radarCore}>
              <Text style={styles.radarCoreText}>{viewModel.tagList.length}</Text>
            </View>
          </View>

          <View style={styles.scanHeroCopyBlock}>
            <Text style={styles.scanHeroEyebrow}>{viewModel.isScanning ? 'AUTO SCANNING' : 'BLUETOOTH READY'}</Text>
            <Text style={[styles.scanHeroTitle, isCompactMobile && styles.scanHeroTitleCompact]}>
              {viewModel.tagList.length > 0 ? 'เจอ BlueTag แล้ว เลือกเครื่องที่ต้องการเชื่อมต่อ' : 'กำลังสแกนหา BlueTag ให้อัตโนมัติ'}
            </Text>
            <Text style={styles.scanHeroBody}>
              {viewModel.tagList.length > 0
                ? 'กด Connect ที่การ์ดของ BlueTag เพื่อเปิดแผงควบคุมเสียงของเครื่องนั้น'
                : viewModel.message || 'แอปจะค้นหา BlueTag รอบตัวเองอัตโนมัติทันทีเมื่อเข้าหน้านี้'}
            </Text>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.scanRefreshButton, pressed ? styles.scanRefreshButtonPressed : null]}
              onPress={actions.onRefreshScan}
            >
              <Text style={styles.scanRefreshButtonText}>รีเฟรชรายการ BlueTag</Text>
              <Text style={styles.scanRefreshButtonCaption}>ค้างรายการที่เจอไว้ 1 นาที และแตะเพื่อล้างรายการเก่าแล้วสแกนใหม่</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {!viewModel.isWeb && !showConnectedUi ? (
        <View style={styles.discoveryPanel}>
          {viewModel.tagList.length === 0 ? (
            <View style={styles.emptyStateCard}>
              <Text style={styles.emptyStateTitle}>ยังไม่พบ BlueTag</Text>
              <Text style={styles.emptyStateBody}>ขยับบอร์ดให้ใกล้ขึ้นหรือรอสักครู่ แอปกำลังสแกนให้อัตโนมัติอยู่</Text>
            </View>
          ) : (
            <View style={styles.discoveryList}>
              {viewModel.tagList.map((tag) => {
                const connected = viewModel.connectedTagId === tag.tagId;
                const access = viewModel.tagAccessById[tag.tagId];
                const blockedByOtherWebId =
                  access?.access === 'bound_to_my_web_id' && Boolean(access.web_id) && access.web_id !== viewModel.selectedWebId;
                const blockedByOtherAccount = access?.access === 'bound_to_other_account';
                const connectDisabled = !connected && (blockedByOtherWebId || blockedByOtherAccount);
                const boundToThisWebId = access?.access === 'bound_to_my_web_id' && access.web_id === viewModel.selectedWebId;
                const accessLabel = blockedByOtherAccount
                  ? 'ผูกกับบัญชีอื่นอยู่'
                  : blockedByOtherWebId
                    ? `ผูกกับ ${access?.web_id} อยู่`
                    : boundToThisWebId
                      ? `ผูกกับ ${access.web_id} และอยู่ในระยะ`
                      : access?.access === 'bound_to_my_web_id'
                        ? `ผูกกับ ${access.web_id}`
                      : 'พร้อมเชื่อมต่อ';
                return (
                  <View key={tag.tagId} style={[styles.tagCard, connected && styles.tagCardConnected]}>
                    <View style={styles.tagCardTopRow}>
                      <View style={styles.tagIdentityBlock}>
                        <Text style={styles.tagName}>{tag.name || 'BlueTag'}</Text>
                        <Text style={styles.tagId}>{tag.tagId}</Text>
                      </View>
                      <View style={[styles.signalPill, connected && styles.signalPillConnected]}>
                        <Text style={[styles.signalPillText, connected && styles.signalPillTextConnected]}>{tag.rssi} dBm</Text>
                      </View>
                    </View>

                    <Text style={styles.tagMeta}>
                      ระยะ {viewModel.formatDistanceMeters(tag.rssi)} | {viewModel.rssiZone(tag.rssi)} | แบตเตอรี่ {tag.battery ?? '-'}%
                    </Text>
                    <Text style={styles.tagLastSeen}>เจอล่าสุด {tag.lastSeen || '-'}</Text>
                    <Text style={[styles.tagAccessStatus, connectDisabled ? styles.tagAccessStatusBlocked : styles.tagAccessStatusReady]}>{accessLabel}</Text>

                    <Pressable
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.tagPrimaryButtonPressable,
                        connectDisabled ? styles.tagPrimaryButtonPressableDisabled : null,
                        pressed ? styles.tagPrimaryButtonPressablePressed : null,
                      ]}
                      disabled={connectDisabled}
                      onPress={() => {
                        if (connected) {
                          setDisconnectConfirmOpen(true);
                          return;
                        }
                        setPendingConnectTagId(tag.tagId);
                      }}
                    >
                      <View
                        style={[
                          styles.tagPrimaryButtonShell,
                          connected ? styles.tagDisconnectButtonShell : null,
                          connectDisabled ? styles.tagPrimaryButtonShellDisabled : null,
                        ]}
                      >
                        <View pointerEvents="none" style={styles.tagPrimaryButtonContent}>
                          <Text style={styles.tagPrimaryButtonText}>
                            {connected ? 'DISCONNECT BLUETAG' : connectDisabled ? 'CONNECT LOCKED' : 'CONNECT BLUETAG'}
                          </Text>
                          <Text style={styles.tagPrimaryButtonCaption}>
                            {connected
                              ? 'แตะเพื่อตัดการเชื่อมต่ออุปกรณ์นี้'
                              : connectDisabled
                                ? 'บอร์ดนี้ถูกผูกอยู่แล้ว จึงเชื่อมต่อจาก ID นี้ไม่ได้'
                                : 'แตะเพื่อยืนยันการเชื่อมต่อ'}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      ) : null}

      {showConnectedUi ? (
        <>
          <MapSection
            mapLat={viewModel.mapLat}
            mapLng={viewModel.mapLng}
            selectedTagId={viewModel.mapQueryTag}
            selectedTagLabel={viewModel.targetSeenLabel}
            mapMarkers={viewModel.mapMarkers}
            mapSummary={viewModel.mapSummary}
            showLocalhostWarning={viewModel.showLocalhostWarning}
            onSelectTag={actions.setTargetTag}
          />
        </>
      ) : null}

      {!viewModel.isWeb && showConnectedUi ? (
        <View style={styles.discoveryPanel}>
          <View style={styles.discoveryHeader}>
          </View>

          {viewModel.tagList.length === 0 ? (
            <View style={styles.emptyStateCard}>
              <Text style={styles.emptyStateTitle}>ยังไม่พบ BlueTag</Text>
              <Text style={styles.emptyStateBody}>ขยับบอร์ดให้ใกล้ขึ้นหรือรอสักครู่ แอปกำลังสแกนให้อัตโนมัติอยู่</Text>
            </View>
          ) : (
            <View style={styles.discoveryList}>
              {viewModel.tagList.map((tag) => {
                const connected = viewModel.connectedTagId === tag.tagId;
                const access = viewModel.tagAccessById[tag.tagId];
                const blockedByOtherWebId =
                  access?.access === 'bound_to_my_web_id' && Boolean(access.web_id) && access.web_id !== viewModel.selectedWebId;
                const blockedByOtherAccount = access?.access === 'bound_to_other_account';
                const connectDisabled = !connected && (blockedByOtherWebId || blockedByOtherAccount);
                const accessLabel = blockedByOtherAccount
                  ? 'ผูกกับบัญชีอื่นอยู่'
                  : blockedByOtherWebId
                    ? `ผูกกับ ${access?.web_id} อยู่`
                    : access?.access === 'bound_to_my_web_id'
                      ? `ผูกกับ ${access.web_id}`
                      : 'พร้อมเชื่อมต่อ';
                return (
                  <View key={tag.tagId} style={[styles.tagCard, connected && styles.tagCardConnected]}>
                    <View style={styles.tagCardTopRow}>
                      <View style={styles.tagIdentityBlock}>
                        <Text style={styles.tagName}>{tag.name || 'BlueTag'}</Text>
                        <Text style={styles.tagId}>{tag.tagId}</Text>
                      </View>
                      <View style={[styles.signalPill, connected && styles.signalPillConnected]}>
                        <Text style={[styles.signalPillText, connected && styles.signalPillTextConnected]}>{tag.rssi} dBm</Text>
                      </View>
                    </View>

                    <Text style={styles.tagMeta}>
                      ระยะ {viewModel.formatDistanceMeters(tag.rssi)} | {viewModel.rssiZone(tag.rssi)} | แบตเตอรี่ {tag.battery ?? '-'}%
                    </Text>
                    <Text style={styles.tagLastSeen}>เจอล่าสุด {tag.lastSeen || '-'}</Text>
                    <Text style={[styles.tagAccessStatus, connectDisabled ? styles.tagAccessStatusBlocked : styles.tagAccessStatusReady]}>{accessLabel}</Text>

                    <Pressable
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.tagPrimaryButtonPressable,
                        connectDisabled ? styles.tagPrimaryButtonPressableDisabled : null,
                        pressed ? styles.tagPrimaryButtonPressablePressed : null,
                      ]}
                      disabled={connectDisabled}
                      onPress={() => {
                        if (connected) {
                          setDisconnectConfirmOpen(true);
                          return;
                        }
                        setPendingConnectTagId(tag.tagId);
                      }}
                    >
                      <View
                        style={[
                          styles.tagPrimaryButtonShell,
                          connected ? styles.tagDisconnectButtonShell : null,
                          connectDisabled ? styles.tagPrimaryButtonShellDisabled : null,
                        ]}
                      >
                        <View pointerEvents="none" style={styles.tagPrimaryButtonContent}>
                          <Text style={styles.tagPrimaryButtonText}>
                            {connected ? 'DISCONNECT BLUETAG' : connectDisabled ? 'CONNECT LOCKED' : 'CONNECT BLUETAG'}
                          </Text>
                          <Text style={styles.tagPrimaryButtonCaption}>
                            {connected
                              ? 'แตะเพื่อตัดการเชื่อมต่ออุปกรณ์นี้'
                              : connectDisabled
                                ? 'บอร์ดนี้ถูกผูกอยู่แล้ว จึงเชื่อมต่อจาก ID นี้ไม่ได้'
                                : 'แตะเพื่อยืนยันการเชื่อมต่อ'}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      ) : null}

      {viewModel.shouldShowManualRing ? (
        <>
          <RingSection
            targetTagId={viewModel.ringTargetTagId}
            autoRingEnabled={viewModel.autoRingEnabled}
            onToggleAutoRing={actions.onToggleAutoRing}
            onOff={actions.onManualOff}
            onSlow={actions.onManualSlow}
          />
        </>
      ) : null}

      {viewModel.shouldShowNearby && viewModel.isWeb ? (
        <NearbySection
          tags={viewModel.tagList}
          formatDistanceMeters={viewModel.formatDistanceMeters}
          rssiZone={viewModel.rssiZone}
          onPickTag={actions.setTargetTag}
          onConnectTag={actions.onConnectTag}
          connectedTagId={viewModel.connectedTagId}
          tagBindings={viewModel.tagBindings}
        />
      ) : null}

      {showConnectedUi && viewModel.tagList.length > 0 ? (
        <>
          <TagManagerSection
            tags={viewModel.tagList}
            selectedTagId={viewModel.mapQueryTag}
            tagNicknames={viewModel.tagNicknames}
            onPickTag={actions.setTargetTag}
            onSaveNickname={actions.onSaveTagNickname}
          />

          <View style={styles.factoryResetDropdownCard}>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.factoryResetDropdownToggle, pressed ? styles.pressed : null]}
              onPress={() => setFactoryResetDropdownOpen((current) => !current)}
            >
              <View style={styles.factoryResetDropdownCopy}>
                <Text style={styles.factoryResetDropdownEyebrow}>Factory Reset</Text>
                <Text style={styles.factoryResetDropdownTitle}>รีเซ็ต BlueTag กลับค่าโรงงาน</Text>
                <Text style={styles.factoryResetDropdownHint}>
                  {factoryResetDropdownOpen ? 'ซ่อนรายละเอียด' : 'แตะเพื่อดูรายละเอียด'}
                </Text>
              </View>
            </Pressable>

            {factoryResetDropdownOpen ? (
              <View style={styles.factoryResetDropdownBodyWrap}>
                <Text style={styles.dangerZoneBody}>
                  รายการนี้จะรีเซ็ตบอร์ด, ยกเลิกการผูกกับ {viewModel.selectedWebId || 'บัญชีนี้'}, ล้างข้อมูล current state ในระบบ และบันทึกประวัติการรีเซ็ตไว้
                </Text>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.factoryResetButtonPressable, pressed ? styles.factoryResetButtonPressablePressed : null]}
                  onPress={() => setFactoryResetConfirmOpen(true)}
                >
                  <View style={styles.factoryResetButton}>
                    <Text style={styles.factoryResetButtonText}>FACTORY RESET</Text>
                    <Text style={styles.factoryResetButtonCaption}>ล้างบอร์ดและยกเลิกการผูกอัตโนมัติ</Text>
                  </View>
                </Pressable>
              </View>
            ) : null}
          </View>
        </>
      ) : null}

      <Modal transparent visible={Boolean(pendingConnectTag)} animationType="fade">
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPendingConnectTagId('')} />
          <View style={styles.modalCard}>
            <Text style={styles.modalEyebrow}>Confirm Connection</Text>
            <Text style={styles.modalTitle}>เชื่อมต่อกับ BlueTag นี้ใช่ไหม</Text>
            <Text style={styles.modalTagName}>{pendingConnectTag?.name || 'BlueTag'}</Text>
            <Text style={styles.modalTagId}>{pendingConnectTag?.tagId || '-'}</Text>
            <Text style={styles.modalBody}>
              หลังเชื่อมต่อแล้ว แผนที่และแผงควบคุมของ BlueTag เครื่องนี้จะถูกเปิดขึ้น
            </Text>

            <View style={styles.modalPrimaryButtonWrap}>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.modalPrimaryButtonPressable, pressed ? styles.modalPrimaryButtonPressablePressed : null]}
                onPress={() => {
                  if (pendingConnectTagId) {
                    actions.onConnectTag(pendingConnectTagId);
                  }
                  setPendingConnectTagId('');
                }}
              >
                <View style={styles.modalPrimaryButton}>
                  <View pointerEvents="none" style={styles.modalPrimaryButtonContent}>
                    <Text style={styles.modalPrimaryButtonText}>CONNECT BLUETAG</Text>
                    <Text style={styles.modalPrimaryButtonCaption}>แตะเพื่อยืนยันการเชื่อมต่อทันที</Text>
                  </View>
                </View>
              </Pressable>
            </View>

            <Pressable style={({ pressed }) => [styles.modalSecondaryButton, pressed ? styles.pressed : null]} onPress={() => setPendingConnectTagId('')}>
              <Text style={styles.modalSecondaryButtonText}>ยกเลิก</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={disconnectConfirmOpen} animationType="fade">
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setDisconnectConfirmOpen(false)} />
          <View style={styles.disconnectModalCard}>
            <Text style={styles.disconnectModalEyebrow}>Disconnect Device</Text>
            <Text style={styles.disconnectModalTitle}>ตัดการเชื่อมต่อ BlueTag นี้ใช่ไหม</Text>
            <Text style={styles.disconnectModalTagId}>{viewModel.connectedTagId || '-'}</Text>
            <Text style={styles.disconnectModalBody}>
              ถ้าตัดการเชื่อมต่อแล้ว หน้าแผนที่และแผงควบคุมจะถูกซ่อนจนกว่าจะเชื่อมต่อใหม่อีกครั้ง
            </Text>

            <View style={styles.disconnectModalPrimaryWrap}>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.disconnectModalPrimaryPressable,
                  pressed ? styles.disconnectModalPrimaryPressablePressed : null,
                ]}
                onPress={() => {
                  setDisconnectConfirmOpen(false);
                  actions.onDisconnectTag();
                }}
              >
                <View style={styles.disconnectModalPrimaryButton}>
                  <View pointerEvents="none" style={styles.disconnectModalPrimaryContent}>
                    <Text style={styles.disconnectModalPrimaryText}>DISCONNECT BLUETAG</Text>
                    <Text style={styles.disconnectModalPrimaryCaption}>แตะเพื่อยืนยันการตัดการเชื่อมต่อ</Text>
                  </View>
                </View>
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [styles.modalSecondaryButton, pressed ? styles.pressed : null]}
              onPress={() => setDisconnectConfirmOpen(false)}
            >
              <Text style={styles.modalSecondaryButtonText}>ยกเลิก</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={factoryResetConfirmOpen} animationType="fade">
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setFactoryResetConfirmOpen(false)} />
          <View style={styles.factoryResetModalCard}>
            <Text style={styles.factoryResetModalEyebrow}>Factory Reset</Text>
            <Text style={styles.factoryResetModalTitle}>รีเซ็ต BlueTag กลับค่าโรงงานใช่ไหม</Text>
            <Text style={styles.factoryResetModalTagId}>{viewModel.connectedTagId || '-'}</Text>
            <Text style={styles.factoryResetModalBody}>
              ระบบจะรีเซ็ตบอร์ด, ยกเลิกการผูกกับ Web ID นี้, ล้างข้อมูล current state ในระบบ และบันทึกประวัติการรีเซ็ตไว้ใน log
            </Text>

            <View style={styles.factoryResetModalPrimaryWrap}>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.factoryResetModalPrimaryPressable,
                  pressed ? styles.factoryResetModalPrimaryPressablePressed : null,
                ]}
                onPress={async () => {
                  const tagId = viewModel.connectedTagId;
                  setFactoryResetConfirmOpen(false);
                  if (!tagId) return;
                  await actions.onFactoryResetTag(tagId);
                }}
              >
                <View style={styles.factoryResetModalPrimaryButton}>
                  <View pointerEvents="none" style={styles.disconnectModalPrimaryContent}>
                    <Text style={styles.factoryResetModalPrimaryText}>RESET BLUETAG</Text>
                    <Text style={styles.factoryResetModalPrimaryCaption}>ยืนยันการล้างบอร์ดและข้อมูลในระบบ</Text>
                  </View>
                </View>
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [styles.modalSecondaryButton, pressed ? styles.pressed : null]}
              onPress={() => setFactoryResetConfirmOpen(false)}
            >
              <Text style={styles.modalSecondaryButtonText}>ยกเลิก</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scanHero: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    padding: 22,
    gap: 18,
  },
  scanHeroCompact: {
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  scanHeroGlowBlue: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    top: -80,
    right: -60,
    backgroundColor: 'rgba(14, 165, 233, 0.18)',
  },
  scanHeroGlowGold: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    bottom: -70,
    left: -40,
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
  },
  radarWrap: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarPulseOuter: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 999,
    backgroundColor: 'rgba(125, 211, 252, 0.18)',
  },
  radarPulseInner: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 999,
    backgroundColor: 'rgba(14, 165, 233, 0.28)',
  },
  radarCore: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarCoreText: {
    color: '#0f172a',
    fontSize: 22,
    fontFamily: 'Sarabun_700Bold',
  },
  scanHeroCopyBlock: {
    gap: 6,
  },
  scanHeroEyebrow: {
    color: '#7dd3fc',
    fontSize: 12,
    letterSpacing: 0.6,
    fontFamily: 'Sarabun_700Bold',
  },
  scanHeroTitle: {
    color: '#f8fafc',
    fontSize: 24,
    lineHeight: 30,
    fontFamily: 'Sarabun_700Bold',
  },
  scanHeroTitleCompact: {
    fontSize: 20,
    lineHeight: 26,
  },
  scanHeroBody: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Sarabun_400Regular',
  },
  scanRefreshButton: {
    marginTop: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.34)',
    backgroundColor: 'rgba(15, 118, 110, 0.28)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 2,
  },
  scanRefreshButtonPressed: {
    transform: [{ scale: 0.985 }],
    backgroundColor: 'rgba(15, 118, 110, 0.42)',
  },
  scanRefreshButtonText: {
    color: '#ecfeff',
    fontSize: 15,
    fontFamily: 'Sarabun_700Bold',
  },
  scanRefreshButtonCaption: {
    color: '#bae6fd',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Sarabun_600SemiBold',
  },
  discoveryPanel: {
    gap: 12,
  },
  discoveryHeader: {
    gap: 2,
  },
  discoveryTitle: {
    color: '#0f172a',
    fontSize: 24,
    fontFamily: 'Sarabun_700Bold',
  },
  discoveryCaption: {
    color: '#64748b',
    fontSize: 13,
    fontFamily: 'Sarabun_400Regular',
  },
  emptyStateCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 18,
    gap: 4,
  },
  emptyStateTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontFamily: 'Sarabun_700Bold',
  },
  emptyStateBody: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Sarabun_400Regular',
  },
  discoveryList: {
    gap: 12,
  },
  discoveryGroup: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 2,
  },
  discoveryGroupTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontFamily: 'Sarabun_700Bold',
  },
  discoveryGroupBody: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Sarabun_400Regular',
  },
  tagCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#dbeafe',
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    padding: 16,
    gap: 10,
  },
  tagCardConnected: {
    borderColor: '#0ea5e9',
    backgroundColor: '#f0f9ff',
  },
  tagCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  tagIdentityBlock: {
    flex: 1,
    gap: 2,
  },
  tagName: {
    color: '#0f172a',
    fontSize: 20,
    fontFamily: 'Sarabun_700Bold',
  },
  tagId: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: 'Sarabun_600SemiBold',
  },
  signalPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  signalPillConnected: {
    backgroundColor: '#0ea5e9',
  },
  signalPillText: {
    color: '#0369a1',
    fontSize: 12,
    fontFamily: 'Sarabun_700Bold',
  },
  signalPillTextConnected: {
    color: '#f8fafc',
  },
  tagMeta: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Sarabun_400Regular',
  },
  tagLastSeen: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Sarabun_600SemiBold',
  },
  tagAccessStatus: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Sarabun_700Bold',
  },
  tagAccessStatusReady: {
    color: '#166534',
  },
  tagAccessStatusBlocked: {
    color: '#b91c1c',
  },
  outOfRangeSection: {
    gap: 10,
    marginTop: 4,
  },
  outOfRangeList: {
    gap: 10,
  },
  outOfRangeCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    padding: 16,
    gap: 8,
  },
  outOfRangeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  outOfRangePill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  outOfRangePillText: {
    color: '#475569',
    fontSize: 12,
    fontFamily: 'Sarabun_700Bold',
  },
  outOfRangeHint: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Sarabun_400Regular',
  },
  tagPrimaryButtonPressable: {
    position: 'relative',
    width: '100%',
    minHeight: 64,
    marginTop: 8,
    borderRadius: 18,
  },
  tagPrimaryButtonPressableDisabled: {
    opacity: 0.92,
  },
  tagPrimaryButtonPressablePressed: {
    transform: [{ scale: 0.985 }],
  },
  tagPrimaryButtonShell: {
    position: 'relative',
    width: '100%',
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#166534',
    paddingVertical: 13,
    paddingHorizontal: 16,
    shadowColor: '#052e16',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    elevation: 6,
  },
  tagDisconnectButtonShell: {
    backgroundColor: '#dc2626',
  },
  tagPrimaryButtonShellDisabled: {
    backgroundColor: '#64748b',
    shadowColor: '#334155',
    shadowOpacity: 0.16,
  },
  tagPrimaryButtonContent: {
    width: '100%',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 2,
    zIndex: 2,
    elevation: 2,
    paddingHorizontal: 8,
  },
  tagPrimaryButtonText: {
    position: 'relative',
    color: '#f8fafc',
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'left',
    fontFamily: 'Sarabun_700Bold',
    letterSpacing: 0.4,
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
    includeFontPadding: false,
  },
  tagPrimaryButtonCaption: {
    position: 'relative',
    marginTop: 2,
    color: '#f8fafc',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'left',
    fontFamily: 'Sarabun_600SemiBold',
    includeFontPadding: false,
  },
  tagSecondaryButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  tagSecondaryButtonText: {
    color: '#0f172a',
    fontSize: 15,
    fontFamily: 'Sarabun_600SemiBold',
  },
  disconnectButtonPressable: {
    width: 146,
    borderRadius: 18,
  },
  disconnectButtonPressablePressed: {
    transform: [{ scale: 0.985 }],
  },
  disconnectButton: {
    borderRadius: 18,
    minHeight: 60,
    backgroundColor: '#dc2626',
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
    shadowColor: '#7f1d1d',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 5,
  },
  disconnectButtonText: {
    color: '#fef2f2',
    fontSize: 14,
    fontFamily: 'Sarabun_700Bold',
  },
  disconnectButtonCaption: {
    marginTop: 1,
    color: '#fee2e2',
    fontSize: 11,
    fontFamily: 'Sarabun_600SemiBold',
  },
  dangerZoneCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff1f2',
    padding: 16,
    gap: 8,
  },
  factoryResetDropdownCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
    padding: 16,
    gap: 10,
  },
  factoryResetDropdownToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  factoryResetDropdownCopy: {
    flex: 1,
    gap: 2,
  },
  factoryResetDropdownEyebrow: {
    color: '#c2410c',
    fontSize: 11,
    letterSpacing: 0.5,
    fontFamily: 'Sarabun_700Bold',
  },
  factoryResetDropdownTitle: {
    color: '#9a3412',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Sarabun_700Bold',
  },
  factoryResetDropdownHint: {
    color: '#c2410c',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Sarabun_600SemiBold',
  },
  factoryResetDropdownCaret: {
    color: '#ea580c',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Sarabun_700Bold',
  },
  factoryResetDropdownBodyWrap: {
    gap: 10,
    paddingTop: 2,
  },
  dangerZoneEyebrow: {
    color: '#b91c1c',
    fontSize: 11,
    letterSpacing: 0.5,
    fontFamily: 'Sarabun_700Bold',
  },
  dangerZoneTitle: {
    color: '#7f1d1d',
    fontSize: 20,
    lineHeight: 26,
    fontFamily: 'Sarabun_700Bold',
  },
  dangerZoneBody: {
    color: '#9a3412',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Sarabun_400Regular',
  },
  factoryResetButtonPressable: {
    borderRadius: 18,
    marginTop: 4,
  },
  factoryResetButtonPressablePressed: {
    transform: [{ scale: 0.985 }],
  },
  factoryResetButton: {
    borderRadius: 18,
    minHeight: 60,
    backgroundColor: '#ea580c',
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    shadowColor: '#9a3412',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 5,
  },
  factoryResetButtonText: {
    color: '#fff7ed',
    fontSize: 16,
    fontFamily: 'Sarabun_700Bold',
  },
  factoryResetButtonCaption: {
    marginTop: 2,
    color: '#ffedd5',
    fontSize: 12,
    fontFamily: 'Sarabun_600SemiBold',
  },
  autoRingCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 16,
    gap: 6,
  },
  autoRingTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontFamily: 'Sarabun_700Bold',
  },
  autoRingBody: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Sarabun_400Regular',
  },
  autoRingButton: {
    marginTop: 4,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  autoRingButtonText: {
    color: '#f8fafc',
    fontSize: 15,
    fontFamily: 'Sarabun_700Bold',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  modalCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(186, 230, 253, 0.7)',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    padding: 20,
    gap: 8,
  },
  modalEyebrow: {
    color: '#0284c7',
    fontSize: 12,
    letterSpacing: 0.5,
    fontFamily: 'Sarabun_700Bold',
  },
  modalTitle: {
    color: '#0f172a',
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'Sarabun_700Bold',
  },
  modalTagName: {
    color: '#0f172a',
    fontSize: 18,
    fontFamily: 'Sarabun_700Bold',
  },
  modalTagId: {
    color: '#64748b',
    fontSize: 13,
    fontFamily: 'Sarabun_600SemiBold',
  },
  modalBody: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Sarabun_400Regular',
  },
  modalPrimaryButtonWrap: {
    marginTop: 8,
    borderRadius: 22,
  },
  modalPrimaryButtonPressable: {
    width: '100%',
    borderRadius: 18,
  },
  modalPrimaryButtonPressablePressed: {
    transform: [{ scale: 0.985 }],
  },
  modalPrimaryButton: {
    width: '100%',
    borderRadius: 18,
    minHeight: 68,
    backgroundColor: '#14532d',
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: '#052e16',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 6,
  },
  modalPrimaryButtonContent: {
    width: '100%',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 3,
  },
  modalPrimaryButtonText: {
    color: '#f8fafc',
    fontSize: 18,
    lineHeight: 22,
    textAlign: 'left',
    fontFamily: 'Sarabun_700Bold',
    letterSpacing: 0.5,
  },
  modalPrimaryButtonCaption: {
    marginTop: 3,
    color: '#f8fafc',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'left',
    fontFamily: 'Sarabun_600SemiBold',
  },
  modalSecondaryButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#94a3b8',
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 10,
  },
  modalSecondaryButtonText: {
    color: '#0f172a',
    fontSize: 15,
    fontFamily: 'Sarabun_600SemiBold',
  },
  disconnectModalCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(252, 165, 165, 0.72)',
    backgroundColor: 'rgba(255, 251, 251, 0.99)',
    padding: 20,
    gap: 8,
  },
  disconnectModalEyebrow: {
    color: '#dc2626',
    fontSize: 12,
    letterSpacing: 0.5,
    fontFamily: 'Sarabun_700Bold',
  },
  disconnectModalTitle: {
    color: '#111827',
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'Sarabun_700Bold',
  },
  disconnectModalTagId: {
    color: '#7f1d1d',
    fontSize: 14,
    fontFamily: 'Sarabun_700Bold',
  },
  disconnectModalBody: {
    color: '#4b5563',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Sarabun_400Regular',
  },
  disconnectModalPrimaryWrap: {
    marginTop: 8,
    borderRadius: 22,
  },
  disconnectModalPrimaryPressable: {
    width: '100%',
    borderRadius: 18,
  },
  disconnectModalPrimaryPressablePressed: {
    transform: [{ scale: 0.985 }],
  },
  disconnectModalPrimaryButton: {
    width: '100%',
    borderRadius: 18,
    minHeight: 68,
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: '#7f1d1d',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 6,
  },
  disconnectModalPrimaryContent: {
    width: '100%',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 3,
  },
  disconnectModalPrimaryText: {
    color: '#fff7ed',
    fontSize: 18,
    lineHeight: 22,
    textAlign: 'left',
    fontFamily: 'Sarabun_700Bold',
    letterSpacing: 0.5,
  },
  disconnectModalPrimaryCaption: {
    marginTop: 3,
    color: '#fee2e2',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'left',
    fontFamily: 'Sarabun_600SemiBold',
  },
  factoryResetModalCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#fdba74',
    backgroundColor: 'rgba(255, 247, 237, 0.99)',
    padding: 20,
    gap: 8,
  },
  factoryResetModalEyebrow: {
    color: '#c2410c',
    fontSize: 12,
    letterSpacing: 0.5,
    fontFamily: 'Sarabun_700Bold',
  },
  factoryResetModalTitle: {
    color: '#111827',
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'Sarabun_700Bold',
  },
  factoryResetModalTagId: {
    color: '#9a3412',
    fontSize: 14,
    fontFamily: 'Sarabun_700Bold',
  },
  factoryResetModalBody: {
    color: '#7c2d12',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Sarabun_400Regular',
  },
  factoryResetModalPrimaryWrap: {
    marginTop: 8,
    borderRadius: 22,
  },
  factoryResetModalPrimaryPressable: {
    width: '100%',
    borderRadius: 18,
  },
  factoryResetModalPrimaryPressablePressed: {
    transform: [{ scale: 0.985 }],
  },
  factoryResetModalPrimaryButton: {
    width: '100%',
    borderRadius: 18,
    minHeight: 68,
    backgroundColor: '#ea580c',
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: '#9a3412',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 6,
  },
  factoryResetModalPrimaryText: {
    color: '#fff7ed',
    fontSize: 18,
    lineHeight: 22,
    textAlign: 'left',
    fontFamily: 'Sarabun_700Bold',
    letterSpacing: 0.5,
  },
  factoryResetModalPrimaryCaption: {
    marginTop: 3,
    color: '#ffedd5',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'left',
    fontFamily: 'Sarabun_600SemiBold',
  },
  pressed: {
    opacity: 0.82,
  },
});
