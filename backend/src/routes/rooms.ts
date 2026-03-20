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

// GET /api/rooms
router.get('/', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;

  try {
    const result = await pool.query(
      'SELECT * FROM rooms WHERE user_id = $1 ORDER BY sort_order ASC',
      [userId]
    );
    res.json(result.rows.map(toCamel));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/rooms
router.post('/', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { name, emoji = null, color = null, parentId = null } = req.body;

  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const id = uuid();
  const now = Date.now();

  try {
    const result = await pool.query(
      'INSERT INTO rooms (id, user_id, name, emoji, color, sort_order, parent_id, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [id, userId, name.trim(), emoji, color, now, parentId, now]
    );
    res.status(201).json(toCamel(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/rooms/:id
router.patch('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;

  const fieldMap: Record<string, string> = {
    parentId: 'parent_id',
    sortOrder: 'sort_order',
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
      `UPDATE rooms SET ${setClauses.join(', ')} WHERE user_id = $1 AND id = $2 RETURNING *`,
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

// DELETE /api/rooms/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;

  try {
    // Nullify room_id on inventory_items and plants
    await pool.query(
      'UPDATE inventory_items SET room_id = NULL WHERE user_id = $1 AND room_id = $2',
      [userId, id]
    );
    await pool.query(
      'UPDATE plants SET room_id = NULL WHERE user_id = $1 AND room_id = $2',
      [userId, id]
    );

    const result = await pool.query(
      'DELETE FROM rooms WHERE user_id = $1 AND id = $2 RETURNING id',
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
