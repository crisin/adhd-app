import { usePolling } from './usePolling';
import { api } from '../api/client';
import { toGoal } from '../api/mappers';
import { GoalObj } from '../api/types';

export function useGoals(): GoalObj[] {
  const [goals] = usePolling(
    () => api.get<any[]>('/goals?status=active').then((rows) => rows.map(toGoal)),
    []
  );
  return goals;
}
