import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  ScrollView,
  TextInput,
  Modal,
  Pressable,
  ActivityIndicator,
  Platform,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDatabase } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import * as Haptics from 'expo-haptics';
import { sendTestNotification, requestNotificationPermission } from '../services/notifications';
import {
  useSettingsStore,
  CalendarSourceKey,
  DEFAULT_CALENDAR_COLORS,
  CALENDAR_SOURCE_LABELS,
  CALENDAR_SOURCE_ICONS,
} from '../store/useSettingsStore';
import { colors, spacing, radius } from '../theme/tokens';
import { Task } from '../db/models/Task';
import { useAI } from '../hooks/useAI';

const WORK_OPTIONS = [10, 15, 20, 25, 30, 45, 60] as const;
const WARNING_OPTIONS = [1, 2, 3, 5] as const;

const ALL_SOURCES: CalendarSourceKey[] = ['manual', 'task-due', 'plant-reminder', 'device'];

// Curated palette for quick picking
const COLOR_PALETTE = [
  '#5A9A52', '#2E8B57', '#10B981', '#059669',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7',
  '#C9960A', '#D97706', '#F59E0B', '#EAB308',
  '#DC2626', '#E05C5C', '#F43F5E', '#EC4899',
  '#6B8C69', '#94A3B8', '#64748B', '#475569',
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>{children}</View>
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Color Picker Modal ───────────────────────────────────────────────────────

function ColorPickerModal({
  visible,
  currentColor,
  sourceLabel,
  onSelect,
  onClose,
}: {
  visible: boolean;
  currentColor: string;
  sourceLabel: string;
  onSelect: (color: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [customHex, setCustomHex] = useState('');

  const handleSelect = (color: string) => {
    Haptics.selectionAsync();
    onSelect(color);
    onClose();
  };

  const handleCustom = () => {
    const hex = customHex.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      handleSelect(hex);
      setCustomHex('');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalScrim} onPress={onClose}>
        <Pressable onPress={() => {}}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Choose Color</Text>
            <Text style={styles.modalSubtitle}>{sourceLabel}</Text>

            {/* Current color preview */}
            <View style={styles.currentColorRow}>
              <View style={[styles.colorPreviewLg, { backgroundColor: currentColor }]} />
              <Text style={styles.currentColorHex}>{currentColor}</Text>
            </View>

            {/* Palette grid */}
            <View style={styles.paletteGrid}>
              {COLOR_PALETTE.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.paletteItem,
                    { backgroundColor: color },
                    currentColor === color && styles.paletteItemActive,
                  ]}
                  onPress={() => handleSelect(color)}
                />
              ))}
            </View>

            {/* Custom hex input */}
            <View style={styles.customColorRow}>
              <TextInput
                style={styles.customColorInput}
                placeholder="#FF5733"
                placeholderTextColor={colors.textMuted}
                value={customHex}
                onChangeText={setCustomHex}
                maxLength={7}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={[styles.customColorBtn, !/^#[0-9A-Fa-f]{6}$/.test(customHex.trim()) && styles.customColorBtnDisabled]}
                onPress={handleCustom}
                disabled={!/^#[0-9A-Fa-f]{6}$/.test(customHex.trim())}
              >
                <Text style={styles.customColorBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── AI Section ──────────────────────────────────────────────────────────────

function AISection() {
  const ai = useAI();

  const statusLabel = {
    idle: 'Not loaded',
    loading: `Downloading... ${Math.round(ai.loadProgress * 100)}%`,
    ready: 'Ready',
    generating: 'Generating...',
    error: ai.error ?? 'Error',
  }[ai.status];

  const statusColor = {
    idle: colors.textMuted,
    loading: '#7C3AED',
    ready: '#10B981',
    generating: '#7C3AED',
    error: colors.danger,
  }[ai.status];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>Local AI</Text>
      <View style={styles.aiRow}>
        <View style={styles.aiInfo}>
          <Text style={styles.aiModelName}>Qwen 2.5 0.5B Instruct</Text>
          <Text style={[styles.aiStatusLabel, { color: statusColor }]}>{statusLabel}</Text>
        </View>
        {ai.status === 'idle' || ai.status === 'error' ? (
          <TouchableOpacity style={styles.aiLoadBtn} onPress={ai.initModel} activeOpacity={0.8}>
            <Text style={styles.aiLoadBtnText}>Download</Text>
          </TouchableOpacity>
        ) : ai.isLoading ? (
          <ActivityIndicator size="small" color="#7C3AED" />
        ) : (
          <View style={styles.aiReadyDot} />
        )}
      </View>
      {ai.isLoading && (
        <View style={styles.aiSettingsProgress}>
          <View style={[styles.aiSettingsProgressFill, { width: `${Math.round(ai.loadProgress * 100)}%` }]} />
        </View>
      )}
      <Text style={styles.aiHint}>
        Runs 100% in your browser via WebAssembly. First download is ~530 MB, then cached for offline use.
      </Text>
    </View>
  );
}

// ─── Settings Screen ──────────────────────────────────────────────────────────

export function SettingsScreen() {
  const {
    workDuration, transitionWarning, calendarColors, notificationsEnabled,
    setWorkDuration, setTransitionWarning, setCalendarColor, resetCalendarColors,
    setNotificationsEnabled,
  } = useSettingsStore();
  const db = useDatabase();

  const [editingSource, setEditingSource] = useState<CalendarSourceKey | null>(null);
  const [testSending, setTestSending] = useState(false);

  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive alerts for timers, events, and tasks.',
        );
        return;
      }
    }
    setNotificationsEnabled(enabled);
    Haptics.selectionAsync();
  };

  const handleTestNotification = async () => {
    setTestSending(true);
    try {
      const sent = await sendTestNotification();
      if (!sent) {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings.',
        );
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setTestSending(false);
    }
  };

  const handleExport = async () => {
    try {
      const tasks = await db.get<Task>('tasks').query(Q.sortBy('created_at', Q.desc)).fetch();
      const data = tasks.map((t) => ({
        id: t.id,
        title: t.title,
        notes: t.notes,
        status: t.status,
        priority: t.priority,
        estimatedMinutes: t.estimatedMinutes,
        actualMinutes: t.actualMinutes,
        createdAt: t.createdAt,
        completedAt: t.completedAt,
      }));
      await Share.share({ message: JSON.stringify(data, null, 2) });
    } catch (_e) {
      // Share cancelled or failed silently
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.heading}>Settings</Text>
        </View>

        {/* Timer defaults */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Timer defaults</Text>

          <Row label="Work duration">
            <View style={styles.chipRow}>
              {WORK_OPTIONS.map((min) => (
                <Chip
                  key={min}
                  label={`${min}m`}
                  active={workDuration === min}
                  onPress={() => setWorkDuration(min)}
                />
              ))}
            </View>
          </Row>

          <Row label="Transition warning">
            <View style={styles.chipRow}>
              {WARNING_OPTIONS.map((min) => (
                <Chip
                  key={min}
                  label={`${min}m`}
                  active={transitionWarning === min}
                  onPress={() => setTransitionWarning(min)}
                />
              ))}
            </View>
          </Row>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notifications</Text>

          <View style={styles.notifRow}>
            <View style={styles.notifInfo}>
              <Text style={styles.notifTitle}>Enable notifications</Text>
              <Text style={styles.notifDesc}>
                Get alerts for timers, events, and tasks
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={notificationsEnabled ? colors.primaryDark : '#f4f3f4'}
            />
          </View>

          <TouchableOpacity
            style={[styles.testBtn, testSending && styles.testBtnDisabled]}
            onPress={handleTestNotification}
            activeOpacity={0.8}
            disabled={testSending}
          >
            {testSending ? (
              <ActivityIndicator size="small" color={colors.primaryDark} />
            ) : (
              <>
                <Ionicons name="notifications-outline" size={18} color={colors.primaryDark} />
                <Text style={styles.testBtnText}>Send Test Notification</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Calendar Colors */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Calendar colors</Text>
            <TouchableOpacity
              onPress={() => {
                resetCalendarColors();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }}
            >
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>

          {ALL_SOURCES.map((src) => {
            const color = calendarColors[src];
            const isDefault = color === DEFAULT_CALENDAR_COLORS[src];
            return (
              <TouchableOpacity
                key={src}
                style={styles.colorRow}
                onPress={() => setEditingSource(src)}
                activeOpacity={0.7}
              >
                <View style={styles.colorRowLeft}>
                  <View style={[styles.colorSwatch, { backgroundColor: color }]} />
                  <Ionicons
                    name={CALENDAR_SOURCE_ICONS[src] as any}
                    size={18}
                    color={color}
                    style={styles.colorRowIcon}
                  />
                  <Text style={styles.colorRowLabel}>{CALENDAR_SOURCE_LABELS[src]}</Text>
                </View>
                <View style={styles.colorRowRight}>
                  <Text style={[styles.colorRowHex, !isDefault && { color }]}>{color}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Local AI */}
        {Platform.OS === 'web' && <AISection />}

        {/* Data */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Data</Text>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExport} activeOpacity={0.8}>
            <Text style={styles.exportBtnText}>Export tasks as JSON</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.version}>tADiHD v1.0 · All data stays on device</Text>
        </View>
      </ScrollView>

      {/* Color picker modal */}
      {editingSource ? (
        <ColorPickerModal
          visible={true}
          currentColor={calendarColors[editingSource]}
          sourceLabel={CALENDAR_SOURCE_LABELS[editingSource]}
          onSelect={(color) => setCalendarColor(editingSource, color)}
          onClose={() => setEditingSource(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: spacing.xxl },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  heading: { fontSize: 22, fontWeight: '700', color: colors.text },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },
  resetText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryDark,
    marginBottom: spacing.md,
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowLabel: { fontSize: 15, fontWeight: '500', color: colors.text, marginBottom: spacing.sm },
  rowRight: {},
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: colors.primaryDark },

  // Notifications
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  notifInfo: { flex: 1, marginRight: spacing.md },
  notifTitle: { fontSize: 15, fontWeight: '500', color: colors.text },
  notifDesc: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  testBtnDisabled: { opacity: 0.5 },
  testBtnText: { fontSize: 15, fontWeight: '600', color: colors.primaryDark },

  // Calendar color rows
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  colorRowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  colorSwatch: { width: 20, height: 20, borderRadius: 4 },
  colorRowIcon: { marginLeft: 2 },
  colorRowLabel: { fontSize: 15, fontWeight: '500', color: colors.text },
  colorRowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  colorRowHex: { fontSize: 13, fontWeight: '500', color: colors.textMuted, fontFamily: 'monospace' },

  exportBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  exportBtnText: { fontSize: 15, fontWeight: '600', color: colors.text },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  version: { fontSize: 12, color: colors.textMuted },

  // Color picker modal
  modalScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  modalSubtitle: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.md },
  currentColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  colorPreviewLg: { width: 40, height: 40, borderRadius: radius.md },
  currentColorHex: { fontSize: 16, fontWeight: '700', color: colors.text, fontFamily: 'monospace' },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  paletteItem: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
  },
  paletteItemActive: {
    borderWidth: 3,
    borderColor: colors.text,
  },
  customColorRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  customColorInput: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    fontFamily: 'monospace',
  },
  customColorBtn: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  customColorBtnDisabled: { opacity: 0.4 },
  customColorBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // AI section
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  aiInfo: { flex: 1 },
  aiModelName: { fontSize: 15, fontWeight: '600', color: colors.text },
  aiStatusLabel: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  aiLoadBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  aiLoadBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  aiReadyDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' },
  aiSettingsProgress: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 1.5,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  aiSettingsProgressFill: { height: '100%', backgroundColor: '#7C3AED', borderRadius: 1.5 },
  aiHint: { fontSize: 12, color: colors.textMuted, lineHeight: 16 },
});
