import React, { useState, useCallback } from 'react';
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
import { Permissions } from '../services/permissions';
import {
  useSettingsStore,
  CalendarSourceKey,
  DEFAULT_CALENDAR_COLORS,
  CALENDAR_SOURCE_LABELS,
  CALENDAR_SOURCE_ICONS,
  ThemePreset,
  FontScale,
  FontFamily,
  AIProvider,
} from '../store/useSettingsStore';
import { THEME_PRESETS, THEME_LABELS, useTheme } from '../theme/ThemeProvider';
import { colors, spacing, radius } from '../theme/tokens';
import { Task } from '../db/models/Task';
import { useAI } from '../hooks/useAI';
import { PermissionStatusBadge, PlatformAvailability, TestOutput } from '../components/TestSection';

// ─── Constants ───────────────────────────────────────────────────────────────

const WORK_OPTIONS = [10, 15, 20, 25, 30, 45, 60] as const;
const WARNING_OPTIONS = [1, 2, 3, 5] as const;
const ALL_SOURCES: CalendarSourceKey[] = ['manual', 'task-due', 'plant-reminder', 'device'];
const FONT_SCALE_OPTIONS: { value: FontScale; label: string }[] = [
  { value: 'small', label: 'S' },
  { value: 'default', label: 'M' },
  { value: 'large', label: 'L' },
  { value: 'xlarge', label: 'XL' },
];
const FONT_FAMILY_OPTIONS: { value: FontFamily; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'mono', label: 'Mono' },
  { value: 'rounded', label: 'Rounded' },
];
const AI_PROVIDER_OPTIONS: { value: AIProvider; label: string; description: string }[] = [
  { value: 'local', label: 'On-Device', description: 'Runs locally, no internet needed' },
  { value: 'openai', label: 'OpenAI', description: 'GPT-4o Mini, GPT-4o' },
  { value: 'anthropic', label: 'Anthropic', description: 'Claude Haiku, Sonnet' },
  { value: 'custom', label: 'Custom', description: 'OpenAI-compatible endpoint' },
];

const COLOR_PALETTE = [
  '#5A9A52', '#2E8B57', '#10B981', '#059669',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7',
  '#C9960A', '#D97706', '#F59E0B', '#EAB308',
  '#DC2626', '#E05C5C', '#F43F5E', '#EC4899',
  '#6B8C69', '#94A3B8', '#64748B', '#475569',
];

// ─── Reusable components ─────────────────────────────────────────────────────

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

// ─── Collapsible Section ─────────────────────────────────────────────────────

function Section({
  id,
  label,
  icon,
  children,
  collapsible = false,
  defaultOpen = true,
}: {
  id: string;
  label: string;
  icon?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const { expandedSections, toggleSection } = useSettingsStore();

  // Non-collapsible sections are always shown
  if (!collapsible) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          {icon && <Ionicons name={icon as any} size={16} color={colors.textMuted} style={styles.sectionIcon} />}
          <Text style={styles.sectionLabel}>{label}</Text>
        </View>
        {children}
      </View>
    );
  }

  // Collapsible: check if expanded
  // If expandedSections hasn't been touched for this id, use defaultOpen
  const hasBeenToggled = expandedSections.includes(`_toggled_${id}`);
  const isExpanded = hasBeenToggled
    ? expandedSections.includes(id)
    : defaultOpen;

  const handleToggle = () => {
    // Mark as toggled + toggle expansion
    if (!hasBeenToggled) {
      // First toggle: add both the toggled marker and the actual state
      const next = defaultOpen
        ? [...expandedSections, `_toggled_${id}`] // was open, now closing — don't add id
        : [...expandedSections, `_toggled_${id}`, id]; // was closed, now opening — add id
      useSettingsStore.setState({ expandedSections: next });
    } else {
      toggleSection(id);
    }
    Haptics.selectionAsync();
  };

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeaderRow}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        {icon && <Ionicons name={icon as any} size={16} color={colors.textMuted} style={styles.sectionIcon} />}
        <Text style={styles.sectionLabel}>{label}</Text>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textMuted}
          style={styles.sectionChevron}
        />
      </TouchableOpacity>
      {isExpanded && children}
    </View>
  );
}

