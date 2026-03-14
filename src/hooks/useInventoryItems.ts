import { useDatabase } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import { useState, useEffect } from 'react';
import { InventoryItem, InventoryRoom } from '../db/models/InventoryItem';

export function useInventoryItems(room: InventoryRoom | null = null) {
  const database = useDatabase();
  const [items, setItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    const query = room
      ? database.get<InventoryItem>('inventory_items').query(Q.where('room', room), Q.sortBy('name', Q.asc))
      : database.get<InventoryItem>('inventory_items').query(Q.sortBy('name', Q.asc));

    const sub = query.observe().subscribe(setItems);
    return () => sub.unsubscribe();
  }, [database, room]);

  return items;
}
