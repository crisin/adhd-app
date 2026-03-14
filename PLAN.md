# tADiHD — Implementation Plan & Task Tracker

> **Vision:** A single offline-first "brain" for people with ADHD — captures everything (tasks, ideas, stuff, plants, goals, events), surfaces only what matters right now, and never shames you for falling behind.

---

## Status Legend
- `[ ]` not started
- `[~]` in progress
- `[x]` done

---

## Feature Overview (from user research)

| Feature | Priority | Phase |
|---|---|---|
| Tasks with categories (private / school / work / …) | P0 | 3 |
| Short + long term goals, linked to tasks | P0 | 3 |
| Kanban board view for tasks | P0 | 3 |
| Idea dump (quick capture, AI processing later) | P0 | 3 |
| Calendar (events + task due dates) | P1 | 4 |
| Home inventory (items in the house, list first) | P1 | 5 |
| Plant management (care schedules, reminders) | P1 | 5 |
| Reminders + notifications | P1 | 2 |
| AI: idea processing, task breakdown, time estimation | P2 | 6 |
| Sync + account (optional, E2E encrypted) | P3 | 7 |

---

## Design Principles (enforce in every PR)

1. **One thing on screen at a time** — never show the full list during focus mode
2. **Every interaction must feel good** — haptics + animations are not optional
3. **No shame** — stats are positive only; no "you failed" framing
4. **Offline always works** — network never required for core function
5. **Fast to open, fast to add** — brain dump reachable in ≤ 2 taps from anywhere
6. **Calm UI** — ADHD brains get overwhelmed; keep visual noise low

---

## Architecture Notes

### Navigation (current → target)
```
Current:  Today | All Tasks | Settings
Target:   Today | Tasks | Life | Settings
                           └── Goals, Ideas, Inventory, Plants (hub screen)
```

### Database schema versions
- **v1** (live): tasks, focus_sessions, reminders
- **v2** (Phase 3): add `category` + `goal_id` to tasks; add goals, ideas tables
- **v3** (Phase 4): add calendar_events table
- **v4** (Phase 5): add inventory_items, plants tables

### Category system
Tasks get a `category` field: `private | school | work | health | finance | other`
Color-coded, filterable in All Tasks + Kanban views.

---

## Phase 1 — MVP Core Loop ✅ DONE

### 1.1 Navigation ✅
- [x] Tab bar: Today | All Tasks | Settings (`@react-navigation/bottom-tabs`)
- [x] Modal stack: AddTask, FocusTimer (`@react-navigation/native-stack`)

### 1.2 State + DB ✅
- [x] Zustand stores (useTaskStore, useSettingsStore with AsyncStorage)
- [x] WatermelonDB reactive hooks (useTodayTasks, useBacklogTasks)
- [x] DB actions: createTask, updateTaskStatus, updateTaskTitle, deleteTask, startFocusSession, endFocusSession

### 1.3–1.8 Screens ✅
- [x] Today — swipe card, Start Focus, "Just start for 2 min", streak + summary
- [x] Add Task — modal, time presets, Today/Backlog toggle
- [x] Focus Timer — animated bar, MM:SS, pause/resume, end-early confirm, celebration
- [x] All Tasks — sectioned list (Today + Backlog), inline tap-to-expand actions
- [x] Settings — timer chips, export, version

---

## Phase 2 — Reminders + Polish

### 2.1 Notifications
- [ ] Request permissions on first launch (polite prompt)
- [ ] `src/services/notifications.ts` — schedule / cancel / update
- [ ] Escalating reminder logic (Level 0 → 1 → 2)
- [ ] Hyperfocus alarm after 90 min unbroken focus

### 2.2 Motivation Layer ✅
- [x] Streak counter (🔥 badge in Today header)
- [x] Daily summary strip ("You finished X tasks today ✨")
- [x] "Just start for 2 minutes" shortcut

### 2.3 UX Polish
- [ ] Onboarding flow (3 screens: concept → core loop → permissions)
- [ ] Skeleton loading states
- [ ] Error boundaries

### 2.4 Sound Design
- [ ] Completion chime
- [ ] Transition warning chime
- [ ] Ambient "body double" sounds (café, rain, white noise) via expo-av

---

## Phase 3 — Task Expansion ✅ DONE

### 3.1 DB Schema v2 ✅
- [x] Migration: add `category` column to tasks (`private | school | work | health | finance | other`)
- [x] Migration: add `goal_id` column to tasks (nullable FK)
- [x] New table: `goals` (title, description, type: short/long, status, target_date, sort_order)
- [x] New table: `ideas` (content, processed, created_at)
- [x] Update Task model + Goal model + Idea model
- [x] Update both DB adapters (native + web)

### 3.2 Task Categories ✅
- [x] Category picker in AddTask screen (colour-coded chips)
- [x] Category filter bar in Kanban screen
- [x] Category dot/pill on task cards in Kanban
- [ ] Category filter in All Tasks screen (next polish item)

### 3.3 Goals ✅
- [x] `src/screens/GoalsScreen.tsx` — list of short + long term goals
- [x] Goal card: title, type badge (short/long), linked task count, progress bar
- [x] Create goal modal (title, type, description, category)
- [x] Link tasks to a goal (goalId param in AddTask)
- [x] Mark goal complete / delete goal

### 3.4 Idea Dump ✅
- [x] `src/screens/IdeasScreen.tsx` — scrollable list of raw ideas
- [x] Quick-capture input bar at top (always visible)
- [x] Convert idea → Today task or Backlog task
- [x] `// TODO(phase6): AI — process idea with on-device model here`