// ─── Permission Toggle Row ───────────────────────────────────────────────────

function PermissionToggle({
  label,
  description,
  icon,
  enabled,
  permissionKind,
  onToggle,
}: {
  label: string;
  description: string;
  icon: string;
  enabled: boolean;
  permissionKind: string;
  onToggle: (enabled: boolean) => void;
}) {
  const handleToggle = async (value: boolean) => {
    if (value) {
      const kind = permissionKind as any;
      if (Permissions.isAvailable(kind)) {
        const granted = await Permissions.requestWithAlert(kind, label);
        if (!granted) return;
      }
    }
    onToggle(value);
    Haptics.selectionAsync();
  };

  const available = Permissions.isAvailable(permissionKind as any);

  return (
    <View style={[styles.notifRow, !available && styles.rowDisabled]}>
      <View style={styles.permRowLeft}>
        <Ionicons name={icon as any} size={20} color={enabled ? colors.primaryDark : colors.textMuted} />
        <View style={styles.notifInfo}>
          <Text style={styles.notifTitle}>{label}</Text>
          <Text style={styles.notifDesc}>{description}</Text>
          {!available && (
            <Text style={styles.notAvailable}>
              Not available on {Platform.OS === 'web' ? 'web' : 'this platform'}
            </Text>
          )}
        </View>
      </View>
      <Switch
        value={enabled && available}
        onValueChange={handleToggle}
        disabled={!available}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={enabled ? colors.primaryDark : '#f4f3f4'}
      />
    </View>
  );
}

