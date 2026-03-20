import { usePolling } from './usePolling';
import { api } from '../api/client';
import { toLabel } from '../api/mappers';
import { LabelObj } from '../api/types';

export function useLabels(): LabelObj[] {
  const [labels] = usePolling(
    () => api.get<any[]>('/labels').then((rows) => rows.map(toLabel)),
    []
  );
  return labels;
}
