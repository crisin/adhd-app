/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.tsx',
    './index.ts',
    './src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
      },
      fontSize: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 20,
        xl: 28,
        xxl: 40,
      },
      borderRadius: {
        sm: 6,
        md: 12,
        lg: 20,
      },
      colors: {
        // Mirror src/theme/tokens.ts — update both if you change the palette
        primary: {
          DEFAULT: '#A8D5A2',
          dark: '#5A9A52',
          light: '#E8F5E6',
        },
        accent: {
          DEFAULT: '#F5C842',
          dark: '#C9960A',
          light: '#FDF3C0',
        },
        danger: {
          DEFAULT: '#E05C5C',
          dark: '#B02020',
          light: '#FDEAEA',
        },
        background: '#F7FAF7',
        surface: '#FFFFFF',
        'surface-muted': '#F0F4F0',
        border: '#D8E8D6',
        text: {
          DEFAULT: '#1A2E1A',
          muted: '#6B8C69',
          'on-primary': '#1A2E1A',
        },
      },
    },
  },
  plugins: [],
};