// ─── Color Picker Modal ──────────────────────────────────────────────────────

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

            <View style={styles.currentColorRow}>
              <View style={[styles.colorPreviewLg, { backgroundColor: currentColor }]} />
              <Text style={styles.currentColorHex}>{currentColor}</Text>
            </View>

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
  const { aiProvider, aiModelId, aiSystemPrompt, setAIProvider, setAIModelId, setAISystemPrompt } = useSettingsStore();
  const [testOutput, setTestOutput] = useState<string[]>([]);
  const [testIdea, setTestIdea] = useState('');
  const [testing, setTesting] = useState(false);

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

  const handleTestDecompose = async () => {
    if (!testIdea.trim()) return;
    setTesting(true);
    setTestOutput(['Running decomposition...']);
    const start = Date.now();
    try {
      const result = await ai.decompose(testIdea);
      const elapsed = Date.now() - start;
      if (result) {
        setTestOutput([
          `Title: ${result.title}`,
          `Category: ${result.category ?? 'none'}`,
          `Priority: ${result.priority}`,
          `Estimated: ${result.estimatedMinutes ?? '?'} min`,
          `Subtasks: ${result.subtasks.length}`,
          ...result.subtasks.map((s, i) => `  ${i + 1}. ${s.title}`),
          `Time: ${elapsed}ms`,
        ]);
      } else {
        setTestOutput(['No result returned']);
      }
    } catch (e: any) {
      setTestOutput([`Error: ${e.message}`]);
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      {/* Provider selection */}
      <Text style={styles.subLabel}>Provider</Text>
      <View style={styles.chipRow}>
        {AI_PROVIDER_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            active={aiProvider === opt.value}
            onPress={() => setAIProvider(opt.value)}
          />
        ))}
      </View>
      <Text style={styles.aiHint}>
        {AI_PROVIDER_OPTIONS.find((o) => o.value === aiProvider)?.description}
      </Text>

      {/* Local AI download (web only) */}
      {aiProvider === 'local' && Platform.OS === 'web' && (
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
      )}

      {ai.isLoading && (
        <View style={styles.aiSettingsProgress}>
          <View style={[styles.aiSettingsProgressFill, { width: `${Math.round(ai.loadProgress * 100)}%` }]} />
        </View>
      )}

      {aiProvider === 'local' && Platform.OS !== 'web' && (
        <Text style={styles.aiHint}>
          On-device AI is not yet available on native platforms. Coming soon with llama.rn integration.
        </Text>
      )}

      {/* Cloud API key placeholder */}
      {(aiProvider === 'openai' || aiProvider === 'anthropic' || aiProvider === 'custom') && (
        <View style={styles.row}>
          <Text style={styles.rowLabel}>API Key</Text>
          <Text style={styles.comingSoon}>Cloud providers coming in next update</Text>
        </View>
      )}

      {/* Custom system prompt */}
      <Text style={[styles.subLabel, { marginTop: spacing.md }]}>System Prompt</Text>
      <TextInput
        style={styles.systemPromptInput}
        value={aiSystemPrompt}
        onChangeText={setAISystemPrompt}
        placeholder="Leave empty for default prompt"
        placeholderTextColor={colors.textMuted}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
      {aiSystemPrompt.length > 0 && (
        <TouchableOpacity onPress={() => setAISystemPrompt('')}>
          <Text style={styles.resetText}>Reset to Default</Text>
        </TouchableOpacity>
      )}

      {/* Test section */}
      <Text style={[styles.subLabel, { marginTop: spacing.md }]}>Test AI</Text>
      <TextInput
        style={styles.testInput}
        value={testIdea}
        onChangeText={setTestIdea}
        placeholder="Enter a test idea to decompose..."
        placeholderTextColor={colors.textMuted}
      />
      <TouchableOpacity
        style={[styles.testBtn, (testing || ai.status !== 'ready') && styles.testBtnDisabled]}
        onPress={handleTestDecompose}
        activeOpacity={0.8}
        disabled={testing || ai.status !== 'ready'}
      >
        {testing ? (
          <ActivityIndicator size="small" color={colors.primaryDark} />
        ) : (
          <>
            <Ionicons name="flask-outline" size={18} color={colors.primaryDark} />
            <Text style={styles.testBtnText}>Test Decomposition</Text>
          </>
        )}
      </TouchableOpacity>
      <TestOutput lines={testOutput} />

      <PlatformAvailability
        features={[
          { label: 'Local AI (WebAssembly)', ios: false, android: false, web: true },
          { label: 'Local AI (llama.rn)', ios: false, android: false, web: false },
          { label: 'Cloud AI (API)', ios: true, android: true, web: true },
        ]}
      />
    </>
  );
}

// ─── Appearance Section ──────────────────────────────────────────────────────

