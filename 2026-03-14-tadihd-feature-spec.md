# tADiHD — Feature Specification

> Offline-first ADHD companion app built with Expo (React Native).
> All data lives on-device. No backend required.

---

## 1. Task Planning

The core productivity feature. Tasks are the central data type that other features feed into.

### Task Properties

| Field         | Required | Description                                        |
| ------------- | -------- | -------------------------------------------------- |
| Title         | yes      | Short, actionable name                             |
| Description   | no       | Markdown-capable body text                         |
| Priority      | yes      | `high` · `medium` · `low` (default: medium)        |
| Labels        | no       | User-defined tags (e.g. "errand", "health", "fun") |
| Due date/time | no       | Optional deadline, used by Calendar view           |
| Subtasks      | no       | Flat checklist of child items with done/not-done   |
| Recurrence    | no       | Repeat rule (daily / weekly / custom interval)     |
| Source        | auto     | Origin marker: manual, idea-dump, plant-reminder   |

### Kanban Board

Four fixed columns that represent a task's lifecycle:

```
Backlog  →  Next Up  →  In Progress  →  Done
```

- Drag-and-drop between columns.
- Each column shows task count and is collapsible.
- Long-press a task to quick-edit priority or labels.
- "Done" column auto-archives tasks after a configurable period (default: 7 days).
- Filter/sort by label, priority, or due date.

### Subtasks

- Displayed as an inline checklist when a task is expanded.
- Completing all subtasks does **not** auto-complete the parent — the user makes that conscious decision (avoids accidental archival).
- Subtasks are simple text + done flag; they do not have their own priority or labels.

---

## 2. Calendar

A unified time-based overview of everything that has a date.

### Views

- **Month** — dots/badges on days that have events or tasks.
- **Week** — time-block grid showing scheduled items.
- **Day** — detailed agenda list.

### Event Types

| Type           | Origin                             | Editable                     |
| -------------- | ---------------------------------- | ---------------------------- |
| Task due date  | Task Planning                      | via task                     |
| Custom event   | Created directly in Calendar       | yes                          |
| Water reminder | Plant Management (auto-generated)  | via plant settings           |
| Device event   | Synced from device calendar (read) | no (edit in native calendar) |

### Custom Events

- Title, optional description, start time, optional end time, optional recurrence.
- Stored locally alongside tasks.

### Device Calendar Integration

- Read-only sync: pull events from the device calendar via `expo-calendar`.
- Device events are displayed with a distinct visual style so the user can tell them apart.
- No write-back to avoid permission fatigue and accidental data leaks.

---

## 3. Home Inventory

Track belongings by room — or without a room for uncategorized items.

### Data Model

```
Room (optional)
 └─ Item
      ├── Name          (required)
      ├── Quantity       (optional, integer)
      ├── Photo          (optional, local image URI)
      └── Notes          (optional, free text)
```

### Rooms

- User-created, renameable, deletable.
- Deleting a room moves its items to "Unsorted".
- A default **Unsorted** bucket always exists for items without a room.

### Items

- Quick-add flow: type name → save. All other fields can be filled in later.
- Photo is captured via camera or picked from gallery (reuse `expo-image-picker`).
- Photos are stored locally in app sandbox, referenced by URI.

### Search & Filter

- Global full-text search across item names and notes.
- Filter by room.

---

## 4. Plant Management

A specialized subset of inventory focused on living things that need recurring attention.

### Data Model

```
Room (optional, shared with Home Inventory rooms)
 └─ Plant
      ├── Name                (required, e.g. "Desk Fern")
      ├── Species             (optional, e.g. "Nephrolepis exaltata")
      ├── Photo               (optional)
      ├── Watering Interval   (required, in days)
      └── Last Watered        (timestamp, updated on "water" action)
```

### Watering Flow

1. Plant list shows each plant's **next watering date** (last watered + interval).
2. Plants due today or overdue are highlighted.
3. User taps "Water" → `lastWatered` updates to now → next date recalculates.
4. A **water reminder task** is auto-generated in the Calendar on the next watering date.
   - This task has `source: plant-reminder` and links back to the plant.
   - Completing the task triggers the same "Water" action.

### Shared Rooms

Rooms are shared between Home Inventory and Plant Management. A room can contain both items and plants. The room list is a single source of truth.

---

## 5. Idea Dump → Task Creation (Local AI)

Capture raw thoughts fast, then let on-device AI structure them.

### Capture

