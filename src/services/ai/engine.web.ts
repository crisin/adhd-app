import { AIEngine, AIEngineState, AIStatus, DecomposedTask, SYSTEM_PROMPT, TASK_CATEGORIES } from './types';

// Model ID for WebLLM — Qwen 2.5 3B is the sweet spot for structured output quality
const MODEL_ID = 'Qwen2.5-3B-Instruct-q4f16_1-MLC';

class WebAIEngine implements AIEngine {
  private engine: any = null;
  private state: AIEngineState = { status: 'idle', loadProgress: 0, error: null };
  private listeners = new Set<(state: AIEngineState) => void>();

  getState(): AIEngineState {
    return this.state;
  }

  onStateChange(listener: (state: AIEngineState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setState(patch: Partial<AIEngineState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn(this.state));
  }

  isReady(): boolean {
    return this.state.status === 'ready';
  }

  async init(): Promise<void> {
    if (this.state.status === 'ready' || this.state.status === 'loading') return;

    this.setState({ status: 'loading', loadProgress: 0, error: null });

    try {
      const webllm = await import('@mlc-ai/web-llm');

      this.engine = await webllm.CreateMLCEngine(MODEL_ID, {
        initProgressCallback: (progress: any) => {
          // progress.progress is 0-1
          this.setState({ loadProgress: progress.progress ?? 0 });
        },
      });

      this.setState({ status: 'ready', loadProgress: 1 });
    } catch (err: any) {
      this.setState({
        status: 'error',
        error: err?.message ?? 'Failed to load AI model',
      });
      throw err;
    }
  }

  async decomposeIdea(text: string): Promise<DecomposedTask> {
    if (!this.engine) throw new Error('AI engine not initialized');

    this.setState({ status: 'generating' });

    try {
      const response = await this.engine.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content ?? '';
      const parsed = JSON.parse(content);

      // Validate and sanitize the response
      const result = this.sanitize(parsed);

      this.setState({ status: 'ready' });
      return result;
    } catch (err: any) {
      this.setState({ status: 'ready' }); // back to ready, not error — model is still loaded
      throw new Error(`AI generation failed: ${err?.message}`);
    }
  }

  private sanitize(raw: any): DecomposedTask {
    const validCategories = new Set(TASK_CATEGORIES);
    const validPriorities = new Set(['high', 'medium', 'low']);

    return {
      title: typeof raw.title === 'string' ? raw.title.slice(0, 100) : 'Untitled task',
      category: validCategories.has(raw.category) ? raw.category : null,
      priority: validPriorities.has(raw.priority) ? raw.priority : 'medium',
      estimatedMinutes: typeof raw.estimatedMinutes === 'number' ? raw.estimatedMinutes : null,
      subtasks: Array.isArray(raw.subtasks)
        ? raw.subtasks.slice(0, 8).map((s: any) => ({
            title: typeof s.title === 'string' ? s.title.slice(0, 100) : 'Subtask',
            estimatedMinutes: typeof s.estimatedMinutes === 'number' ? s.estimatedMinutes : null,
          }))
        : [],
    };
  }
}

export function createEngine(): AIEngine {
  return new WebAIEngine();
}
