import { usePolling } from './usePolling';
import { api } from '../api/client';
import { toInventoryItem } from '../api/mappers';
import { InventoryItemObj, InventoryRoom } from '../api/types';

export function useInventoryItems(room: InventoryRoom | null = null): InventoryItemObj[] {
  const [items] = usePolling(
    () => {
      const url = room ? `/inventory?room_id=${encodeURIComponent(room)}` : '/inventory';
      return api.get<any[]>(url).then((rows) => rows.map(toInventoryItem));
    },
    []
  );
  return items;
}
