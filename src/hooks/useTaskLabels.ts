import { useDatabase } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import { useState, useEffect } from 'react';
import { TaskLabel } from '../db/models/TaskLabel';
import { Label } from '../db/models/Label';

export function useTaskLabelIds(taskId: string) {
  const database = useDatabase();
  const [labelIds, setLabelIds] = useState<string[]>([]);

  useEffect(() => {
    const sub = database
      .get<TaskLabel>('task_labels')
      .query(Q.where('task_id', taskId))
      .observe()
      .subscribe((tls) => setLabelIds(tls.map((tl) => tl.labelId)));
    return () => sub.unsubscribe();
  }, [database, taskId]);

  return labelIds;
}

export function useLabelsForTask(taskId: string) {
  const database = useDatabase();
  const [labels, setLabels] = useState<Label[]>([]);

  useEffect(() => {
    const sub = database
      .get<TaskLabel>('task_labels')
      .query(Q.where('task_id', taskId))
      .observe()
      .subscribe(async (tls) => {
        if (tls.length === 0) {
          setLabels([]);
          return;
        }
        const ids = tls.map((tl) => tl.labelId);
        const found = await database
          .get<Label>('labels')
          .query(Q.where('id', Q.oneOf(ids)))
          .fetch();
        setLabels(found);
      });
    return () => sub.unsubscribe();
  }, [database, taskId]);

  return labels;
}