function AppearanceSection() {
  const { themePreset, fontScale, fontFamily, setThemePreset, setFontScale, setFontFamily } = useSettingsStore();

  return (
    <>
      {/* Theme presets */}
      <Text style={styles.subLabel}>Theme</Text>
      <View style={styles.themeGrid}>
        {(Object.keys(THEME_PRESETS) as ThemePreset[]).map((preset) => {
          const theme = THEME_PRESETS[preset];
          const active = themePreset === preset;
          return (
            <TouchableOpacity
              key={preset}
              style={[styles.themeCard, active && styles.themeCardActive]}
              onPress={() => {
                setThemePreset(preset);
                Haptics.selectionAsync();
              }}
              activeOpacity={0.8}
            >
              <View style={styles.themeSwatches}>
                <View style={[styles.themeSwatch, { backgroundColor: theme.primary }]} />
                <View style={[styles.themeSwatch, { backgroundColor: theme.background }]} />
                <View style={[styles.themeSwatch, { backgroundColor: theme.text }]} />
              </View>
              <Text style={[styles.themeLabel, active && styles.themeLabelActive]}>
                {THEME_LABELS[preset]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Font size */}
      <Text style={[styles.subLabel, { marginTop: spacing.md }]}>Font Size</Text>
      <View style={styles.chipRow}>
        {FONT_SCALE_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            active={fontScale === opt.value}
            onPress={() => {
              setFontScale(opt.value);
              Haptics.selectionAsync();
            }}
          />
        ))}
      </View>

      {/* Font family */}
      <Text style={[styles.subLabel, { marginTop: spacing.md }]}>Font</Text>
      <View style={styles.chipRow}>
        {FONT_FAMILY_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            active={fontFamily === opt.value}
            onPress={() => {
              setFontFamily(opt.value);
              Haptics.selectionAsync();
            }}
          />
        ))}
      </View>

      {/* Preview */}
      <Text style={[styles.subLabel, { marginTop: spacing.md }]}>Preview</Text>
      <View style={styles.previewCard}>
        <Text style={styles.previewTitle}>Sample Task</Text>
        <Text style={styles.previewSubtitle}>This is how your content will look</Text>
        <View style={styles.previewBadgeRow}>
          <View style={[styles.previewBadge, { backgroundColor: THEME_PRESETS[themePreset].primaryLight }]}>
            <Text style={[styles.previewBadgeText, { color: THEME_PRESETS[themePreset].primaryDark }]}>Medium</Text>
          </View>
          <View style={[styles.previewBadge, { backgroundColor: THEME_PRESETS[themePreset].accentLight }]}>
            <Text style={[styles.previewBadgeText, { color: THEME_PRESETS[themePreset].accentDark }]}>Work</Text>
          </View>
        </View>
      </View>
    </>
  );
}

// ─── Photos & Camera Test Section ────────────────────────────────────────────

function PhotosCameraTestSection() {
  const [testOutput, setTestOutput] = useState<string[]>([]);

  const handleTestCheck = async () => {
    const cam = await Permissions.check('camera');
    const lib = await Permissions.check('photoLibrary');
    setTestOutput([
      `Camera: ${cam.status} (canAskAgain: ${cam.canAskAgain})`,
      `Photo Library: ${lib.status} (canAskAgain: ${lib.canAskAgain})`,
      `Platform: ${Platform.OS}`,
    ]);
  };

  return (
    <>
      <PermissionStatusBadge permission="camera" />
      <TouchableOpacity style={styles.testBtn} onPress={handleTestCheck} activeOpacity={0.8}>
        <Ionicons name="shield-checkmark-outline" size={18} color={colors.primaryDark} />
        <Text style={styles.testBtnText}>Check Permission Status</Text>
      </TouchableOpacity>
      <Text style={styles.aiHint}>
        Full camera and gallery integration will be available in the next update. Photos are stored locally only.
      </Text>
      <TestOutput lines={testOutput} />
      <PlatformAvailability
        features={[
          { label: 'Camera capture', ios: true, android: true, web: true },
          { label: 'Photo gallery', ios: true, android: true, web: true },
          { label: 'Album browsing', ios: true, android: true, web: false },
        ]}
      />
    </>
  );
}

// ─── Microphone Test Section ─────────────────────────────────────────────────

function MicrophoneTestSection() {
  const [testOutput, setTestOutput] = useState<string[]>([]);

  const handleTestCheck = async () => {
    const mic = await Permissions.check('microphone');
    setTestOutput([
      `Microphone: ${mic.status} (canAskAgain: ${mic.canAskAgain})`,
      `Platform: ${Platform.OS}`,
    ]);
  };

  return (
    <>
      <PermissionStatusBadge permission="microphone" />
      <TouchableOpacity style={styles.testBtn} onPress={handleTestCheck} activeOpacity={0.8}>
        <Ionicons name="shield-checkmark-outline" size={18} color={colors.primaryDark} />
        <Text style={styles.testBtnText}>Check Permission Status</Text>
      </TouchableOpacity>
      <Text style={styles.aiHint}>
        Voice recording for ideas and tasks will be available in the next update. Recordings stay on your device.
      </Text>
      <TestOutput lines={testOutput} />
      <PlatformAvailability
        features={[
          { label: 'Audio recording', ios: true, android: true, web: true },
          { label: 'Audio playback', ios: true, android: true, web: true },
        ]}
      />
    </>
  );
}

