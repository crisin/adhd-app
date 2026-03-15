# tADiHD — Mobile Features Implementation Plan

> Comprehensive plan for: media access, microphone recording, AI model options, configuration/theming, system integrations, and per-feature testing pages in Settings.

---

## Guiding Principles

1. **User-initiated only** — Every permission is requested only when the user explicitly enables it in Settings. Never on app launch, never silently.
2. **Testing pages** — Each feature gets a dedicated testing/demo section accessible from Settings so the user can verify it works before relying on it.
3. **Cross-platform** — iOS, Android, and Web. Graceful degradation where native APIs aren't available on web.
4. **Offline-first** — All media stored locally in app sandbox. No cloud uploads.
5. **Calm UI** — Consistent with existing design tokens. No overwhelming permission dialogs.

---

## Architecture: Permissions Service

### New file: `src/services/permissions.ts`

A unified permissions layer that wraps Expo's permission APIs and integrates with the settings store.

```typescript
// Planned API shape
export interface PermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: 'undetermined' | 'granted' | 'denied' | 'limited';
}

export const Permissions = {
  camera: {
    check(): Promise<PermissionStatus>;
    request(): Promise<PermissionStatus>;
    openSettings(): Promise<void>;  // Deep-links to OS settings
  },
  photoLibrary: {
    check(): Promise<PermissionStatus>;
    request(): Promise<PermissionStatus>;
    openSettings(): Promise<void>;
  },
  microphone: {
    check(): Promise<PermissionStatus>;
    request(): Promise<PermissionStatus>;
    openSettings(): Promise<void>;
  },
  calendar: {
    check(): Promise<PermissionStatus>;
    request(): Promise<PermissionStatus>;
    openSettings(): Promise<void>;
  },
  contacts: {
    check(): Promise<PermissionStatus>;
    request(): Promise<PermissionStatus>;
    openSettings(): Promise<void>;
  },
};
```

### Settings Store Expansion (`useSettingsStore.ts`)

Add permission toggle states and feature preferences:

```typescript
// New fields in SettingsStore
interface SettingsStore {
  // ... existing fields ...

  // Permission toggles (user must opt in)
  cameraEnabled: boolean;
  photoLibraryEnabled: boolean;
  microphoneEnabled: boolean;
  calendarSyncEnabled: boolean;
  emailIntegrationEnabled: boolean;

  // Theming
  colorTheme: 'green' | 'blue' | 'purple' | 'amber' | 'custom';
  customColors: Partial<typeof colors>;
  fontScale: 'small' | 'default' | 'large' | 'xlarge';
  fontFamily: 'system' | 'mono' | 'rounded';

  // AI config
  aiProvider: 'local' | 'openai' | 'anthropic' | 'custom';
  aiApiKey: string;          // stored securely via expo-secure-store
  aiModelId: string;         // e.g. 'qwen-2.5-0.5b', 'gpt-4o-mini', 'claude-haiku-4-5'
  aiSystemPrompt: string;    // custom system prompt override
  aiStorageLimit: number;    // MB, for local model cache management

  // Setters...
}
```

---

## Feature 1: Photo / Album / Camera Access

### Dependencies
```
expo-image-picker    # Camera + gallery picker (unified API)
expo-file-system     # Local file storage management
expo-media-library   # Album browsing (optional, for album view)
```

### Implementation Steps

#### 1.1 Permission Flow
- **Where:** Settings > "Photos & Camera" section
- **Toggle:** "Enable camera & photo access"
- **Behavior:** Toggle OFF by default. When turned ON:
  1. Show explanation text: "Used for inventory items and plant photos. Photos stay on your device."
  2. Call `ImagePicker.requestCameraPermissionsAsync()` + `ImagePicker.requestMediaLibraryPermissionsAsync()`
  3. If denied, show alert with "Open Settings" button → `Linking.openSettings()`
  4. Store granted state in `useSettingsStore.cameraEnabled`
