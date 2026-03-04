/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

const DRAWER_WIDTH = 280;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Drawer Context ───
interface DrawerContextType {
  openDrawer: () => void;
  closeDrawer: () => void;
  currentScreen: string;
  navigateTo: (screen: string) => void;
}

const DrawerContext = createContext<DrawerContextType>({
  openDrawer: () => {},
  closeDrawer: () => {},
  currentScreen: 'Dashboard',
  navigateTo: () => {},
});

export function useDrawer() {
  return useContext(DrawerContext);
}

// ─── Nav Items ───
const NAV_ITEMS = [
  { key: 'Dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'Orders', label: 'Orders', icon: '📋' },
  { key: 'Products', label: 'Products & Inventory', icon: '📦' },
  { key: 'Customers', label: 'Customers', icon: '👥' },
  { key: 'Ledger', label: 'Sales Ledger', icon: '💰' },
  { key: 'divider' },
  { key: 'Chat', label: 'AI Assistant', icon: '🤖' },
];

// ─── Sidebar Content ───
function SidebarContent({
  currentScreen,
  onNavigate,
  onClose,
}: {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onClose: () => void;
}) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    onClose();
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.sidebar} edges={['top', 'bottom']}>
      {/* Header / User Info */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.name || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {user?.name || 'User'}
          </Text>
          <Text style={styles.businessName} numberOfLines={1}>
            {user?.businessName || user?.email || ''}
          </Text>
        </View>
      </View>

      <View style={styles.dividerLine} />

      {/* Nav Items */}
      <ScrollView style={styles.navList} showsVerticalScrollIndicator={false}>
        {NAV_ITEMS.map((item, idx) => {
          if (item.key === 'divider') {
            return <View key={`div-${idx}`} style={styles.dividerLine} />;
          }
          const isActive = currentScreen === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => onNavigate(item.key)}
              activeOpacity={0.7}
            >
              <Text style={styles.navIcon}>{item.icon}</Text>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.dividerLine} />
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutIcon}>↪️</Text>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
        <Text style={styles.version}>ProcureFlow v1.0</Text>
      </View>
    </SafeAreaView>
  );
}

// ─── Drawer Layout ───
export function DrawerLayout({
  screens,
  initialScreen = 'Dashboard',
}: {
  screens: Record<string, React.ComponentType<any>>;
  initialScreen?: string;
}) {
  const [currentScreen, setCurrentScreen] = useState(initialScreen);
  const [isOpen, setIsOpen] = useState(false);
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const openDrawer = useCallback(() => {
    setIsOpen(true);
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateX, overlayOpacity]);

  const closeDrawer = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -DRAWER_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setIsOpen(false));
  }, [translateX, overlayOpacity]);

  const navigateTo = useCallback(
    (screen: string) => {
      closeDrawer();
      // Small delay so drawer closes smoothly before screen switch
      setTimeout(() => setCurrentScreen(screen), 100);
    },
    [closeDrawer]
  );

  const ScreenComponent = screens[currentScreen] || screens.Dashboard;

  return (
    <DrawerContext.Provider value={{ openDrawer, closeDrawer, currentScreen, navigateTo }}>
      <View style={styles.root}>
        {/* Main Screen */}
        <ScreenComponent />

        {/* Overlay */}
        {isOpen && (
          <TouchableWithoutFeedback onPress={closeDrawer}>
            <Animated.View
              style={[styles.overlay, { opacity: overlayOpacity }]}
            />
          </TouchableWithoutFeedback>
        )}

        {/* Drawer */}
        <Animated.View
          style={[styles.drawer, { transform: [{ translateX }] }]}
        >
          <SidebarContent
            currentScreen={currentScreen}
            onNavigate={navigateTo}
            onClose={closeDrawer}
          />
        </Animated.View>
      </View>
    </DrawerContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 10,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    zIndex: 20,
    backgroundColor: '#131312',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 20,
  },

  // Sidebar styles
  sidebar: {
    flex: 1,
    backgroundColor: '#131312',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#c4622d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
  },
  userName: {
    color: '#f0ede3',
    fontSize: 16,
    fontWeight: '700',
  },
  businessName: {
    color: '#6a6860',
    fontSize: 13,
    marginTop: 2,
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#2e2e2b',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  navList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    marginVertical: 2,
    gap: 14,
  },
  navItemActive: {
    backgroundColor: 'rgba(196,98,45,0.15)',
  },
  navIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  navLabel: {
    color: '#a8a498',
    fontSize: 15,
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#c4622d',
    fontWeight: '600',
  },
  footer: {
    paddingBottom: 12,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 26,
    paddingVertical: 13,
    gap: 14,
  },
  logoutIcon: {
    fontSize: 20,
  },
  logoutText: {
    color: '#a8a498',
    fontSize: 15,
    fontWeight: '500',
  },
  version: {
    color: '#3e3e3a',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
});

