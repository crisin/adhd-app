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