- **Low frequency:** Camera picker only appears as an optional action on inventory/plant edit screens. No proactive prompts.

#### 1.2 Photo Capture Service
New file: `src/services/photos.ts`

```typescript
export interface PhotoResult {
  uri: string;        // Local file URI in app sandbox
  width: number;
  height: number;
  fileSize: number;
}

export async function takePhoto(): Promise<PhotoResult | null>;
export async function pickFromGallery(): Promise<PhotoResult | null>;
export async function deletePhoto(uri: string): Promise<void>;
export async function getPhotoSize(uri: string): Promise<number>; // bytes
```

- Photos saved to `FileSystem.documentDirectory + 'photos/'`
- Thumbnails generated at 200x200 for list views
- Original kept for full-screen view
- Web fallback: uses `<input type="file" accept="image/*">` via expo-image-picker's web support

#### 1.3 UI Integration Points
- **InventoryScreen:** Add camera icon button on item card → opens picker → saves to `imageUri` field (already exists on model)
- **PlantsScreen:** Add camera icon on plant card → same flow
- **Item/Plant edit modal:** Photo preview with replace/remove actions
- **Full-screen photo viewer:** Tap thumbnail → zoom view with pinch-to-zoom

#### 1.4 Storage Management
- Track total photo storage in Settings
- "Photos" section shows: "X photos · Y MB used"
- Option to clear all photos or selectively remove orphaned photos

#### 1.5 Testing Page — Settings > Photos & Camera > Test
- Show current permission status (granted/denied/undetermined)
- "Take Test Photo" button → captures and displays inline
- "Pick from Gallery" button → picks and displays inline
- "Delete Test Photo" button → removes it
- Shows file path, size, dimensions
- Platform indicator: shows which APIs are available on current platform

---

## Feature 2: Microphone Recording

### Dependencies
```
expo-av              # Audio recording + playback
expo-file-system     # Recording file management
```

### Implementation Steps

#### 2.1 Permission Flow
- **Where:** Settings > "Microphone" section
- **Toggle:** "Enable microphone recording"
- **Behavior:** Toggle OFF by default. When turned ON:
  1. Explanation: "Used for voice notes on ideas and tasks. Recordings stay on your device."
  2. Call `Audio.requestPermissionsAsync()`
  3. Handle denied state with "Open Settings" button
  4. Store in `useSettingsStore.microphoneEnabled`

#### 2.2 Audio Recording Service
New file: `src/services/audio.ts`

```typescript
export interface RecordingResult {
  uri: string;
  durationMs: number;
  fileSize: number;
}

export interface AudioRecorder {
  start(): Promise<void>;
  stop(): Promise<RecordingResult>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  cancel(): void;
  getStatus(): { isRecording: boolean; durationMs: number };
  onDurationChange(cb: (ms: number) => void): () => void;
}

export function createRecorder(): AudioRecorder;
export function playAudio(uri: string): Promise<void>;
export function deleteRecording(uri: string): Promise<void>;
```

- Recordings saved to `FileSystem.documentDirectory + 'recordings/'`
- Format: AAC (m4a) on native, WebM on web
- Max recording length: configurable (default 5 min, max 30 min)
- Audio mode: `allowsRecordingIOS: true`, `playsInSilentModeIOS: true`

#### 2.3 UI Integration Points
- **IdeasScreen:** Mic button next to text input → record voice → save as idea with audio attachment
- **AddTaskScreen:** Optional voice note attachment
- **Playback widget:** Inline audio player (play/pause, seek bar, duration) on ideas/tasks with recordings
- **DB changes:** Add `audio_uri` column to `ideas` table + `tasks` table (new migration)

#### 2.4 Web Fallback
- Use `navigator.mediaDevices.getUserMedia()` via expo-av's web support
- Same UI, same flow, WebM format instead of M4A

