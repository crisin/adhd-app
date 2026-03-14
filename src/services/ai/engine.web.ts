import { Wllama } from '@wllama/wllama/esm';
import { AIEngine, AIEngineState, DecomposedTask, SYSTEM_PROMPT, TASK_CATEGORIES } from './types';

// Qwen 2.5 3B Instruct Q4_K_M — good structured output, ~2 GB download
const MODEL_REPO = 'Qwen/Qwen2.5-3B-Instruct-GGUF';
const MODEL_FILE = 'qwen2.5-3b-instruct-q4_k_m.gguf';

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

    this.setState({ status: 'loading', loadProgress: 0, error: null, statusMessage: 'Initializing WASM runtime...' });

    try {
      const wasmPaths = {
        'single-thread/wllama.wasm': '/wllama/single-thread.wasm',
        'multi-thread/wllama.wasm': '/wllama/multi-thread.wasm',
      };

      this.setState({ statusMessage: 'Loading WebAssembly engine...' });

      this.wllama = new Wllama(wasmPaths, {
        allowOffline: true,
        suppressNativeLog: true,
      });

      const nThreads = navigator.hardwareConcurrency
        ? Math.min(navigator.hardwareConcurrency, 4)
        : 2;

      this.setState({ statusMessage: `Downloading model (Qwen 2.5 3B)...`, loadProgress: 0.01 });

      await this.wllama.loadModelFromHF(MODEL_REPO, MODEL_FILE, {
        n_ctx: 2048,
        n_threads: nThreads,
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
        statusMessage: `Model loaded (${nThreads} threads)`,
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

    this.setState({
      status: 'generating',
      statusMessage: 'Preparing prompt...',
      tokensGenerated: 0,
      partialOutput: '',
    });

    try {
      const grammar = buildJsonGrammar();
      let tokenCount = 0;
      const startTime = Date.now();

      this.setState({ statusMessage: 'Thinking...' });

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
          onNewToken: (_token: number, _piece: Uint8Array, currentText: string) => {
            tokenCount++;
            const elapsed = (Date.now() - startTime) / 1000;
            const tokPerSec = elapsed > 0 ? (tokenCount / elapsed).toFixed(1) : '...';
            this.setState({
              tokensGenerated: tokenCount,
              partialOutput: currentText,
              statusMessage: `Generating... ${tokenCount} tokens (${tokPerSec} tok/s)`,
            });
          },
        }
      );

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const parsed = JSON.parse(result);
      const sanitized = this.sanitize(parsed);
      const subtaskCount = sanitized.subtasks.length;

      this.setState({
        status: 'ready',
        statusMessage: `Done! ${tokenCount} tokens in ${elapsed}s \u2014 ${sanitized.title} + ${subtaskCount} subtask${subtaskCount !== 1 ? 's' : ''}`,
        tokensGenerated: tokenCount,
        partialOutput: '',
      });

      return sanitized;
    } catch (err: any) {
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

/**
 * GBNF grammar that constrains output to our exact JSON schema.
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
