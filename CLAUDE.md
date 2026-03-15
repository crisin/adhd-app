# CLAUDE.md — tADiHD Project Guide

## Project Overview
tADiHD is an offline-first ADHD companion app built with Expo 55 (React Native). All data lives on-device. No backend required.

## Tech Stack
- **Framework:** Expo 55 / React Native 0.83.2 / React 19
- **Styling:** NativeWind 4 (Tailwind for RN) + StyleSheet
- **Database:** WatermelonDB (SQLite on native, LokiJS + IndexedDB on web)
- **State:** Zustand 5 (persisted via AsyncStorage)
- **Navigation:** React Navigation 7 (bottom tabs + native stack)
- **AI:** Wllama (WebAssembly LLM, web only currently)
- **Targets:** iOS, Android, Web

## Key Directories
```
src/
├── db/           # WatermelonDB schema (v6), models, actions, migrations
├── screens/      # One file per screen (12 screens)
├── navigation/   # Tab + stack nav, desktop side nav
├── hooks/        # Custom reactive hooks (WatermelonDB queries)
├── services/     # AI engine, notifications
├── store/        # Zustand stores (settings, active task)
├── theme/        # Design tokens (colors, spacing, typography)
├── components/   # Shared UI components
└── utils/        # Helpers
```

## Commands
```bash
npx expo start          # Start dev server
npx expo start --web    # Web only
npx expo run:ios        # iOS native build
npx expo run:android    # Android native build
```

## Architecture Rules
- **Offline-first:** No network calls for core features. All data local.
- **Platform files:** Use `.web.ts` suffix for web-specific implementations (e.g., `engine.web.ts`)
- **DB adapters:** `src/db/index.ts` = native (SQLite), `src/db/index.web.ts` = web (LokiJS)
- **Schema migrations:** Always increment version in `src/db/schema/index.ts` and add migration in `src/db/migrations.ts`
- **Permissions:** Only request when user explicitly opts in via Settings. Never on first launch.
- **Design:** Calm, low-stimulation UI. No shame framing. Haptic feedback on interactions.

## Design Tokens
All colors, spacing, typography defined in `src/theme/tokens.ts`. Change there, not inline.

## State Management Pattern
- **Zustand** for app-wide settings (persisted) and ephemeral UI state
- **WatermelonDB reactive hooks** for all database queries (live-updating)
- **Custom hooks** in `src/hooks/` wrap WatermelonDB queries

## Adding a New Screen
1. Create `src/screens/MyScreen.tsx`
2. Add to `MainTabParamList` in `src/navigation/index.tsx`
3. Add `<Tab.Screen>` in `MainTabs` component
4. Update `TAB_ROUTE_NAMES` array
