// Native mobile AI engine — stub for now
// Will be replaced with react-native-executorch or llama.rn when
// the project switches from Expo Go to a custom dev client.

import { AIEngine, AIEngineState, DecomposedTask } from './types';

class NativeAIEngine implements AIEngine {
  private state: AIEngineState = { status: 'error', loadProgress: 0, error: 'Local AI not yet available on native. Use the web app for AI features.' };
  private listeners = new Set<(state: AIEngineState) => void>();

  getState(): AIEngineState {
    return this.state;
  }

  onStateChange(listener: (state: AIEngineState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  isReady(): boolean {
    return false;
  }

  async init(): Promise<void> {
    // No-op on native until we add llama.rn or executorch
  }

  async decomposeIdea(_text: string): Promise<DecomposedTask> {
    throw new Error('Local AI not yet available on native');
  }
}

export function createEngine(): AIEngine {
  return new NativeAIEngine();
}
