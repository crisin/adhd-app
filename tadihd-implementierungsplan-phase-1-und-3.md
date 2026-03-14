# TadiHD — genauer Implementierungsplan für Phase 1 und Phase 3

## Ausgangslage

Dieser Plan setzt voraus, dass das Grundgerüst der Expo-App bereits steht und ihr auf dem aktuellen Projektstand mit **Expo + NativeWind + WatermelonDB + Zustand + Reanimated/Lottie + expo-notifications** aufsetzt. Der bestehende Produktkern bleibt unverändert:

**Brain dump → Pick one → Start timer → Transition warning → Complete → Celebrate**

Er basiert auf euren bisherigen Entscheidungen zu local-first, on-device Datenhaltung, „one thing on screen at a time“, positiver Framing-Logik und dem Fokus auf Brain Dump, Today View, Timer, Transition Warning und Celebration.

---

## Harte Produkt- und Technikentscheidungen vor Start

Diese Punkte sollten vor dem ersten größeren Sprint festgezurrt werden. Ohne diese Entscheidungen driftet das Projekt.

1. **Mobile-first bleibt verbindlich.** Web/Desktop dürfen im Code nicht mitgedacht werden, wenn sie Phase 1 oder 3 verlangsamen.
2. **Phase 1 bleibt brutal klein.** Keine Reminders, keine Streaks, keine Subtasks-UI, keine Integrationen.
3. **Phase 3 bekommt keine freie Chat-Oberfläche.** KI ist nur als strukturierte Aktion am Task verfügbar.
4. **Local-first ist nicht verhandelbar.** Cloud-Fallback ist nicht Teil des ersten AI-Releases.
5. **Datenmodell bleibt stabil.** Neue Features erweitern den Kern, sie verbiegen ihn nicht.
6. **AI-Codegen nur gegen definierte Interfaces.** Keine KI-generierten Querschnitts-Refactorings ohne Review.

---

## Technischer Zielzustand

### Empfohlene Zielstruktur

Wenn euer aktuelles Gerüst eher screen-basiert ist, lasst die Screens liegen, zieht aber die eigentliche Logik feature-basiert darunter.

```txt
src/
  app/
    providers/
    navigation/
  db/
    schema/
    models/
    migrations/
    repositories/
  features/
    tasks/
      components/
      hooks/
      services/
      store/
      types/
    focus/
      components/
      hooks/
      services/
      store/
      types/
    settings/
      components/
      store/
      services/
    ai/
      contracts/
      providers/
      prompts/
      evaluators/
      services/
      store/
      types/
  lib/
    notifications/
    haptics/
    export/
    analytics/
    validation/
  screens/
    TodayScreen.tsx
    AddTaskScreen.tsx
    BacklogScreen.tsx
    FocusTimerScreen.tsx
    SettingsScreen.tsx
  theme/
    tokens.ts
  ui/
    Button.tsx
    Card.tsx
    ProgressBar.tsx
    Modal.tsx
```

### Architekturregeln

- **WatermelonDB ist Source of Truth** für persistente Daten.
- **Zustand speichert nur UI-/Session-State**, nicht eure Business-Historie.
- **Services kapseln Side Effects** wie Haptics, Notifications, Export, AI.
- **Screens orchestrieren nur**, sie enthalten keine persistente Geschäftslogik.
- **Alle AI-Ausgaben sind strikt typisiert und JSON-basiert.**

---

# Phase 1 — Foundation / MVP

## Ziel

Phase 1 liefert den ersten wirklich nutzbaren Kern:

- Task erfassen
- Task in Today oder Backlog halten
- genau einen Task fokussiert anzeigen
- Fokus-Session starten
- Timer visuell herunterlaufen lassen
- rechtzeitig Transition Warning auslösen
- Task sauber abschließen
- Completion positiv verstärken

## Nicht Teil von Phase 1

- Reminders mit Eskalation
- Hyperfocus-Alarm
- Subtasks im UI
- AI-Features
- Sync
- Integrationen
- Streaks / Gamification-Ökonomie
- Body Doubling

## Definition of Done für Phase 1

Phase 1 ist erst fertig, wenn ein Nutzer auf einem frischen Build:

1. in unter 30 Sekunden einen Task erfassen kann,
2. diesen Task aus dem Today Screen starten kann,
3. einen sichtbaren Timer bekommt,
4. vor Timer-Ende eine Transition Warning erlebt,
5. den Task als done oder skipped abschließen kann,
6. eine positive Completion-Rückmeldung bekommt,
7. nach App-Neustart alle Daten weiter vorhanden sind,
8. den Flow ohne Netzwerk vollständig nutzen kann.

---

