# ADHD App — MVP Implementation Plan

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Platform | React Native + Expo | Cross-platform (iOS, Android, desktop via Expo for Web), fastest iteration |
| Offline-first | Yes — all data on device | Privacy, works anywhere, no account needed |
| AI | Local models via on-device inference | Privacy + offline requirement |
| Data storage | WatermelonDB (SQLite) | Built for offline-first RN apps, fast, reactive |
| State | Zustand | Lightweight, minimal boilerplate |
| UI | NativeWind (Tailwind for RN) | Rapid styling, consistent design tokens |
| Notifications | expo-notifications | Cross-platform local push |

---

## MVP Scope — The Core Loop

The MVP answers one question: **can a user capture a task, work on it with a timer, and feel rewarded for finishing?**

```
Brain dump task → Pick one → Start timer → Get transition warning → Complete → Celebrate
```

Everything else is post-MVP.

---

## Tech Stack

```
adhd-app/
├── apps/
│   └── mobile/          # Expo app (iOS + Android + Web)
├── packages/
│   └── db/              # WatermelonDB schema + models (shared)
```

**Dependencies:**
- `expo` ~52
- `expo-notifications` — local scheduled notifications
- `expo-haptics` — physical feedback on actions
- `@nozbe/watermelondb` — offline-first SQLite ORM
- `zustand` — global state
- `nativewind` — Tailwind styling
- `react-native-reanimated` — timer animations
- `lottie-react-native` — completion celebrations
- `expo-av` — ambient sounds (body double mode, later)

**Local AI (post-MVP phase 2):**
- `llama.rn` or `react-native-executorch` (ExecuTorch by Meta)
- Target: Phi-3 Mini or Qwen2.5-0.5B — small enough to ship on-device

---

## Data Models

### Task
```
id: string
title: string
notes: string | null
estimatedMinutes: number | null
actualMinutes: number | null
status: 'backlog' | 'today' | 'active' | 'done' | 'skipped'
createdAt: Date
completedAt: Date | null
order: number          // for manual sorting
parentId: string | null  // for subtasks
```

### FocusSession
```
id: string
taskId: string
startedAt: Date
endedAt: Date | null
plannedMinutes: number
completed: boolean
```

### Reminder
```
id: string
taskId: string | null   // null = standalone reminder
title: string
scheduledAt: Date
repeatRule: string | null  // cron-like
escalationLevel: 0 | 1 | 2  // gentle / firm / alarm
dismissed: boolean
```

---

## MVP Screens (5 screens max)

### 1. Today Screen (home)
- Shows **one task at a time** in large focus view
- Swipe right = done, swipe left = skip (send to backlog)
- "What's next" button to move to next task
- FAB to add task (brain dump)
- Bottom: peek at how many tasks remain today (number only, no list)

### 2. Brain Dump / Add Task
- Full-screen text input, huge font
- Zero friction — just a title is enough
- Optional: estimated time picker (5 / 15 / 30 / 60 min presets)
- Optional: schedule for today or backlog
- Save = instant, then back to Today

### 3. Focus Timer Screen
- Activated when user starts a task
- Full-screen visual timer — large shrinking arc / color fill
- Color shifts: green → yellow → red as time runs out
- Transition warning at T-3 min: gentle pulse + haptic
- Pause / extend / end early buttons
- Background: blocks distractions (minimal chrome)

### 4. Backlog
- Simple scrollable list of all non-today tasks
- Tap to move to today
- Long-press to edit / delete
- No sorting complexity in MVP — just FIFO

### 5. Settings
- Timer defaults (work duration, break duration, transition warning offset)
- Notification preferences
- Dark/light mode toggle
- Data export (JSON) — for user data ownership

---

## Notification Strategy

| Trigger | Type | Escalation |
|---|---|---|
| Reminder time hits | Level 0 | Soft chime, no sound |
| +5 min ignored | Level 1 | Sound + banner |
| +15 min ignored | Level 2 | Loud alarm, persistent |
| Timer transition warning | — | Haptic + subtle sound |
| Hyperfocus check-in | — | Gentle nudge after 90 min of unbroken focus |

---

## Phase Plan

### Phase 1 — Foundation (MVP)
- [ ] Expo project setup with NativeWind + WatermelonDB
- [ ] Task model + CRUD
- [ ] Today screen with one-task view + swipe gestures
- [ ] Brain dump add screen
- [ ] Backlog screen
- [ ] Focus timer with visual arc animation
- [ ] Transition warning (local notification + haptic)
- [ ] Completion celebration (Lottie animation + haptic)
- [ ] Settings screen (timer defaults)

### Phase 2 — Reminders + Polish
- [ ] Reminder model + scheduling via expo-notifications
- [ ] Escalating reminder logic
- [ ] Streaks and positive stats
- [ ] "Just start for 2 minutes" shortcut
- [ ] Hyperfocus alarm
- [ ] Onboarding flow

### Phase 3 — AI Features
- [ ] Evaluate llama.rn / react-native-executorch for on-device inference
- [ ] "Break this down for me" — AI splits a vague task into micro-steps
- [ ] Smart time estimation based on task description
- [ ] Optional: cloud model fallback when offline AI unavailable

### Phase 4 — Integrations + Sync
- [ ] Optional account + end-to-end encrypted sync (CRDTs)
- [ ] Apple Reminders / Google Calendar import
- [ ] Desktop companion app (Expo for Web or Tauri)

---

## Design Principles (non-negotiable)

1. **One thing on screen at a time** — never show the full list during focus
2. **Every interaction must feel good** — haptics, animations, sounds are not optional
3. **No shame** — stats show only positives; no "you missed X days" framing
4. **Offline always works** — network is never required for core function
5. **Fast to open, fast to add** — brain dump must be reachable in 2 taps from anywhere

---

## Design Decisions

| Decision | Choice |
|---|---|
| App name | **TadiHD** |
| Timer visual | Horizontal progress bar (shrinking, color-shifting) |
| Color system | CSS custom properties (design tokens) — default: light green (`#A8D5A2` family), user-swappable |

### Color Token System
All colors defined as design tokens so the entire theme is swappable:

```
--color-primary        // main green (default #A8D5A2)
--color-primary-dark   // darker shade for text/icons on light bg
--color-primary-light  // lighter tint for backgrounds
--color-accent         // contrast pop color (e.g. orange for warnings)
--color-danger         // timer running out / urgent (red family)
--color-surface        // card/panel backgrounds
--color-background     // page background
--color-text           // primary text
--color-text-muted     // secondary text
```

Timer bar shifts colors automatically:
- **> 50% remaining** → `--color-primary` (green)
- **25–50% remaining** → `--color-accent` (amber)
- **< 25% remaining** → `--color-danger` (red)

### Remaining Open Questions
- Sound design deferred to Phase 2+. Leave `// TODO(phase2): sound — play completion chime here` comments at trigger points.
- Subtasks deferred to Phase 2. Leave `// TODO(phase2): subtasks — render children tasks here` comments in Task model and Today screen.
