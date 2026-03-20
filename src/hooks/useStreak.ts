import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api/client';
import { toTask } from '../api/mappers';

function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export function useStreak(): { streak: number; todayCount: number } {
  const [streak, setStreak] = useState(0);
  const [todayCount, setTodayCount] = useState(0);

  const compute = useCallback(() => {
    api
      .get<any[]>('/tasks?status=done')
      .then((rows) => rows.map(toTask))
      .then((tasks) => {
        const todayStart = startOfDay(new Date());
        const done = tasks.filter((t) => t.completedAt != null);

        setTodayCount(done.filter((t) => t.completedAt!.getTime() >= todayStart).length);

        let currentStreak = 0;
        let checkDay = todayStart;
        while (true) {
          const dayEnd = checkDay + 86400000;
          const hasTask = done.some(
            (t) => t.completedAt!.getTime() >= checkDay && t.completedAt!.getTime() < dayEnd
          );
          if (!hasTask) break;
          currentStreak++;
          checkDay -= 86400000;
        }
        setStreak(currentStreak);
      })
      .catch(console.error);
  }, []);

  const computeRef = useRef(compute);
  computeRef.current = compute;

  useEffect(() => {
    computeRef.current();
    const id = setInterval(() => computeRef.current(), 2000);
    return () => clearInterval(id);
  }, []);

  return { streak, todayCount };
}