## Phase 1 — Arbeitspakete

## P1-01 — Technische Basis härten

### Ziel
Nicht „Projekt aufsetzen“, sondern vorhandenes Expo-Gerüst auf einen stabilen Delivery-Stand bringen.

### Aufgaben

- Paketstände vereinheitlichen und dokumentieren.
- `expo-doctor` in CI bzw. als Pflichtcheck aufnehmen.
- Alias-Imports einführen (`@/features/...`, `@/lib/...`).
- Navigation festziehen.
- Root-Provider sauber aufbauen:
  - DB Provider
  - Theme Provider
  - Zustand bootstrap
  - Notification bootstrap
- Development Build statt reiner Expo-Go-Denke als Standard definieren.
- Environment-Konvention einführen:
  - `__DEV__`
  - `AI_ENABLED`
  - `DEBUG_NOTIFICATIONS`

### Deliverables

- stabiles `package.json`
- funktionierende Provider-Kette in `App.tsx`
- dokumentierter Start-Flow für alle Entwickler
- CI-Checkliste

### Akzeptanzkriterien

- Projekt startet auf iOS und Android konsistent.
- Keine roten Warnungen durch Reanimated / NativeWind / WatermelonDB.
- `expo-doctor` läuft ohne unbekannte Blocker.

---

## P1-02 — Datenmodell und Persistenzkern

### Ziel
Den MVP-Domain-Kern sauber persistieren.

### Zu implementierende Tabellen

#### `tasks`

```ts
id: string
title: string
notes: string | null
estimatedMinutes: number | null
actualMinutes: number | null
status: 'backlog' | 'today' | 'active' | 'done' | 'skipped'
createdAt: number
completedAt: number | null
order: number
parentId: string | null
```

#### `focus_sessions`

```ts
id: string
taskId: string
startedAt: number
endedAt: number | null
plannedMinutes: number
completed: boolean
```

### Aufgaben

- WatermelonDB-Schema anlegen.
- Models anlegen.
- Initial Migration schreiben.
- Repository-Layer schreiben:
  - `createTask`
  - `updateTask`
  - `deleteTask`
  - `moveTaskToToday`
  - `moveTaskToBacklog`
  - `startTask`
  - `completeTask`
  - `skipTask`
  - `getCurrentTodayTask`
  - `getBacklogTasks`
  - `createFocusSession`
  - `finishFocusSession`
- Selektoren/Hooks bauen:
  - `useCurrentTask()`
  - `useRemainingTodayCount()`
  - `useBacklogTasks()`

### Wichtige Entscheidung

`status = 'active'` nur setzen, wenn eine Fokus-Session wirklich läuft. Nicht bereits beim reinen Öffnen eines Tasks.

### Akzeptanzkriterien

- CRUD für Tasks funktioniert lokal persistent.
- Reihenfolge in Today/Backlog bleibt stabil.
- App-Neustart verändert keinen Task-Zustand unerwartet.
- Fokus-Sessions werden korrekt mit Start-/Endzeit erfasst.

---

## P1-03 — Task-Erfassung und Brain Dump

### Ziel
Der schnellste Weg vom Gedanken zum gespeicherten Task.

### Screen: `AddTaskScreen`

### UI-Regeln

- Vollbild, kaum Chrome
- Fokus auf ein großes Texteingabefeld
- Standard nur `title`
- optionale Zeit-Presets: `5 / 15 / 30 / 60`
- optionaler Zielort: `Heute` oder `Backlog`
- Speichern sofort, ohne Extra-Dialog

### Aufgaben

- Formularzustand lokal halten.
- Validierung minimal:
  - leerer String nicht speichern
  - Input trimmen
- Quick actions einbauen:
  - `Save to Today`
  - `Save to Backlog`
- Nach Save sofort zurück zum Today Screen.
- Tastaturverhalten sauber lösen.
- Optionalen Notes-Block nur hinter „mehr“ oder collapsed UI.

### Akzeptanzkriterien

- Ein Task kann mit nur einem Pflichtfeld gespeichert werden.
- Task-Erfassung funktioniert mit einer Hand und wenigen Taps.
- Leere oder whitespace-only Eingaben werden verhindert.

---

## P1-04 — Today Screen mit One-Task-View

### Ziel
Der Hauptscreen zeigt **genau eine** aktuelle Handlung, nicht eine Liste.

### Screen: `TodayScreen`

### Inhalte

- aktuelle Fokuskarte mit Task-Titel
- optional geschätzte Dauer
- CTA: `Start`
- CTA: `Done`
- CTA: `Skip`
- CTA: `What's next`
- FAB: `Brain dump`
- Restanzahl des Tages nur numerisch, keine volle Aufgabenliste