#### 2.5 Testing Page — Settings > Microphone > Test
- Show current permission status
- "Record Test Audio" button → starts recording with live duration counter
- "Stop & Play" button → stops recording and plays it back
- Waveform visualization (simple amplitude bars) during recording
- Shows file path, duration, file size
- "Delete Test Recording" button

---

## Feature 3: AI Model Options & Storage Management

### Dependencies
```
expo-secure-store    # Secure API key storage
expo-file-system     # Model file management
```

### Implementation Steps

#### 3.1 Multi-Provider AI Engine
Refactor `src/services/ai/` to support multiple providers:

```
src/services/ai/
├── index.ts               # Factory: createEngine(provider, config)
├── types.ts               # Shared interfaces (existing, extended)
├── providers/
│   ├── local-wllama.ts    # Current Wllama engine (web)
│   ├── local-llama-rn.ts  # Future llama.rn engine (native)
│   ├── openai.ts          # OpenAI API (gpt-4o-mini, gpt-4o)
│   ├── anthropic.ts       # Anthropic API (claude-haiku, claude-sonnet)
│   └── custom.ts          # Custom OpenAI-compatible endpoint
└── storage.ts             # Model cache management
```

#### 3.2 Provider Configuration UI
Settings > "AI Engine" section (replaces current "Local AI" section):

- **Provider selector:** Local (on-device) | OpenAI | Anthropic | Custom endpoint
- **Local options:**
  - Model picker: Qwen 2.5 0.5B (current), Qwen 2.5 1.5B, Phi-3 Mini (when available on native)
  - Download/delete model buttons with progress
  - Storage used: "Qwen 2.5 0.5B — 530 MB (cached)"
- **Cloud options:**
  - API key input (masked, stored in expo-secure-store)
  - Model selector dropdown (fetched from API or hardcoded list)
  - "Validate Key" button to test connection
- **Custom endpoint:**
  - Base URL input
  - API key input
  - Model ID input

#### 3.3 Custom System Prompt
Settings > "AI Engine" > "System Prompt":

- Multiline text input with the current default prompt shown
- "Reset to Default" button
- Character count
- Preview: "Test with sample idea" → runs decomposition with custom prompt → shows result

#### 3.4 Storage Management
Settings > "AI Engine" > "Storage":

- List of downloaded models with sizes
- Total AI storage used
- "Delete Model" per model
- "Clear All AI Data" button
- Storage quota setting: "Max AI storage: X MB" (slider: 256 / 512 / 1024 / 2048)

#### 3.5 Provider Interface Extension

```typescript
// Extended AIEngine interface
export interface AIEngine {
  // ... existing methods ...
  getProviderInfo(): { name: string; model: string; isLocal: boolean };
  estimateTokens(text: string): number;
  getStorageUsed(): Promise<number>; // bytes
  clearStorage(): Promise<void>;
}
```

#### 3.6 Testing Page — Settings > AI Engine > Test
- Current provider + model shown
- "Test Decomposition" — enter an idea, see AI output in real-time
- Token count display
- Response time measurement
- "Test Connection" for cloud providers — validates API key + connectivity
- Error display with troubleshooting hints
- Side-by-side comparison: run same prompt on two providers

---

## Feature 4: Configuration Options (Colors, Fonts, AI System Prompt)

### Dependencies
```
expo-font           # Custom font loading (if adding custom fonts)
```

### Implementation Steps

#### 4.1 Theme System Overhaul
Refactor `src/theme/tokens.ts` into a dynamic theme system:

New file: `src/theme/ThemeProvider.tsx`

```typescript
// Predefined themes
export const THEMES = {
  green: { /* current default - calm green */ },
  blue: { /* ocean blue - cool, focused */ },
  purple: { /* lavender - creative, calm */ },
  amber: { /* warm amber - cozy, gentle */ },
  dark: { /* dark mode - low light */ },
  highContrast: { /* accessibility - strong contrast */ },
} as const;

// ThemeProvider wraps the app and provides dynamic colors
export function ThemeProvider({ children }: { children: React.ReactNode });
export function useTheme(): ThemeTokens;
```

