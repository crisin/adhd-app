import { AIEngine, AIEngineState, DecomposedTask, SYSTEM_PROMPT, TASK_CATEGORIES } from './types';

// Qwen 2.5 3B Instruct Q4_K_M — good structured output, ~2 GB download
const MODEL_REPO = 'Qwen/Qwen2.5-3B-Instruct-GGUF';
const MODEL_FILE = 'qwen2.5-3b-instruct-q4_k_m.gguf';

class WllamaEngine implements AIEngine {
  private wllama: any = null;
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
      const { Wllama } = await import('@wllama/wllama');

      // WASM files are served as static assets from /public/wllama/
      const wasmPaths = {
        'single-thread/wllama.wasm': '/wllama/single-thread.wasm',
        'multi-thread/wllama.wasm': '/wllama/multi-thread.wasm',
      };

      this.wllama = new Wllama(wasmPaths, {
        allowOffline: true,
        suppressNativeLog: true,
      });

      await this.wllama.loadModelFromHF(MODEL_REPO, MODEL_FILE, {
        n_ctx: 2048,
        n_threads: navigator.hardwareConcurrency
          ? Math.min(navigator.hardwareConcurrency, 4)
          : 2,
        progressCallback: ({ loaded, total }: { loaded: number; total: number }) => {
          if (total > 0) {
            this.setState({ loadProgress: loaded / total });
          }
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
    if (!this.wllama) throw new Error('AI engine not initialized');

    this.setState({ status: 'generating' });

    try {
      // Build JSON grammar to constrain output
      const grammar = buildJsonGrammar();

      const result = await this.wllama.createChatCompletion(
        [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
        {
          nPredict: 1024,
          sampling: {
            temp: 0.3,
            top_p: 0.9,
            grammar,
          },
          useCache: false,
        }
      );

      const parsed = JSON.parse(result);
      const sanitized = this.sanitize(parsed);

      this.setState({ status: 'ready' });
      return sanitized;
    } catch (err: any) {
      this.setState({ status: 'ready' });
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

/**
 * GBNF grammar that constrains output to our exact JSON schema.
 * This ensures the model always produces valid, parseable JSON.
 */
function buildJsonGrammar(): string {
  return String.raw`
root ::= "{" ws "\"title\"" ws ":" ws string "," ws "\"category\"" ws ":" ws category "," ws "\"priority\"" ws ":" ws priority "," ws "\"estimatedMinutes\"" ws ":" ws number "," ws "\"subtasks\"" ws ":" ws "[" ws subtask ("," ws subtask)* ws "]" ws "}"
category ::= "\"private\"" | "\"school\"" | "\"work\"" | "\"health\"" | "\"finance\"" | "\"other\""
priority ::= "\"high\"" | "\"medium\"" | "\"low\""
subtask ::= "{" ws "\"title\"" ws ":" ws string "," ws "\"estimatedMinutes\"" ws ":" ws number ws "}"
string ::= "\"" ([^"\\] | "\\" .)* "\""
number ::= [0-9]+
ws ::= [ \t\n]*
`.trim();
}

export function createEngine(): AIEngine {
  return new WllamaEngine();
}