### Aufgaben

- `useCurrentTask()` anbinden.
- States sauber behandeln:
  - kein Today-Task vorhanden
  - Today-Task vorhanden, nicht aktiv
  - Today-Task aktiv
- Swipe-Gesten nur dann einbauen, wenn sie zuverlässig sind; sonst explizite Buttons zuerst.
- Skip schiebt zurück in Backlog.
- Done schließt Task ab.
- `What's next` springt deterministisch zum nächsten Today-Task.
- Leerer Zustand darf nicht nach „du hast nichts geschafft“ aussehen.

### Akzeptanzkriterien

- Es wird nie mehr als ein Task prominent gezeigt.
- Done/Skip/Next verhalten sich deterministisch.
- Empty State bleibt positiv und handlungsorientiert.

---

## P1-05 — Backlog Screen

### Ziel
Eine simple Ablage, kein Task-Management-Monster.

### Screen: `BacklogScreen`

### Aufgaben

- Liste aller `backlog` Tasks anzeigen.
- Tap auf Task → nach Today verschieben.
- Long press oder trailing action → edit / delete.
- FIFO-Reihenfolge beibehalten.
- Kein Filtern, kein Sortier-UI, keine Prioritäten.

### Akzeptanzkriterien

- Nutzer kann Backlog-Task mit einem Schritt nach Today schieben.
- Bearbeiten und Löschen funktionieren ohne Seiteneffekte.
- Keine Performanceprobleme bei 100+ Tasks.

---

## P1-06 — Fokus-Session-Domain und Timer-Engine

### Ziel
Ein stabiler Timer, der auch App-Lifecycle-Wechsel überlebt.

### Screen: `FocusTimerScreen`

### Zentrale Designentscheidung

Der Timer darf **nicht** rein auf `setInterval` + lokaler Component-State-Logik beruhen. Maßgeblich ist immer:

- `startedAt`
- `plannedMinutes`
- `pausedDuration` oder Pause-State
- aktuelle Zeit `Date.now()`

### Empfohlener Aufbau

#### Persistente Session-Daten

```ts
activeSession = {
  taskId: string
  startedAt: number
  plannedMinutes: number
  pauseStartedAt?: number | null
  totalPausedMs: number
}
```

#### Abgeleitete Werte

- `elapsedMs`
- `remainingMs`
- `progress`
- `warningReached`
- `finished`

### Aufgaben

- Fokus-Session starten.
- Timer-State zentral halten.
- Reanimated-gestützte Fortschrittsanzeige bauen.
- Actions implementieren:
  - `pause`
  - `resume`
  - `extend +5m`
  - `end early`
- App in Background/Foreground testen.
- Beim Reopen Session korrekt rekonstruieren.

### Akzeptanzkriterien

- Timer läuft nach App-Wechsel weiter korrekt.
- Pause/Resume verfälscht `actualMinutes` nicht.
- Progress-Bar springt nicht chaotisch.
- Verlängern und frühes Beenden funktionieren zuverlässig.

---

## P1-07 — Transition Warning, Haptics und lokale Notifications

### Ziel
Nutzer früh genug mental auf den Übergang vorbereiten.

### Aufgaben

- Notification-Service kapseln:
  - Berechtigungen anfragen
  - lokale Notification planen
  - bestehende Timer-Notifications stornieren
- Transition Warning aus `plannedMinutes - warningOffset` ableiten.
- Warning doppelt absichern:
  - im aktiven Screen visuell/haptisch
  - als lokale Notification bei Background-Fall
- Haptik-Muster definieren:
  - Start
  - Warning
  - Completion
  - Error / Invalid Action
- Settings-abhängige Aktivierung berücksichtigen.

### Akzeptanzkriterien

- Warning wird genau einmal ausgelöst.
- Keine verwaisten Notifications nach Session-Abbruch.
- Im Vordergrund und Hintergrund ist das Verhalten konsistent.

---

## P1-08 — Completion Flow und Dopamin-Feedback

### Ziel
Abschluss muss sich spürbar gut anfühlen, nicht bloß korrekt.

### Aufgaben

- Lottie-Animation einbinden.
- Completion-Haptik definieren.
- Beim Abschluss Folgendes atomar ausführen:
  - Session beenden
  - `actualMinutes` setzen/aufsummieren
  - Task auf `done`
  - `completedAt` setzen
  - Celebration triggern
- Optionalen Abschluss-Sheet bauen:
  - „Erledigt“
  - „War gut genug“
  - „Nächsten Task zeigen“

### Akzeptanzkriterien

- Completion ist nicht still.
- Task- und Session-Daten bleiben konsistent.
- Nutzer landet sauber zurück im Flow.

