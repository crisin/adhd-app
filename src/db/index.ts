import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { migrations } from './migrations';
import { Task } from './models/Task';
import { FocusSession } from './models/FocusSession';
import { Reminder } from './models/Reminder';
import { Goal } from './models/Goal';
import { Idea } from './models/Idea';
import { InventoryItem } from './models/InventoryItem';
import { Plant } from './models/Plant';

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: true,
  onSetUpError: (error) => {
    console.error('[tADiHD] Database setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [Task, FocusSession, Reminder, Goal, Idea, InventoryItem, Plant],
});

export { Task, FocusSession, Reminder, Goal, Idea, InventoryItem, Plant };
export type { TaskStatus, TaskCategory } from './models/Task';
export type { GoalType, GoalStatus } from './models/Goal';
export type { EscalationLevel } from './models/Reminder';
export type { InventoryRoom } from './models/InventoryItem';
