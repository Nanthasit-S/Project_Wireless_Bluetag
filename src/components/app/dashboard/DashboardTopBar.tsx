import { BlurView } from 'expo-blur';
import { useMemo, useRef, useState } from 'react';
import { Modal, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { styles } from '../../../styles/appStyles';
import type { DashboardView } from '../../../types/appViewModels';

interface DashboardTopBarProps {
  currentView: DashboardView;
  currentUserName?: string;
  currentUserEmail?: string;
  canAccessAdminTools: boolean;
  isCompactMobile: boolean;
  menuOpen: boolean;
  onChangeView: (view: DashboardView) => void;
  onCloseMenu: () => void;
  onToggleMenu: () => void;
  onLogout: () => void;
}

const MENU_WIDTH = 290;

const defaultMenuItems: Array<{ key: DashboardView; label: string; hint: string }> = [
  { key: 'dashboard', label: 'หน้าหลัก', hint: 'ดูแท็กและภาพรวมทั้งหมด' },
  { key: 'profile', label: 'โปรไฟล์', hint: 'ดูข้อมูลบัญชีที่ใช้อยู่' },
];

const adminMenuItem: { key: DashboardView; label: string; hint: string } = {
  key: 'admin',
  label: 'แอดมิน',
  hint: 'จัดการบอร์ดผ่าน USB, sync และ reset',
};

function getProfileInitials(name?: string, email?: string) {
  const source = (name && name.trim()) || (email && email.trim()) || 'BT';
  const chunks = source
    .split(/[\s@._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (chunks.length >= 2) {
    return `${chunks[0][0] ?? ''}${chunks[1][0] ?? ''}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function getCurrentViewLabel(view: DashboardView) {
  switch (view) {
    case 'dashboard':
      return 'หน้าหลัก';
    case 'profile':
      return 'โปรไฟล์';
    case 'admin':
    default:
      return 'แอดมิน';
  }
}

export function DashboardTopBar({
  currentView,
  currentUserName,
  currentUserEmail,
  canAccessAdminTools,
  isCompactMobile,
  menuOpen,
  onChangeView,
  onCloseMenu,
  onToggleMenu,
  onLogout,
}: DashboardTopBarProps) {
  const buttonRef = useRef<View>(null);
  const { width: screenWidth } = useWindowDimensions();
  const [menuPosition, setMenuPosition] = useState({ top: 76, left: 16 });
  const [hoveredMenuKey, setHoveredMenuKey] = useState('');
  const [hoveringLogout, setHoveringLogout] = useState(false);
  const initials = useMemo(() => getProfileInitials(currentUserName, currentUserEmail), [currentUserEmail, currentUserName]);
  const menuItems = useMemo(
    () => (canAccessAdminTools ? [...defaultMenuItems, adminMenuItem] : defaultMenuItems),
    [canAccessAdminTools],
  );
  const displayName = currentUserName?.trim() || 'ผู้ใช้ BlueTag';
  const displayEmail = currentUserEmail?.trim() || 'ยังไม่มีอีเมลที่แสดง';
  const currentViewLabel = getCurrentViewLabel(currentView);

  const handleNavigate = (view: DashboardView) => {
    setHoveredMenuKey('');
    onChangeView(view);
  };

  const handleToggle = () => {
    if (menuOpen) {
      setHoveredMenuKey('');
      setHoveringLogout(false);
      onCloseMenu();
      return;
    }

    if (isCompactMobile) {
      setMenuPosition({
        top: 92,
        left: 16,
      });
      onToggleMenu();
      return;
    }

    buttonRef.current?.measureInWindow((x, y, width, height) => {
      const nextLeft = Math.min(Math.max(12, x + width - MENU_WIDTH), Math.max(12, screenWidth - MENU_WIDTH - 12));

      setMenuPosition({
        top: y + height + 8,
        left: nextLeft,
      });
      onToggleMenu();
    });
  };

  return (
    <View style={[styles.topBar, isCompactMobile && styles.topBarMobile]}>
      <View style={[styles.topBarMeta, isCompactMobile && styles.topBarMetaMobile]}>
      </View>

      {isCompactMobile ? null : (
      <View ref={buttonRef} style={[styles.profileMenuShell, isCompactMobile && styles.profileMenuShellMobile]}>
        <Pressable
          style={({ pressed }) => [
            styles.profileMenuButton,
            isCompactMobile && styles.profileMenuButtonMobile,
            menuOpen ? styles.profileMenuButtonActive : null,
            pressed ? styles.profileMenuButtonPressed : null,
          ]}
          onPress={handleToggle}
        >
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{initials}</Text>
          </View>
          <View style={styles.profileMenuButtonMeta}>
            <Text style={styles.profileMenuButtonName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.profileMenuButtonHint}>{currentViewLabel}</Text>
          </View>
          <Text style={styles.profileMenuCaret}>{menuOpen ? '▴' : '▾'}</Text>
        </Pressable>

        <Modal transparent visible={menuOpen} animationType="fade" onRequestClose={onCloseMenu}>
          <View style={styles.profileMenuModalRoot}>
            <BlurView intensity={18} tint="light" style={styles.profileMenuBlurLayer} />
            <View style={styles.profileMenuShadeLayer} />
            <Pressable style={styles.profileMenuCloseLayer} onPress={onCloseMenu} />

            <Pressable
              style={[
                styles.profileMenuModalShell,
                isCompactMobile ? styles.profileMenuModalShellMobile : { top: menuPosition.top, left: menuPosition.left },
              ]}
              onPress={() => undefined}
            >
              <View style={[styles.profileMenuCard, isCompactMobile && styles.profileMenuCardMobile]}>
                <View style={styles.profileMenuHeader}>
                  <View style={styles.profileAvatarLarge}>
                    <Text style={styles.profileAvatarLargeText}>{initials}</Text>
                  </View>
                  <View style={styles.profileMenuHeaderMeta}>
                    <Text style={styles.profileMenuName} numberOfLines={1}>
                      {displayName}
                    </Text>
                    <Text style={styles.profileMenuEmail} numberOfLines={1}>
                      {displayEmail}
                    </Text>
                  </View>
                </View>

              {menuItems.map((item) => {
                  const active = currentView === item.key;
                  const hovered = hoveredMenuKey === item.key;

                  return (
                    <Pressable
                      key={item.key}
                      style={({ pressed }) => [
                        styles.profileMenuItem,
                        active ? styles.profileMenuItemActive : null,
                        hovered && !active ? styles.profileMenuItemHover : null,
                        pressed ? styles.profileMenuItemPressed : null,
                      ]}
                      onHoverIn={() => setHoveredMenuKey(item.key)}
                      onHoverOut={() => setHoveredMenuKey('')}
                      onPress={() => handleNavigate(item.key)}
                    >
                      <Text style={[styles.profileMenuItemText, active ? styles.profileMenuItemTextActive : null]}>{item.label}</Text>
                      <Text style={styles.profileMenuItemHint}>{item.hint}</Text>
                    </Pressable>
                  );
                })}

                <View style={styles.profileMenuDivider} />

                <Pressable
                  style={({ pressed }) => [
                    styles.profileMenuDangerItem,
                    hoveringLogout ? styles.profileMenuDangerItemHover : null,
                    pressed ? styles.profileMenuDangerItemPressed : null,
                  ]}
                  onHoverIn={() => setHoveringLogout(true)}
                  onHoverOut={() => setHoveringLogout(false)}
                  onPress={onLogout}
                >
                  <Text style={styles.profileMenuDangerText}>ออกจากระบบ</Text>
                </Pressable>
              </View>
            </Pressable>
          </View>
        </Modal>
      </View>
      )}
    </View>
  );
}
