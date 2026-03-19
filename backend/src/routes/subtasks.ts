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

// GET /api/subtasks?task_id=X
router.get('/', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { task_id } = req.query;

  try {
    let result;
    if (task_id) {
      result = await pool.query(
        'SELECT * FROM subtasks WHERE user_id = $1 AND task_id = $2 ORDER BY sort_order ASC',
        [userId, task_id]
      );
    } else {
      result = await pool.query(
        'SELECT * FROM subtasks WHERE user_id = $1 ORDER BY sort_order ASC',
        [userId]
      );
    }
    res.json(result.rows.map(toCamel));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/subtasks
router.post('/', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { taskId, title, done = false } = req.body;

  if (!taskId || !title) {
    res.status(400).json({ error: 'taskId and title are required' });
    return;
  }

  const id = uuid();
  const sortOrder = Date.now();

  try {
    const result = await pool.query(
      'INSERT INTO subtasks (id, user_id, task_id, title, done, sort_order) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [id, userId, taskId, title.trim(), done, sortOrder]
    );
    res.status(201).json(toCamel(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/subtasks/:id
router.patch('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;
  const { title, done, sortOrder } = req.body;

  const setClauses: string[] = [];
  const values: any[] = [userId, id];
  let paramIdx = 3;

  if (title !== undefined) {
    setClauses.push(`title = $${paramIdx}`);
    values.push(title.trim());
    paramIdx++;
  }
  if (done !== undefined) {
    setClauses.push(`done = $${paramIdx}`);
    values.push(done);
    paramIdx++;
  }
  if (sortOrder !== undefined) {
    setClauses.push(`sort_order = $${paramIdx}`);
    values.push(sortOrder);
    paramIdx++;
  }

  if (setClauses.length === 0) {
    res.status(400).json({ error: 'No valid fields to update' });
    return;
  }

  try {
    const result = await pool.query(
      `UPDATE subtasks SET ${setClauses.join(', ')} WHERE user_id = $1 AND id = $2 RETURNING *`,
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

// DELETE /api/subtasks/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM subtasks WHERE user_id = $1 AND id = $2 RETURNING id',
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
