import { create } from 'zustand';

interface TaskStore {
  activeTaskId: string | null;
  setActiveTaskId: (id: string | null) => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  activeTaskId: null,
  setActiveTaskId: (id) => set({ activeTaskId: id }),
}));
