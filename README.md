# TadiHD

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

## Project Structure

```
adhd-app/
├── src/
│   ├── db/
│   │   ├── schema/        — WatermelonDB table schemas
│   │   └── models/        — Task, FocusSession, Reminder models
│   ├── screens/           — One file per screen
│   ├── theme/
│   │   └── tokens.ts      — All colors, spacing, typography (single source of truth)
│   └── hooks/             — Custom React hooks
├── assets/                — Icons, splash screens
├── App.tsx                — Root component, DB provider
├── tailwind.config.js     — NativeWind theme (mirrors src/theme/tokens.ts)
└── babel.config.js        — Babel config for NativeWind + Reanimated
```

---

## Theming

All colors are defined as design tokens in [src/theme/tokens.ts](src/theme/tokens.ts). The default palette is **light green**.

To change the theme, edit the `colors` object in that file and mirror the changes in `tailwind.config.js`. No other files need to change.

Timer bar colors shift automatically:
- Green (`colors.timerHigh`) — more than 50% remaining
- Amber (`colors.timerMid`) — 25–50% remaining
- Red (`colors.timerLow`) — less than 25% remaining

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

- [brainstorm.md](brainstorm.md) — feature ideas and design thinking
- [implementation-plan.md](implementation-plan.md) — MVP scope, phase plan, data models
