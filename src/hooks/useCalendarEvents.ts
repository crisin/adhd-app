import { usePolling } from './usePolling';
import { api } from '../api/client';
import { toCalendarEvent } from '../api/mappers';
import { CalendarEventObj } from '../api/types';

export function useCalendarEvents(startMs: number, endMs: number): CalendarEventObj[] {
  const [events] = usePolling(
    () =>
      api
        .get<any[]>(`/calendar?start=${startMs}&end=${endMs}`)
        .then((rows) => rows.map(toCalendarEvent)),
    []
  );
  return events;
}

export function useCalendarEventsForDay(date: Date): CalendarEventObj[] {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return useCalendarEvents(start.getTime(), end.getTime());
}
