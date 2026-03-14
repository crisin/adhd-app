import { useDatabase } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import { useState, useEffect } from 'react';
import { CalendarEvent } from '../db/models/CalendarEvent';

export function useCalendarEvents(startMs: number, endMs: number) {
  const database = useDatabase();
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const sub = database
      .get<CalendarEvent>('calendar_events')
      .query(
        Q.and(
          Q.where('start_at', Q.gte(startMs)),
          Q.where('start_at', Q.lte(endMs))
        ),
        Q.sortBy('start_at', Q.asc)
      )
      .observe()
      .subscribe(setEvents);
    return () => sub.unsubscribe();
  }, [database, startMs, endMs]);

  return events;
}

export function useCalendarEventsForDay(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return useCalendarEvents(start.getTime(), end.getTime());
}
