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

// GET /api/reminders
router.get('/', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;

  try {
    const result = await pool.query(
      'SELECT * FROM reminders WHERE user_id = $1 ORDER BY scheduled_at ASC',
      [userId]
    );
    res.json(result.rows.map(toCamel));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/reminders
router.post('/', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const {
    title,
    scheduledAt,
    taskId = null,
    repeatRule = null,
    escalationLevel = 0,
    dismissed = false,
  } = req.body;

  if (!title || scheduledAt === undefined) {
    res.status(400).json({ error: 'title and scheduledAt are required' });
    return;
  }

  const id = uuid();

  try {
    const result = await pool.query(
      `INSERT INTO reminders (id, user_id, task_id, title, scheduled_at, repeat_rule, escalation_level, dismissed)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, userId, taskId, title.trim(), scheduledAt, repeatRule, escalationLevel, dismissed]
    );
    res.status(201).json(toCamel(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/reminders/:id
router.patch('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;

  const fieldMap: Record<string, string> = {
    taskId: 'task_id',
    scheduledAt: 'scheduled_at',
    repeatRule: 'repeat_rule',
    escalationLevel: 'escalation_level',
  };

  const setClauses: string[] = [];
  const values: any[] = [userId, id];
  let paramIdx = 3;

  for (const key of Object.keys(req.body)) {
    const col = fieldMap[key] ?? key;
    setClauses.push(`${col} = $${paramIdx}`);
    values.push(req.body[key]);
    paramIdx++;
  }

  if (setClauses.length === 0) {
    res.status(400).json({ error: 'No valid fields to update' });
    return;
  }

  try {
    const result = await pool.query(
      `UPDATE reminders SET ${setClauses.join(', ')} WHERE user_id = $1 AND id = $2 RETURNING *`,
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

// DELETE /api/reminders/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM reminders WHERE user_id = $1 AND id = $2 RETURNING id',
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

export default router;
