import { usePolling } from './usePolling';
import { api } from '../api/client';
import { toTask } from '../api/mappers';
import { TaskObj } from '../api/types';

export function useTodayTasks(): TaskObj[] {
  const [tasks] = usePolling(
    () => api.get<any[]>('/tasks?status=today,active').then((rows) => rows.map(toTask)),
    []
  );
  return tasks;
}
