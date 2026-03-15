# tADiHD

An ADHD-focused productivity app built around how ADHD brains actually work — time blindness, task paralysis, hyperfocus traps, and the need for dopamine rewards.

Core loop: **Brain dump a task → pick one → focus timer → transition warning → complete → celebrate.**

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Expo 55 (React Native) |
| Styling | NativeWind v4 (Tailwind for RN) |
| Database | WatermelonDB (offline-first SQLite) |
| State | Zustand |
| Animations | React Native Reanimated + Lottie |
| Notifications | expo-notifications (local only) |

All user data is stored **on-device only**. No account, no server, no network required.

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/) — `npm install -g expo-cli`
- For iOS: Xcode + iOS Simulator (macOS only)
- For Android: Android Studio + an emulator, or a physical device with [Expo Go](https://expo.dev/go)
- For web: any modern browser

---

## Getting Started

```sh
# 1. Clone the repo
git clone <repo-url>
cd adhd-app

# 2. Install dependencies
npm install

# 3. Start the dev server
npm start
```

This opens the Expo dev menu. From there:

| Key | Action |
|---|---|
| `i` | Open iOS Simulator |
| `a` | Open Android Emulator |
| `w` | Open in browser |
| Scan QR | Open on physical device via Expo Go |

---

## Running on a specific platform

```sh
npm run ios      # iOS Simulator (macOS only)
npm run android  # Android Emulator
npm run web      # Browser
```

---

## Features

### Core
- **Task Management** — Kanban board (Backlog → Today → Active → Done), categories, priorities, due dates, subtasks, labels
- **Focus Timer** — Pomodoro-style with transition warnings, haptic feedback, and celebration on completion
- **Idea Dump** — Quick capture for raw thoughts, convert to tasks manually or via AI
- **Goals** — Short and long term goals linked to tasks with progress tracking
- **Calendar** — Month/week/day views, custom events, task due dates, plant water reminders

### Life Modules
- **Home Inventory** — Track belongings by user-created rooms with search and filters
- **Plant Management** — Watering schedules, status indicators, auto-reminders via calendar + tasks

### AI (On-Device)
- **Idea Decomposition** — Local AI (Qwen 2.5 0.5B via WebAssembly) turns raw ideas into structured tasks with subtasks
- **Multi-Provider** — Settings to configure local, OpenAI, Anthropic, or custom AI endpoints
- **Custom System Prompt** — Customize how AI processes your ideas

### Settings & Configuration
- **Appearance** — 6 theme presets (Forest, Ocean, Lavender, Sunset, Midnight, High Contrast), font size scaling, font family
- **Permissions** — Camera, microphone, calendar sync, and more — all opt-in from Settings, never requested automatically
- **Integrations** — Device calendar sync (read-only), email sharing, contacts (planned)
- **Testing Pages** — Every permission-gated feature has an inline test section to verify it works

### Cross-Platform
- **iOS, Android, Web** from a single codebase
- **Responsive** — Side navigation on desktop (≥768px), bottom tabs on mobile
- **Offline-first** — Everything works without internet

---

## Permissions Philosophy

tADiHD **never** requests permissions on launch or silently. Every permission (camera, microphone, calendar, etc.) is:

1. Off by default
2. Only requested when you explicitly enable it in Settings
3. Accompanied by a clear explanation of what it's used for
4. Testable via the built-in test section in Settings

---

## Project Structure

```
adhd-app/
├── src/
│   ├── db/
│   │   ├── schema/          — WatermelonDB table schemas (v6, 12 tables)
│   │   ├── models/          — Task, Goal, Idea, Plant, Room, CalendarEvent, etc.
│   │   ├── actions.ts       — 35+ CRUD operations
│   │   └── migrations.ts    — Schema migration history
│   ├── screens/             — One file per screen (12 screens)
│   ├── navigation/          — Tab + stack nav, responsive side nav
│   ├── hooks/               — 20+ custom reactive hooks
│   ├── services/
│   │   ├── permissions.ts   — Unified permission management
│   │   ├── notifications.ts — Local push notification scheduling
│   │   └── ai/             — On-device and cloud AI providers
│   ├── store/               — Zustand stores (settings, active task)
│   ├── theme/
│   │   ├── tokens.ts        — Design tokens (colors, spacing, typography)
│   │   └── ThemeProvider.tsx — Dynamic theming with 6 presets
│   └── components/          — Shared UI components
├── assets/                  — Icons, splash screens
├── App.tsx                  — Root component (DB + Theme providers)
└── PLAN.md                  — Implementation roadmap
```

---

## Theming

6 built-in themes, selectable in Settings > Appearance:

| Theme | Description |
|---|---|
| Forest | Calm green (default) — low-stimulation |
| Ocean | Cool blue — focused |
| Lavender | Soft purple — creative |
| Sunset | Warm amber — cozy |
| Midnight | Dark mode — low light |
| High Contrast | Strong contrast — accessibility |

Font size (S / M / L / XL) and font family (System / Mono / Rounded) are also configurable.

---

## Known Setup Issues

**npm cache permission error on macOS**

If you see `EACCES: permission denied` when running `npm install`, your npm cache has root-owned files. Fix it with:

```sh
sudo chown -R $(whoami) ~/.npm
```

Then re-run `npm install`.

---

## Docs

- [PLAN.md](PLAN.md) — Implementation roadmap & task tracker
- [PLAN-mobile-features.md](PLAN-mobile-features.md) — Mobile features plan (camera, mic, AI, theming, integrations)
- [brainstorm.md](brainstorm.md) — Feature ideas and design thinking
- [implementation-plan.md](implementation-plan.md) — MVP scope, phase plan, data models
- [2026-03-14-tadihd-feature-spec.md](2026-03-14-tadihd-feature-spec.md) — Complete feature specification