### 3.5 Kanban Board ✅
- [x] `src/screens/KanbanScreen.tsx` — horizontal scroll, 3 columns
  - **Backlog** | **Today** | **Done**
- [x] Tap-to-expand card actions (move, focus, done, delete)
- [x] Category filter applies to Kanban view
- [ ] Drag-and-drop between columns (Phase 3.5b — Reanimated v3)

### 3.6 Navigation v2 ✅
- [x] Added dedicated tabs: Today | All Tasks | Kanban | Ideas | Goals | Settings
- [x] `AddTask` route type updated to accept optional `goalId` param
- [x] All new screens wired into bottom tab navigator

---

## Phase 4 — Calendar

### 4.1 DB Schema v3
- [ ] New table: `calendar_events` (title, start_at, end_at, all_day, task_id nullable, category)
- [ ] CalendarEvent model

### 4.2 Calendar Screen
- [ ] `src/screens/CalendarScreen.tsx`
- [ ] Month view + week view toggle
- [ ] Task due dates appear on calendar
- [ ] Tap day → list of events/tasks for that day
- [ ] Create event modal (title, date, time, link to task)
- [ ] Today's schedule card on Today screen (peek at next event)

---

## Phase 5 — Life Modules

### 5.1 DB Schema v3 ✅ (merged into v3, calendar will be v4)
- [x] New table: `inventory_items` — name, room, location, quantity, notes, image_uri
- [x] InventoryItem model (WatermelonDB)
- [x] Migration v2→v3
- [ ] New table: `plants` — Phase 5.3

### 5.2 Home Inventory ✅
- [x] `src/screens/InventoryScreen.tsx` — SectionList grouped by room
- [x] 8 rooms: Kitchen, Bathroom, Bedroom, Living Room, Office, Garage, Garden, Other
- [x] Add/edit/delete item with name, room picker, specific location, quantity ±, notes
- [x] Full-text search across name/location/notes
- [x] Room filter chips
- [x] Quantity ± stepper in modal
- [x] Tap-to-expand inline edit/remove actions
- [x] Wired into tab navigation with 🏠 icon

### 5.3 Plant Management ✅
- [x] `src/screens/PlantsScreen.tsx` — responsive grid (2/3/4 cols by breakpoint)
- [x] Plant card: name, species, status indicator (never/overdue/today/soon/ok), color-coded border
- [x] Watering label: "X days overdue", "Water today", "In X days"
- [x] 💧 Water button on every card → updates lastWateredAt + haptic
- [x] Add/edit modal: name, species, interval presets (2/3/5/7/10/14/21/30d) + custom, location, notes
- [x] Sort by urgency: overdue first, then never-watered, then due soon
- [x] 💧 N badge in header when any plants need attention
- [ ] Watering reminders via expo-notifications (Phase 2 item)
- [ ] Plants needing water nudge on Today screen (future)

### 5.4 Desktop Side Navigation ✅
- [x] `src/navigation/SideNav.tsx` — custom tabBar component
- [x] Static side rail at 220px on screens ≥ 768px wide
- [x] App branding (tADiHD + tagline) at top
- [x] Main nav items + Settings pinned at bottom
- [x] Active state with green highlight
- [x] Falls back to standard BottomTabBar on mobile
- [x] `sceneContainerStyle` auto-adjusts content area margin
- [ ] Collapsible toggle (future)

---

## Phase 6 — AI Features

### 6.1 On-Device Inference
- [ ] Evaluate `llama.rn` vs `react-native-executorch`
- [ ] Target: Phi-3 Mini or Qwen2.5-0.5B
- [ ] Optional WiFi-only model download

### 6.2 AI-Powered Features
- [ ] Idea dump → AI turns raw idea into structured task/goal
- [ ] "Break this down for me" → splits vague task into micro-steps
- [ ] Smart time estimation from task title
- [ ] Optional: cloud model fallback with user's own API key

---

## Phase 7 — Integrations & Sync

- [ ] Optional account + E2E encrypted sync (CRDTs — Automerge or Yjs)
- [ ] Apple Reminders / Google Calendar import
- [ ] iCloud / Google Drive backup
- [ ] Desktop companion (Expo Web already works)

---

## Current File Map

```
src/
├── db/
│   ├── index.ts / index.web.ts   (SQLite / LokiJS adapters)
│   ├── schema/index.ts           (v1: tasks, focus_sessions, reminders)
│   ├── actions.ts                (CRUD mutations)
│   └── models/  Task, FocusSession, Reminder
├── hooks/
│   ├── useTodayTasks.ts
│   ├── useBacklogTasks.ts
│   └── useStreak.ts
├── navigation/index.tsx
├── screens/
│   ├── TodayScreen.tsx       ✅
│   ├── AddTaskScreen.tsx     ✅
│   ├── FocusTimerScreen.tsx  ✅
│   ├── BacklogScreen.tsx     ✅  (now "All Tasks", sectioned)
│   └── SettingsScreen.tsx    ✅
├── store/
│   ├── useTaskStore.ts
│   └── useSettingsStore.ts
└── theme/  tokens.ts, index.ts
```

---

## Next Up → Phase 3

**Start here, in order:**
1. `3.1` DB schema v2 migration (categories + goals + ideas)
2. `3.2` Category picker in AddTask + filter in All Tasks
3. `3.3` Goals screen
4. `3.4` Idea Dump screen
5. `3.5` Kanban board
6. `3.6` Navigation v2 (add Life hub tab)
