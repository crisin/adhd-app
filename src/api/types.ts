export type TaskStatus = 'backlog' | 'today' | 'active' | 'done' | 'skipped';
export type TaskCategory = 'private' | 'school' | 'work' | 'health' | 'finance' | 'other';
export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskSource = 'manual' | 'idea-dump' | 'plant-reminder';

export interface TaskRow {
  id: string;
  title: string;
  notes: string | null;
  status: TaskStatus;
  category: TaskCategory | null;
  goalId: string | null;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  sortOrder: number;
  completedAt: number | null; // ms
  priority: TaskPriority;
  dueAt: number | null; // ms
  recurrenceRule: string | null;
  source: TaskSource;
  plantId: string | null;
  archivedAt: number | null;
  createdAt: number;
}

export interface TaskObj extends Omit<TaskRow, 'completedAt'> {
  completedAt: Date | null;
  isOverdue: boolean;
  isDueToday: boolean;
}

export type GoalType = 'short' | 'long';
export type GoalStatus = 'active' | 'done' | 'archived';

export interface GoalRow {
  id: string;
  title: string;
  description: string | null;
  type: GoalType;
  status: GoalStatus;
  category: TaskCategory | null;
  targetDate: number | null; // ms
  sortOrder: number;
  completedAt: number | null; // ms
  createdAt: number;
}

export interface GoalObj extends Omit<GoalRow, 'completedAt' | 'targetDate'> {
  completedAt: Date | null;
  targetDate: Date | null;
}

export interface IdeaRow {
  id: string;
  content: string;
  processed: boolean;
  createdAt: number;
}

export interface IdeaObj extends Omit<IdeaRow, 'createdAt'> {
  createdAt: Date;
}

export interface SubtaskRow {
  id: string;
  taskId: string;
  title: string;
  done: boolean;
  sortOrder: number;
}

export type SubtaskObj = SubtaskRow;

export interface LabelRow {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

export interface LabelObj extends Omit<LabelRow, 'createdAt'> {
  createdAt: Date;
}

export interface TaskLabelRow {
  id: string;
  taskId: string;
  labelId: string;
}

export type TaskLabelObj = TaskLabelRow;

export type InventoryRoom =
  | 'kitchen'
  | 'bathroom'
  | 'bedroom'
  | 'living_room'
  | 'office'
  | 'garage'
  | 'garden'
  | 'other';

export interface InventoryItemRow {
  id: string;
  name: string;
  room: InventoryRoom;
  location: string | null;
  quantity: number;
  notes: string | null;
  imageUri: string | null;
  roomId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface InventoryItemObj extends Omit<InventoryItemRow, 'createdAt' | 'updatedAt'> {
  createdAt: Date;
  updatedAt: Date;
}

export interface PlantRow {
  id: string;
  name: string;
  species: string | null;
  wateringIntervalDays: number;
  lastWateredAt: number | null; // ms
  location: string | null;
  notes: string | null;
  imageUri: string | null;
  roomId: string | null;
  createdAt: number;
}

export interface PlantObj extends Omit<PlantRow, 'createdAt'> {
  createdAt: Date;
  daysSinceWatered: number | null;
  daysUntilWater: number | null;
  wateringStatus: 'never' | 'overdue' | 'today' | 'soon' | 'ok';
}

export interface RoomRow {
  id: string;
  name: string;
  emoji: string | null;
  color: string | null;
  sortOrder: number;
  parentId: string | null;
  createdAt: number;
}

export interface RoomObj extends Omit<RoomRow, 'createdAt'> {
  createdAt: Date;
}

export type CalendarEventSource = 'manual' | 'task-due' | 'plant-reminder' | 'device';

export interface CalendarEventRow {
  id: string;
  title: string;
  description: string | null;
  startAt: number; // ms
  endAt: number | null; // ms
  allDay: boolean;
  recurrenceRule: string | null;
  source: CalendarEventSource;
  taskId: string | null;
  plantId: string | null;
  deviceEventId: string | null;
  createdAt: number;
}

export interface CalendarEventObj extends Omit<CalendarEventRow, 'createdAt'> {
  createdAt: Date;
  startDate: Date;
  endDate: Date | null;
  isMultiDay: boolean;
}

export interface FocusSessionRow {
  id: string;
  taskId: string;
  startedAt: number; // ms
  endedAt: number | null; // ms
  plannedMinutes: number;
  completed: boolean;
}

export type FocusSessionObj = FocusSessionRow;

export type EscalationLevel = 0 | 1 | 2;

export interface ReminderRow {
  id: string;
  taskId: string | null;
  title: string;
  scheduledAt: number; // ms
  repeatRule: string | null;
  escalationLevel: EscalationLevel;
  dismissed: boolean;
}

export interface ReminderObj extends Omit<ReminderRow, 'scheduledAt'> {
  scheduledAt: Date;
}
