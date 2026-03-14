import { useDatabase } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import { useState, useEffect } from 'react';
import { Label } from '../db/models/Label';

export function useLabels() {
  const database = useDatabase();
  const [labels, setLabels] = useState<Label[]>([]);

  useEffect(() => {
    const sub = database
      .get<Label>('labels')
      .query(Q.sortBy('name', Q.asc))
      .observe()
      .subscribe(setLabels);
    return () => sub.unsubscribe();
  }, [database]);

  return labels;
}
