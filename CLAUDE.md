# CLAUDE.md — tADiHD Project Guide

## Project Overview
tADiHD is an offline-first ADHD companion app built with Expo 55 (React Native). All data lives on-device. No backend required. Targets iOS, Android, and Web from a single codebase.

## Tech Stack
- **Framework:** Expo 55 / React Native 0.83.2 / React 19
- **Styling:** NativeWind 4 (Tailwind for RN) + StyleSheet
- **Database:** WatermelonDB (SQLite on native, LokiJS + IndexedDB on web)
- **State:** Zustand 5 (persisted via AsyncStorage)
- **Navigation:** React Navigation 7 (bottom tabs + native stack)
- **AI:** Wllama (WebAssembly LLM, web only currently). Multi-provider pattern in `src/services/ai/`.
- **Theming:** Dynamic theme system via `ThemeProvider` context. 6 preset themes + font scale/family.
- **Permissions:** Unified via `src/services/permissions.ts`. All user-initiated from Settings.

## Commands
```bash
npx expo start              # Start dev server (all platforms)
npx expo start --web        # Web only
npx expo run:ios            # iOS native build
npx expo run:android        # Android native build
npm install                 # Install dependencies
```

**Note:** `tsc --noEmit` will fail — this project uses Expo's Babel/Metro pipeline, not raw tsc. Use `npx expo start` to validate builds.

## Key Directories
```
src/
├── db/                 # WatermelonDB schema (v6), models, actions, migrations
│   ├── schema/         # Table definitions (increment version here)
│   ├── models/         # WatermelonDB Model classes (Task, Goal, Idea, Plant, etc.)
│   ├── actions.ts      # All CRUD operations (35+ actions)
│   ├── migrations.ts   # Schema migration steps
│   ├── index.ts        # Native adapter (SQLite)
│   └── index.web.ts    # Web adapter (LokiJS + IndexedDB)
├── screens/            # One file per screen (12 screens)
├── navigation/         # Tab + stack nav, desktop side nav (SideNav.tsx)
├── hooks/              # Custom reactive hooks (WatermelonDB live queries)
├── services/
│   ├── permissions.ts  # Unified permission check/request for all features
│   ├── notifications.ts # expo-notifications scheduling
│   └── ai/            # AI engine (multi-provider pattern)
│       ├── types.ts    # AIEngine interface, DecomposedTask type
│       ├── engine.ts   # Native stub (placeholder)
│       └── engine.web.ts # Wllama WebAssembly engine
├── store/
│   ├── useSettingsStore.ts  # All app settings (persisted via AsyncStorage)
│   └── useTaskStore.ts      # Active task ID for focus timer
├── theme/
│   ├── tokens.ts       # Static design tokens (backward compat, still the SSoT for static imports)
│   ├── ThemeProvider.tsx # Dynamic theme context (6 presets, font scale, font family)
│   ├── categories.ts   # Task category colors/metadata
│   └── index.ts        # Re-exports
├── components/
│   ├── PermissionGate.tsx  # Wraps feature UI, shows enable prompt if disabled
│   ├── TestSection.tsx     # PermissionStatusBadge, PlatformAvailability, TestOutput
│   └── LocationPicker.tsx  # Hierarchical room picker modal
└── utils/
    └── confirm.ts      # Cross-platform delete confirmation
```

## Architecture Rules

### Core Principles
- **Offline-first:** No network calls for core features. All data local.
- **Permissions:** ONLY request when user explicitly opts in via Settings. Never on first launch. Never silently.
- **Design:** Calm, low-stimulation UI. No shame framing. Haptic feedback on interactions.
- **Platform files:** Use `.web.ts` suffix for web-specific implementations.

### Database
- Schema version lives in `src/db/schema/index.ts`
- **Always** increment version + add migration step in `src/db/migrations.ts` when changing schema
- Two adapters: `src/db/index.ts` (SQLite/native), `src/db/index.web.ts` (LokiJS/web)
- Models extend WatermelonDB's `Model` class with `@field`, `@date`, `@relation` decorators
- All mutations go through `database.write()` in `src/db/actions.ts`

