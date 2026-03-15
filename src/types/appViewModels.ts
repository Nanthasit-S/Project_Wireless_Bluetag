import type {
  AdminAuditLogRecord,
  AdminBindingMismatchRecord,
  AdminUserRecord,
  LocationHistoryCursor,
  LocationHistoryItem,
  SeenTag,
} from './bluetag';

export type DashboardView = 'dashboard' | 'profile' | 'settings' | 'admin';

export interface MapMarkerViewModel {
  tagId: string;
  name: string;
  latitude: number;
  longitude: number;
  rssi: number;
  battery: number | null;
  lastSeen: string;
  source: string;
}

export interface TagOptionViewModel {
  tagId: string;
  name: string;
  rssi: number;
  battery: number | null;
  lastSeen: string;
}

export interface AuthScreenViewModel {
  authReady: boolean;
  fontsLoaded: boolean;
  authDesktop: boolean;
  authMode: 'login' | 'register';
  authEmail: string;
  authPassword: string;
  authName: string;
  authBusy: boolean;
  authError: string;
}

export interface AuthScreenActions {
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onChangeName: (value: string) => void;
  onSubmit: () => void;
  onToggleMode: () => void;
}

export interface DesktopDashboardViewModel {
  selectedWebId: string;
  tagBindings: Record<string, string>;
  canManageTechnicianMode: boolean;
  mapLat: number;
  mapLng: number;
  selectedTagId: string;
  selectableTags: TagOptionViewModel[];
  markers: MapMarkerViewModel[];
  locationTitle: string;
  mapSummary: string;
  detailSummary: string;
  showLocalhostWarning: boolean;
  historyTitle: string;
  historyItems: LocationHistoryItem[];
  historyLoading: boolean;
  historyLoadingMore: boolean;
  historyCursor: LocationHistoryCursor | null;
  historyFocusId: number | null;
  adminUsers: AdminUserRecord[];
  adminAuditLogs: AdminAuditLogRecord[];
  adminBindingMismatches: AdminBindingMismatchRecord[];
  adminLoading: boolean;
}

export interface MobileDashboardViewModel {
  bleReady: boolean;
  isScanning: boolean;
  autoRingEnabled: boolean;
  targetTag: string;
  message: string;
  targetSummary: string;
  shouldShowBleControl: boolean;
  isMobileWeb: boolean;
  mapLat: number;
  mapLng: number;
  mapQueryTag: string;
  targetSeenLabel: string;
  mapMarkers: MapMarkerViewModel[];
  mapSummary: string;
  showLocalhostWarning: boolean;
  shouldShowManualRing: boolean;
  shouldShowNearby: boolean;
  tagList: SeenTag[];
  formatDistanceMeters: (rssi: number) => string;
  rssiZone: (rssi: number) => string;
  tagBindings: Record<string, string>;
  isWeb: boolean;
  selectedWebId: string;
  tagNicknames: Record<string, string>;
}

export interface DashboardScreenViewModel {
  dashboardMaxWidth: number;
  bleState: string;
  isScanning: boolean;
  deviceCount: number;
  currentConnectionCode: string;
  isWeb: boolean;
  webModeLabel: string;
  isDesktopWeb: boolean;
  currentUserName: string;
  currentUserEmail: string;
  currentUserLoading: boolean;
  canAccessAdminTools: boolean;
  backendBase: string;
  desktop: DesktopDashboardViewModel;
  mobile: MobileDashboardViewModel;
}

export interface DesktopDashboardActions {
  onSelectHistoryItem: (item: LocationHistoryItem) => void;
  onLoadMoreHistory: () => void;
  onDesktopPickTag: (tagId: string) => void;
  onSaveTagNickname: (tagId: string, nickname: string) => void;
  onAssignTag: (tagId: string, webId: string) => Promise<boolean>;
  onUnassignTag: (tagId: string) => Promise<boolean>;
  onSyncBoardState: (params: {
    tagId: string;
    webId: string;
    boardWebIdHash: string | null;
    boardLockState: 'locked' | 'unbound';
  }) => Promise<boolean>;
  onTechnicianResetTag: (tagId: string) => Promise<boolean>;
  onAdminUserRoleUpdate: (userId: string, role: 'user' | 'admin') => Promise<boolean>;
  onAdminDeleteUser: (userId: string) => Promise<boolean>;
  onAdminClearTagState: (tagId: string) => Promise<boolean>;
  onReloadAdminData: () => void;
}

export interface MobileDashboardActions {
  setTargetTag: (tagId: string) => void;
  onStartScan: () => void;
  onStopScan: () => void;
  onToggleAutoRing: () => void;
  onManualOff: () => void;
  onManualSlow: () => void;
  onManualFast: () => void;
  onAssignTag: (tagId: string, webId: string) => Promise<boolean>;
  onUnassignTag: (tagId: string) => Promise<boolean>;
  onSaveTagNickname: (tagId: string, nickname: string) => void;
}

export interface DashboardScreenActions extends DesktopDashboardActions, MobileDashboardActions {
  onChangeBackendBase: (value: string) => void;
  onRefreshCurrentUser: () => void;
  onLogout: () => void;
}
