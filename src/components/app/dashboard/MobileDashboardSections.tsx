import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { MapSection } from '../../dashboard/MapSection';
import { NearbySection } from '../../dashboard/NearbySection';
import { RingSection } from '../../dashboard/RingSection';
import { ScanSection } from '../../dashboard/ScanSection';
import { TagManagerSection } from '../../dashboard/TagManagerSection';
import type { MobileDashboardActions, MobileDashboardViewModel } from '../../../types/appViewModels';

interface MobileDashboardSectionsProps {
  viewModel: MobileDashboardViewModel;
  actions: MobileDashboardActions;
}

export function MobileDashboardSections({ viewModel, actions }: MobileDashboardSectionsProps) {
  const shouldShowAutoScanState = !viewModel.isWeb && viewModel.tagList.length === 0;

  useEffect(() => {
    if (!shouldShowAutoScanState) return;
    if (!viewModel.bleReady) return;
    if (viewModel.isScanning) return;

    actions.onStartScan();
  }, [actions, shouldShowAutoScanState, viewModel.bleReady, viewModel.isScanning]);

  return (
    <>
      <View className="rounded-[28px] border border-slate-200 bg-white/95 p-4 gap-2">
        <Text className="text-slate-500 text-xs font-semibold uppercase tracking-[1px]" style={styles.label}>
          รหัสเชื่อมต่อของบัญชีนี้
        </Text>
        <Text className="text-slate-950 text-xl font-bold" style={styles.heading}>
          {viewModel.selectedWebId || 'ยังไม่มีรหัสเชื่อมต่อ'}
        </Text>
        <Text className="text-slate-600 text-sm" style={styles.body}>
          หน้าแอปมือถือเอาไว้ดูตำแหน่งและหา BlueTag ได้เลย ถ้าจะจัดการบอร์ดผ่าน USB ให้ทำจากหน้าแอดมินบนเว็บ
        </Text>
      </View>

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

      {shouldShowAutoScanState ? (
        <View className="rounded-[30px] border border-slate-200 bg-white/95 p-5 gap-4 items-center">
          <View className="w-14 h-14 rounded-full bg-sky-100 items-center justify-center">
            <ActivityIndicator size="small" color="#0284c7" />
          </View>

          <View className="gap-1 items-center">
            <Text className="text-slate-950 text-[22px] font-bold" style={styles.heading}>
              กำลังค้นหา BlueTag
            </Text>
            <Text className="text-slate-600 text-sm text-center" style={styles.body}>
              ระบบกำลังรีเฟรชสัญญาณให้อัตโนมัติ ถ้าเจอ BlueTag เมื่อไร รายการจะแสดงขึ้นมาเอง
            </Text>
          </View>

          <View className="rounded-[20px] bg-sky-50 border border-sky-200 px-4 py-4 w-full gap-1">
            <Text className="text-sky-700 text-xs font-semibold uppercase tracking-[1px]" style={styles.label}>
              สถานะการค้นหา
            </Text>
            <Text className="text-slate-950 text-base font-bold" style={styles.value}>
              {viewModel.isScanning ? 'กำลังสแกนสัญญาณอยู่' : 'กำลังเตรียมเริ่มสแกน'}
            </Text>
            <Text className="text-slate-600 text-sm" style={styles.body}>
              {viewModel.message || 'รอสัญญาณจาก BlueTag ใกล้เคียง'}
            </Text>
          </View>
        </View>
      ) : (
        <ScanSection
          bleReady={viewModel.bleReady}
          isScanning={viewModel.isScanning}
          autoRingEnabled={viewModel.autoRingEnabled}
          targetTag={viewModel.targetTag}
          message={viewModel.message}
          targetSummary={viewModel.targetSummary}
          disableBleActions={!viewModel.shouldShowBleControl}
          allowTargetInput={!viewModel.isMobileWeb}
          showAutoRingToggle={viewModel.shouldShowBleControl}
          restrictionNote={
            viewModel.isMobileWeb ? 'Mobile web focuses on map viewing. Use the native app for full scan control.' : undefined
          }
          onStartScan={actions.onStartScan}
          onStopScan={actions.onStopScan}
          onToggleAutoRing={actions.onToggleAutoRing}
          onChangeTargetTag={actions.setTargetTag}
        />
      )}

      {viewModel.shouldShowManualRing ? (
        <RingSection onOff={actions.onManualOff} onSlow={actions.onManualSlow} onFast={actions.onManualFast} />
      ) : null}

      {viewModel.shouldShowNearby ? (
        <NearbySection
          tags={viewModel.tagList}
          formatDistanceMeters={viewModel.formatDistanceMeters}
          rssiZone={viewModel.rssiZone}
          onPickTag={actions.setTargetTag}
          tagBindings={viewModel.tagBindings}
        />
      ) : null}

      {!shouldShowAutoScanState ? (
        <TagManagerSection
          tags={viewModel.tagList}
          selectedTagId={viewModel.mapQueryTag}
          tagNicknames={viewModel.tagNicknames}
          onPickTag={actions.setTargetTag}
          onSaveNickname={actions.onSaveTagNickname}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontFamily: 'Sarabun_700Bold',
  },
  body: {
    fontFamily: 'Sarabun_400Regular',
  },
  label: {
    fontFamily: 'Sarabun_600SemiBold',
  },
  value: {
    fontFamily: 'Sarabun_700Bold',
  },
});
