import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Calendar source types ───────────────────────────────────────────────────

export type CalendarSourceKey = 'manual' | 'task-due' | 'plant-reminder' | 'device';

export const DEFAULT_CALENDAR_COLORS: Record<CalendarSourceKey, string> = {
  manual: '#5A9A52',
  'task-due': '#C9960A',
  'plant-reminder': '#2E8B57',
  device: '#6B8C69',
};

export const CALENDAR_SOURCE_LABELS: Record<CalendarSourceKey, string> = {
  manual: 'My Events',
  'task-due': 'Task Due Dates',
  'plant-reminder': 'Plant Watering',
  device: 'Device Calendar',
};

export const CALENDAR_SOURCE_ICONS: Record<CalendarSourceKey, string> = {
  manual: 'calendar',
  'task-due': 'checkmark-circle',
  'plant-reminder': 'leaf',
  device: 'phone-portrait',
};

// ─── Theme types ─────────────────────────────────────────────────────────────

export type ThemePreset = 'green' | 'blue' | 'purple' | 'amber' | 'dark' | 'highContrast';
export type FontScale = 'small' | 'default' | 'large' | 'xlarge';
export type FontFamily = 'system' | 'mono' | 'rounded';

// ─── AI types ────────────────────────────────────────────────────────────────

export type AIProvider = 'local' | 'openai' | 'anthropic' | 'custom';

// ─── Store interface ─────────────────────────────────────────────────────────

interface SettingsStore {
  // Timer
  workDuration: number;
  transitionWarning: number;

  // Notifications
  notificationsEnabled: boolean;

  // Calendar colors
  calendarColors: Record<CalendarSourceKey, string>;

  // ── Feature permissions (user must opt in) ──
  cameraEnabled: boolean;
  photoLibraryEnabled: boolean;
  microphoneEnabled: boolean;
  calendarSyncEnabled: boolean;
  emailIntegrationEnabled: boolean;
  contactsEnabled: boolean;

  // ── Appearance ──
  themePreset: ThemePreset;
  fontScale: FontScale;
  fontFamily: FontFamily;

  // ── AI config ──
  aiProvider: AIProvider;
  aiModelId: string;
  aiSystemPrompt: string;
  aiStorageLimitMb: number;
  // Note: API keys stored in expo-secure-store, not here

  // ── Settings UI state ──
  expandedSections: string[];

  // ── Setters ──
  setWorkDuration: (min: number) => void;
  setTransitionWarning: (min: number) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setCalendarColor: (source: CalendarSourceKey, color: string) => void;
  resetCalendarColors: () => void;

  // Permission setters
  setCameraEnabled: (enabled: boolean) => void;
  setPhotoLibraryEnabled: (enabled: boolean) => void;
  setMicrophoneEnabled: (enabled: boolean) => void;
  setCalendarSyncEnabled: (enabled: boolean) => void;
  setEmailIntegrationEnabled: (enabled: boolean) => void;
  setContactsEnabled: (enabled: boolean) => void;

  // Appearance setters
  setThemePreset: (preset: ThemePreset) => void;
  setFontScale: (scale: FontScale) => void;
  setFontFamily: (family: FontFamily) => void;

  // AI setters
  setAIProvider: (provider: AIProvider) => void;
  setAIModelId: (id: string) => void;
  setAISystemPrompt: (prompt: string) => void;
  setAIStorageLimitMb: (mb: number) => void;

  // Section toggle
  toggleSection: (section: string) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // Timer
      workDuration: 25,
      transitionWarning: 3,

      // Notifications
      notificationsEnabled: false,

      // Calendar colors
      calendarColors: { ...DEFAULT_CALENDAR_COLORS },

      // Permissions (all off by default)
      cameraEnabled: false,
      photoLibraryEnabled: false,
      microphoneEnabled: false,
      calendarSyncEnabled: false,
      emailIntegrationEnabled: false,
      contactsEnabled: false,

      // Appearance
      themePreset: 'green',
      fontScale: 'default',
      fontFamily: 'system',

      // AI
      aiProvider: 'local',
      aiModelId: 'qwen-2.5-0.5b',
      aiSystemPrompt: '',
      aiStorageLimitMb: 1024,

      // UI state
      expandedSections: [],

      // Setters
      setWorkDuration: (workDuration) => set({ workDuration }),
      setTransitionWarning: (transitionWarning) => set({ transitionWarning }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setCalendarColor: (source, color) =>
        set((state) => ({
          calendarColors: { ...state.calendarColors, [source]: color },
        })),
      resetCalendarColors: () =>
        set({ calendarColors: { ...DEFAULT_CALENDAR_COLORS } }),

      // Permission setters
      setCameraEnabled: (cameraEnabled) => set({ cameraEnabled }),
      setPhotoLibraryEnabled: (photoLibraryEnabled) => set({ photoLibraryEnabled }),
      setMicrophoneEnabled: (microphoneEnabled) => set({ microphoneEnabled }),
      setCalendarSyncEnabled: (calendarSyncEnabled) => set({ calendarSyncEnabled }),
      setEmailIntegrationEnabled: (emailIntegrationEnabled) => set({ emailIntegrationEnabled }),
      setContactsEnabled: (contactsEnabled) => set({ contactsEnabled }),

      // Appearance setters
      setThemePreset: (themePreset) => set({ themePreset }),
      setFontScale: (fontScale) => set({ fontScale }),
      setFontFamily: (fontFamily) => set({ fontFamily }),

      // AI setters
      setAIProvider: (aiProvider) => set({ aiProvider }),
      setAIModelId: (aiModelId) => set({ aiModelId }),
      setAISystemPrompt: (aiSystemPrompt) => set({ aiSystemPrompt }),
      setAIStorageLimitMb: (aiStorageLimitMb) => set({ aiStorageLimitMb }),

      // Section toggle
      toggleSection: (section) =>
        set((state) => {
          const expanded = state.expandedSections.includes(section)
            ? state.expandedSections.filter((s) => s !== section)
            : [...state.expandedSections, section];
          return { expandedSections: expanded };
        }),
    }),
    {
      name: 'tadihd-settings',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist meaningful settings, not transient UI state
      partialState: undefined,
    },
  ),
);
