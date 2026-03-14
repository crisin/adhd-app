import { useDatabase } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import { Idea } from '../db/models/Idea';
import { useState, useEffect } from 'react';

export function useIdeas(showProcessed = false) {
  const database = useDatabase();
  const [ideas, setIdeas] = useState<Idea[]>([]);

  useEffect(() => {
    const query = showProcessed
      ? database.get<Idea>('ideas').query(Q.sortBy('created_at', Q.desc))
      : database.get<Idea>('ideas').query(Q.where('processed', false), Q.sortBy('created_at', Q.desc));

    const sub = query.observe().subscribe(setIdeas);
    return () => sub.unsubscribe();
  }, [database, showProcessed]);

  return ideas;
}
