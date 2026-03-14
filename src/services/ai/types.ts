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
  isReady(): boolean;
}

export const TASK_CATEGORIES = ['private', 'school', 'work', 'health', 'finance', 'other'] as const;

export const SYSTEM_PROMPT = `You are a task decomposition assistant for an ADHD productivity app. Given a rough idea or thought, break it down into a clear, actionable main task with concrete subtasks.

Rules:
- Keep the main task title concise (under 60 chars)
- Create 2-6 subtasks, each a single concrete action
- Subtask titles should start with a verb
- Estimate minutes realistically (5, 10, 15, 20, 30, 45, 60, 90, 120)
- Pick the best category: private, school, work, health, finance, or other
- Set priority: high (urgent/important), medium (normal), low (nice-to-have)
- If the idea is already a simple single task, still return 1-2 subtasks

Respond ONLY with valid JSON matching this exact schema:
{
  "title": "string",
  "category": "private|school|work|health|finance|other",
  "priority": "high|medium|low",
  "estimatedMinutes": number,
  "subtasks": [
    { "title": "string", "estimatedMinutes": number }
  ]
}`;