// ─── Integrations Test Section ───────────────────────────────────────────────

function IntegrationsSection() {
  const {
    calendarSyncEnabled, emailIntegrationEnabled, contactsEnabled,
    setCalendarSyncEnabled, setEmailIntegrationEnabled, setContactsEnabled,
  } = useSettingsStore();
  const [testOutput, setTestOutput] = useState<string[]>([]);

  const handleCalendarTest = async () => {
    const cal = await Permissions.check('calendar');
    setTestOutput([
      `Calendar: ${cal.status} (canAskAgain: ${cal.canAskAgain})`,
      `Available: ${Permissions.isAvailable('calendar')}`,
      `Platform: ${Platform.OS}`,
    ]);
  };

  return (
    <>
      <PermissionToggle
        label="Device Calendar"
        description="Show device calendar events alongside tADiHD events (read-only)"
        icon="calendar-outline"
        enabled={calendarSyncEnabled}
        permissionKind="calendar"
        onToggle={setCalendarSyncEnabled}
      />
      <PermissionToggle
        label="Email Sharing"
        description="Share task summaries and exports via email"
        icon="mail-outline"
        enabled={emailIntegrationEnabled}
        permissionKind="notifications" // Email doesn't need permissions, using notifications as dummy
        onToggle={setEmailIntegrationEnabled}
      />
      <PermissionToggle
        label="Contacts"
        description="Link tasks to contacts (future feature)"
        icon="people-outline"
        enabled={contactsEnabled}
        permissionKind="contacts"
        onToggle={setContactsEnabled}
      />

      {/* Test */}
      <Text style={[styles.subLabel, { marginTop: spacing.md }]}>Test Integrations</Text>
      <TouchableOpacity style={styles.testBtn} onPress={handleCalendarTest} activeOpacity={0.8}>
        <Ionicons name="calendar-outline" size={18} color={colors.primaryDark} />
        <Text style={styles.testBtnText}>Check Calendar Access</Text>
      </TouchableOpacity>
      <TestOutput lines={testOutput} />
      <PlatformAvailability
        features={[
          { label: 'Calendar sync', ios: true, android: true, web: false },
          { label: 'Email compose', ios: true, android: true, web: true },
          { label: 'Contacts', ios: true, android: true, web: false },
        ]}
      />
    </>
  );
}

// ─── Settings Screen ─────────────────────────────────────────────────────────

