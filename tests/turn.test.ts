import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  REQUIRED_BOO_COUNT,
  type GameState,
  type PlayerId,
} from '../src/state.js';
import {
  resolveNextIntermissionActivePlayer,
  resolveTurnPresenter,
  resolveTurnWatcher,
} from '../src/turn.js';

const createState = (activePlayer: PlayerId, configure?: (state: GameState) => void): GameState => {
  const state = createInitialState();
  state.activePlayer = activePlayer;
  state.turn.presenter = activePlayer;
  state.turn.watcher = activePlayer === 'lumina' ? 'nox' : 'lumina';
  if (configure) {
    configure(state);
  }
  return state;
};

describe('resolveNextIntermissionActivePlayer', () => {
  it('インターミッション突入ごとに手番が交互に切り替わる', () => {
    const luminaTurn = createState('lumina');
    expect(resolveNextIntermissionActivePlayer(luminaTurn)).toBe('nox');

    const noxTurn = createState('nox');
    expect(resolveNextIntermissionActivePlayer(noxTurn)).toBe('lumina');
  });

  it('ブーイング成功時でも次手番は相手プレイヤーになる', () => {
    const state = createState('lumina', (draft) => {
      draft.turn.presenter = 'lumina';
      draft.turn.watcher = 'nox';
      draft.watch.decision = 'boo';
      draft.players.lumina.booCount = REQUIRED_BOO_COUNT;
      draft.players.nox.clapCount = 1;
      draft.history.push({
        id: 'history-watch',
        type: 'watch',
        turn: draft.turn.count,
        actor: 'lumina',
        payload: {
          decision: 'boo',
          outcome: 'success',
        },
        createdAt: draft.updatedAt,
      });
      draft.history.push({
        id: 'history-spotlight',
        type: 'spotlight',
        turn: draft.turn.count,
        actor: 'nox',
        payload: {
          result: 'mismatch',
          winner: 'nox',
        },
        createdAt: draft.updatedAt + 1,
      });
    });

    expect(resolveNextIntermissionActivePlayer(state)).toBe('nox');
  });

  it('直近スカウト情報が無い場合はターン情報から次手番を決定する', () => {
    const state = createState('lumina', (draft) => {
      draft.lastScoutPlayer = null;
      draft.turn.presenter = 'nox';
      draft.turn.watcher = 'lumina';
    });

    expect(resolveNextIntermissionActivePlayer(state)).toBe('lumina');
  });
});

describe('resolveTurnPresenter / resolveTurnWatcher', () => {
  it('ターン情報を優先して提示側とウォッチ側を返す', () => {
    const state = createState('lumina', (draft) => {
      draft.turn.presenter = 'lumina';
      draft.turn.watcher = 'nox';
      draft.activePlayer = 'nox';
    });

    expect(resolveTurnPresenter(state)).toBe('lumina');
    expect(resolveTurnWatcher(state)).toBe('nox');
  });

  it('ターン情報が欠落している場合は直近スカウト担当とその相手を返す', () => {
    const state = createState('lumina', (draft) => {
      draft.lastScoutPlayer = 'nox';
      draft.activePlayer = 'lumina';
    });

    state.turn.presenter = undefined as unknown as PlayerId;
    state.turn.watcher = undefined as unknown as PlayerId;

    expect(resolveTurnPresenter(state)).toBe('nox');
    expect(resolveTurnWatcher(state)).toBe('lumina');
  });
});
