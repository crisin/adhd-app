import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { Task } from './models/Task';
import { FocusSession } from './models/FocusSession';
import { Reminder } from './models/Reminder';

const adapter = new SQLiteAdapter({
  schema,
  // Migrations will go here as the schema evolves
  migrations: undefined,
  jsi: true, // Enable JSI for better performance on native
  onSetUpError: (error) => {
    console.error('[TadiHD] Database setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [Task, FocusSession, Reminder],
});

export { Task, FocusSession, Reminder };
export type { TaskStatus } from './models/Task';
export type { EscalationLevel } from './models/Reminder';
