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

// GET /api/labels or GET /api/labels?task_id=X
router.get('/', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { task_id } = req.query;

  try {
    let result;
    if (task_id) {
      result = await pool.query(
        `SELECT l.* FROM labels l
         INNER JOIN task_labels tl ON tl.label_id = l.id AND tl.user_id = l.user_id
         WHERE l.user_id = $1 AND tl.task_id = $2
         ORDER BY l.name ASC`,
        [userId, task_id]
      );
    } else {
      result = await pool.query(
        'SELECT * FROM labels WHERE user_id = $1 ORDER BY name ASC',
        [userId]
      );
    }
    res.json(result.rows.map(toCamel));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/labels
router.post('/', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { name, color } = req.body;

  if (!name || !color) {
    res.status(400).json({ error: 'name and color are required' });
    return;
  }

  const id = uuid();
  const now = Date.now();

  try {
    const result = await pool.query(
      'INSERT INTO labels (id, user_id, name, color, created_at) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [id, userId, name.trim(), color, now]
    );
    res.status(201).json(toCamel(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/labels/:id
router.patch('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;
  const { name, color } = req.body;

  const setClauses: string[] = [];
  const values: any[] = [userId, id];
  let paramIdx = 3;

  if (name !== undefined) {
    setClauses.push(`name = $${paramIdx}`);
    values.push(name.trim());
    paramIdx++;
  }
  if (color !== undefined) {
    setClauses.push(`color = $${paramIdx}`);
    values.push(color);
    paramIdx++;
  }

  if (setClauses.length === 0) {
    res.status(400).json({ error: 'No valid fields to update' });
    return;
  }

  try {
    const result = await pool.query(
      `UPDATE labels SET ${setClauses.join(', ')} WHERE user_id = $1 AND id = $2 RETURNING *`,
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

// DELETE /api/labels/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM task_labels WHERE user_id = $1 AND label_id = $2', [userId, id]);
    const result = await pool.query(
      'DELETE FROM labels WHERE user_id = $1 AND id = $2 RETURNING id',
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