- Full-screen text input optimised for speed (large tap target, auto-focus).
- User can dictate via the OS keyboard's built-in speech-to-text — no custom voice engine needed.
- Each dump is saved as a timestamped note.

### AI Processing

- On-device text analysis (model TBD — e.g. llama.cpp via `llama.rn`, ONNX, or MediaPipe).
- The AI reads a dump and proposes:
  - **Extracted tasks** — one task suggestion per actionable sentence.
  - **Suggested labels** — matched against existing user labels.
  - **Priority hint** — derived from urgency cues in the text.
- User reviews suggestions in a confirmation screen:
  - Accept / edit / dismiss each proposed task.
  - Accepted tasks land in the **Backlog** column.

### Fallback (no model available)

If the local model isn't downloaded yet or the device can't run it, the idea dump still works as a plain note archive. Task extraction can be triggered manually later.

---

## 6. Cross-Feature Interactions

The features are not isolated — they share data and feed into each other.

```
┌──────────────┐         creates tasks          ┌──────────────┐
│  Idea Dump   │ ──────────────────────────────▶ │    Tasks     │
│  (Local AI)  │                                 │  (Kanban)    │
└──────────────┘                                 └──────┬───────┘
                                                        │
                            due dates & reminders       │
┌──────────────┐         ◀──────────────────────────────┘
│   Calendar   │
└──────┬───────┘         water reminders
       │◀───────────────────────────────────────┐
       │                                        │
       │         device calendar (read-only)    │
       │◀──── expo-calendar ────┐               │
       │                        │        ┌──────┴───────┐
       │                        │        │    Plants     │
       │                        │        └──────┬───────┘
       │                        │               │ shares rooms
       │                        │        ┌──────┴───────┐
       │                        │        │  Inventory   │
       │                        │        └──────────────┘
       └────────────────────────┘
```

| Interaction                | Mechanism                                                 |
| -------------------------- | --------------------------------------------------------- |
| Idea Dump → Tasks          | AI extracts actionable items into Backlog                 |
| Tasks → Calendar           | Tasks with a due date appear on the Calendar              |
| Plants → Calendar          | Water reminders auto-create calendar entries              |
| Plants → Tasks             | Water reminders are also tasks (`source: plant-reminder`) |
| Inventory ↔ Plants         | Shared room model; unified room management                |
| Device Calendar → Calendar | Read-only sync via `expo-calendar`                        |

---

## 7. Storage & Offline Strategy

- **Database**: Local SQLite via `expo-sqlite` (or Watermelon DB for reactive queries).
- **Images**: Stored in app sandbox (`FileSystem.documentDirectory`).
- **No cloud sync** in v1. All data is device-local.
- Future consideration: optional export/import (JSON + zipped images) for backup or device migration.

---

## 8. Open Questions

- [ ] Which on-device LLM to bundle/download for idea extraction? Evaluate `llama.rn` feasibility on low-end Android.
- [ ] Should recurring tasks create new task instances or reuse the same task?
- [ ] Notification strategy: local push notifications for water reminders and task due dates?
- [ ] Data export format for backup — JSON, SQLite dump, or both?

---

## 9. Implementation TODOs — Gap Analysis vs Current Codebase

> Current state: WatermelonDB v5 schema, 12 tables, 11 screens, 13 reactive hooks, 35+ CRUD actions. Phases 1/3/5 done. Below is the gap status.

### Legend
- `[x]` already implemented
- `[~]` partially done — needs updates to match spec
- `[ ]` not started

---

### 9.1 Task Model Expansion

The spec adds several fields the current `Task` model doesn't have.

| Field | Current | Spec | Work |
|-------|---------|------|------|
| title | ✅ | ✅ | — |
| description (markdown) | `notes: string` (plain) | Markdown body | add markdown rendering |
| priority | ❌ | `high \| medium \| low` | new column + migration |
| labels | ❌ | user-defined tags (many-to-many) | new `labels` table + join, or JSON array column |
| due date/time | ❌ | optional deadline | new column + migration |
| subtasks | ❌ (TODO in code) | flat checklist | new `subtasks` table |
| recurrence | ❌ | repeat rule | new column or table |
| source | ❌ | `manual \| idea-dump \| plant-reminder` | new column |

