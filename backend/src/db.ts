import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function initDb(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL,
      category TEXT,
      goal_id TEXT,
      estimated_minutes INTEGER,
      actual_minutes INTEGER,
      sort_order BIGINT NOT NULL,
      completed_at BIGINT,
      priority TEXT NOT NULL DEFAULT 'medium',
      due_at BIGINT,
      recurrence_rule TEXT,
      source TEXT NOT NULL DEFAULT 'manual',
      plant_id TEXT,
      archived_at BIGINT,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS focus_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      started_at BIGINT NOT NULL,
      ended_at BIGINT,
      planned_minutes INTEGER NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT false
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      task_id TEXT,
      title TEXT NOT NULL,
      scheduled_at BIGINT NOT NULL,
      repeat_rule TEXT,
      escalation_level INTEGER NOT NULL DEFAULT 0,
      dismissed BOOLEAN NOT NULL DEFAULT false
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      category TEXT,
      target_date BIGINT,
      sort_order BIGINT NOT NULL,
      completed_at BIGINT,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ideas (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      processed BOOLEAN NOT NULL DEFAULT false,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plants (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      species TEXT,
      watering_interval_days INTEGER NOT NULL,
      last_watered_at BIGINT,
      location TEXT,
      notes TEXT,
      image_uri TEXT,
      room_id TEXT,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      room TEXT NOT NULL,
      location TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      image_uri TEXT,
      room_id TEXT,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      title TEXT NOT NULL,
      done BOOLEAN NOT NULL DEFAULT false,
      sort_order BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS labels (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS task_labels (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      label_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      emoji TEXT,
      color TEXT,
      sort_order BIGINT NOT NULL,
      parent_id TEXT,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      start_at BIGINT NOT NULL,
      end_at BIGINT,
      all_day BOOLEAN NOT NULL DEFAULT false,
      recurrence_rule TEXT,
      source TEXT NOT NULL DEFAULT 'manual',
      task_id TEXT,
      plant_id TEXT,
      device_event_id TEXT,
      created_at BIGINT NOT NULL
    );
  `);
  console.log('Database tables initialized');
}