---

## P1-09 — Settings und lokale Datenhoheit

### Ziel
Nötige Defaults ohne Konfigurationsmonster.

### Screen: `SettingsScreen`

### Einstellungen für Phase 1

- Standard-Fokusdauer
- Standard-Pausendauer
- Transition-Warning-Offset
- Haptics on/off
- Notifications on/off
- Dark/Light Theme Toggle
- JSON-Export

### Aufgaben

- Settings Store aufbauen.
- Persistenz für Settings anlegen.
- Export-Service implementieren:
  - Tasks
  - Sessions
  - Settings
- Exportformat versionieren:

```json
{
  "schemaVersion": 1,
  "exportedAt": "ISO_DATE",
  "tasks": [],
  "focusSessions": [],
  "settings": {}
}
```

### Akzeptanzkriterien

- Änderungen greifen sofort oder beim nächsten relevanten Startpunkt.
- Export erzeugt valides JSON.
- Keine Einstellung blockiert den Kern-Flow.

---

## P1-10 — Qualitätssicherung und Beta-Cut

### Ziel
Aus „läuft bei uns“ wird „kann getestet werden“.

### Tests

#### Unit

- Task-Repository
- Fokus-Session-Logik
- Timer-Berechnungen
- Warning-Berechnung
- Settings-Parser / Export-Serializer

#### Component

- AddTaskScreen
- TodayScreen Empty/Active States
- FocusTimerScreen Actions

#### E2E-Smoke

- Task anlegen → Today → Timer starten → Done
- Task anlegen → Backlog → nach Today holen
- Timer starten → Pause/Resume → Extend → End Early

### Manuelle QA-Matrix

- iOS foreground/background
- Android foreground/background
- Notification permission granted / denied
- App kill + reopen during active session
- Theme switching
- 100+ Backlog tasks

### Release-Artefakte

- internes TestFlight / Android internal build
- bekannte Grenzen dokumentiert
- Crash-/Fehlerliste
- UX-Friction-Liste für Phase 2

---

## Empfohlene Sprint-Aufteilung für Phase 1

## Sprint 1 — Domain + Persistenz + Task-Capture

### Ziel
Speichern, lesen, verschieben.

### Scope

- P1-01
- P1-02
- P1-03
- Basisnavigation

### Exit-Kriterien

- Task anlegen und persistent speichern
- Today/Backlog korrekt trennbar

---

## Sprint 2 — Today Flow + Backlog

### Ziel
MVP-Nutzung ohne Timer schon einmal komplett erlebbar machen.

### Scope

- P1-04
- P1-05
- erste Empty States

### Exit-Kriterien

- Done / Skip / What's next funktionieren
- Brain dump ist an Today angeschlossen

---

## Sprint 3 — Focus Timer + Warning + Celebration

### Ziel
Den eigentlichen Produktkern schließen.

### Scope

- P1-06
- P1-07
- P1-08

### Exit-Kriterien

- aktiver Fokusflow mit Abschluss
- Notification/Haptics stabil

---

## Sprint 4 — Settings + Export + QA + Beta

### Ziel
Den Build testbar und intern releasefähig machen.

### Scope

- P1-09
- P1-10
- Bugfixing
- UX-Polish nur für Blocker

### Exit-Kriterien

- interner Beta-Build vorhanden
- Kernflow stabil offline testbar

---

## Phase 1 — AI-gestützter Entwicklungsworkflow

Da ihr hauptsächlich mit KI entwickelt, braucht ihr in Phase 1 klare Arbeitsregeln.

### Ticket-Format

Jedes Ticket bekommt:

- Kontext
- betroffene Dateien
- Eingaben/Ausgaben
- Randbedingungen
- Akzeptanzkriterien
- Testfälle

### Empfohlenes Prompt-Muster

```txt
Implementiere <konkrete Aufgabe> in den Dateien <Dateien>.
Halte dich an diese Regeln:
- TypeScript strict
- keine Businesslogik in Screens
- WatermelonDB ist Source of Truth
- Zustand nur für UI-State
- keine neuen Dependencies
- liefere zusätzlich Unit Tests
- ändere nur die angegebenen Dateien
```

### Review-Regeln

AI-Code wird nicht gemerged, bevor geprüft ist:

- erzeugt er doppelte State-Quellen?
- versteckt er Businesslogik im Screen?
- schreibt er fragile Timer-Logik?
- verletzt er Offline-First?
- sind Side Effects gekapselt?
- wurden Tests mitgeliefert?

---

# Phase 3 — AI Features

## Ziel
KI entfernt Reibung beim Starten eines Tasks, nicht beim Planen eines ganzen Lebens.

