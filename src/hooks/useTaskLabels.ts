import { usePolling } from './usePolling';
import { api } from '../api/client';
import { toTaskLabel, toLabel } from '../api/mappers';
import { LabelObj } from '../api/types';

export function useTaskLabelIds(taskId: string): string[] {
  const [labelIds] = usePolling(
    () =>
      api
        .get<any[]>(`/task-labels?task_id=${encodeURIComponent(taskId)}`)
        .then((rows) => rows.map(toTaskLabel).map((tl) => tl.labelId)),
    []
  );
  return labelIds;
}

export function useLabelsForTask(taskId: string): LabelObj[] {
  const [labels] = usePolling(
    () =>
      api
        .get<any[]>(`/labels?task_id=${encodeURIComponent(taskId)}`)
        .then((rows) => rows.map(toLabel)),
    []
  );
  return labels;
}
