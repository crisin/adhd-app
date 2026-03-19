import { usePolling } from './usePolling';
import { api } from '../api/client';
import { toRoom } from '../api/mappers';
import { RoomObj } from '../api/types';

export function useRooms(): RoomObj[] {
  const [rooms] = usePolling(
    () => api.get<any[]>('/rooms').then((rows) => rows.map(toRoom)),
    []
  );
  return rooms;
}
