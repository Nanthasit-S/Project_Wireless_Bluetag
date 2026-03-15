import { Platform } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import type { DashboardScreenActions, DashboardScreenViewModel, AuthScreenActions, AuthScreenViewModel } from '../types/appViewModels';
import { formatDistanceMeters, rssiZone } from '../utils/bluetag';
import { formatThaiDateTime } from '../utils/time';
import type { TagBindingAccessRecord } from '../types/bluetag';

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
  const shouldShowNearby = !isMobileWeb;
  const webModeLabel = isDesktopWeb ? 'โหมดเว็บบนคอมพิวเตอร์' : 'โหมดเว็บบนมือถือ';
  const authDesktop = isWeb && width >= 960;
  const dashboardMaxWidth = isDesktopWeb ? 1320 : 980;
  const [tagAccessById, setTagAccessById] = useState<Record<string, TagBindingAccessRecord>>({});

  useEffect(() => {
    if (!backend.authToken || ble.tagList.length === 0) {
      setTagAccessById({});
      return;
    }

    let cancelled = false;
    const missingTagIds = ble.tagList.map((tag) => tag.tagId).filter((tagId) => !tagAccessById[tagId]);
    if (missingTagIds.length === 0) {
      return;
    }

    void Promise.all(
      missingTagIds.map(async (tagId) => backend.checkTagAccess(tagId)),
    ).then((rows) => {
      if (cancelled) return;
      setTagAccessById((current) => {
        const next = { ...current };
        rows.forEach((row) => {
          if (!row) return;
          next[row.tag_id] = row;
        });
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [backend.authToken, backend.checkTagAccess, ble.tagList, tagAccessById]);

  const desktopBindingTags = useMemo(() => {
    const localByTagId = Object.fromEntries(ble.tagList.map((tag) => [tag.tagId, tag]));
    const overviewByTagId = Object.fromEntries(backend.selectedWebIdOverview.map((item) => [item.tag_id, item]));
    const boundTagIdsForSelectedWebId = Object.entries(backend.tagBindings)
      .filter(([, webId]) => webId === backend.selectedWebId)
      .map(([tagId]) => tagId);
    const combined = Array.from(
      new Set([
        ...backend.selectedWebIdOverview.map((item) => item.tag_id),
        ...boundTagIdsForSelectedWebId,
      ]),
    ).map((tagId) => {
      const item = overviewByTagId[tagId];
      const local = localByTagId[tagId];
      const nickname = ble.tagNicknames[tagId]?.trim() ?? '';
      const backendNickname = item?.nickname?.trim() ?? '';
      if (local) return local;
      return {
        deviceId: tagId,
        tagId,
        name: nickname || backendNickname || toBlueTagDisplayName(tagId),
        rssi: -120,
        battery: null,
        counter: null,
        lastSeen: formatThaiDateTime(item?.location_updated_at ?? item?.binding_updated_at ?? '-'),
        lastSeenMs: Date.now(),
      };
    });

    for (const tag of ble.tagList) {
      if (!combined.some((item) => item.tagId === tag.tagId)) {
        combined.push(tag);
      }
    }

    return combined;
  }, [backend.selectedWebId, backend.selectedWebIdOverview, backend.tagBindings, ble.tagList, ble.tagNicknames]);

  const profileBoundTags = useMemo(() => {
    const localByTagId = Object.fromEntries(ble.tagList.map((tag) => [tag.tagId, tag]));
    const overviewByTagId = Object.fromEntries(backend.selectedWebIdOverview.map((item) => [item.tag_id, item]));
    const boundTagIds = Array.from(
      new Set([
        ...Object.keys(backend.tagBindings),
        ...backend.selectedWebIdOverview.map((item) => item.tag_id),
      ]),
    );

    return boundTagIds
      .map((tagId) => {
        const item = overviewByTagId[tagId];
        const local = localByTagId[tagId];
        const webId = backend.tagBindings[tagId] ?? item?.web_id ?? '';
        const nickname = ble.tagNicknames[tagId]?.trim() ?? item?.nickname?.trim() ?? '';
        const displayName = nickname || local?.name || toBlueTagDisplayName(tagId);

        return {
          tagId,
          name: displayName,
          nickname,
          webId,
          battery: local?.battery ?? null,
          rssi: local?.rssi ?? null,
          lastSeen: local?.lastSeen ?? formatThaiDateTime(item?.location_updated_at ?? item?.binding_updated_at ?? '-'),
          sampleCount: item?.sample_count ?? 0,
          estimateSource: item?.estimate_source ?? 'binding',
          latitude: item?.estimated_latitude ?? null,
          longitude: item?.estimated_longitude ?? null,
        };
      })
      .sort((left, right) => {
        const leftHasLiveSignal = left.rssi != null ? 1 : 0;
        const rightHasLiveSignal = right.rssi != null ? 1 : 0;
        if (leftHasLiveSignal !== rightHasLiveSignal) {
          return rightHasLiveSignal - leftHasLiveSignal;
        }

        const webIdCompare = left.webId.localeCompare(right.webId);
        if (webIdCompare !== 0) return webIdCompare;
        return left.tagId.localeCompare(right.tagId);
      });
  }, [backend.selectedWebIdOverview, backend.tagBindings, ble.tagList, ble.tagNicknames]);

  const selectedWebTags = useMemo(
    () => {
      const overviewTagIds = new Set(backend.selectedWebIdOverview.map((item) => item.tag_id));
      return desktopBindingTags.filter(
        (tag) => backend.tagBindings[tag.tagId] === backend.selectedWebId || overviewTagIds.has(tag.tagId),
      );
    },
    [backend.selectedWebId, backend.selectedWebIdOverview, backend.tagBindings, desktopBindingTags],
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
        const backendNickname = item.nickname?.trim() ?? '';
        return {
          tagId: item.tag_id,
          name: local?.name ?? (backendNickname || toBlueTagDisplayName(item.tag_id)),
          latitude: item.estimated_latitude,
          longitude: item.estimated_longitude,
          rssi: local?.rssi ?? -120,
          battery: local?.battery ?? null,
          lastSeen: local?.lastSeen ?? formatThaiDateTime(item.location_updated_at ?? item.binding_updated_at ?? '-'),
          source: item.estimate_source ?? 'backend',
        };
      });
  }, [backend.selectedWebIdOverview, ble.tagList]);

  const desktopSelectedTagId =
    (ble.targetTag.trim() && selectedWebTags.some((tag) => tag.tagId === ble.targetTag.trim().toUpperCase())
      ? ble.targetTag.trim().toUpperCase()
      : selectedWebTags[0]?.tagId) ?? '';
  const desktopFocusedTagId = backend.historyFocus?.tagId || desktopSelectedTagId;

  const mapQueryTag = useMemo(() => {
    if (ble.targetTag.trim()) return ble.targetTag.trim().toUpperCase();
    return ble.targetSeen?.tagId ?? '';
  }, [ble.targetSeen?.tagId, ble.targetTag]);

  const mobileBoundTagIds = useMemo(() => {
    const overviewTagIds = backend.selectedWebIdOverview.map((item) => item.tag_id);
    const locallyBoundTagIds = Object.entries(backend.tagBindings)
      .filter(([, webId]) => webId === backend.selectedWebId)
      .map(([tagId]) => tagId);
    return new Set([...overviewTagIds, ...locallyBoundTagIds]);
  }, [backend.selectedWebId, backend.selectedWebIdOverview, backend.tagBindings]);

  const mobileBoundSeen = useMemo(() => {
    if (!backend.selectedWebId) return null;

    const currentTarget = ble.targetSeen;
    if (currentTarget && mobileBoundTagIds.has(currentTarget.tagId)) {
      return currentTarget;
    }

    return ble.tagList.find((tag) => mobileBoundTagIds.has(tag.tagId) && ble.activeTagIds.has(tag.tagId)) ?? null;
  }, [backend.selectedWebId, ble.activeTagIds, ble.tagList, ble.targetSeen, mobileBoundTagIds]);

  useEffect(() => {
    if (isWeb || !ble.autoRingEnabled || ble.connectedTagId) return;
    if (!mobileBoundSeen) {
      if (ble.targetTag.trim()) {
        ble.setTargetTag('');
      }
      return;
    }
    if (ble.targetSeen && mobileBoundTagIds.has(ble.targetSeen.tagId)) return;
    if (ble.targetTag.trim().toUpperCase() === mobileBoundSeen.tagId) return;

    ble.setTargetTag(mobileBoundSeen.tagId);
  }, [
    ble.autoRingEnabled,
    ble.connectedTagId,
    ble.targetSeen,
    ble.targetTag,
    ble.setTargetTag,
    isWeb,
    mobileBoundSeen,
    mobileBoundTagIds,
  ]);

  const mobileBoundTagCards = useMemo(() => {
    const localByTagId = Object.fromEntries(ble.tagList.map((tag) => [tag.tagId, tag]));
    const overviewByTagId = Object.fromEntries(backend.selectedWebIdOverview.map((item) => [item.tag_id, item]));
    const boundTagIds = Array.from(mobileBoundTagIds);

    return boundTagIds
      .map((tagId) => {
        const local = localByTagId[tagId];
        const overview = overviewByTagId[tagId];
        const nickname = ble.tagNicknames[tagId]?.trim() ?? overview?.nickname?.trim() ?? '';
        return {
          tagId,
          name: nickname || local?.name || toBlueTagDisplayName(tagId),
          webId: backend.tagBindings[tagId] ?? overview?.web_id ?? backend.selectedWebId,
          inRange: Boolean(local && ble.activeTagIds.has(tagId)),
          connected: ble.connectedTagId === tagId,
          rssi: local?.rssi ?? null,
          battery: local?.battery ?? null,
          lastSeen: local?.lastSeen ?? formatThaiDateTime(overview?.location_updated_at ?? overview?.binding_updated_at ?? '-'),
        };
      })
      .sort((left, right) => {
        if (left.connected !== right.connected) return left.connected ? -1 : 1;
        if (left.inRange !== right.inRange) return left.inRange ? -1 : 1;
        return left.tagId.localeCompare(right.tagId);
      });
  }, [
    backend.selectedWebId,
    backend.selectedWebIdOverview,
    backend.tagBindings,
    ble.connectedTagId,
    ble.tagList,
    ble.tagNicknames,
    mobileBoundTagIds,
  ]);

  const connectedRingTarget = ble.connectedTagId
    ? ble.tagList.find((tag) => tag.tagId === ble.connectedTagId) ?? null
    : null;
  const mobileRingTarget = connectedRingTarget ?? ble.connectedSeen ?? mobileBoundSeen;
  const shouldShowManualRing = !isWeb && Boolean(ble.connectedTagId);
  const autoRingPausedReason =
    !isWeb && ble.autoRingEnabled && !ble.connectedTagId && backend.selectedWebId && mobileBoundTagCards.length > 0 && !mobileBoundSeen
      ? 'Auto Ring paused: ไม่พบ BlueTag ที่ตรงกับ Web ID นี้'
      : '';

  const localLocationForTarget = mapQueryTag ? ble.localTagLocations[mapQueryTag] ?? null : null;
  const mapLat = localLocationForTarget?.latitude ?? backend.mapTag?.estimated_latitude ?? ble.phoneLocation?.latitude ?? 16.4419;
  const mapLng = localLocationForTarget?.longitude ?? backend.mapTag?.estimated_longitude ?? ble.phoneLocation?.longitude ?? 102.835;
  const targetDistance = mobileRingTarget ? formatDistanceMeters(mobileRingTarget.rssi) : '-';
  const targetSummary = mobileRingTarget
    ? `${mobileRingTarget.tagId} | RSSI ${mobileRingTarget.rssi} | ${targetDistance} | ${rssiZone(mobileRingTarget.rssi)} | ${mobileRingTarget.lastSeen}`
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
  const desktopMapLat = backend.historyFocus?.latitude ?? desktopMapMarkers[0]?.latitude ?? mapLat;
  const desktopMapLng = backend.historyFocus?.longitude ?? desktopMapMarkers[0]?.longitude ?? mapLng;
  const desktopMapSummary =
    desktopMapMarkers.length > 0
      ? `มี BlueTag บนแผนที่ ${desktopMapMarkers.length} เครื่องสำหรับ ${backend.selectedWebId}`
      : 'ยังไม่มีข้อมูลตำแหน่ง';
  const locationHistoryTitle = desktopFocusedTagId
    ? `ย้อนหลังของ ${desktopFocusedTagId} ใน ${backend.selectedWebId}`
      : backend.selectedWebId
      ? `ย้อนหลังของ ${backend.selectedWebId}`
      : 'ยังไม่มี Web ID สำหรับดูย้อนหลัง';

  const authViewModel: AuthScreenViewModel = {
    authReady: backend.authReady,
    fontsLoaded,
    authDesktop,
    authMode: backend.authMode,
    backendBase: backend.backendBase,
    authEmail: backend.authEmail,
    authPassword: backend.authPassword,
    authName: backend.authName,
    authBusy: backend.authBusy,
    authError: backend.authError,
  };

  const authActions: AuthScreenActions = {
    onChangeBackendBase: backend.setBackendBase,
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
    profileBoundTags,
    desktop: {
      selectedWebId: backend.selectedWebId,
      tagBindings: backend.tagBindings,
      canManageTechnicianMode: backend.currentUserRole === 'admin',
      mapLat: desktopMapLat,
      mapLng: desktopMapLng,
      selectedTagId: desktopFocusedTagId,
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
      autoRingPausedReason,
      targetTag: ble.targetTag,
      connectedTagId: ble.connectedTagId,
      ringTargetTagId: mobileRingTarget?.tagId ?? '',
      message: ble.message,
      targetSummary,
      shouldShowBleControl,
      isMobileWeb,
      mapLat,
      mapLng,
      mapQueryTag,
      targetSeenLabel: mobileRingTarget ? `${mobileRingTarget.name} (${mobileRingTarget.tagId})` : ble.targetTag || 'BlueTag-000001',
      mapMarkers,
      mapSummary,
      showLocalhostWarning,
      shouldShowManualRing,
      shouldShowNearby,
      shouldShowConnectActions: !isWeb,
      tagList: ble.tagList,
      formatDistanceMeters,
      rssiZone,
      tagBindings: backend.tagBindings,
      tagAccessById,
      isWeb,
      selectedWebId: backend.selectedWebId,
      tagNicknames: ble.tagNicknames,
      boundTagCards: mobileBoundTagCards,
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
    onConnectTag: (tagId) => {
      void (async () => {
        const access = await backend.checkTagAccess(tagId);
        if (!access) {
          ble.setMessage('ตรวจสอบสถานะการผูกของ BlueTag ไม่สำเร็จ');
          return;
        }

        if (access.access === 'bound_to_other_account') {
          ble.setMessage('BlueTag เครื่องนี้ถูกผูกกับบัญชีอื่นอยู่ จึงเชื่อมต่อจาก ID นี้ไม่ได้');
          return;
        }

        if (access.access === 'bound_to_my_web_id' && access.web_id !== backend.selectedWebId) {
          ble.setMessage(`BlueTag เครื่องนี้ถูกผูกกับ ${access.web_id} อยู่แล้ว จึงเชื่อมต่อด้วย ${backend.selectedWebId || 'ID นี้'} ไม่ได้`);
          return;
        }

        if (!backend.selectedWebId) {
          ble.setMessage('ยังไม่มีรหัสเชื่อมต่อของบัญชีนี้ เลยผูก BlueTag อัตโนมัติไม่ได้');
          return;
        }

        if (access.access === 'unbound') {
          const assigned = await backend.handleAssignTag(tagId, backend.selectedWebId);
          if (!assigned) {
            ble.setMessage(`ผูก ${tagId} กับ ${backend.selectedWebId} ไม่สำเร็จ`);
            return;
          }
        }

        ble.connectToTag(tagId);
        await backend.recordConnectedTagLastSeen(tagId);
      })();
    },
    onDisconnectTag: () => {
      ble.disconnectFromTag();
    },
    onStartScan: () => {
      void ble.startScan();
    },
    onRefreshScan: () => {
      void ble.refreshScan();
    },
    onStopScan: ble.stopScan,
    onToggleAutoRing: () => {
      if (!ble.targetTag.trim() && mobileRingTarget?.tagId) {
        ble.setTargetTag(mobileRingTarget.tagId);
      }
      ble.handleToggleAutoRing();
    },
    onManualOff: () => {
      if (!ble.targetTag.trim() && mobileRingTarget?.tagId) {
        ble.setTargetTag(mobileRingTarget.tagId);
      }
      ble.handleManualOff();
    },
    onManualSlow: () => {
      if (!ble.targetTag.trim() && mobileRingTarget?.tagId) {
        ble.setTargetTag(mobileRingTarget.tagId);
      }
      ble.handleManualRing(1);
    },
    onManualFast: () => {
      if (!ble.targetTag.trim() && mobileRingTarget?.tagId) {
        ble.setTargetTag(mobileRingTarget.tagId);
      }
      ble.handleManualRing(2);
    },
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
      return (async () => {
        await ble.setTagNickname(tagId, nickname);
        const saved = await backend.saveTagNickname(tagId, nickname);
        if (!saved) {
          ble.setMessage('บันทึกชื่อเล่นลงเซิร์ฟเวอร์ไม่สำเร็จ');
          return false;
        }
        ble.setMessage(nickname.trim() ? `บันทึกชื่อเล่น ${tagId} แล้ว` : `ล้างชื่อเล่น ${tagId} แล้ว`);
        return true;
      })();
    },
    onFactoryResetTag: (tagId) => {
      return (async () => {
        const connected = ble.tagList.find((tag) => tag.tagId === tagId);
        if (!connected) {
          ble.setMessage('ยังไม่พบบอร์ดตัวนี้ในระยะสัญญาณ เลยสั่ง factory reset ไม่ได้');
          return false;
        }

        const boardReset = await ble.handleFactoryReset(connected.deviceId, tagId);
        if (!boardReset) {
          ble.setMessage(`ส่งคำสั่ง factory reset ไปที่ ${tagId} ไม่สำเร็จ`);
          return false;
        }

        const backendReset = await backend.handleFactoryResetTag(tagId);
        if (!backendReset) {
          ble.setMessage(`บอร์ด ${tagId} reset แล้ว แต่ backend ยังล้างข้อมูลไม่สำเร็จ`);
          return false;
        }

        ble.disconnectFromTag();
        ble.setTargetTag('');
        ble.setMessage(`factory reset ${tagId} ทั้งบอร์ดและระบบแล้ว`);
        return true;
      })();
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