Phase 3 liefert nur zwei klar definierte Fähigkeiten:

1. **Task schätzen** — „Wie groß ist das ungefähr?“
2. **Task zerlegen** — „Mach mir daraus die nächsten kleinen Schritte.“

## Nicht Teil von Phase 3

- freier Chat
- langfristige Planung
- automatisches Scheduling über mehrere Tage
- Kalenderoptimierung
- Cloud-Fallback im ersten Release
- selbstständige Task-Umsortierung ohne Nutzerbestätigung

## Definition of Done für Phase 3

Phase 3 ist erst fertig, wenn ein Nutzer:

1. bei einem Task eine AI-Aktion auslösen kann,
2. innerhalb brauchbarer Wartezeit ein strukturiertes Ergebnis erhält,
3. die Vorschläge übernehmen, ablehnen oder editieren kann,
4. nie den Eindruck bekommt, die KI habe „heimlich“ seine Daten verschoben,
5. die App weiterhin offline sinnvoll nutzen kann, auch wenn AI deaktiviert oder nicht initialisiert ist.

---

## Phase 3 — harte Produktentscheidungen

1. **AI-Features sind task-scoped.** Keine globale Chat-Navigation.
2. **AI schreibt nie direkt in den Task.** Zuerst Vorschlag, dann Nutzer-Übernahme.
3. **Alle Outputs müssen validierbar sein.** Kein unstrukturiertes Freitext-Chaos.
4. **Phase 3 startet local-only.** Cloud-Fallback ist ein späteres Extra, kein Plan-B-Grundlage.
5. **Zuerst Time Estimation, dann Breakdown.** Estimation ist technisch kleiner und besser evaluierbar.

---

## Empfohlenes Phase-3-Datenmodell

Statt AI-Ergebnisse direkt in Tasks zu schreiben, legt eine getrennte Vorschlags- oder Generationstabelle an.

### `ai_generations`

```ts
id: string
taskId: string
type: 'estimate' | 'breakdown'
inputText: string
outputJson: string
modelId: string
provider: 'executorch' | 'llama_rn'
latencyMs: number
accepted: boolean
rejected: boolean
createdAt: number
```

### Vorteil

- ihr könnt Qualität messen,
- ihr verliert keine Rohdaten,
- ihr könnt AI-Vorschläge später evaluieren,
- ihr müsst das Kernmodell nicht mit Übergangslogik verschmutzen.

---

## Phase 3 — Arbeitspakete

## P3-01 — AI-Abstraktionsschicht und Kontrakte

### Ziel
Einen stabilen Rahmen schaffen, bevor irgendein Modell eingebaut wird.

### Interfaces

```ts
export interface EstimateTaskInput {
  title: string
  notes?: string | null
}

export interface EstimateTaskOutput {
  estimatedMinutes: number
  confidence: 'low' | 'medium' | 'high'
  rationaleShort: string
}

export interface BreakdownTaskInput {
  title: string
  notes?: string | null
  targetMinutes?: number | null
}

export interface BreakdownTaskOutput {
  microSteps: Array<{
    title: string
    estimatedMinutes?: number
  }>
}
```

### Aufgaben

- `AIProvider` Interface definieren.
- Use Cases kapseln:
  - `estimateTask(input)`
  - `breakDownTask(input)`
- Zod- oder gleichwertige Runtime-Validierung ergänzen.
- Fehlerklassen definieren:
  - `ModelNotReadyError`
  - `InferenceTimeoutError`
  - `InvalidAIOutputError`
  - `UnsupportedDeviceError`

### Akzeptanzkriterien

- Business-Code kennt nie direkt das konkrete AI-SDK.
- Jeder Provider kann durch denselben Vertrag ersetzt werden.
- Ungültige Outputs werden abgefangen.

---

## P3-02 — Runtime-Spike: ExecuTorch vs. llama.rn

### Ziel
Nicht raten, sondern messen.

### Bewertungsmatrix

Für beide Kandidaten messen:

- Integrationsaufwand in Expo Development Build
- Startzeit des Models
- Time to first token / first result
- Speicherverbrauch
- Binärgrößen-Einfluss
- Qualität der strukturierten Outputs
- Stabilität auf iOS und Android
- Abbruch-/Timeout-Verhalten

### Vorgehen

- minimalen Spike-Screen bauen
- ein kleines Testmodell pro Provider anbinden
- drei Prompts pro Use Case laufen lassen
- Resultate in Markdown protokollieren

### Empfehlung für die Entscheidung

- Wenn strukturiertes, stabiles, React-Native-freundliches Setup zählt: **bevorzugt ExecuTorch evaluieren**.
- Wenn ihr maximale Nähe zu `llama.cpp` und GGUF-Ökosystem priorisiert: **llama.rn als Backup-Spike**.

