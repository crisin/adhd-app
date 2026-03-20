import { usePolling } from './usePolling';
import { api } from '../api/client';
import { toTask } from '../api/mappers';
import { TaskObj } from '../api/types';

export function useTasksForGoal(goalId: string): TaskObj[] {
  const [tasks] = usePolling(
    () => api.get<any[]>(`/tasks?goal_id=${encodeURIComponent(goalId)}`).then((rows) => rows.map(toTask)),
    []
  );
  return tasks;
}
