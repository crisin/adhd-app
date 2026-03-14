import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { schema } from './schema';
import { migrations } from './migrations';
import { Task } from './models/Task';
import { FocusSession } from './models/FocusSession';
import { Reminder } from './models/Reminder';
import { Goal } from './models/Goal';
import { Idea } from './models/Idea';
import { InventoryItem } from './models/InventoryItem';
import { Plant } from './models/Plant';
import { Subtask } from './models/Subtask';
import { Label } from './models/Label';
import { TaskLabel } from './models/TaskLabel';
import { Room } from './models/Room';
import { CalendarEvent } from './models/CalendarEvent';

const adapter = new LokiJSAdapter({
  schema,
  migrations,
  useWebWorker: false,
  useIncrementalIndexedDB: true,
  onSetUpError: (error: Error) => {
    console.error('[tADiHD] Database setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [
    Task, FocusSession, Reminder, Goal, Idea,
    InventoryItem, Plant,
    Subtask, Label, TaskLabel, Room, CalendarEvent,
  ],
});

export { Task, FocusSession, Reminder, Goal, Idea, InventoryItem, Plant };
export { Subtask, Label, TaskLabel, Room, CalendarEvent };
export type { TaskStatus, TaskCategory, TaskPriority, TaskSource } from './models/Task';
export type { GoalType, GoalStatus } from './models/Goal';
export type { EscalationLevel } from './models/Reminder';
export type { InventoryRoom } from './models/InventoryItem';
export type { CalendarEventSource } from './models/CalendarEvent';
