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

// GET /api/task-labels?task_id=X
router.get('/', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { task_id } = req.query;

  if (!task_id) {
    res.status(400).json({ error: 'task_id is required' });
    return;
  }

  try {
    const result = await pool.query(
      'SELECT * FROM task_labels WHERE user_id = $1 AND task_id = $2',
      [userId, task_id]
    );
    res.json(result.rows.map(toCamel));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/task-labels
router.post('/', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { taskId, labelId } = req.body;

  if (!taskId || !labelId) {
    res.status(400).json({ error: 'taskId and labelId are required' });
    return;
  }

  const id = uuid();

  try {
    const result = await pool.query(
      'INSERT INTO task_labels (id, user_id, task_id, label_id) VALUES ($1,$2,$3,$4) RETURNING *',
      [id, userId, taskId, labelId]
    );
    res.status(201).json(toCamel(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/task-labels?task_id=X&label_id=Y
router.delete('/', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { task_id, label_id } = req.query;

  if (!task_id || !label_id) {
    res.status(400).json({ error: 'task_id and label_id are required' });
    return;
  }

  try {
    await pool.query(
      'DELETE FROM task_labels WHERE user_id = $1 AND task_id = $2 AND label_id = $3',
      [userId, task_id, label_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
