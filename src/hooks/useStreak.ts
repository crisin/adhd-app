import { useDatabase } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import { Task } from '../db/models/Task';
import { useState, useEffect } from 'react';

function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export function useStreak(): { streak: number; todayCount: number } {
  const database = useDatabase();
  const [streak, setStreak] = useState(0);
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => {
    const sub = database
      .get<Task>('tasks')
      .query(Q.where('status', 'done'), Q.sortBy('completed_at', Q.desc))
      .observe()
      .subscribe((tasks) => {
        const todayStart = startOfDay(new Date());
        const done = tasks.filter((t) => t.completedAt != null);

        // Count completed today
        setTodayCount(done.filter((t) => t.completedAt!.getTime() >= todayStart).length);

        // Calculate streak (consecutive days with ≥1 completed task)
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
      });
    return () => sub.unsubscribe();
  }, [database]);

  return { streak, todayCount };
}
