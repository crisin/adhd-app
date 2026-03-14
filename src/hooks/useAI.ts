import { useState, useEffect, useRef, useCallback } from 'react';
import { createEngine, AIEngine, AIEngineState, DecomposedTask } from '../services/ai';

// Singleton engine — model stays loaded across screens
let engineInstance: AIEngine | null = null;

function getEngine(): AIEngine {
  if (!engineInstance) {
    engineInstance = createEngine();
  }
  return engineInstance;
}

export function useAI() {
  const engine = useRef(getEngine());
  const [state, setState] = useState<AIEngineState>(engine.current.getState());
  const [result, setResult] = useState<DecomposedTask | null>(null);

  useEffect(() => {
    return engine.current.onStateChange(setState);
  }, []);

  const initModel = useCallback(async () => {
    try {
      await engine.current.init();
    } catch (_e) {
      // Error is captured in state
    }
  }, []);

  const decompose = useCallback(async (text: string): Promise<DecomposedTask> => {
    if (!engine.current.isReady()) {
      await engine.current.init();
    }
    const decomposed = await engine.current.decomposeIdea(text);
    setResult(decomposed);
    return decomposed;
  }, []);

  const cancel = useCallback(() => {
    engine.current.cancelGeneration();
  }, []);

  const clearResult = useCallback(() => setResult(null), []);

  return {
    ...state,
    result,
    initModel,
    decompose,
    cancel,
    clearResult,
    isReady: state.status === 'ready',
    isLoading: state.status === 'loading',
    isGenerating: state.status === 'generating',
  };
}
