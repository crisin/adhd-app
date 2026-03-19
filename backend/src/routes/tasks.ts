import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { v4 as uuid } from 'uuid';

const router = Router();

function toCamel(row: any): any {
  const result: any = {};
  for (const key of Object.keys(row)) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camel] = row[key];
  }
  return result;
}

// GET /api/tasks
router.get('/', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { status, goal_id } = req.query;

  try {
    let rows;

    if (goal_id) {
      const result = await pool.query(
        'SELECT * FROM tasks WHERE user_id = $1 AND goal_id = $2 ORDER BY sort_order ASC',
        [userId, goal_id]
      );
      rows = result.rows;
    } else if (status === 'done') {
      const result = await pool.query(
        "SELECT * FROM tasks WHERE user_id = $1 AND status = 'done' ORDER BY completed_at DESC",
        [userId]
      );
      rows = result.rows;
    } else if (status === 'backlog') {
      const result = await pool.query(
        "SELECT * FROM tasks WHERE user_id = $1 AND status = 'backlog' ORDER BY sort_order ASC",
        [userId]
      );
      rows = result.rows;
    } else if (typeof status === 'string' && status.includes(',')) {
      const statuses = status.split(',').map((s) => s.trim());
      const placeholders = statuses.map((_, i) => `$${i + 2}`).join(', ');
      const result = await pool.query(
        `SELECT * FROM tasks WHERE user_id = $1 AND status IN (${placeholders}) ORDER BY sort_order ASC`,
        [userId, ...statuses]
      );
      rows = result.rows;
    } else if (status) {
      const result = await pool.query(
        'SELECT * FROM tasks WHERE user_id = $1 AND status = $2 ORDER BY sort_order ASC',
        [userId, status]
      );
      rows = result.rows;
    } else {
      const result = await pool.query(
        'SELECT * FROM tasks WHERE user_id = $1 ORDER BY sort_order ASC',
        [userId]
      );
      rows = result.rows;
    }

    res.json(rows.map(toCamel));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tasks
router.post('/', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const {
    title,
    notes = null,
    status = 'today',
    category = null,
    goalId = null,
    estimatedMinutes = null,
    priority = 'medium',
    dueAt = null,
    recurrenceRule = null,
    source = 'manual',
    plantId = null,
  } = req.body;

  if (!title) {
    res.status(400).json({ error: 'title is required' });
    return;
  }

  const id = uuid();
  const now = Date.now();

  try {
    const result = await pool.query(
      `INSERT INTO tasks
        (id, user_id, title, notes, status, category, goal_id, estimated_minutes,
         actual_minutes, sort_order, priority, due_at, recurrence_rule, source,
         plant_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [
        id, userId, title.trim(), notes, status, category, goalId,
        estimatedMinutes, null, now, priority, dueAt, recurrenceRule,
        source, plantId, now,
      ]
    );
    res.status(201).json(toCamel(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/tasks/:id
router.patch('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;

  const allowed = [
    'title', 'notes', 'status', 'category', 'goal_id', 'goalId',
    'estimated_minutes', 'estimatedMinutes', 'actual_minutes', 'actualMinutes',
    'sort_order', 'sortOrder', 'priority', 'due_at', 'dueAt',
    'recurrence_rule', 'recurrenceRule', 'plant_id', 'plantId',
    'completed_at', 'completedAt',
  ];

  const setClauses: string[] = [];
  const values: any[] = [userId, id];
  let paramIdx = 3;

  const body = req.body;

  // Normalize camelCase keys to snake_case for SQL
  const fieldMap: Record<string, string> = {
    goalId: 'goal_id',
    estimatedMinutes: 'estimated_minutes',
    actualMinutes: 'actual_minutes',
    sortOrder: 'sort_order',
    dueAt: 'due_at',
    recurrenceRule: 'recurrence_rule',
    plantId: 'plant_id',
    completedAt: 'completed_at',
    archivedAt: 'archived_at',
  };

  for (const key of Object.keys(body)) {
    const col = fieldMap[key] ?? key;
    if (allowed.includes(key) || allowed.includes(col)) {
      setClauses.push(`${col} = $${paramIdx}`);
      let val = body[key];
      // If setting status to done and completedAt not provided, set it
      if (key === 'status' && val === 'done' && body.completedAt === undefined) {
        // Will add completedAt after
      }
      values.push(val);
      paramIdx++;
    }
  }

  // Auto-set completed_at when status transitions to done
  if (body.status === 'done' && body.completedAt === undefined && body.completed_at === undefined) {
    setClauses.push(`completed_at = $${paramIdx}`);
    values.push(Date.now());
    paramIdx++;
  }

  if (setClauses.length === 0) {
    res.status(400).json({ error: 'No valid fields to update' });
    return;
  }

  try {
    const result = await pool.query(
      `UPDATE tasks SET ${setClauses.join(', ')} WHERE user_id = $1 AND id = $2 RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json(toCamel(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM subtasks WHERE user_id = $1 AND task_id = $2', [userId, id]);
    await pool.query('DELETE FROM task_labels WHERE user_id = $1 AND task_id = $2', [userId, id]);
    const result = await pool.query(
      'DELETE FROM tasks WHERE user_id = $1 AND id = $2 RETURNING id',
      [userId, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tasks/:id/archive
router.post('/:id/archive', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'UPDATE tasks SET archived_at = $3 WHERE user_id = $1 AND id = $2 RETURNING *',
      [userId, id, Date.now()]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json(toCamel(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tasks/:id/focus-start
router.post('/:id/focus-start', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;
  const { plannedMinutes } = req.body;

  if (!plannedMinutes) {
    res.status(400).json({ error: 'plannedMinutes is required' });
    return;
  }

  const sessionId = uuid();
  const now = Date.now();

  try {
    const taskResult = await pool.query(
      "UPDATE tasks SET status = 'active' WHERE user_id = $1 AND id = $2 RETURNING *",
      [userId, id]
    );
    if (taskResult.rows.length === 0) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const sessionResult = await pool.query(
      `INSERT INTO focus_sessions (id, user_id, task_id, started_at, planned_minutes, completed)
       VALUES ($1, $2, $3, $4, $5, false) RETURNING *`,
      [sessionId, userId, id, now, plannedMinutes]
    );

    res.status(201).json({
      task: toCamel(taskResult.rows[0]),
      session: toCamel(sessionResult.rows[0]),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tasks/:id/focus-end
router.post('/:id/focus-end', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;
  const { sessionId, completed } = req.body;

  if (!sessionId) {
    res.status(400).json({ error: 'sessionId is required' });
    return;
  }

  const now = Date.now();
  const newStatus = completed ? 'done' : 'today';

  try {
    const sessionResult = await pool.query(
      'UPDATE focus_sessions SET ended_at = $3, completed = $4 WHERE user_id = $1 AND id = $2 RETURNING *',
      [userId, sessionId, now, completed]
    );
    if (sessionResult.rows.length === 0) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const taskResult = await pool.query(
      `UPDATE tasks SET status = $3, completed_at = $4
       WHERE user_id = $1 AND id = $2 RETURNING *`,
      [userId, id, newStatus, completed ? now : null]
    );
    if (taskResult.rows.length === 0) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json({
      task: toCamel(taskResult.rows[0]),
      session: toCamel(sessionResult.rows[0]),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
