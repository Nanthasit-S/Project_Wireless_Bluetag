import { Platform } from 'react-native';
import { useMemo } from 'react';
import type { DashboardScreenActions, DashboardScreenViewModel, AuthScreenActions, AuthScreenViewModel } from '../types/appViewModels';
import { formatDistanceMeters, rssiZone } from '../utils/bluetag';

function toBlueTagDisplayName(tagId: string) {
  const suffix = tagId.replace(/^BTAG[-_]?/i, '').trim();
  return suffix ? `BlueTag-${suffix}` : 'BlueTag';
}

export function useAppViewModels(params: {
  width: number;
  backend: ReturnType<typeof import('./useBackendController').useBackendController>;
  ble: ReturnType<typeof import('./useBleController').useBleController>;
  fontsLoaded: boolean;
}) {
  const { width, backend, ble, fontsLoaded } = params;
  const isWeb = Platform.OS === 'web';
  const isDesktopWeb = isWeb && width >= 1024;
  const isMobileWeb = isWeb && width < 768;
  const shouldShowBleControl = !isWeb;
  const shouldShowManualRing = !isWeb;
  const shouldShowNearby = !isMobileWeb;
  const webModeLabel = isDesktopWeb ? 'โหมดเว็บบนคอมพิวเตอร์' : 'โหมดเว็บบนมือถือ';
  const authDesktop = isWeb && width >= 960;
  const dashboardMaxWidth = isDesktopWeb ? 1320 : 980;

  const desktopBindingTags = useMemo(() => {
    const localByTagId = Object.fromEntries(ble.tagList.map((tag) => [tag.tagId, tag]));
    const combined = backend.selectedWebIdOverview.map((item) => {
      const local = localByTagId[item.tag_id];
      const nickname = ble.tagNicknames[item.tag_id];
      if (local) return local;
      return {
        deviceId: item.tag_id,
        tagId: item.tag_id,
        name: nickname || toBlueTagDisplayName(item.tag_id),
        rssi: -120,
        battery: null,
        counter: null,
        lastSeen: item.location_updated_at ?? item.binding_updated_at ?? '-',
        lastSeenMs: Date.now(),
      };
    });

    for (const tag of ble.tagList) {
      if (!combined.some((item) => item.tagId === tag.tagId)) {
        combined.push(tag);
      }
    }

    return combined;
  }, [backend.selectedWebIdOverview, ble.tagList, ble.tagNicknames]);

  const selectedWebTags = useMemo(
    () => desktopBindingTags.filter((tag) => backend.tagBindings[tag.tagId] === backend.selectedWebId),
    [backend.selectedWebId, backend.tagBindings, desktopBindingTags],
  );

  const desktopMapMarkers = useMemo(() => {
    const localByTagId = Object.fromEntries(ble.tagList.map((tag) => [tag.tagId, tag]));

    return backend.selectedWebIdOverview
      .filter(
        (item): item is typeof item & { estimated_latitude: number; estimated_longitude: number } =>
          item.estimated_latitude != null && item.estimated_longitude != null,
      )
      .map((item) => {
        const local = localByTagId[item.tag_id];
        return {
          tagId: item.tag_id,
          name: local?.name ?? toBlueTagDisplayName(item.tag_id),
          latitude: item.estimated_latitude,
          longitude: item.estimated_longitude,
          rssi: local?.rssi ?? -120,
          battery: local?.battery ?? null,
          lastSeen: local?.lastSeen ?? item.location_updated_at ?? item.binding_updated_at,
          source: item.estimate_source ?? 'backend',
        };
      });
  }, [backend.selectedWebIdOverview, ble.tagList]);

  const desktopSelectedTagId =
    (ble.targetTag.trim() && selectedWebTags.some((tag) => tag.tagId === ble.targetTag.trim().toUpperCase())
      ? ble.targetTag.trim().toUpperCase()
      : selectedWebTags[0]?.tagId) ?? '';

  const mapQueryTag = useMemo(() => {
    if (ble.targetTag.trim()) return ble.targetTag.trim().toUpperCase();
    return ble.targetSeen?.tagId ?? '';
  }, [ble.targetSeen?.tagId, ble.targetTag]);

  const localLocationForTarget = mapQueryTag ? ble.localTagLocations[mapQueryTag] ?? null : null;
  const mapLat = localLocationForTarget?.latitude ?? backend.mapTag?.estimated_latitude ?? ble.phoneLocation?.latitude ?? 16.4419;
  const mapLng = localLocationForTarget?.longitude ?? backend.mapTag?.estimated_longitude ?? ble.phoneLocation?.longitude ?? 102.835;
  const targetDistance = ble.targetSeen ? formatDistanceMeters(ble.targetSeen.rssi) : '-';
  const targetSummary = ble.targetSeen
    ? `${ble.targetSeen.tagId} | RSSI ${ble.targetSeen.rssi} | ${targetDistance} | ${rssiZone(ble.targetSeen.rssi)} | ${ble.targetSeen.lastSeen}`
    : 'ยังไม่พบ BlueTag';

  const mapSummary =
    backend.mapTag?.estimated_latitude != null && backend.mapTag?.estimated_longitude != null
      ? `${backend.mapTag.estimated_latitude.toFixed(6)}, ${backend.mapTag.estimated_longitude.toFixed(6)} (${backend.mapTag.estimate_source ?? 'n/a'})`
      : localLocationForTarget
        ? `${localLocationForTarget.latitude.toFixed(6)}, ${localLocationForTarget.longitude.toFixed(6)} (จากการสแกนบน iPhone เวลา ${localLocationForTarget.updatedAt})`
        : 'ยังไม่มีข้อมูลตำแหน่ง';

  const mapMarkers = useMemo(() => {
    const markers: {
      tagId: string;
      name: string;
      latitude: number;
      longitude: number;
      rssi: number;
      battery: number | null;
      lastSeen: string;
      source: string;
    }[] = [];

    for (const tag of ble.tagList) {
      const local = ble.localTagLocations[tag.tagId];
      if (local) {
        markers.push({
          tagId: tag.tagId,
          name: tag.name,
          latitude: local.latitude,
          longitude: local.longitude,
          rssi: tag.rssi,
          battery: tag.battery,
          lastSeen: tag.lastSeen,
          source: `local @ ${local.updatedAt}`,
        });
        continue;
      }

      if (mapQueryTag === tag.tagId && backend.mapTag?.estimated_latitude != null && backend.mapTag?.estimated_longitude != null) {
        markers.push({
          tagId: tag.tagId,
          name: tag.name,
          latitude: backend.mapTag.estimated_latitude,
          longitude: backend.mapTag.estimated_longitude,
          rssi: tag.rssi,
          battery: tag.battery,
          lastSeen: tag.lastSeen,
          source: `backend (${backend.mapTag.estimate_source ?? 'n/a'})`,
        });
      }
    }

    return markers;
  }, [backend.mapTag, ble.localTagLocations, ble.tagList, mapQueryTag]);

  const showLocalhostWarning =
    Platform.OS !== 'web' && /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/i.test(backend.backendBase.trim());
  const desktopWebLocationTitle = `${backend.selectedWebId} • ${selectedWebTags.length} BlueTag`;
  const desktopMapLat =
    backend.historyFocus?.tagId === desktopSelectedTagId ? backend.historyFocus.latitude : desktopMapMarkers[0]?.latitude ?? mapLat;
  const desktopMapLng =
    backend.historyFocus?.tagId === desktopSelectedTagId ? backend.historyFocus.longitude : desktopMapMarkers[0]?.longitude ?? mapLng;
  const desktopMapSummary =
    desktopMapMarkers.length > 0
      ? `มี BlueTag บนแผนที่ ${desktopMapMarkers.length} เครื่องสำหรับ ${backend.selectedWebId}`
      : 'ยังไม่มีข้อมูลตำแหน่ง';
  const locationHistoryTitle = desktopSelectedTagId
    ? `ย้อนหลังของ ${desktopSelectedTagId} ใน ${backend.selectedWebId}`
    : backend.selectedWebId
      ? `ย้อนหลังของ ${backend.selectedWebId}`
      : 'ยังไม่มี Web ID สำหรับดูย้อนหลัง';

  const authViewModel: AuthScreenViewModel = {
    authReady: backend.authReady,
    fontsLoaded,
    authDesktop,
    authMode: backend.authMode,
    authEmail: backend.authEmail,
    authPassword: backend.authPassword,
    authName: backend.authName,
    authBusy: backend.authBusy,
    authError: backend.authError,
  };

  const authActions: AuthScreenActions = {
    onChangeEmail: backend.setAuthEmail,
    onChangePassword: backend.setAuthPassword,
    onChangeName: backend.setAuthName,
    onSubmit: () => {
      void backend.handleAuthSubmit();
    },
    onToggleMode: () => {
      backend.setAuthMode((prev) => (prev === 'login' ? 'register' : 'login'));
      backend.setAuthError('');
    },
  };

  const dashboardViewModel: DashboardScreenViewModel = {
    dashboardMaxWidth,
    bleState: ble.bleState,
    isScanning: ble.isScanning,
    deviceCount: ble.tagList.length,
    currentConnectionCode: backend.selectedWebId,
    isWeb,
    webModeLabel,
    isDesktopWeb,
    currentUserName: backend.currentUserName,
    currentUserEmail: backend.currentUserEmail,
    currentUserLoading: backend.currentUserLoading,
    canAccessAdminTools: backend.currentUserRole === 'admin',
    backendBase: backend.backendBase,
    desktop: {
      selectedWebId: backend.selectedWebId,
      tagBindings: backend.tagBindings,
      canManageTechnicianMode: backend.currentUserRole === 'admin',
      mapLat: desktopMapLat,
      mapLng: desktopMapLng,
      selectedTagId: desktopSelectedTagId,
      selectableTags: selectedWebTags.map((tag) => ({
        tagId: tag.tagId,
        name: tag.name,
        rssi: tag.rssi,
        battery: tag.battery,
        lastSeen: tag.lastSeen,
      })),
      markers: desktopMapMarkers,
      locationTitle: desktopWebLocationTitle,
      mapSummary: desktopMapSummary,
      detailSummary: mapSummary,
      showLocalhostWarning,
      historyTitle: locationHistoryTitle,
      historyItems: backend.locationHistoryItems,
      historyLoading: backend.locationHistoryLoading,
      historyLoadingMore: backend.locationHistoryLoadingMore,
      historyCursor: backend.locationHistoryCursor,
      historyFocusId: backend.historyFocus?.id ?? null,
      adminUsers: backend.adminUsers,
      adminAuditLogs: backend.adminAuditLogs,
      adminBindingMismatches: backend.adminBindingMismatches,
      adminLoading: backend.adminLoading,
    },
    mobile: {
      bleReady: ble.bleReady,
      isScanning: ble.isScanning,
      autoRingEnabled: ble.autoRingEnabled,
      targetTag: ble.targetTag,
      message: ble.message,
      targetSummary,
      shouldShowBleControl,
      isMobileWeb,
      mapLat,
      mapLng,
      mapQueryTag,
      targetSeenLabel: ble.targetSeen ? `${ble.targetSeen.name} (${ble.targetSeen.tagId})` : ble.targetTag || 'BlueTag-000001',
      mapMarkers,
      mapSummary,
      showLocalhostWarning,
      shouldShowManualRing,
      shouldShowNearby,
      tagList: ble.tagList,
      formatDistanceMeters,
      rssiZone,
      tagBindings: backend.tagBindings,
      isWeb,
      selectedWebId: backend.selectedWebId,
      tagNicknames: ble.tagNicknames,
    },
  };

  const dashboardActions: DashboardScreenActions = {
    onSelectHistoryItem: (item) => {
      ble.setTargetTag(item.tag_id);
      backend.handleSelectHistoryItem(item);
    },
    onLoadMoreHistory: () => {
      void backend
        .loadLocationHistory({
          append: true,
          cursor: backend.locationHistoryCursor,
          webId: backend.selectedWebId,
          tagId: desktopSelectedTagId,
        })
        .catch(() => {
          ble.setMessage('Failed to load more location history');
        });
    },
    onDesktopPickTag: (tagId) => {
      backend.setHistoryFocus(null);
      ble.setTargetTag(tagId);
    },
    setTargetTag: ble.setTargetTag,
    onStartScan: () => {
      void ble.startScan();
    },
    onStopScan: ble.stopScan,
    onToggleAutoRing: ble.handleToggleAutoRing,
    onManualOff: ble.handleManualOff,
    onManualSlow: () => ble.handleManualRing(1),
    onManualFast: () => ble.handleManualRing(2),
    onAssignTag: (tagId, webId) => backend.handleAssignTag(tagId, webId),
    onUnassignTag: (tagId) => backend.handleUnassignTag(tagId),
    onSyncBoardState: (params) => backend.handleSyncBoardState(params),
    onTechnicianResetTag: (tagId) => backend.handleTechnicianResetTag(tagId),
    onAdminUserRoleUpdate: (userId, role) => backend.handleAdminUserRoleUpdate(userId, role),
    onAdminDeleteUser: (userId) => backend.handleAdminDeleteUser(userId),
    onAdminClearTagState: (tagId) => backend.handleAdminClearTagState(tagId),
    onReloadAdminData: () => {
      void backend.loadAdminData();
    },
    onChangeBackendBase: backend.setBackendBase,
    onRefreshCurrentUser: () => {
      void backend.loadCurrentUserProfile();
    },
    onSaveTagNickname: (tagId, nickname) => {
      void ble.setTagNickname(tagId, nickname);
    },
    onLogout: () => {
      void backend.handleLogout();
    },
  };

  return {
    authViewModel,
    authActions,
    dashboardViewModel,
    dashboardActions,
    isDesktopWeb,
    desktopSelectedTagId,
  };
}
