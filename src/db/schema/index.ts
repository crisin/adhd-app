import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'tasks',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'status', type: 'string' }, // 'backlog' | 'today' | 'active' | 'done' | 'skipped'
        { name: 'estimated_minutes', type: 'number', isOptional: true },
        { name: 'actual_minutes', type: 'number', isOptional: true },
        { name: 'sort_order', type: 'number' },
        { name: 'completed_at', type: 'number', isOptional: true }, // unix timestamp
        // TODO(phase2): subtasks — add parent_id column here
        // { name: 'parent_id', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'focus_sessions',
      columns: [
        { name: 'task_id', type: 'string', isIndexed: true },
        { name: 'started_at', type: 'number' }, // unix timestamp
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
        { name: 'scheduled_at', type: 'number' }, // unix timestamp
        { name: 'repeat_rule', type: 'string', isOptional: true },
        { name: 'escalation_level', type: 'number' }, // 0 | 1 | 2
        { name: 'dismissed', type: 'boolean' },
      ],
    }),
  ],
});