### State Management
- **Zustand** (`useSettingsStore`): app-wide settings, permission toggles, theme, AI config. Persisted via AsyncStorage.
- **WatermelonDB reactive hooks**: all database queries. Live-updating. One hook per data concern.
- **Custom hooks** in `src/hooks/` wrap WatermelonDB `useQuery()` calls.

### Theming System
- `src/theme/tokens.ts`: Static tokens (backward compat, used by components importing `colors` directly)
- `src/theme/ThemeProvider.tsx`: Dynamic theme via React Context. Wraps the entire app in `App.tsx`.
- `useTheme()` hook returns current `ThemeTokens` (colors, typography, preset info)
- 6 presets: green (default), blue, purple, amber, dark, highContrast
- Font scale: small (0.85x), default (1x), large (1.15x), xlarge (1.3x)
- Font family: system, mono, rounded
- **Migration path:** New code should use `useTheme()`. Existing code using static `colors` import still works (green preset).

### Permissions System
- `src/services/permissions.ts`: Unified API for camera, photoLibrary, microphone, calendar, contacts, notifications
- `Permissions.check(kind)` / `Permissions.request(kind)` / `Permissions.isAvailable(kind)`
- `Permissions.requestWithAlert(kind, label)` — auto-shows "Open Settings" alert if denied
- Each permission has a toggle in `useSettingsStore` (e.g., `cameraEnabled`, `microphoneEnabled`)
- `PermissionGate` component wraps feature UI — shows enable prompt when disabled

### Settings Screen Pattern
- Organized into collapsible `Section` components with icons
- Each feature section includes inline test functionality
- Test components from `src/components/TestSection.tsx`: `PermissionStatusBadge`, `PlatformAvailability`, `TestOutput`
- Sections: Timer, Appearance, Notifications, Photos & Camera, Microphone, AI Engine, Integrations, Calendar Colors, Data

### AI System
- Multi-provider pattern: local (Wllama/web), planned: OpenAI, Anthropic, custom endpoint
- `useAI()` hook: singleton model instance, states (idle/loading/ready/generating/error)
- `AIEngine` interface in `src/services/ai/types.ts`
- Custom system prompt configurable in Settings (stored in `useSettingsStore.aiSystemPrompt`)
- API keys for cloud providers: will use `expo-secure-store` (NOT Zustand/AsyncStorage)

### Navigation
- 10 tabs: Today, Calendar, Tasks, Kanban, Ideas, Goals, Inventory, Plants, Locations, Settings
- Desktop (>=768px): side nav panel (220px) via `SideNav.tsx`
- Mobile: bottom tab bar
- Modal stack: AddTask, FocusTimer

## Adding a New Screen
1. Create `src/screens/MyScreen.tsx`
2. Add to `MainTabParamList` in `src/navigation/index.tsx`
3. Add `<Tab.Screen>` in `MainTabs` component
4. Update `TAB_ROUTE_NAMES` array

## Adding a New Permission-Gated Feature
1. Add toggle to `useSettingsStore` (e.g., `myFeatureEnabled`)
2. Add check/request to `src/services/permissions.ts` if new permission type
3. Add `PermissionToggle` row in relevant Settings section
4. Wrap feature UI in `PermissionGate` component
5. Add test section with `PermissionStatusBadge` + `PlatformAvailability`

## Adding a New Theme Preset
1. Define `ThemeColors` object in `src/theme/ThemeProvider.tsx`
2. Add to `THEME_PRESETS` record
3. Add label to `THEME_LABELS`
4. Add to `ThemePreset` union type in `src/store/useSettingsStore.ts`

## Platform Availability
| Feature | iOS | Android | Web |
|---------|-----|---------|-----|
| Camera/Photos | Yes | Yes | Yes (file input) |
| Microphone | Yes | Yes | Yes (WebRTC) |
| Local AI (Wllama) | No | No | Yes |
| Cloud AI | Yes | Yes | Yes |
| Calendar sync | Yes | Yes | No |
| Email compose | Yes | Yes | Partial (mailto:) |
| Notifications | Yes | Yes | Yes (Push API) |
| Secure storage | Yes | Yes | Partial |
