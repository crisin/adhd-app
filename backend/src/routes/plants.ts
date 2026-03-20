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

// GET /api/plants
router.get('/', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;

  try {
    const result = await pool.query(
      'SELECT * FROM plants WHERE user_id = $1 ORDER BY name ASC',
      [userId]
    );
    res.json(result.rows.map(toCamel));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/plants
router.post('/', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const {
    name,
    wateringIntervalDays,
    species = null,
    location = null,
    notes = null,
    imageUri = null,
    roomId = null,
  } = req.body;

  if (!name || !wateringIntervalDays) {
    res.status(400).json({ error: 'name and wateringIntervalDays are required' });
    return;
  }

  const id = uuid();
  const now = Date.now();

  try {
    const result = await pool.query(
      `INSERT INTO plants (id, user_id, name, species, watering_interval_days, last_watered_at, location, notes, image_uri, room_id, created_at)
       VALUES ($1,$2,$3,$4,$5,NULL,$6,$7,$8,$9,$10) RETURNING *`,
      [id, userId, name.trim(), species, wateringIntervalDays, location, notes, imageUri, roomId, now]
    );
    res.status(201).json(toCamel(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/plants/:id
router.patch('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;

  const fieldMap: Record<string, string> = {
    wateringIntervalDays: 'watering_interval_days',
    lastWateredAt: 'last_watered_at',
    imageUri: 'image_uri',
    roomId: 'room_id',
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
      `UPDATE plants SET ${setClauses.join(', ')} WHERE user_id = $1 AND id = $2 RETURNING *`,
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

// DELETE /api/plants/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;

  try {
    await pool.query(
      'DELETE FROM calendar_events WHERE user_id = $1 AND plant_id = $2',
      [userId, id]
    );
    await pool.query(
      "DELETE FROM tasks WHERE user_id = $1 AND plant_id = $2 AND source = 'plant-reminder'",
      [userId, id]
    );
    const result = await pool.query(
      'DELETE FROM plants WHERE user_id = $1 AND id = $2 RETURNING id',
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

// POST /api/plants/:id/water
router.post('/:id/water', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'UPDATE plants SET last_watered_at = $3 WHERE user_id = $1 AND id = $2 RETURNING *',
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

// POST /api/plants/:id/water-schedule
router.post('/:id/water-schedule', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const now = Date.now();

    const plantResult = await client.query(
      'UPDATE plants SET last_watered_at = $3 WHERE user_id = $1 AND id = $2 RETURNING *',
      [userId, id, now]
    );
    if (plantResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Plant not found' });
      return;
    }

    const plant = plantResult.rows[0];
    const nextWaterDate = now + plant.watering_interval_days * 86400000;
    const eventId = uuid();

    await client.query(
      `INSERT INTO calendar_events
        (id, user_id, title, start_at, all_day, source, plant_id, created_at)
       VALUES ($1,$2,$3,$4,true,'plant-reminder',$5,$6)`,
      [eventId, userId, `Water ${plant.name}`, nextWaterDate, id, now]
    );

    await client.query('COMMIT');
    res.json(toCamel(plant));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

export default router;
