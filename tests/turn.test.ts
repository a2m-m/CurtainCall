import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  REQUIRED_BOO_COUNT,
  type GameState,
  type PlayerId,
} from '../src/state.js';
import { resolveNextIntermissionActivePlayer } from '../src/turn.js';

const createState = (activePlayer: PlayerId, configure?: (state: GameState) => void): GameState => {
  const state = createInitialState();
  state.activePlayer = activePlayer;
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
});
