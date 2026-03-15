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