- The `useTheme()` hook replaces direct imports from `tokens.ts`
- Existing `colors` export remains for backward compatibility but reads from context
- Theme changes are instant (no app restart)

#### 4.2 Color Configuration UI
Settings > "Appearance" section:

- **Theme preset picker:** 6 theme cards with preview swatches
  - Green (Default), Blue, Purple, Amber, Dark, High Contrast
- **Custom colors** (advanced, collapsed by default):
  - Primary color picker (reuse existing ColorPickerModal)
  - Accent color picker
  - Background color picker
  - Auto-generates complementary colors from primary
- **Preview strip:** Shows how a task card looks with current theme

#### 4.3 Font Configuration
Settings > "Appearance" > "Text":

- **Font size scale:** Small / Default / Large / Extra Large
  - Multiplier applied to all `typography.fontSize*` values
  - Slider or chip selector
- **Font family:** System (default) | Rounded | Monospace
  - System = platform default (San Francisco / Roboto)
  - Rounded = SF Rounded / Product Sans feel
  - Monospace = coding/minimal aesthetic
- **Preview:** Sample text shown with current settings

#### 4.4 Testing Page — Settings > Appearance > Preview
- Live preview card showing:
  - Task card with title, subtitle, priority badge, category dot
  - Button in primary color
  - Muted text sample
  - Surface card with border
- Toggles to switch between themes instantly
- Font scale slider with live preview
- "Reset to Defaults" button

---

## Feature 5: System Integrations (Calendar, Email, etc.)

### Dependencies
```
expo-calendar        # Device calendar read access
expo-mail-composer   # Email composition
expo-linking         # Deep links to system apps
expo-contacts        # Contact access (future)
```

### Implementation Steps

#### 5.1 Calendar Integration
Settings > "Integrations" > "Device Calendar":

**Permission flow:**
- Toggle: "Sync device calendar events"
- Explanation: "Show your device calendar events alongside tADiHD events. Read-only — we never modify your calendar."
- Request `Calendar.requestCalendarPermissionsAsync()`
- Store in `useSettingsStore.calendarSyncEnabled`

**Sync behavior:**
- Read-only pull from device calendars
- New service: `src/services/calendar-sync.ts`
  ```typescript
  export async function getDeviceCalendars(): Promise<DeviceCalendar[]>;
  export async function syncDeviceEvents(startDate: Date, endDate: Date): Promise<void>;
  export async function getSelectedCalendarIds(): Promise<string[]>;
  export async function setSelectedCalendarIds(ids: string[]): Promise<void>;
  ```
- User selects which device calendars to show (multi-select)
- Synced events stored as `CalendarEvent` with `source: 'device'` and `device_event_id`
- Sync triggered: on app open (if >5 min since last sync) + manual pull-to-refresh on CalendarScreen
- Visual distinction: device events use dashed border + device icon
- **Web:** Not available (no `expo-calendar` support). Show "Calendar sync is available on iOS and Android" message.

#### 5.2 Email Integration
Settings > "Integrations" > "Email":

**No permission needed** — uses system email composer.

- "Email daily summary" — compose email with today's completed/pending tasks
- "Email task list" — select tasks → compose email with task details
- Uses `MailComposer.composeAsync()` — opens native email app with pre-filled content
- Fallback: `Linking.openURL('mailto:...')` with subject + body

**Integration points:**
- TodayScreen: "Share today's summary" action → composes email
- BacklogScreen: "Email selected tasks" action
- Export: "Email export" option alongside current JSON share

#### 5.3 Reminders / Notifications Integration
Already partially implemented. Extend:

- Settings > "Integrations" > "Reminders"
- Water reminders for plants → push notification at configured time
- Task due date reminders → notification X minutes before
- Escalating reminders: gentle → firm → urgent (existing model, needs scheduling logic)

