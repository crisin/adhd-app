import { Wllama } from '@wllama/wllama/esm';
import { AIEngine, AIEngineState, DecomposedTask, SYSTEM_PROMPT, TASK_CATEGORIES } from './types';

// Qwen 2.5 0.5B — small enough for fast WASM single-thread inference (~530 MB)
const MODEL_REPO = 'Qwen/Qwen2.5-0.5B-Instruct-GGUF';
const MODEL_FILE = 'qwen2.5-0.5b-instruct-q8_0.gguf';

const INITIAL_STATE: AIEngineState = {
  status: 'idle',
  loadProgress: 0,
  error: null,
  statusMessage: 'AI ready to load',
  tokensGenerated: 0,
  partialOutput: '',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

class WllamaEngine implements AIEngine {
  private wllama: any = null;
  private state: AIEngineState = { ...INITIAL_STATE };
  private listeners = new Set<(state: AIEngineState) => void>();
  private thinkingTimer: ReturnType<typeof setInterval> | null = null;
  private abortController: AbortController | null = null;

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

  private startThinkingTimer() {
    const start = Date.now();
    this.thinkingTimer = setInterval(() => {
      const elapsed = ((Date.now() - start) / 1000).toFixed(0);
      this.setState({ statusMessage: `Processing prompt... ${elapsed}s` });
    }, 500);
  }

  private stopThinkingTimer() {
    if (this.thinkingTimer) {
      clearInterval(this.thinkingTimer);
      this.thinkingTimer = null;
    }
  }

  isReady(): boolean {
    return this.state.status === 'ready';
  }

  cancelGeneration(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.stopThinkingTimer();
    this.setState({
      status: 'ready',
      statusMessage: 'Cancelled',
      partialOutput: '',
      tokensGenerated: 0,
    });
  }

  async init(): Promise<void> {
    if (this.state.status === 'ready' || this.state.status === 'loading') return;

    this.setState({ status: 'loading', loadProgress: 0, error: null, statusMessage: 'Initializing WASM runtime...' });

    try {
      const wasmPaths = {
        'single-thread/wllama.wasm': '/wllama/single-thread.wasm',
      };

      this.setState({ statusMessage: 'Loading WebAssembly engine...' });

      this.wllama = new Wllama(wasmPaths, {
        allowOffline: true,
        suppressNativeLog: true,
      });

      this.setState({ statusMessage: 'Downloading model (Qwen 2.5 0.5B)...', loadProgress: 0.01 });

      await this.wllama.loadModelFromHF(MODEL_REPO, MODEL_FILE, {
        n_ctx: 1024,
        progressCallback: ({ loaded, total }: { loaded: number; total: number }) => {
          if (total > 0) {
            const pct = loaded / total;
            this.setState({
              loadProgress: pct,
              statusMessage: `Downloading model... ${formatBytes(loaded)} / ${formatBytes(total)} (${Math.round(pct * 100)}%)`,
            });
          }
        },
      });

      this.setState({
        status: 'ready',
        loadProgress: 1,
        statusMessage: 'Model loaded',
      });
    } catch (err: any) {
      this.setState({
        status: 'error',
        error: err?.message ?? 'Failed to load AI model',
        statusMessage: `Error: ${err?.message ?? 'Unknown error'}`,
      });
      throw err;
    }
  }

  async decomposeIdea(text: string): Promise<DecomposedTask> {
    if (!this.wllama) throw new Error('AI engine not initialized');

    this.abortController = new AbortController();

    this.setState({
      status: 'generating',
      statusMessage: 'Processing prompt... 0s',
      tokensGenerated: 0,
      partialOutput: '',
    });

    this.startThinkingTimer();

    try {
      let tokenCount = 0;
      let firstTokenTime: number | null = null;
      const startTime = Date.now();

      const result = await this.wllama.createChatCompletion(
        [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
        {
          nPredict: 512,
          sampling: {
            temp: 0.3,
            top_p: 0.9,
          },
          useCache: false,
          abortSignal: this.abortController.signal,
          onNewToken: (_token: number, _piece: Uint8Array, currentText: string) => {
            if (tokenCount === 0) {
              this.stopThinkingTimer();
              firstTokenTime = Date.now();
              const promptTime = ((firstTokenTime - startTime) / 1000).toFixed(1);
              this.setState({ statusMessage: `Prompt processed in ${promptTime}s. Generating...` });
            }
            tokenCount++;
            const genElapsed = firstTokenTime ? (Date.now() - firstTokenTime) / 1000 : 0;
            const tokPerSec = genElapsed > 0 ? (tokenCount / genElapsed).toFixed(1) : '...';
            this.setState({
              tokensGenerated: tokenCount,
              partialOutput: currentText,
              statusMessage: `Generating... ${tokenCount} tokens (${tokPerSec} tok/s)`,
            });
          },
        }
      );

      this.stopThinkingTimer();
      this.abortController = null;

      const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      // Extract JSON from the response — model may wrap it in markdown
      const jsonStr = extractJson(result);
      const parsed = JSON.parse(jsonStr);
      const sanitized = this.sanitize(parsed);
      const subtaskCount = sanitized.subtasks.length;

      this.setState({
        status: 'ready',
        statusMessage: `Done in ${totalElapsed}s — ${subtaskCount} subtask${subtaskCount !== 1 ? 's' : ''}`,
        tokensGenerated: tokenCount,
        partialOutput: '',
      });

      return sanitized;
    } catch (err: any) {
      this.stopThinkingTimer();
      this.abortController = null;

      // Don't show error for user-initiated cancellation
      if (err?.name === 'AbortError' || err?.message?.includes('abort')) {
        this.setState({ status: 'ready', statusMessage: 'Cancelled' });
        throw err;
      }

      this.setState({
        status: 'ready',
        statusMessage: `Generation failed: ${err?.message}`,
      });
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

/** Pull the first {...} JSON object out of the model's response */
function extractJson(text: string): string {
  const start = text.indexOf('{');
  if (start === -1) throw new Error('No JSON found in response');
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') depth--;
    if (depth === 0) return text.slice(start, i + 1);
  }
  throw new Error('Incomplete JSON in response');
}

export function createEngine(): AIEngine {
  return new WllamaEngine();
}