### Exit-Kriterien

- ein Provider wird als `primary` markiert
- ein Provider bleibt optionaler Fallback für spätere Evaluierung
- Entscheidung ist mit Messwerten dokumentiert, nicht nach Bauchgefühl

---

## P3-03 — Modell- und Prompt-Strategie

### Ziel
Modelle nicht „irgendwie“ sprechen lassen, sondern eng führen.

### Regeln

- Prompts nur in zentralen Dateien halten.
- Outputs nur als JSON.
- Kurze systematische Instruktionen.
- Keine langen Konversationskontexte.
- Keine Funktionalität, die viel Weltwissen braucht.

### Prompt für Time Estimation

```txt
You estimate how long a single personal task may take.
Return only valid JSON.
Do not include markdown.
Be conservative.
If the task is vague, lower confidence.
```

### Ziel-JSON

```json
{
  "estimatedMinutes": 20,
  "confidence": "medium",
  "rationaleShort": "Includes setup and context switching."
}
```

### Prompt für Breakdown

```txt
You turn one vague task into 3 to 7 tiny next steps.
Return only valid JSON.
Each step must be concrete, physical, and startable.
Avoid generic advice.
```

### Ziel-JSON

```json
{
  "microSteps": [
    { "title": "Open the bank app", "estimatedMinutes": 2 },
    { "title": "Find the last invoice", "estimatedMinutes": 5 }
  ]
}
```

### Akzeptanzkriterien

- Prompt-Dateien sind versionierbar.
- JSON-Parser schlägt bei Freitext sauber fehl.
- Ausgabequalität ist reproduzierbar genug für Tests.

---

## P3-04 — Evaluations-Harness bauen

### Ziel
AI nicht nach Gefühl shippen.

### Datensatz

Legt einen kleinen internen Eval-Satz an, z. B. 40–60 Aufgabenbeschreibungen aus diesen Gruppen:

- Admin
- Haushalt
- Kommunikation
- Arbeit / Deep Work
- Erledigungen
- diffuse / vage Aufgaben

### Pro Aufgabe speichern

- erwarteter Zeitkorridor
- ob die Aufgabe zu unklar für gute Schätzung ist
- was eine brauchbare Zerlegung wäre
- Negativbeispiele

### Metriken

#### Für Estimation

- Anteil plausibler Schätzungen
- Anteil grober Ausreißer
- durchschnittliche Latenz
- Anteil valider JSON-Antworten

#### Für Breakdown

- Anteil konkret startbarer Steps
- Anteil generischer / nutzloser Steps
- durchschnittliche Anzahl brauchbarer Steps
- Anteil valider JSON-Antworten

### Akzeptanzkriterien

- Jeder Modellwechsel lässt sich gegen denselben Satz messen.
- Qualität ist dokumentiert statt gefühlt.

---

## P3-05 — Feature 1: Smart Time Estimation

### Ziel
Das kleinere, klarere AI-Feature zuerst produktiv machen.

### UX-Einstiegspunkte

- auf Task-Card: `Zeit schätzen`
- im Add/Edit-Screen: `Schätzen`
- optional nach Brain Dump bei unklarer Aufgabe

### Flow

1. Nutzer tippt `Zeit schätzen`
2. Input wird normalisiert
3. AI läuft lokal
4. Ergebnis wird validiert
5. Bottom Sheet zeigt:
   - geschätzte Minuten
   - Confidence
   - kurze Begründung
   - `Übernehmen`
   - `Bearbeiten`
   - `Verwerfen`
6. Nur bei `Übernehmen` wird `estimatedMinutes` im Task gesetzt

### Aufgaben

- Use Case implementieren
- Loading-/Error-States bauen
- Ergebnis-UI bauen
- Übernahme in Task persistieren
- `ai_generations` mitschreiben

### Akzeptanzkriterien

- Kein Ergebnis überschreibt Daten ohne Bestätigung.
- Fehlerfall blockiert den normalen App-Flow nicht.
- Nutzer kann Schätzung editieren, statt blind übernehmen zu müssen.

---

## P3-06 — Feature 2: Break this down for me

### Ziel
Aus diffuser Reibung konkrete, kleine Startschritte machen.

### UX-Einstiegspunkte

- auf Today Task
- auf Backlog Task
- optional direkt nach Brain Dump bei sehr vager Eingabe

### Flow

1. Nutzer tippt `Aufteilen`
2. Input wird an AI gegeben
3. Ergebnis wird validiert
4. Bottom Sheet oder Modal zeigt 3–7 Microsteps
5. Nutzer kann:
   - alle übernehmen
   - einzelne übernehmen
   - editieren
   - verwerfen

