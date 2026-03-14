import { useDatabase } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import { useState, useEffect } from 'react';
import { Plant } from '../db/models/Plant';

export function usePlants() {
  const database = useDatabase();
  const [plants, setPlants] = useState<Plant[]>([]);

  useEffect(() => {
    const sub = database
      .get<Plant>('plants')
      .query(Q.sortBy('name', Q.asc))
      .observe()
      .subscribe(setPlants);
    return () => sub.unsubscribe();
  }, [database]);

  return plants;
}
