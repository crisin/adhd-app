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

// GET /api/goals or GET /api/goals?status=active
router.get('/', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { status } = req.query;

  try {
    let result;
    if (status) {
      result = await pool.query(
        'SELECT * FROM goals WHERE user_id = $1 AND status = $2 ORDER BY sort_order ASC',
        [userId, status]
      );
    } else {
      result = await pool.query(
        'SELECT * FROM goals WHERE user_id = $1 ORDER BY sort_order ASC',
        [userId]
      );
    }
    res.json(result.rows.map(toCamel));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/goals
router.post('/', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const {
    title,
    type,
    description = null,
    category = null,
    targetDate = null,
    status = 'active',
  } = req.body;

  if (!title || !type) {
    res.status(400).json({ error: 'title and type are required' });
    return;
  }

  const id = uuid();
  const now = Date.now();

  try {
    const result = await pool.query(
      `INSERT INTO goals (id, user_id, title, description, type, status, category, target_date, sort_order, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [id, userId, title.trim(), description, type, status, category, targetDate, now, now]
    );
    res.status(201).json(toCamel(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/goals/:id
router.patch('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;

  const fieldMap: Record<string, string> = {
    targetDate: 'target_date',
    sortOrder: 'sort_order',
    completedAt: 'completed_at',
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

  // Auto-set completed_at when status transitions to done
  if (req.body.status === 'done' && req.body.completedAt === undefined && req.body.completed_at === undefined) {
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
      `UPDATE goals SET ${setClauses.join(', ')} WHERE user_id = $1 AND id = $2 RETURNING *`,
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

// DELETE /api/goals/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM goals WHERE user_id = $1 AND id = $2 RETURNING id',
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
