import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { schema } from './schema';
import { Task } from './models/Task';
import { FocusSession } from './models/FocusSession';
import { Reminder } from './models/Reminder';

const adapter = new LokiJSAdapter({
  schema,
  migrations: undefined,
  useWebWorker: false,
  useIncrementalIndexedDB: true,
  onSetUpError: (error: Error) => {
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
