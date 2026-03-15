import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

interface SettingsStore {
  workDuration: number;
  transitionWarning: number;
  calendarColors: Record<CalendarSourceKey, string>;
  notificationsEnabled: boolean;

  setWorkDuration: (min: number) => void;
  setTransitionWarning: (min: number) => void;
  setCalendarColor: (source: CalendarSourceKey, color: string) => void;
  resetCalendarColors: () => void;
  setNotificationsEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      workDuration: 25,
      transitionWarning: 3,
      calendarColors: { ...DEFAULT_CALENDAR_COLORS },
      notificationsEnabled: false,

      setWorkDuration: (workDuration) => set({ workDuration }),
      setTransitionWarning: (transitionWarning) => set({ transitionWarning }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setCalendarColor: (source, color) =>
        set((state) => ({
          calendarColors: { ...state.calendarColors, [source]: color },
        })),
      resetCalendarColors: () =>
        set({ calendarColors: { ...DEFAULT_CALENDAR_COLORS } }),
    }),
    {
      name: 'tadihd-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
