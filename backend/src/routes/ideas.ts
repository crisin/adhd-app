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

// GET /api/ideas or GET /api/ideas?processed=false
router.get('/', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { processed } = req.query;

  try {
    let result;
    if (processed === 'false') {
      result = await pool.query(
        'SELECT * FROM ideas WHERE user_id = $1 AND processed = false ORDER BY created_at DESC',
        [userId]
      );
    } else {
      result = await pool.query(
        'SELECT * FROM ideas WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
    }
    res.json(result.rows.map(toCamel));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/ideas
router.post('/', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { content } = req.body;

  if (!content) {
    res.status(400).json({ error: 'content is required' });
    return;
  }

  const id = uuid();
  const now = Date.now();

  try {
    const result = await pool.query(
      'INSERT INTO ideas (id, user_id, content, processed, created_at) VALUES ($1,$2,$3,false,$4) RETURNING *',
      [id, userId, content.trim(), now]
    );
    res.status(201).json(toCamel(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/ideas/:id
router.patch('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;

  const setClauses: string[] = [];
  const values: any[] = [userId, id];
  let paramIdx = 3;

  const { content, processed } = req.body;

  if (content !== undefined) {
    setClauses.push(`content = $${paramIdx}`);
    values.push(content.trim());
    paramIdx++;
  }
  if (processed !== undefined) {
    setClauses.push(`processed = $${paramIdx}`);
    values.push(processed);
    paramIdx++;
  }

  if (setClauses.length === 0) {
    res.status(400).json({ error: 'No valid fields to update' });
    return;
  }

  try {
    const result = await pool.query(
      `UPDATE ideas SET ${setClauses.join(', ')} WHERE user_id = $1 AND id = $2 RETURNING *`,
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

// DELETE /api/ideas/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM ideas WHERE user_id = $1 AND id = $2 RETURNING id',
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

// POST /api/ideas/:id/to-task
router.post('/:id/to-task', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;
  const { status = 'today', category = null } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const ideaResult = await client.query(
      'SELECT * FROM ideas WHERE user_id = $1 AND id = $2',
      [userId, id]
    );
    if (ideaResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Idea not found' });
      return;
    }

    const idea = ideaResult.rows[0];
    const taskId = uuid();
    const now = Date.now();

    const taskResult = await client.query(
      `INSERT INTO tasks
        (id, user_id, title, status, category, sort_order, priority, source, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,'medium','idea-dump',$7) RETURNING *`,
      [taskId, userId, idea.content.trim(), status, category, now, now]
    );

    await client.query(
      'UPDATE ideas SET processed = true WHERE user_id = $1 AND id = $2',
      [userId, id]
    );

    await client.query('COMMIT');
    res.status(201).json(toCamel(taskResult.rows[0]));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

export default router;