#### 5.4 Contacts Integration (Future)
Settings > "Integrations" > "Contacts":

- Toggle: "Access contacts for task assignment"
- Use case: associate tasks with people ("Call dentist" → link to contact)
- Low priority, placeholder in Settings UI

#### 5.5 Testing Page — Settings > Integrations > Test
- **Calendar test:**
  - Show permission status
  - "Fetch Device Calendars" → lists all calendars with checkboxes
  - "Fetch Today's Events" → shows device events for today
  - Event count + last sync timestamp
- **Email test:**
  - "Send Test Email" → opens composer with sample content
  - Shows whether MailComposer is available on platform
- **Notifications test:**
  - Already exists (current "Send Test Notification" button)
  - Add: "Schedule Test Reminder in 30s" → schedules and confirms

---

## Feature 6: Settings Page Structure

### Redesigned Settings Navigation

The current flat SettingsScreen will be refactored into a hierarchical structure:

```
Settings (main list)
├── Timer Defaults         (existing — work duration, warnings)
├── Appearance             (NEW — themes, colors, fonts)
│   └── Preview & Test     (testing page)
├── AI Engine              (expanded — provider, model, prompt, storage)
│   └── Test AI            (testing page)
├── Photos & Camera        (NEW — permission toggle, storage)
│   └── Test Camera        (testing page)
├── Microphone             (NEW — permission toggle, recording settings)
│   └── Test Recording     (testing page)
├── Integrations           (NEW — calendar, email, contacts)
│   ├── Calendar Test      (testing page)
│   └── Email Test         (testing page)
├── Notifications          (existing — toggle, test)
├── Calendar Colors        (existing — event source colors)
├── Data                   (existing — export, future: import/backup)
└── About                  (version, links)
```

### Implementation Approach

**Option A (Recommended): Expandable sections within SettingsScreen**
- Keep single SettingsScreen but with collapsible sections
- Each section has a "Test" button that expands inline
- Simpler navigation, consistent with current UX
- Pros: No new navigation routes needed, familiar pattern
- Cons: Long scroll on small screens

**Option B: Settings sub-screens via stack navigation**
- SettingsScreen becomes a list of links
- Each feature has its own screen: `SettingsCameraScreen.tsx`, `SettingsAIScreen.tsx`, etc.
- Testing page embedded at bottom of each sub-screen
- Pros: Cleaner separation, less scrolling
- Cons: More files, more navigation

**Recommendation:** Start with Option A (expandable sections). If the Settings screen becomes too long (>8 sections), refactor to Option B. The testing pages should always be inline within their parent section to keep the "try it" flow seamless.

### Testing Page Pattern

Each testing page follows a consistent template:

```tsx
function FeatureTestSection({ feature }: { feature: string }) {
  return (
    <View style={styles.testSection}>
      <Text style={styles.testHeader}>Test {feature}</Text>

      {/* Permission status indicator */}
      <PermissionStatusBadge permission={feature} />

      {/* Feature-specific test actions */}
      {/* ... buttons, inputs, previews ... */}

      {/* Platform availability */}
      <PlatformAvailability feature={feature} />

      {/* Results/output area */}
      <TestOutputArea />
    </View>
  );
}
```

Shared components:
- `PermissionStatusBadge` — shows granted/denied/undetermined with color
- `PlatformAvailability` — shows iOS/Android/Web checkmarks
- `TestOutputArea` — scrollable area for test results

---

## New Files Summary