- [x] **DB migration** — v4→v5: added `priority`, `due_at`, `recurrence_rule`, `source`, `plant_id`, `archived_at` to tasks
- [x] **Labels system** — separate `labels` + `task_labels` join tables. CRUD actions + hooks built.
- [x] **Subtasks table** — `subtasks` (task_id, title, done, sort_order). Model + CRUD actions + hook built.
- [x] **Update Task model** — priority, dueAt, recurrenceRule, source, plantId, archivedAt + computed getters (isOverdue, isDueToday)
- [x] **Update AddTaskScreen** — priority picker, due date input added
- [ ] **Subtask UI** — inline checklist in task detail/expanded card view (model ready, UI pending)
- [ ] **Labels picker UI** — labels CRUD + picker in AddTask/Kanban card (model ready, UI pending)
- [ ] **Recurrence engine** — service that creates new task instances on schedule (or reuses — see open questions)
- [x] **Source tracking** — set automatically when tasks are created from idea dump or plant reminders

---

### 9.2 Kanban Board Upgrade

Current: 3 columns (Backlog | Today | Done), tap-to-expand actions, category filter.
Spec: 4 columns, drag-and-drop, auto-archive, long-press quick-edit, filter by label/priority/due.

- [x] **4th column** — Backlog → Next Up → In Progress → Done. Maps to statuses: backlog, today, active, done.
- [ ] **Drag-and-drop** — implement with `react-native-gesture-handler` + Reanimated v3. Cards draggable between columns.
- [x] **Auto-archive** — Done column auto-hides tasks completed >7 days ago. `archived_at` field on Task model.
- [ ] **Long-press quick-edit** — long-press a card opens inline priority + labels editor.
- [ ] **Filter by label, priority, due date** — extend current category filter bar to include these dimensions.
- [x] **Collapsible columns** — each column header toggleable. Priority + due date display on cards.

---

### 9.3 Calendar (NEW — entirely unbuilt)

No calendar exists in the current codebase. This is the largest new feature.

#### 9.3.1 DB Schema
- [x] New table: `calendar_events` — full schema with all FK fields, source types, device_event_id
- [x] CalendarEvent model + v4→v5 migration
- [x] CRUD actions: createCalendarEvent, updateCalendarEvent, deleteCalendarEvent
- [x] Hook: useCalendarEvents(startMs, endMs), useCalendarEventsForDay(date)

#### 9.3.2 Calendar Screen
- [x] **Month view** — grid with dots/badges (color-coded by source), tap day → opens day view
- [x] **Week view** — day-by-day list with event chips
- [x] **Day view** — detailed agenda with expand/delete, source badges
- [x] View toggle (month ↔ week ↔ day)
- [x] Tap day in month → opens day view
- [x] Create event modal (title, description, all-day toggle, start/end time)

#### 9.3.3 Integrations
- [ ] **Tasks → Calendar** — tasks with a `due_at` auto-appear as calendar entries (source: 'task-due') — field exists, auto-sync logic pending
- [x] **Plants → Calendar** — `waterPlantAndSchedule()` auto-creates calendar event + task for next watering
- [ ] **Device calendar** — read-only sync via `expo-calendar`. Display device events with distinct visual style. No write-back.

#### 9.3.4 Navigation
- [x] Calendar tab added between Today and Tasks in both desktop sidebar and mobile nav

---

### 9.4 Home Inventory — Spec Gaps

Current: 8 hardcoded room types, search, room filter, add/edit/delete.
Spec: user-created rooms, shared with Plants, photo capture, quick-add.

- [x] **Rooms table** — `rooms` (name, emoji, color, sort_order). Model + CRUD (createRoom, updateRoom, deleteRoom). Deleting cascades items/plants to unsorted.
- [x] **room_id FK** — added to both `inventory_items` and `plants` tables. Legacy `room` enum kept for compat.
- [x] **useRooms hook** — reactive query sorted by sort_order.
- [ ] **Room management UI** — create / rename / delete rooms screen (model ready, UI pending)
- [ ] **"Unsorted" bucket** — UI treatment for items with null room_id
- [ ] **Photo capture** — `imageUri` field exists on model but no camera/gallery UI. Add photo picker via `expo-image-picker`.
- [ ] **Photo display** — show thumbnail on item row, full-size on tap.
- [ ] **Quick-add** — streamlined flow: type name → save immediately, other fields filled later.

---

### 9.5 Plant Management — Spec Gaps

Current: responsive grid, watering status, interval presets, add/edit/delete, 💧 water button.
Spec: shared rooms with inventory, photo support, water→calendar integration, water→task creation.

