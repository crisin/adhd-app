import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 6,
  tables: [
    tableSchema({
      name: 'tasks',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'status', type: 'string' }, // 'backlog' | 'today' | 'active' | 'done' | 'skipped'
        { name: 'category', type: 'string', isOptional: true },
        { name: 'goal_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'estimated_minutes', type: 'number', isOptional: true },
        { name: 'actual_minutes', type: 'number', isOptional: true },
        { name: 'sort_order', type: 'number' },
        { name: 'completed_at', type: 'number', isOptional: true },
        // v5: task model expansion
        { name: 'priority', type: 'string' }, // 'high' | 'medium' | 'low'
        { name: 'due_at', type: 'number', isOptional: true },
        { name: 'recurrence_rule', type: 'string', isOptional: true },
        { name: 'source', type: 'string' }, // 'manual' | 'idea-dump' | 'plant-reminder'
        { name: 'plant_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'archived_at', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'focus_sessions',
      columns: [
        { name: 'task_id', type: 'string', isIndexed: true },
        { name: 'started_at', type: 'number' },
        { name: 'ended_at', type: 'number', isOptional: true },
        { name: 'planned_minutes', type: 'number' },
        { name: 'completed', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'reminders',
      columns: [
        { name: 'task_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'scheduled_at', type: 'number' },
        { name: 'repeat_rule', type: 'string', isOptional: true },
        { name: 'escalation_level', type: 'number' },
        { name: 'dismissed', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'goals',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'type', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'category', type: 'string', isOptional: true },
        { name: 'target_date', type: 'number', isOptional: true },
        { name: 'sort_order', type: 'number' },
        { name: 'completed_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'ideas',
      columns: [
        { name: 'content', type: 'string' },
        { name: 'processed', type: 'boolean' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'plants',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'species', type: 'string', isOptional: true },
        { name: 'watering_interval_days', type: 'number' },
        { name: 'last_watered_at', type: 'number', isOptional: true },
        { name: 'location', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'image_uri', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        // v5: shared rooms
        { name: 'room_id', type: 'string', isOptional: true, isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'inventory_items',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'room', type: 'string' }, // legacy — kept for migration compat
        { name: 'location', type: 'string', isOptional: true },
        { name: 'quantity', type: 'number' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'image_uri', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        // v5: shared rooms
        { name: 'room_id', type: 'string', isOptional: true, isIndexed: true },
      ],
    }),
    // v5: new tables
    tableSchema({
      name: 'subtasks',
      columns: [
        { name: 'task_id', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'done', type: 'boolean' },
        { name: 'sort_order', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'labels',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'color', type: 'string' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'task_labels',
      columns: [
        { name: 'task_id', type: 'string', isIndexed: true },
        { name: 'label_id', type: 'string', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'rooms',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'emoji', type: 'string', isOptional: true },
        { name: 'color', type: 'string', isOptional: true },
        { name: 'sort_order', type: 'number' },
        { name: 'created_at', type: 'number' },
        // v6: nested locations
        { name: 'parent_id', type: 'string', isOptional: true, isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'calendar_events',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'start_at', type: 'number' },
        { name: 'end_at', type: 'number', isOptional: true },
        { name: 'all_day', type: 'boolean' },
        { name: 'recurrence_rule', type: 'string', isOptional: true },
        { name: 'source', type: 'string' }, // 'manual' | 'task-due' | 'plant-reminder' | 'device'
        { name: 'task_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'plant_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'device_event_id', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
});
