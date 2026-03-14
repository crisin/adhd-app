import { useDatabase } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import { useState, useEffect } from 'react';
import { Room } from '../db/models/Room';

export function useRooms() {
  const database = useDatabase();
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    const sub = database
      .get<Room>('rooms')
      .query(Q.sortBy('sort_order', Q.asc))
      .observe()
      .subscribe(setRooms);
    return () => sub.unsubscribe();
  }, [database]);

  return rooms;
}
