import { usePolling } from './usePolling';
import { api } from '../api/client';
import { toPlant } from '../api/mappers';
import { PlantObj } from '../api/types';

export function usePlants(): PlantObj[] {
  const [plants] = usePolling(
    () => api.get<any[]>('/plants').then((rows) => rows.map(toPlant)),
    []
  );
  return plants;
}
