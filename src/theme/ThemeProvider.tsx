import React, { createContext, useContext, useMemo } from 'react';
import { useSettingsStore, ThemePreset, FontScale, FontFamily } from '../store/useSettingsStore';

// ─── Theme token types ───────────────────────────────────────────────────────

export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  accent: string;
  accentDark: string;
  accentLight: string;
  danger: string;
  dangerDark: string;
  dangerLight: string;
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  textOnPrimary: string;
  timerHigh: string;
  timerMid: string;
  timerLow: string;
}

export interface ThemeTypography {
  fontSizeXs: number;
  fontSizeSm: number;
  fontSizeMd: number;
  fontSizeLg: number;
  fontSizeXl: number;
  fontSizeXxl: number;
  fontWeightRegular: '400';
  fontWeightMedium: '500';
  fontWeightBold: '700';
  fontFamily: string | undefined; // undefined = system default
}

export interface ThemeTokens {
  colors: ThemeColors;
  typography: ThemeTypography;
  preset: ThemePreset;
  fontScale: FontScale;
  fontFamilyChoice: FontFamily;
  isDark: boolean;
}

// ─── Presets ─────────────────────────────────────────────────────────────────

const GREEN: ThemeColors = {
  primary: '#A8D5A2',
  primaryDark: '#5A9A52',
  primaryLight: '#E8F5E6',
  accent: '#F5C842',
  accentDark: '#C9960A',
  accentLight: '#FDF3C0',
  danger: '#E05C5C',
  dangerDark: '#B02020',
  dangerLight: '#FDEAEA',
  background: '#F7FAF7',
  surface: '#FFFFFF',
  surfaceMuted: '#F0F4F0',
  border: '#D8E8D6',
  text: '#1A2E1A',
  textMuted: '#6B8C69',
  textOnPrimary: '#1A2E1A',
  timerHigh: '#A8D5A2',
  timerMid: '#F5C842',
  timerLow: '#E05C5C',
};

const BLUE: ThemeColors = {
  primary: '#93C5FD',
  primaryDark: '#2563EB',
  primaryLight: '#DBEAFE',
  accent: '#F5C842',
  accentDark: '#C9960A',
  accentLight: '#FDF3C0',
  danger: '#EF4444',
  dangerDark: '#B91C1C',
  dangerLight: '#FEE2E2',
  background: '#F0F7FF',
  surface: '#FFFFFF',
  surfaceMuted: '#E8F0FE',
  border: '#BFDBFE',
  text: '#1E293B',
  textMuted: '#64748B',
  textOnPrimary: '#1E293B',
  timerHigh: '#93C5FD',
  timerMid: '#F5C842',
  timerLow: '#EF4444',
};

const PURPLE: ThemeColors = {
  primary: '#C4B5FD',
  primaryDark: '#7C3AED',
  primaryLight: '#EDE9FE',
  accent: '#F5C842',
  accentDark: '#C9960A',
  accentLight: '#FDF3C0',
  danger: '#EF4444',
  dangerDark: '#B91C1C',
  dangerLight: '#FEE2E2',
  background: '#FAF5FF',
  surface: '#FFFFFF',
  surfaceMuted: '#F3EEFF',
  border: '#DDD6FE',
  text: '#1E1B2E',
  textMuted: '#7C6F9B',
  textOnPrimary: '#1E1B2E',
  timerHigh: '#C4B5FD',
  timerMid: '#F5C842',
  timerLow: '#EF4444',
};

const AMBER: ThemeColors = {
  primary: '#FCD34D',
  primaryDark: '#B45309',
  primaryLight: '#FEF3C7',
  accent: '#A8D5A2',
  accentDark: '#5A9A52',
  accentLight: '#E8F5E6',
  danger: '#EF4444',
  dangerDark: '#B91C1C',
  dangerLight: '#FEE2E2',
  background: '#FFFBEB',
  surface: '#FFFFFF',
  surfaceMuted: '#FEF9E7',
  border: '#FDE68A',
  text: '#292524',
  textMuted: '#92400E',
  textOnPrimary: '#292524',
  timerHigh: '#FCD34D',
  timerMid: '#FB923C',
  timerLow: '#EF4444',
};

