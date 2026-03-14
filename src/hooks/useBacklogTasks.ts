import { useDatabase } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import { Task } from '../db/models/Task';
import { useState, useEffect } from 'react';

export function useBacklogTasks(): Task[] {
  const database = useDatabase();
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const sub = database
      .get<Task>('tasks')
      .query(Q.where('status', 'backlog'), Q.sortBy('sort_order', Q.asc))
      .observe()
      .subscribe(setTasks);
    return () => sub.unsubscribe();
  }, [database]);

  return tasks;
}
