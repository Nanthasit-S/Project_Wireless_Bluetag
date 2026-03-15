import { StyleSheet, Text, View } from 'react-native';
import { LocationHistoryPanel } from '../../dashboard/LocationHistoryPanel';
import { MapSection } from '../../dashboard/MapSection';
import type { DesktopDashboardActions, DesktopDashboardViewModel } from '../../../types/appViewModels';
import { DesktopTagNicknamePanel } from './DesktopTagNicknamePanel';

interface DesktopDashboardSectionsProps {
  viewModel: DesktopDashboardViewModel;
  actions: DesktopDashboardActions;
}

export function DesktopDashboardSections({ viewModel, actions }: DesktopDashboardSectionsProps) {
  const shouldShowHistoryPanel = viewModel.historyLoading || viewModel.historyItems.length > 0;
  const hasConnectedBlueTag = viewModel.selectableTags.length > 0;

  if (!hasConnectedBlueTag) {
    return (
      <View className="rounded-[28px] border border-slate-200 bg-white/95 p-6 gap-4">
        <View className="gap-1">
          <Text className="text-[24px] font-bold text-slate-950" style={styles.heading}>
            ยังไม่พบ BlueTag
          </Text>
          <Text className="text-sm text-slate-600" style={styles.body}>
            ตอนนี้ยังไม่มี BlueTag ที่ผูกหรือเชื่อมต่อกับบัญชีนี้ จึงยังไม่แสดงแผนที่หลัก
          </Text>
        </View>

        <View className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-5 gap-2">
          <Text className="text-base text-slate-950" style={styles.label}>
            สิ่งที่จะขึ้นเมื่อมี BlueTag
          </Text>
          <Text className="text-sm text-slate-600" style={styles.body}>
            เมื่อมีแท็กอย่างน้อย 1 ตัว ระบบจะค่อยแสดงแผนที่หลัก รายการ BlueTag และประวัติตำแหน่งให้อัตโนมัติ
          </Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <View className="flex-row items-start gap-4">
        <View className="flex-[1.45] gap-4">
          <MapSection
            mapLat={viewModel.mapLat}
            mapLng={viewModel.mapLng}
            selectedTagId={viewModel.selectedTagId}
            selectedTagLabel={
              viewModel.selectableTags.find((tag) => tag.tagId === viewModel.selectedTagId)?.name ?? viewModel.locationTitle
            }
            mapMarkers={viewModel.markers}
            mapSummary={viewModel.mapSummary}
            showLocalhostWarning={viewModel.showLocalhostWarning}
            onSelectTag={actions.onDesktopPickTag}
            isLoading={viewModel.historyLoading && viewModel.markers.length === 0}
          />
        </View>

        <View className="flex-1 gap-4">
          <DesktopTagNicknamePanel
            tags={viewModel.selectableTags}
            selectedTagId={viewModel.selectedTagId}
            onPickTag={actions.onDesktopPickTag}
            onSaveNickname={actions.onSaveTagNickname}
          />
        </View>
      </View>

      {shouldShowHistoryPanel ? (
        <LocationHistoryPanel
          title={viewModel.historyTitle}
          items={viewModel.historyItems}
          loading={viewModel.historyLoading}
          loadingMore={viewModel.historyLoadingMore}
          hasMore={Boolean(viewModel.historyCursor)}
          selectedItemId={viewModel.historyFocusId}
          onSelectItem={actions.onSelectHistoryItem}
          onLoadMore={actions.onLoadMoreHistory}
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
