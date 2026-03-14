import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme/tokens';

export const SIDE_NAV_WIDTH = 220;
export const DESKTOP_BREAKPOINT = 768;

type RouteIconMap = {
  focused: keyof typeof Ionicons.glyphMap;
  unfocused: keyof typeof Ionicons.glyphMap;
  label: string;
};

export const ROUTE_META: Record<string, RouteIconMap> = {
  Today:     { focused: 'today',    unfocused: 'today-outline',    label: 'Today'      },
  Calendar:  { focused: 'calendar', unfocused: 'calendar-outline', label: 'Calendar'   },
  Tasks:     { focused: 'list',     unfocused: 'list-outline',     label: 'All Tasks'  },
  Kanban:    { focused: 'grid',     unfocused: 'grid-outline',     label: 'Kanban'     },
  Ideas:     { focused: 'bulb',     unfocused: 'bulb-outline',     label: 'Ideas'      },
  Goals:     { focused: 'flag',     unfocused: 'flag-outline',     label: 'Goals'      },
  Inventory: { focused: 'home',     unfocused: 'home-outline',     label: 'Inventory'  },
  Plants:    { focused: 'leaf',     unfocused: 'leaf-outline',     label: 'Plants'     },
  Locations: { focused: 'map',      unfocused: 'map-outline',      label: 'Locations'  },
  Settings:  { focused: 'settings', unfocused: 'settings-outline', label: 'Settings'   },
};

// First 4 tabs always visible in the mobile bottom bar
const PRIMARY_ROUTES = ['Today', 'Calendar', 'Tasks', 'Kanban'] as const;
// Everything else lives behind the "More" button
const MORE_ROUTES = ['Ideas', 'Goals', 'Inventory', 'Plants', 'Locations', 'Settings'] as const;

// Desktop sidebar: Settings pinned at bottom, rest up top
const DESKTOP_BOTTOM = new Set(['Settings']);

// ─── Desktop side nav panel ───────────────────────────────────────────────────

