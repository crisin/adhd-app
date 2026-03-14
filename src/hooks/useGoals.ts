import { useDatabase } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import { Goal } from '../db/models/Goal';
import { useState, useEffect } from 'react';

export function useGoals() {
  const database = useDatabase();
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    const sub = database
      .get<Goal>('goals')
      .query(Q.where('status', 'active'), Q.sortBy('sort_order', Q.asc))
      .observe()
      .subscribe(setGoals);
    return () => sub.unsubscribe();
  }, [database]);

  return goals;
}
