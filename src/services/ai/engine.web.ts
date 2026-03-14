import { Wllama } from '@wllama/wllama/esm';
import { AIEngine, AIEngineState, DecomposedTask, SYSTEM_PROMPT, TASK_CATEGORIES } from './types';

// Qwen 2.5 0.5B — small enough for fast WASM single-thread inference (~400 MB)
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

  async init(): Promise<void> {
    if (this.state.status === 'ready' || this.state.status === 'loading') return;

    this.setState({ status: 'loading', loadProgress: 0, error: null, statusMessage: 'Initializing WASM runtime...' });

    try {
      // Single-thread only — multi-thread needs COOP/COEP headers
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
        statusMessage: 'Model loaded — ready to decompose ideas',
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
      statusMessage: 'Processing prompt... 0s',
      tokensGenerated: 0,
      partialOutput: '',
    });

    this.startThinkingTimer();

    try {
      const grammar = buildJsonGrammar();
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
            grammar,
          },
          useCache: false,
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

      const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const parsed = JSON.parse(result);
      const sanitized = this.sanitize(parsed);
      const subtaskCount = sanitized.subtasks.length;

      this.setState({
        status: 'ready',
        statusMessage: `Done in ${totalElapsed}s — ${sanitized.title} + ${subtaskCount} subtask${subtaskCount !== 1 ? 's' : ''}`,
        tokensGenerated: tokenCount,
        partialOutput: '',
      });

      return sanitized;
    } catch (err: any) {
      this.stopThinkingTimer();
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
