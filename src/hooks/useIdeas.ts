import { usePolling } from './usePolling';
import { api } from '../api/client';
import { toIdea } from '../api/mappers';
import { IdeaObj } from '../api/types';

export function useIdeas(showProcessed = false): IdeaObj[] {
  const [ideas] = usePolling(
    () => {
      const url = showProcessed ? '/ideas' : '/ideas?processed=false';
      return api.get<any[]>(url).then((rows) => rows.map(toIdea));
    },
    []
  );
  return ideas;
}