export function SettingsScreen() {
  const {
    workDuration, transitionWarning, calendarColors, notificationsEnabled,
    cameraEnabled, photoLibraryEnabled, microphoneEnabled,
    setWorkDuration, setTransitionWarning, setCalendarColor, resetCalendarColors,
    setNotificationsEnabled, setCameraEnabled, setPhotoLibraryEnabled, setMicrophoneEnabled,
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

  const handleCameraToggle = async (enabled: boolean) => {
    if (enabled) {
      const cam = await Permissions.requestWithAlert('camera', 'Camera');
      const lib = await Permissions.requestWithAlert('photoLibrary', 'Photo Library');
      if (!cam || !lib) return;
    }
    setCameraEnabled(enabled);
    setPhotoLibraryEnabled(enabled);
    Haptics.selectionAsync();
  };

  const handleMicToggle = async (enabled: boolean) => {
    if (enabled) {
      const granted = await Permissions.requestWithAlert('microphone', 'Microphone');
      if (!granted) return;
    }
    setMicrophoneEnabled(enabled);
    Haptics.selectionAsync();
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.heading}>Settings</Text>
        </View>

        {/* Timer defaults */}
        <Section id="timer" label="Timer Defaults" icon="timer-outline">
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
        </Section>

        {/* Appearance */}
        <Section id="appearance" label="Appearance" icon="color-palette-outline" collapsible defaultOpen={false}>
          <AppearanceSection />
        </Section>

        {/* Notifications */}
        <Section id="notifications" label="Notifications" icon="notifications-outline">
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
        </Section>

        {/* Photos & Camera */}
        <Section id="photos" label="Photos & Camera" icon="camera-outline" collapsible defaultOpen={false}>
          <PermissionToggle
            label="Camera & Photos"
            description="Capture photos for inventory items and plants. Photos stay on your device."
            icon="camera-outline"
            enabled={cameraEnabled}
            permissionKind="camera"
            onToggle={handleCameraToggle}
          />
          <Text style={[styles.subLabel, { marginTop: spacing.md }]}>Test</Text>
          <PhotosCameraTestSection />
        </Section>

        {/* Microphone */}
        <Section id="microphone" label="Microphone" icon="mic-outline" collapsible defaultOpen={false}>
          <PermissionToggle
            label="Microphone Recording"
            description="Record voice notes for ideas and tasks. Recordings stay on your device."
            icon="mic-outline"
            enabled={microphoneEnabled}
            permissionKind="microphone"
            onToggle={handleMicToggle}
          />
          <Text style={[styles.subLabel, { marginTop: spacing.md }]}>Test</Text>
          <MicrophoneTestSection />
        </Section>

        {/* AI Engine */}
        <Section id="ai" label="AI Engine" icon="sparkles-outline" collapsible defaultOpen={false}>
          <AISection />
        </Section>

        {/* Integrations */}
        <Section id="integrations" label="Integrations" icon="link-outline" collapsible defaultOpen={false}>
          <IntegrationsSection />
        </Section>

        {/* Calendar Colors */}
        <Section id="calendarColors" label="Calendar Colors" icon="color-fill-outline" collapsible defaultOpen={false}>
          <View style={styles.sectionHeader}>
            <View />
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
        </Section>

        {/* Data */}
        <Section id="data" label="Data" icon="folder-outline">
          <TouchableOpacity style={styles.exportBtn} onPress={handleExport} activeOpacity={0.8}>
            <Text style={styles.exportBtnText}>Export tasks as JSON</Text>
          </TouchableOpacity>
        </Section>

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

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: spacing.xxl },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  heading: { fontSize: 22, fontWeight: '700', color: colors.text },

  // Sections
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionIcon: {
    marginRight: spacing.xs,
  },
  sectionChevron: {
    marginLeft: 'auto',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  subLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  resetText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  comingSoon: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },

  // Rows
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowLabel: { fontSize: 15, fontWeight: '500', color: colors.text, marginBottom: spacing.sm },
  rowRight: {},
  rowDisabled: { opacity: 0.5 },
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

  // Permission toggle
  permRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    marginRight: spacing.md,
  },
  notAvailable: {
    fontSize: 11,
    color: colors.danger,
    marginTop: 2,
  },

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
    marginBottom: spacing.sm,
  },
  testBtnDisabled: { opacity: 0.5 },
  testBtnText: { fontSize: 15, fontWeight: '600', color: colors.primaryDark },
  testInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },

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
    marginTop: spacing.sm,
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
  aiHint: { fontSize: 12, color: colors.textMuted, lineHeight: 16, marginTop: spacing.xs },
  systemPromptInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 80,
    marginBottom: spacing.sm,
  },

  // Appearance
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  themeCard: {
    width: '30%' as any,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  themeCardActive: {
    borderColor: colors.primaryDark,
  },
  themeSwatches: {
    flexDirection: 'row',
    gap: 3,
    marginBottom: spacing.xs,
  },
  themeSwatch: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  themeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  themeLabelActive: {
    color: colors.primaryDark,
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  previewSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  previewBadgeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  previewBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  previewBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