- [x] **Shared rooms** — plants have `room_id` FK. Rooms shared between inventory and plants.
- [ ] **Photo capture** — same as inventory: `imageUri` field exists, no camera UI.
- [x] **Water → Calendar** — `waterPlantAndSchedule()` auto-creates calendar event for next watering date.
- [x] **Water → Task** — `waterPlantAndSchedule()` auto-creates task with `source: 'plant-reminder'` + `plant_id`.
- [x] **Link task completion to watering** — `updateTaskStatus()` auto-calls `waterPlant()` when a plant-reminder task is marked done.

---

### 9.6 Idea Dump → Task Creation (AI)

Current: quick-capture bar, idea list, convert to task (today/backlog), discard. No AI.
Spec: full-screen capture, on-device AI extraction, confirmation screen.

- [x] **Basic capture** — text input + save as idea ✅
- [x] **Manual conversion** — idea → task (today or backlog) ✅
- [~] **Full-screen input** — current UI is a single-line capture bar. Spec wants full-screen optimised for speed with large tap target.
- [ ] **On-device AI model** — integrate `llama.rn` or similar. Download/manage model lifecycle.
- [ ] **AI extraction** — read idea text, propose: extracted tasks, suggested labels, priority hints.
- [ ] **Confirmation screen** — review AI suggestions: accept / edit / dismiss each proposed task. Accepted tasks land in Backlog.
- [ ] **Fallback mode** — when model not available, idea dump works as plain note archive with manual "extract later" trigger.

---

### 9.7 Cross-Feature Interactions

These are the integration points described in Section 6 of the spec.

| Interaction | Status | Work |
|-------------|--------|------|
| Idea Dump → Tasks (manual) | ✅ done | — |
| Idea Dump → Tasks (AI) | ❌ | AI engine + confirmation UI |
| Tasks → Calendar (due dates) | [~] | `due_at` field exists, auto-sync to calendar_events pending |
| Plants → Calendar (water reminders) | ✅ | `waterPlantAndSchedule()` creates calendar event |
| Plants → Tasks (water reminder tasks) | ✅ | `waterPlantAndSchedule()` creates plant-reminder task |
| Inventory ↔ Plants (shared rooms) | ✅ | `rooms` table + `room_id` FK on both models |
| Device Calendar → Calendar | ❌ | `expo-calendar` read-only integration |

---

### 9.8 Infrastructure & Polish

Items needed for a complete v1 matching the spec:

- [ ] **Notifications** — `expo-notifications` for task due dates, water reminders, escalating reminders
- [ ] **Photo system** — `expo-image-picker` (camera + gallery), local storage in app sandbox, thumbnail rendering
- [ ] **Markdown rendering** — for task descriptions (use `react-native-markdown-display` or similar)
- [ ] **Recurrence system** — engine that generates task/event instances from repeat rules
- [ ] **Auto-archive service** — background check that archives done tasks after configurable period
- [ ] **Onboarding flow** — 3-screen intro (concept → core loop → permissions)
- [ ] **Sound design** — completion chime, transition warning, ambient sounds
- [ ] **Error boundaries** — catch + display errors gracefully
- [ ] **Skeleton loading states** — show placeholders while data loads

---

### 9.9 Suggested Implementation Order

Phase order based on dependency graph and impact:

1. **Task model expansion** (9.1) — priority, due_at, source fields. Everything downstream depends on richer tasks.
2. **Rooms table** (9.4) — user-created rooms, shared between inventory + plants. Unblocks shared room interactions.
3. **Subtasks** (9.1) — flat checklist. Standalone, no dependencies.
4. **Calendar** (9.3) — largest new feature. Depends on due_at on tasks, room changes on plants.
5. **Plant → Calendar/Task integration** (9.5) — water reminders create calendar events + tasks.
6. **Labels system** (9.1) — user-defined tags. Depends on deciding JSON vs join table.
7. **Kanban upgrade** (9.2) — 4th column, drag-and-drop, auto-archive. Can be done in parallel with calendar.
8. **Photo support** (9.4, 9.5) — camera/gallery for inventory + plants. Standalone.
9. **Notifications** (9.8) — due date + watering push notifications.
10. **AI idea extraction** (9.6) — largest risk item. Evaluate `llama.rn` feasibility first.
11. **Device calendar sync** (9.3.3) — read-only `expo-calendar` integration. Nice-to-have.
12. **Recurrence** (9.1, 9.8) — repeat rules for tasks + events. Complex, save for later.
