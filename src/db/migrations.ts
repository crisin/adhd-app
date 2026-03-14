import { addColumns, createTable, schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 5,
      steps: [
        // Task model expansion
        addColumns({
          table: 'tasks',
          columns: [
            { name: 'priority', type: 'string' },
            { name: 'due_at', type: 'number', isOptional: true },
            { name: 'recurrence_rule', type: 'string', isOptional: true },
            { name: 'source', type: 'string' },
            { name: 'plant_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'archived_at', type: 'number', isOptional: true },
          ],
        }),
        // Shared rooms FK on plants
        addColumns({
          table: 'plants',
          columns: [
            { name: 'room_id', type: 'string', isOptional: true, isIndexed: true },
          ],
        }),
        // Shared rooms FK on inventory_items
        addColumns({
          table: 'inventory_items',
          columns: [
            { name: 'room_id', type: 'string', isOptional: true, isIndexed: true },
          ],
        }),
        // Subtasks table
        createTable({
          name: 'subtasks',
          columns: [
            { name: 'task_id', type: 'string', isIndexed: true },
            { name: 'title', type: 'string' },
            { name: 'done', type: 'boolean' },
            { name: 'sort_order', type: 'number' },
          ],
        }),
        // Labels table
        createTable({
          name: 'labels',
          columns: [
            { name: 'name', type: 'string' },
            { name: 'color', type: 'string' },
            { name: 'created_at', type: 'number' },
          ],
        }),
        // Task-Labels join table
        createTable({
          name: 'task_labels',
          columns: [
            { name: 'task_id', type: 'string', isIndexed: true },
            { name: 'label_id', type: 'string', isIndexed: true },
          ],
        }),
        // User-created rooms (shared between inventory + plants)
        createTable({
          name: 'rooms',
          columns: [
            { name: 'name', type: 'string' },
            { name: 'emoji', type: 'string', isOptional: true },
            { name: 'color', type: 'string', isOptional: true },
            { name: 'sort_order', type: 'number' },
            { name: 'created_at', type: 'number' },
          ],
        }),
        // Calendar events
        createTable({
          name: 'calendar_events',
          columns: [
            { name: 'title', type: 'string' },
            { name: 'description', type: 'string', isOptional: true },
            { name: 'start_at', type: 'number' },
            { name: 'end_at', type: 'number', isOptional: true },
            { name: 'all_day', type: 'boolean' },
            { name: 'recurrence_rule', type: 'string', isOptional: true },
            { name: 'source', type: 'string' },
            { name: 'task_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'plant_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'device_event_id', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
          ],
        }),
      ],
    },
    {
      toVersion: 4,
      steps: [
        createTable({
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
          ],
        }),
      ],
    },
    {
      toVersion: 3,
      steps: [
        createTable({
          name: 'inventory_items',
          columns: [
            { name: 'name', type: 'string' },
            { name: 'room', type: 'string' },
            { name: 'location', type: 'string', isOptional: true },
            { name: 'quantity', type: 'number' },
            { name: 'notes', type: 'string', isOptional: true },
            { name: 'image_uri', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'tasks',
          columns: [
            { name: 'category', type: 'string', isOptional: true },
            { name: 'goal_id', type: 'string', isOptional: true, isIndexed: true },
          ],
        }),
        createTable({
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
        createTable({
          name: 'ideas',
          columns: [
            { name: 'content', type: 'string' },
            { name: 'processed', type: 'boolean' },
            { name: 'created_at', type: 'number' },
          ],
        }),
      ],
    },
  ],
});
