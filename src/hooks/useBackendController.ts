import { useEffect, useState } from 'react';
import { DEFAULT_BACKEND_BASE } from '../constants/bluetooth';
import type { LocalTagLocation } from '../types/bluetag';
import { useAuthSession } from './backend/useAuthSession';
import { useAdminTools } from './backend/useAdminTools';
import { useLocationHistory } from './backend/useLocationHistory';
import { useMapSync } from './backend/useMapSync';
import { useWebBindings } from './backend/useWebBindings';

export function useBackendController(params: {
  mapQueryTag: string;
  localTagLocations: Record<string, LocalTagLocation>;
  resetBleSession: () => void;
  setMessage: (message: string) => void;
}) {
  const { mapQueryTag, localTagLocations, resetBleSession, setMessage } = params;
  const [backendBase, setBackendBase] = useState(DEFAULT_BACKEND_BASE);

  const auth = useAuthSession({
    backendBase,
    resetBleSession,
    setMessage,
  });

  async function authorizedFetch(input: string, init?: RequestInit) {
    const headers = new Headers(init?.headers || {});
    if (auth.authToken) {
      headers.set('Authorization', `Bearer ${auth.authToken}`);
    }

    return fetch(input, {
      ...init,
      headers,
    });
  }

  async function handleUnauthorized() {
    await auth.clearSession('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
  }

  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<'user' | 'admin'>('user');
  const [currentUserLoading, setCurrentUserLoading] = useState(false);

  async function loadCurrentUserProfile() {
    if (!auth.authToken) {
      setCurrentUserName('');
      setCurrentUserEmail('');
      setCurrentUserRole('user');
      return;
    }

    setCurrentUserLoading(true);
    try {
      const res = await authorizedFetch(`${backendBase.trim()}/api/auth/me`);
      if (res.status === 401) {
        await handleUnauthorized();
        return;
      }
      if (!res.ok) {
        throw new Error('load_profile_failed');
      }

      const data = (await res.json()) as { name?: string; email?: string; role?: 'user' | 'admin' };
      setCurrentUserName(data.name?.trim() || '');
      setCurrentUserEmail(data.email?.trim() || '');
      setCurrentUserRole(data.role === 'admin' ? 'admin' : 'user');
    } catch {
      setMessage('โหลดข้อมูลโปรไฟล์ไม่สำเร็จ');
    } finally {
      setCurrentUserLoading(false);
    }
  }

  const webBindings = useWebBindings({
    authToken: auth.authToken,
    backendBase,
    currentUserName,
    currentUserEmail,
    authorizedFetch,
    onUnauthorized: handleUnauthorized,
    setMessage,
  });

  const locationHistory = useLocationHistory({
    authToken: auth.authToken,
    backendBase,
    selectedWebId: webBindings.selectedWebId,
    authorizedFetch,
    onUnauthorized: handleUnauthorized,
  });

  const mapSync = useMapSync({
    authToken: auth.authToken,
    backendBase,
    mapQueryTag,
    localTagLocations,
    onUnauthorized: handleUnauthorized,
  });

  useEffect(() => {
    void loadCurrentUserProfile();
  }, [auth.authToken, backendBase]);

  const adminTools = useAdminTools({
    authToken: auth.authToken,
    backendBase,
    currentUserRole,
    authorizedFetch,
    onUnauthorized: handleUnauthorized,
    setMessage,
  });

  return {
    backendBase,
    setBackendBase,
    currentUserName,
    currentUserEmail,
    currentUserRole,
    currentUserLoading,
    adminUsers: adminTools.adminUsers,
    adminAuditLogs: adminTools.auditLogs,
    adminBindingMismatches: adminTools.bindingMismatches,
    adminLoading: adminTools.adminLoading,
    mapTag: mapSync.mapTag,
    authReady: auth.authReady,
    authToken: auth.authToken,
    authMode: auth.authMode,
    authEmail: auth.authEmail,
    authPassword: auth.authPassword,
    authName: auth.authName,
    authBusy: auth.authBusy,
    authError: auth.authError,
    selectedWebId: webBindings.selectedWebId,
    tagBindings: webBindings.tagBindings,
    selectedWebIdOverview: webBindings.selectedWebIdOverview,
    locationHistoryItems: locationHistory.locationHistoryItems,
    locationHistoryCursor: locationHistory.locationHistoryCursor,
    locationHistoryLoading: locationHistory.locationHistoryLoading,
    locationHistoryLoadingMore: locationHistory.locationHistoryLoadingMore,
    historyFocus: locationHistory.historyFocus,
    setHistoryFocus: locationHistory.setHistoryFocus,
    setAuthMode: auth.setAuthMode,
    setAuthEmail: auth.setAuthEmail,
    setAuthPassword: auth.setAuthPassword,
    setAuthName: auth.setAuthName,
    setAuthError: auth.setAuthError,
    setSelectedWebId: webBindings.setSelectedWebId,
    handleAuthSubmit: auth.handleAuthSubmit,
    handleLogout: auth.handleLogout,
    handleAssignTag: webBindings.handleAssignTag,
    handleUnassignTag: webBindings.handleUnassignTag,
    handleSyncBoardState: webBindings.handleSyncBoardState,
    handleTechnicianResetTag: webBindings.handleTechnicianResetTag,
    handleAdminUserRoleUpdate: adminTools.updateUserRole,
    handleAdminDeleteUser: adminTools.deleteUser,
    handleAdminClearTagState: adminTools.clearTagState,
    loadAdminData: adminTools.loadAdminData,
    loadCurrentUserProfile,
    loadLocationHistory: locationHistory.loadLocationHistory,
    handleSelectHistoryItem: locationHistory.handleSelectHistoryItem,
  };
}
