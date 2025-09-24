export type PhaseKey =
  | 'home'
  | 'standby'
  | 'scout'
  | 'action'
  | 'watch'
  | 'spotlight'
  | 'intermission'
  | 'curtaincall';

export interface GameState extends Record<string, unknown> {
  phase: PhaseKey;
  route: string;
  revision: number;
  updatedAt: number;
}

export type StateListener<TState> = (state: TState) => void;
export type StateUpdater<TState> = (state: TState) => TState;

export class Store<TState extends Record<string, unknown>> {
  private state: TState;
  private readonly listeners = new Set<StateListener<TState>>();

  constructor(initialState: TState) {
    this.state = initialState;
  }

  getState(): TState {
    return this.state;
  }

  setState(next: TState | StateUpdater<TState>): void {
    const value = typeof next === 'function' ? (next as StateUpdater<TState>)(this.state) : next;
    if (Object.is(value, this.state)) {
      return;
    }
    this.state = value;
    this.emit();
  }

  patch(patch: Partial<TState>): void {
    this.setState({
      ...this.state,
      ...patch,
    });
  }

  subscribe(listener: StateListener<TState>): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}

export const createInitialState = (): GameState => ({
  phase: 'home',
  route: '#/',
  revision: 0,
  updatedAt: Date.now(),
});

export const gameStore = new Store<GameState>(createInitialState());