### Empfohlene Persistenzstrategie in V1

Microsteps zunächst **nicht** als echte Subtasks mit kompletter Produktlogik behandeln, sondern als einfache Kind-Tasks oder vorbereitete Task-Entwürfe.

### Aufgaben

- Breakdown Use Case implementieren
- Ergebnisliste bauen
- „Alle übernehmen“ und „einzeln übernehmen“ bauen
- bei Übernahme Child-Tasks oder vorbereitete Tasks erzeugen
- `ai_generations` speichern

### Akzeptanzkriterien

- Zerlegung produziert handlungsnahe, konkrete Schritte.
- Nutzer behält volle Kontrolle.
- App braucht keine vollwertige Subtask-UI, um den Nutzen zu liefern.

---

## P3-07 — Performance, Speicher und Failover-Verhalten

### Ziel
AI darf die App nicht schwerfällig machen.

### Aufgaben

- Model download / bundle strategy definieren
- Lazy loading einführen
- Warmup-Strategie prüfen
- Timeouts setzen
- Cancelation unterstützen
- Fallback-UI definieren:
  - `Modell lädt`
  - `Gerät nicht unterstützt`
  - `Keine AI verfügbar`
  - `Versuch später erneut`

### Zielbudgets

Diese Werte sind Zielbudgets, keine Garantien:

- Estimation auf Mittelklassegerät: **unter 6 Sekunden**
- Breakdown auf Mittelklassegerät: **unter 10 Sekunden**
- UI bleibt währenddessen bedienbar
- kein App-Freeze beim Öffnen eines AI-Sheets

### Akzeptanzkriterien

- AI ist optional zuschaltbar.
- Die restliche App bleibt ohne AI voll nutzbar.
- Timeouts und Abbrüche führen nicht zu kaputtem State.

---

## P3-08 — Privacy, Logging und Safety Guardrails

### Ziel
Lokale KI ohne Kontrollverlust.

### Regeln

- keine Hintergrundverarbeitung ohne Nutzeraktion
- keine automatische Task-Umsortierung
- keine versteckten Schreibzugriffe
- lokale Logs nur technisch und sparsam
- keine Prompthistorie, die unnötig private Inhalte dupliziert

### Logging

Speichert für Debug/Evaluation nur:

- provider
- modelId
- latency
- parse success/fail
- accepted/rejected

Nicht nötig in V1:

- vollständige Textlogs aller Nutzereingaben

### Akzeptanzkriterien

- Datenschutzstory bleibt glaubwürdig.
- Nutzer versteht, wann AI aktiv ist und wann nicht.

---

## P3-09 — QA und Release-Freigabe für AI

### Testarten

#### Unit

- JSON-Parsing
- Output-Validierung
- Fehler-Mapping
- Use-Case-Orchestrierung

#### Integration

- Provider init
- Provider timeout
- Ergebnisübernahme in Task
- `ai_generations` Speicherung

#### Eval Runs

- kompletter interner Datensatz
- Vergleich zweier Modelle / Prompts

#### Device QA

- iPhone aktueller Generation
- ältere iPhone-Generation
- Android Mittelklasse
- Android Low-/Mid-Memory-Szenario

### Release-Gate

AI wird nur ausgeliefert, wenn:

- JSON-Validität hoch genug ist
- Latenzbudgets grob eingehalten werden
- keine häufigen Hard-Crashes auftreten
- UX im Fehlerfall sauber bleibt

---

## Empfohlene Sprint-Aufteilung für Phase 3

## Sprint A — Abstraktion + Runtime-Spike

### Scope

- P3-01
- P3-02
- erster Spike-Screen

### Exit-Kriterien

- Provider-Entscheidung getroffen
- AI-Basisvertrag steht

---

## Sprint B — Prompting + Eval-Harness + Estimation Backend

### Scope

- P3-03
- P3-04
- Backend-Teil von P3-05

### Exit-Kriterien

- Estimation läuft technisch lokal
- Eval-Satz vorhanden

---

## Sprint C — Estimation UX + Breakdown Backend

### Scope

- UI von P3-05
- Backend von P3-06
- erste Übernahme-Logik

### Exit-Kriterien

- Time Estimation produktiv nutzbar
- Breakdown erzeugt verwertbare Rohoutputs

---

## Sprint D — Breakdown UX + Performance + QA

### Scope

- UI von P3-06
- P3-07
- P3-08
- P3-09

### Exit-Kriterien

- beide AI-Features intern releasefähig
- stabile Fehler- und Performancepfade

---

