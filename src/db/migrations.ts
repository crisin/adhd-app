import { addColumns, createTable, schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
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
