/**
 * tADiHD Design Tokens
 *
 * All colors are defined here as a single source of truth.
 * To change the theme, swap these values — nothing else needs to change.
 *
 * Default palette: light green (calming, ADHD-friendly low-stimulation)
 */

export const colors = {
  // --- Primary brand color (light green default) ---
  primary: '#A8D5A2',
  primaryDark: '#5A9A52',   // for text/icons on light backgrounds
  primaryLight: '#E8F5E6',  // tints, subtle backgrounds

  // --- Accent (warm amber — used for warnings, highlights) ---
  accent: '#F5C842',
  accentDark: '#C9960A',
  accentLight: '#FDF3C0',

  // --- Danger (timer running out, urgent alerts) ---
  danger: '#E05C5C',
  dangerDark: '#B02020',
  dangerLight: '#FDEAEA',

  // --- Neutral surfaces ---
  background: '#F7FAF7',
  surface: '#FFFFFF',
  surfaceMuted: '#F0F4F0',
  border: '#D8E8D6',

  // --- Text ---
  text: '#1A2E1A',
  textMuted: '#6B8C69',
  textOnPrimary: '#1A2E1A', // text placed on top of primary color bg

  // --- Timer bar states ---
  // Applied automatically based on % remaining:
  timerHigh: '#A8D5A2',   // > 50% — same as primary
  timerMid: '#F5C842',    // 25–50% — accent/amber
  timerLow: '#E05C5C',    // < 25% — danger/red
} as const;

export type ColorToken = keyof typeof colors;

/**
 * Typography scale
 */
export const typography = {
  fontSizeXs: 12,
  fontSizeSm: 14,
  fontSizeMd: 16,
  fontSizeLg: 20,
  fontSizeXl: 28,
  fontSizeXxl: 40,

  fontWeightRegular: '400' as const,
  fontWeightMedium: '500' as const,
  fontWeightBold: '700' as const,
} as const;

/**
 * Spacing scale (multiples of 4)
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/**
 * Border radius
 */
export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  full: 9999,
} as const;
