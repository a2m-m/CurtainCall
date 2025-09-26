import { describe, expect, it, vi } from 'vitest';
import { Store } from '../src/state.js';

describe('Store', () => {
  it('subscribeは登録時に最新状態を即時通知し、解除後は通知しない', () => {
    const store = new Store({ value: 1 });
    const listener = vi.fn();

    const unsubscribe = store.subscribe(listener);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith({ value: 1 });

    store.setState({ value: 2 });
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith({ value: 2 });

    unsubscribe();
    store.setState({ value: 3 });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('setStateは同一参照を維持した場合に通知しない', () => {
    const initial = { value: 0 };
    const store = new Store(initial);
    const snapshots: Array<{ value: number }> = [];
    store.subscribe((state) => snapshots.push(state));

    store.setState((current) => current);
    expect(snapshots).toHaveLength(1);

    store.patch({ value: 5 });
    expect(snapshots).toHaveLength(2);
    expect(snapshots[1]).toEqual({ value: 5 });
    expect(store.getState()).toEqual({ value: 5 });
  });
});
