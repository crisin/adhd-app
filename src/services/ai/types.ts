import { TaskCategory, TaskPriority } from '../../db/models/Task';

export interface DecomposedTask {
  title: string;
  category: TaskCategory | null;
  priority: TaskPriority;
  estimatedMinutes: number | null;
  subtasks: { title: string; estimatedMinutes: number | null }[];
}

export type AIStatus = 'idle' | 'loading' | 'ready' | 'generating' | 'error';

export interface AIEngineState {
  status: AIStatus;
  loadProgress: number;
  error: string | null;
  statusMessage: string;
  tokensGenerated: number;
  partialOutput: string;
}

export interface AIEngine {
  getState(): AIEngineState;
  onStateChange(listener: (state: AIEngineState) => void): () => void;
  init(): Promise<void>;
  decomposeIdea(text: string): Promise<DecomposedTask>;
  cancelGeneration(): void;
  isReady(): boolean;
}

export const TASK_CATEGORIES = ['private', 'school', 'work', 'health', 'finance', 'other'] as const;

export const SYSTEM_PROMPT = `Break the user's idea into a task with subtasks. Reply with JSON only.
{"title":"short task name","category":"private|school|work|health|finance|other","priority":"high|medium|low","estimatedMinutes":number,"subtasks":[{"title":"verb + action","estimatedMinutes":number}]}
Rules: 2-5 subtasks, each starting with a verb. Realistic minute estimates.`;
