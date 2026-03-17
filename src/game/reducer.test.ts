import { describe, it, expect, beforeEach } from 'vitest';
import { gameReducer, initialState } from './reducer';
import type { GameState } from '@/types/game';

describe('gameReducer', () => {
  describe('INIT_GAME', () => {
    const state = gameReducer(initialState, {
      type: 'INIT_GAME',
      playerAName: 'Alice',
      playerBName: 'Bob',
    });

    it('phase が standby のまま（START_SCOUT 前）', () => {
      expect(state.phase).toBe('standby');
    });

    it('プレイヤーAの手札が15枚になる', () => {
      expect(state.players[0].hand).toHaveLength(15);
    });

    it('プレイヤーBの手札が15枚になる', () => {
      expect(state.players[1].hand).toHaveLength(15);
    });

    it('バックステージが10枚になる', () => {
      expect(state.backstage).toHaveLength(10);
    });

    it('セット（deck）が13枚になる', () => {
      expect(state.deck).toHaveLength(13);
    });

    it('setRemainingCount が 13 になる', () => {
      expect(state.setRemainingCount).toBe(13);
    });

    it('プレイヤー名が正しくセットされる', () => {
      expect(state.players[0].name).toBe('Alice');
      expect(state.players[1].name).toBe('Bob');
    });

    it('round が 1 になる', () => {
      expect(state.round).toBe(1);
    });

    it('セットにJokerが1枚含まれる', () => {
      expect(state.deck.filter((c) => c.isJoker)).toHaveLength(1);
    });
  });

  describe('START_SCOUT', () => {
    it('INIT_GAME 後に START_SCOUT で phase が scout になる', () => {
      const afterInit = gameReducer(initialState, {
        type: 'INIT_GAME',
        playerAName: 'Alice',
        playerBName: 'Bob',
      });
      const result = gameReducer(afterInit, { type: 'START_SCOUT' });
      expect(result.phase).toBe('scout');
    });

    it('プレイヤー名が未設定の standby では START_SCOUT が無効', () => {
      const result = gameReducer(initialState, { type: 'START_SCOUT' });
      expect(result).toBe(initialState);
    });

    it('standby 以外のフェーズでは START_SCOUT が無効', () => {
      const afterInit = gameReducer(initialState, {
        type: 'INIT_GAME',
        playerAName: 'Alice',
        playerBName: 'Bob',
      });
      const scoutState = gameReducer(afterInit, { type: 'START_SCOUT' });
      const result = gameReducer(scoutState, { type: 'START_SCOUT' });
      expect(result).toBe(scoutState);
    });
  });

  describe('SCOUT_CARD', () => {
    let scoutState: GameState;
    beforeEach(() => {
      const afterInit = gameReducer(initialState, {
        type: 'INIT_GAME',
        playerAName: 'Alice',
        playerBName: 'Bob',
      });
      scoutState = gameReducer(afterInit, { type: 'START_SCOUT' });
    });

    it('phase が action になる', () => {
      const result = gameReducer(scoutState, { type: 'SCOUT_CARD', cardIndex: 0 });
      expect(result.phase).toBe('action');
    });

    it('Aの手札が1枚増える', () => {
      const result = gameReducer(scoutState, { type: 'SCOUT_CARD', cardIndex: 0 });
      expect(result.players[0].hand).toHaveLength(16);
    });

    it('Bの手札が1枚減る', () => {
      const result = gameReducer(scoutState, { type: 'SCOUT_CARD', cardIndex: 0 });
      expect(result.players[1].hand).toHaveLength(14);
    });

    it('選択したカードがAの手札末尾に追加される', () => {
      const targetCard = scoutState.players[1].hand[3];
      const result = gameReducer(scoutState, { type: 'SCOUT_CARD', cardIndex: 3 });
      expect(result.players[0].hand.at(-1)).toEqual(targetCard);
    });
  });

  describe('ACTION_PLAY', () => {
    it('phase が watch になる', () => {
      const afterInit = gameReducer(initialState, {
        type: 'INIT_GAME',
        playerAName: 'Alice',
        playerBName: 'Bob',
      });
      const afterStart = gameReducer(afterInit, { type: 'START_SCOUT' });
      const afterScout = gameReducer(afterStart, { type: 'SCOUT_CARD', cardIndex: 0 });
      const result = gameReducer(afterScout, { type: 'ACTION_PLAY', kamiIndex: 0, shimoIndex: 1 });
      expect(result.phase).toBe('watch');
    });

    it('ステージにkami/shimoがセットされる', () => {
      const afterInit = gameReducer(initialState, {
        type: 'INIT_GAME',
        playerAName: 'Alice',
        playerBName: 'Bob',
      });
      const afterStart = gameReducer(afterInit, { type: 'START_SCOUT' });
      const afterScout = gameReducer(afterStart, { type: 'SCOUT_CARD', cardIndex: 0 });
      const kami = afterScout.players[0].hand[0];
      const shimo = afterScout.players[0].hand[1];
      const result = gameReducer(afterScout, { type: 'ACTION_PLAY', kamiIndex: 0, shimoIndex: 1 });
      expect(result.stage.kami).toEqual({ ...kami, isFaceUp: true });
      expect(result.stage.shimo).toEqual({ ...shimo, isFaceUp: false });
    });
  });

  describe('WATCH_CLAP / WATCH_BOO', () => {
    let watchState: GameState;
    beforeEach(() => {
      const s1 = gameReducer(initialState, { type: 'INIT_GAME', playerAName: 'A', playerBName: 'B' });
      const s2 = gameReducer(s1, { type: 'START_SCOUT' });
      const s3 = gameReducer(s2, { type: 'SCOUT_CARD', cardIndex: 0 });
      watchState = gameReducer(s3, { type: 'ACTION_PLAY', kamiIndex: 0, shimoIndex: 1 });
    });

    it('WATCH_CLAP で phase が intermission になる', () => {
      expect(gameReducer(watchState, { type: 'WATCH_CLAP' }).phase).toBe('intermission');
    });

    it('WATCH_BOO で phase が spotlight になる', () => {
      expect(gameReducer(watchState, { type: 'WATCH_BOO' }).phase).toBe('spotlight');
    });

    it('WATCH_BOO で playerBBooCnt が増える', () => {
      const result = gameReducer(watchState, { type: 'WATCH_BOO' });
      expect(result.playerBBooCnt).toBe(1);
    });
  });

  describe('RESET_GAME', () => {
    it('phase が standby に戻る', () => {
      const afterInit = gameReducer(initialState, {
        type: 'INIT_GAME',
        playerAName: 'Alice',
        playerBName: 'Bob',
      });
      const afterStart = gameReducer(afterInit, { type: 'START_SCOUT' });
      const result = gameReducer(afterStart, { type: 'RESET_GAME' });
      expect(result.phase).toBe('standby');
    });

    it('initialState と同一の値を返す', () => {
      const afterInit = gameReducer(initialState, {
        type: 'INIT_GAME',
        playerAName: 'Alice',
        playerBName: 'Bob',
      });
      const afterStart = gameReducer(afterInit, { type: 'START_SCOUT' });
      const result = gameReducer(afterStart, { type: 'RESET_GAME' });
      expect(result).toEqual(initialState);
    });
  });

  describe('不正遷移', () => {
    it('standby フェーズで SCOUT_CARD を dispatch しても state が変わらない', () => {
      const result = gameReducer(initialState, { type: 'SCOUT_CARD', cardIndex: 0 });
      expect(result).toBe(initialState);
    });

    it('standby フェーズで ACTION_PLAY を dispatch しても state が変わらない', () => {
      const result = gameReducer(initialState, { type: 'ACTION_PLAY', kamiIndex: 0, shimoIndex: 1 });
      expect(result).toBe(initialState);
    });

    it('standby フェーズで WATCH_CLAP を dispatch しても state が変わらない', () => {
      const result = gameReducer(initialState, { type: 'WATCH_CLAP' });
      expect(result).toBe(initialState);
    });
  });
});
