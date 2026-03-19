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

// GET /api/inventory or GET /api/inventory?room_id=X
router.get('/', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { room_id } = req.query;

  try {
    let result;
    if (room_id) {
      result = await pool.query(
        'SELECT * FROM inventory_items WHERE user_id = $1 AND room_id = $2 ORDER BY name ASC',
        [userId, room_id]
      );
    } else {
      result = await pool.query(
        'SELECT * FROM inventory_items WHERE user_id = $1 ORDER BY name ASC',
        [userId]
      );
    }
    res.json(result.rows.map(toCamel));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/inventory
router.post('/', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const {
    name,
    room,
    location = null,
    quantity = 1,
    notes = null,
    imageUri = null,
    roomId = null,
  } = req.body;

  if (!name || !room) {
    res.status(400).json({ error: 'name and room are required' });
    return;
  }

  const id = uuid();
  const now = Date.now();

  try {
    const result = await pool.query(
      `INSERT INTO inventory_items (id, user_id, name, room, location, quantity, notes, image_uri, room_id, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) RETURNING *`,
      [id, userId, name.trim(), room, location, quantity, notes, imageUri, roomId, now]
    );
    res.status(201).json(toCamel(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/inventory/:id
router.patch('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;

  const fieldMap: Record<string, string> = {
    imageUri: 'image_uri',
    roomId: 'room_id',
    updatedAt: 'updated_at',
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

  // Always update updated_at
  setClauses.push(`updated_at = $${paramIdx}`);
  values.push(Date.now());
  paramIdx++;

  if (setClauses.length === 0) {
    res.status(400).json({ error: 'No valid fields to update' });
    return;
  }

  try {
    const result = await pool.query(
      `UPDATE inventory_items SET ${setClauses.join(', ')} WHERE user_id = $1 AND id = $2 RETURNING *`,
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

// DELETE /api/inventory/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM inventory_items WHERE user_id = $1 AND id = $2 RETURNING id',
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
