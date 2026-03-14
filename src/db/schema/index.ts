import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 4,
  tables: [
    tableSchema({
      name: 'tasks',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'status', type: 'string' }, // 'backlog' | 'today' | 'active' | 'done' | 'skipped'
        { name: 'category', type: 'string', isOptional: true }, // 'private' | 'school' | 'work' | 'health' | 'finance' | 'other'
        { name: 'goal_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'estimated_minutes', type: 'number', isOptional: true },
        { name: 'actual_minutes', type: 'number', isOptional: true },
        { name: 'sort_order', type: 'number' },
        { name: 'completed_at', type: 'number', isOptional: true },
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
        { name: 'type', type: 'string' }, // 'short' | 'long'
        { name: 'status', type: 'string' }, // 'active' | 'done' | 'archived'
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
        { name: 'watering_interval_days', type: 'number' }, // how often to water
        { name: 'last_watered_at', type: 'number', isOptional: true }, // null = never
        { name: 'location', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'image_uri', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'inventory_items',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'room', type: 'string' }, // 'kitchen' | 'bathroom' | 'bedroom' | 'living_room' | 'office' | 'garage' | 'garden' | 'other'
        { name: 'location', type: 'string', isOptional: true }, // specific spot, e.g. "top shelf"
        { name: 'quantity', type: 'number' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'image_uri', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
