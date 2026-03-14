import { useDatabase } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import { useState, useEffect } from 'react';
import { Subtask } from '../db/models/Subtask';

export function useSubtasks(taskId: string) {
  const database = useDatabase();
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);

  useEffect(() => {
    const sub = database
      .get<Subtask>('subtasks')
      .query(Q.where('task_id', taskId), Q.sortBy('sort_order', Q.asc))
      .observe()
      .subscribe(setSubtasks);
    return () => sub.unsubscribe();
  }, [database, taskId]);

  return subtasks;
}