const DARK: ThemeColors = {
  primary: '#6EE7B7',
  primaryDark: '#34D399',
  primaryLight: '#1A2E2A',
  accent: '#FBBF24',
  accentDark: '#F59E0B',
  accentLight: '#2D2510',
  danger: '#F87171',
  dangerDark: '#EF4444',
  dangerLight: '#2D1515',
  background: '#0F172A',
  surface: '#1E293B',
  surfaceMuted: '#1A2332',
  border: '#334155',
  text: '#F1F5F9',
  textMuted: '#94A3B8',
  textOnPrimary: '#0F172A',
  timerHigh: '#6EE7B7',
  timerMid: '#FBBF24',
  timerLow: '#F87171',
};

const HIGH_CONTRAST: ThemeColors = {
  primary: '#000000',
  primaryDark: '#000000',
  primaryLight: '#E5E5E5',
  accent: '#B45309',
  accentDark: '#92400E',
  accentLight: '#FEF3C7',
  danger: '#DC2626',
  dangerDark: '#991B1B',
  dangerLight: '#FEE2E2',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F5F5F5',
  border: '#000000',
  text: '#000000',
  textMuted: '#525252',
  textOnPrimary: '#FFFFFF',
  timerHigh: '#16A34A',
  timerMid: '#CA8A04',
  timerLow: '#DC2626',
};

export const THEME_PRESETS: Record<ThemePreset, ThemeColors> = {
  green: GREEN,
  blue: BLUE,
  purple: PURPLE,
  amber: AMBER,
  dark: DARK,
  highContrast: HIGH_CONTRAST,
};

export const THEME_LABELS: Record<ThemePreset, string> = {
  green: 'Forest',
  blue: 'Ocean',
  purple: 'Lavender',
  amber: 'Sunset',
  dark: 'Midnight',
  highContrast: 'High Contrast',
};

// ─── Font scale multipliers ──────────────────────────────────────────────────

const FONT_SCALE_MAP: Record<FontScale, number> = {
  small: 0.85,
  default: 1,
  large: 1.15,
  xlarge: 1.3,
};

const FONT_FAMILY_MAP: Record<FontFamily, string | undefined> = {
  system: undefined,
  mono: 'monospace',
  rounded: undefined, // System default; could map to a custom font later
};

// ─── Context ─────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeTokens | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const preset = useSettingsStore((s) => s.themePreset);
  const fontScale = useSettingsStore((s) => s.fontScale);
  const fontFamilyChoice = useSettingsStore((s) => s.fontFamily);

  const theme = useMemo((): ThemeTokens => {
    const themeColors = THEME_PRESETS[preset];
    const scale = FONT_SCALE_MAP[fontScale];
    const fontFamily = FONT_FAMILY_MAP[fontFamilyChoice];

    return {
      colors: themeColors,
      typography: {
        fontSizeXs: Math.round(12 * scale),
        fontSizeSm: Math.round(14 * scale),
        fontSizeMd: Math.round(16 * scale),
        fontSizeLg: Math.round(20 * scale),
        fontSizeXl: Math.round(28 * scale),
        fontSizeXxl: Math.round(40 * scale),
        fontWeightRegular: '400',
        fontWeightMedium: '500',
        fontWeightBold: '700',
        fontFamily,
      },
      preset,
      fontScale,
      fontFamilyChoice,
      isDark: preset === 'dark',
    };
  }, [preset, fontScale, fontFamilyChoice]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

/**
 * Access the current dynamic theme. Falls back to green preset
 * if used outside ThemeProvider (backward compat during migration).
 */
export function useTheme(): ThemeTokens {
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx;

  // Fallback for components not yet inside ThemeProvider
  return {
    colors: GREEN,
    typography: {
      fontSizeXs: 12,
      fontSizeSm: 14,
      fontSizeMd: 16,
      fontSizeLg: 20,
      fontSizeXl: 28,
      fontSizeXxl: 40,
      fontWeightRegular: '400',
      fontWeightMedium: '500',
      fontWeightBold: '700',
      fontFamily: undefined,
    },
    preset: 'green',
    fontScale: 'default',
    fontFamilyChoice: 'system',
    isDark: false,
  };
}