export function SideNavPanel({
  routeNames,
  activeIndex,
  onNavigate,
}: {
  routeNames: string[];
  activeIndex: number;
  onNavigate: (name: string) => void;
}) {
  const mainRoutes = routeNames.filter((n) => !DESKTOP_BOTTOM.has(n));
  const bottomRoutes = routeNames.filter((n) => DESKTOP_BOTTOM.has(n));

  const renderItem = (name: string) => {
    const meta = ROUTE_META[name];
    if (!meta) return null;
    const isFocused = routeNames.indexOf(name) === activeIndex;
    return (
      <TouchableOpacity
        key={name}
        style={[styles.navItem, isFocused && styles.navItemActive]}
        onPress={() => onNavigate(name)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isFocused ? meta.focused : meta.unfocused}
          size={18}
          color={isFocused ? colors.primaryDark : colors.textMuted}
        />
        <Text style={[styles.navLabel, isFocused && styles.navLabelActive]}>
          {meta.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.sideNav}>
      <View style={styles.brand}>
        <Text style={styles.brandName}>tADiHD</Text>
        <Text style={styles.brandTagline}>Stay in the zone</Text>
      </View>
      <View style={styles.navMain}>{mainRoutes.map(renderItem)}</View>
      <View style={styles.navBottom}>
        <View style={styles.divider} />
        {bottomRoutes.map(renderItem)}
      </View>
    </View>
  );
}

// ─── Mobile bottom bar ────────────────────────────────────────────────────────

function MobileBottomBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [showMore, setShowMore] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(300)).current;

  const activeRoute = state.routes[state.index]?.name ?? '';
  const isMoreActive = !(PRIMARY_ROUTES as readonly string[]).includes(activeRoute);

  const openMore = () => {
    setShowMore(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const closeMore = () => {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setShowMore(false));
  };

  const navigate = (name: string) => {
    (navigation as any).navigate(name);
    closeMore();
  };

  return (
    <>
      {/* ── Bottom bar ── */}
      <View style={[styles.mobileBar, { paddingBottom: Math.max(insets.bottom, spacing.xs) }]}>
        {(PRIMARY_ROUTES as readonly string[]).map((name) => {
          const routeIndex = state.routes.findIndex((r) => r.name === name);
          if (routeIndex === -1) return null;
          const isFocused = state.index === routeIndex;
          const meta = ROUTE_META[name];
          return (
            <TouchableOpacity
              key={name}
              style={styles.mobileTabItem}
              onPress={() => (navigation as any).navigate(name)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isFocused ? meta.focused : meta.unfocused}
                size={22}
                color={isFocused ? colors.primaryDark : colors.textMuted}
              />
              <Text style={[styles.mobileTabLabel, isFocused && styles.mobileTabLabelActive]}>
                {meta.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* More button */}
        <TouchableOpacity
          style={styles.mobileTabItem}
          onPress={openMore}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isMoreActive ? 'apps' : 'apps-outline'}
            size={22}
            color={isMoreActive ? colors.primaryDark : colors.textMuted}
          />
          <Text style={[styles.mobileTabLabel, isMoreActive && styles.mobileTabLabelActive]}>
            More
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── More sheet ── */}
      <Modal
        visible={showMore}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeMore}
      >
        {/* Scrim */}
        <Pressable style={styles.scrim} onPress={closeMore}>
          {/* Sheet — stop press events propagating to scrim */}
          <Pressable onPress={() => {}}>
            <Animated.View
              style={[
                styles.sheet,
                { paddingBottom: Math.max(insets.bottom, spacing.md) },
                { transform: [{ translateY: slideAnim }] },
              ]}
            >
              {/* Handle */}
              <View style={styles.sheetHandle} />

              <Text style={styles.sheetTitle}>More</Text>

              {/* 3-column grid */}
              <View style={styles.sheetGrid}>
                {(MORE_ROUTES as readonly string[]).map((name) => {
                  const isFocused = activeRoute === name;
                  const meta = ROUTE_META[name];
                  return (
                    <TouchableOpacity
                      key={name}
                      style={styles.sheetItem}
                      onPress={() => navigate(name)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.sheetIconWrap, isFocused && styles.sheetIconWrapActive]}>
                        <Ionicons
                          name={isFocused ? meta.focused : meta.unfocused}
                          size={26}
                          color={isFocused ? colors.primaryDark : colors.textMuted}
                        />
                      </View>
                      <Text style={[styles.sheetItemLabel, isFocused && styles.sheetItemLabelActive]}>
                        {meta.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── Navigator bridge ─────────────────────────────────────────────────────────
// Rendered as tabBar prop → lives inside Tab.Navigator context → has Tab nav access.
// Desktop: returns null, exposes navigation upward via refs.
// Mobile: renders MobileBottomBar.

export function NavigatorBridge({
  state,
  navigation,
  descriptors,
  isDesktop,
  onIndexChange,
  onNavReady,
}: BottomTabBarProps & {
  isDesktop: boolean;
  onIndexChange: (index: number) => void;
  onNavReady: (fn: (name: string) => void) => void;
}) {
  React.useLayoutEffect(() => {
    onNavReady((name: string) => (navigation as any).navigate(name));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    onIndexChange(state.index);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.index]);

  if (isDesktop) return null;
  return <MobileBottomBar state={state} navigation={navigation} descriptors={descriptors} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Desktop side nav ──
  sideNav: {
    width: SIDE_NAV_WIDTH,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    flexDirection: 'column',
  },
  brand: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brandName: { fontSize: 18, fontWeight: '800', color: colors.primaryDark, letterSpacing: -0.5 },
  brandTagline: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  navMain: { flex: 1, gap: 2 },
  navBottom: { gap: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  navItemActive: { backgroundColor: colors.primaryLight },
  navLabel: { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  navLabelActive: { fontWeight: '700', color: colors.primaryDark },

  // ── Mobile bottom bar ──
  mobileBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
  },
  mobileTabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: spacing.xs,
  },
  mobileTabLabel: { fontSize: 10, fontWeight: '600', color: colors.textMuted },
  mobileTabLabelActive: { color: colors.primaryDark },

  // ── More sheet ──
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },
  sheetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  sheetItem: {
    width: '30%',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  sheetIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetIconWrapActive: {
    backgroundColor: colors.primaryLight,
  },
  sheetItemLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, textAlign: 'center' },
  sheetItemLabelActive: { color: colors.primaryDark, fontWeight: '700' },
});
