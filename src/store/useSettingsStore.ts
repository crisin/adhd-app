import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsStore {
  workDuration: number;      // minutes, default 25
  transitionWarning: number; // minutes before end, default 3
  setWorkDuration: (min: number) => void;
  setTransitionWarning: (min: number) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      workDuration: 25,
      transitionWarning: 3,
      setWorkDuration: (workDuration) => set({ workDuration }),
      setTransitionWarning: (transitionWarning) => set({ transitionWarning }),
    }),
    {
      name: 'tadihd-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
