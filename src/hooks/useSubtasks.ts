import { usePolling } from './usePolling';
import { api } from '../api/client';
import { toSubtask } from '../api/mappers';
import { SubtaskObj } from '../api/types';

export function useSubtasks(taskId: string): SubtaskObj[] {
  const [subtasks] = usePolling(
    () => api.get<any[]>(`/subtasks?task_id=${encodeURIComponent(taskId)}`).then((rows) => rows.map(toSubtask)),
    []
  );
  return subtasks;
}