```
src/
├── services/
│   ├── permissions.ts          # Unified permission checking/requesting
│   ├── photos.ts               # Photo capture, storage, thumbnails
│   ├── audio.ts                # Audio recording, playback
│   ├── calendar-sync.ts        # Device calendar read-only sync
│   └── ai/
│       ├── providers/
│       │   ├── local-wllama.ts # Extracted from engine.web.ts
│       │   ├── openai.ts       # OpenAI provider
│       │   ├── anthropic.ts    # Anthropic provider
│       │   └── custom.ts       # Custom endpoint provider
│       └── storage.ts          # Model cache management
├── theme/
│   └── ThemeProvider.tsx        # Dynamic theme context
├── components/
│   ├── PermissionGate.tsx       # Wraps feature UI, shows enable prompt if disabled
│   ├── AudioPlayer.tsx          # Inline playback widget
│   ├── PhotoPicker.tsx          # Camera/gallery picker button + preview
│   └── TestSection.tsx          # Shared testing page components
└── screens/
    └── SettingsScreen.tsx       # Expanded with new sections (or split into sub-screens)
```

## Database Changes

### Migration v6 → v7

```sql
-- Add audio support to ideas
ALTER TABLE ideas ADD COLUMN audio_uri TEXT;
ALTER TABLE ideas ADD COLUMN audio_duration_ms INTEGER;

-- Add audio support to tasks
ALTER TABLE tasks ADD COLUMN audio_uri TEXT;
ALTER TABLE tasks ADD COLUMN audio_duration_ms INTEGER;
```

Model updates:
- `Idea.audioUri`, `Idea.audioDurationMs`
- `Task.audioUri`, `Task.audioDurationMs`

---

## Implementation Order (Phased)

### Phase A: Foundation (do first)
1. `src/services/permissions.ts` — unified permission service
2. Expand `useSettingsStore.ts` with new toggles + theme fields
3. `src/theme/ThemeProvider.tsx` — dynamic theming
4. Settings screen restructure (collapsible sections + testing page pattern)

### Phase B: Media (camera + mic)
5. `src/services/photos.ts` — photo capture + storage
6. Photo UI on Inventory + Plants screens
7. DB migration v7 (audio columns)
8. `src/services/audio.ts` — recording + playback
9. Audio UI on Ideas + Tasks screens
10. Testing pages for camera + microphone

### Phase C: AI Expansion
11. Refactor AI into provider pattern
12. OpenAI provider implementation
13. Anthropic provider implementation
14. Custom endpoint provider
15. AI storage management UI
16. Custom system prompt UI
17. AI testing page

### Phase D: Configuration
18. Theme presets (6 built-in themes)
19. Custom color picker
20. Font scale + family options
21. Appearance testing page

### Phase E: System Integrations
22. `src/services/calendar-sync.ts` — device calendar read
23. Calendar sync UI + calendar selector
24. Email integration (MailComposer)
25. Integrations testing page

---

## Platform Availability Matrix

| Feature | iOS | Android | Web |
|---------|-----|---------|-----|
| Camera capture | Yes | Yes | Yes (via file input) |
| Photo gallery | Yes | Yes | Yes (via file input) |
| Microphone | Yes | Yes | Yes (WebRTC) |
| Local AI (Wllama) | No* | No* | Yes |
| Local AI (llama.rn) | Future | Future | No |
| Cloud AI (OpenAI/Anthropic) | Yes | Yes | Yes |
| Calendar sync | Yes | Yes | No |
| Email composer | Yes | Yes | Partial (mailto:) |
| Contacts | Yes | Yes | No |
| Notifications | Yes | Yes | Yes (Push API) |
| Themes/Colors | Yes | Yes | Yes |
| Font options | Yes | Yes | Yes |
| Secure key storage | Yes | Yes | Partial (localStorage) |

\* Native local AI depends on future `llama.rn` or `react-native-executorch` integration.

---

## Security Considerations

- **API keys:** Stored via `expo-secure-store` (Keychain on iOS, Keystore on Android). Web fallback: encrypted in localStorage with device-derived key.
- **Photos:** Stored in app sandbox only. Never uploaded. Cleared on app uninstall.
- **Recordings:** Same as photos. No cloud processing unless user explicitly chooses cloud AI.
- **Calendar data:** Read-only. Never written back to device calendar.
- **Permissions:** All revocable from OS settings. App gracefully handles revoked permissions.