## Phase 3 — AI-gestützter Entwicklungsworkflow

In dieser Phase wird KI nicht nur Feature, sondern auch Liefermittel. Dann braucht ihr härtere Regeln als in Phase 1.

### Regeln für KI-Codegen

- nur gegen klar definierte Interfaces arbeiten
- keine direkte Nutzung des konkreten Providers in UI-Komponenten
- keine Freitext-Auswertung ohne Validator
- keine auto-generated „helper“ ohne klare Ownership
- jeder AI-Code-PR braucht mindestens einen echten Gerätetest

### Ticket-Muster für Phase 3

```txt
Implementiere den Use Case <estimateTask oder breakDownTask>.
Verwende ausschließlich das Interface AIProvider.
Output muss gegen das Schema <Schema> validiert werden.
Bei invalidem Output muss InvalidAIOutputError geworfen werden.
Schreibe Unit Tests für valid, invalid und timeout.
Ändere keine UI-Dateien außerhalb von <Dateiliste>.
```

### Zusätzliche Review-Fragen

- kann dieses Feature komplett scheitern, ohne den Kernflow zu beschädigen?
- ist die Ausgabe wirklich strukturierbar?
- hat der Nutzer immer die letzte Entscheidung?
- ist die Latenz im UI ehrlich kommuniziert?
- ist der Output konkret genug, um bei ADHS wirklich handlungsrelevant zu sein?

---

## Reihenfolge, die ich euch konkret empfehle

### Zuerst umsetzen

1. Phase 1 komplett abschließen
2. echte Nutzung mit Testern durchführen
3. aus realen Tasks einen kleinen Eval-Datensatz bauen
4. Phase 3 mit **Time Estimation zuerst** starten
5. erst danach Breakdown produktiv anschließen

### Nicht parallelisieren

Folgende Dinge würde ich **nicht** parallel bauen:

- Phase 1 Timer-Hardening und Phase 3 AI-Spike
- echte Subtask-Produktlogik und Breakdown-Feature
- Cloud-Fallback und local inference
- Web-Support und on-device AI

---

## Kritische Risiken

## Risiko 1 — Doc-Drift in der Toolchain

In euren bisherigen Unterlagen gibt es bereits Versionsdrift. Das muss vor Phase 1 bereinigt werden, sonst produziert AI-Code Inkonsistenzen.

## Risiko 2 — Timer-Logik wird zu UI-lastig

Wenn der Timer zu stark im Component-State lebt, bekommt ihr Background-Bugs und falsche Session-Zeiten.

## Risiko 3 — Breakdown wird zu früh als „echte Subtasks“ gebaut

Dann zieht ihr euch schon in Phase 3 komplexe Parent/Child-Interaktionen in den Produktkern.

## Risiko 4 — AI ohne Evaluationssatz

Dann shipped ihr ein Feature, das mal gut klingt und mal Müll produziert, ohne das sauber zu merken.

## Risiko 5 — Cloud-Fallback zu früh

Das verwässert eure Privacy- und Offline-Positionierung und verdoppelt euren Debug-Aufwand.

---

## Minimaler Gesamtplan als Checkliste

### Phase 1

- [ ] technische Basis härten
- [ ] Task- und Session-Schema finalisieren
- [ ] Repositories und Hooks bauen
- [ ] AddTaskScreen fertigstellen
- [ ] TodayScreen fertigstellen
- [ ] BacklogScreen fertigstellen
- [ ] Timer-Engine robust machen
- [ ] Transition Warning + Notifications + Haptics integrieren
- [ ] Completion Flow mit Celebration bauen
- [ ] Settings + Export bauen
- [ ] Unit/Component/E2E-Smokes aufsetzen
- [ ] internen Beta-Build schneiden

### Phase 3

- [ ] AI-Kontrakte definieren
- [ ] Runtime-Spike ExecuTorch vs. llama.rn durchführen
- [ ] Modell- und Prompt-Strategie fixieren
- [ ] Eval-Harness bauen
- [ ] Time Estimation produktiv umsetzen
- [ ] Breakdown produktiv umsetzen
- [ ] Performance/Timeout/Fehlerpfade härten
- [ ] Privacy- und Logging-Regeln umsetzen
- [ ] internen AI-Build freigeben

---

## Schlussfolgerung

Für euch ist Phase 1 der eigentliche Produktbeweis. Phase 3 ist erst dann sinnvoll, wenn der Kernflow schon stabil ist. Wenn ihr die Reihenfolge sauber haltet, wird AI ein echter Verstärker. Wenn ihr sie zu früh in einen wackligen Kern kippt, produziert sie nur mehr Oberfläche, mehr Bugs und mehr Scheinkomplexität.

