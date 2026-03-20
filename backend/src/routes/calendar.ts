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

// GET /api/calendar?start=X&end=Y
router.get('/', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { start, end } = req.query;

  try {
    let result;
    if (start && end) {
      result = await pool.query(
        'SELECT * FROM calendar_events WHERE user_id = $1 AND start_at >= $2 AND start_at <= $3 ORDER BY start_at ASC',
        [userId, Number(start), Number(end)]
      );
    } else {
      result = await pool.query(
        'SELECT * FROM calendar_events WHERE user_id = $1 ORDER BY start_at ASC',
        [userId]
      );
    }
    res.json(result.rows.map(toCamel));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/calendar
router.post('/', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const {
    title,
    startAt,
    description = null,
    endAt = null,
    allDay = false,
    recurrenceRule = null,
    source = 'manual',
    taskId = null,
    plantId = null,
    deviceEventId = null,
  } = req.body;

  if (!title || startAt === undefined) {
    res.status(400).json({ error: 'title and startAt are required' });
    return;
  }

  const id = uuid();
  const now = Date.now();

  try {
    const result = await pool.query(
      `INSERT INTO calendar_events
        (id, user_id, title, description, start_at, end_at, all_day, recurrence_rule, source, task_id, plant_id, device_event_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [id, userId, title.trim(), description, startAt, endAt, allDay, recurrenceRule, source, taskId, plantId, deviceEventId, now]
    );
    res.status(201).json(toCamel(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/calendar/:id
router.patch('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;

  const fieldMap: Record<string, string> = {
    startAt: 'start_at',
    endAt: 'end_at',
    allDay: 'all_day',
    recurrenceRule: 'recurrence_rule',
    taskId: 'task_id',
    plantId: 'plant_id',
    deviceEventId: 'device_event_id',
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
      `UPDATE calendar_events SET ${setClauses.join(', ')} WHERE user_id = $1 AND id = $2 RETURNING *`,
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

// DELETE /api/calendar/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM calendar_events WHERE user_id = $1 AND id = $2 RETURNING id',
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
