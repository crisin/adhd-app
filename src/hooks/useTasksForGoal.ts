import { useDatabase } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import { Task } from '../db/models/Task';
import { useState, useEffect } from 'react';

export function useTasksForGoal(goalId: string) {
  const database = useDatabase();
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const sub = database
      .get<Task>('tasks')
      .query(Q.where('goal_id', goalId), Q.sortBy('sort_order', Q.asc))
      .observe()
      .subscribe(setTasks);
    return () => sub.unsubscribe();
  }, [database, goalId]);

  return tasks;
}
