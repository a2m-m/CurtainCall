import { describe, it, expect } from 'vitest';
import { calculateScore } from './scoring';
import type { Card, GameState } from '@/types/game';

function makeCard(rank: number, isJoker = false): Card {
  return { suit: 'spades', rank, isJoker, isFaceUp: false };
}

const baseState: GameState = {
  phase: 'curtain-call',
  players: [
    { id: 'A', name: 'アリス', hand: [] },
    { id: 'B', name: 'ボブ', hand: [] },
  ],
  stage: { kami: null, shimo: null },
  deck: [],
  backstage: [],
  setRemainingCount: 0,
  publicInfos: [],
  playerABooCnt: 3,
  playerBBooCnt: 3,
  playerAKami: [],
  playerBKami: [],
  playerAShimo: [],
  playerBShimo: [],
  round: 1,
  curtainCallReason: 'joker',
  booResult: null,
  spotlightCard: null,
  backstageRevealedCards: [],
  backstageResult: null,
  backstagePlayerId: null,
  lastOpenedCard: null,
  spotlightOpenResultNextPhase: null, lastScoutedCard: null,
};

describe('calculateScore', () => {
  describe('カミ合計', () => {
    it('playerAKami が空の場合は 0', () => {
      const result = calculateScore({ ...baseState, playerAKami: [] }, 'A');
      expect(result.kamiTotal).toBe(0);
    });

    it('数字カードはランク値をそのまま使う（5 → 5）', () => {
      const state: GameState = { ...baseState, playerAKami: [makeCard(5)] };
      expect(calculateScore(state, 'A').kamiTotal).toBe(5);
    });

    it('A は 1', () => {
      const state: GameState = { ...baseState, playerAKami: [makeCard(1)] };
      expect(calculateScore(state, 'A').kamiTotal).toBe(1);
    });

    it('J は 11', () => {
      const state: GameState = { ...baseState, playerAKami: [makeCard(11)] };
      expect(calculateScore(state, 'A').kamiTotal).toBe(11);
    });

    it('Q は 12', () => {
      const state: GameState = { ...baseState, playerAKami: [makeCard(12)] };
      expect(calculateScore(state, 'A').kamiTotal).toBe(12);
    });

    it('K は 13', () => {
      const state: GameState = { ...baseState, playerAKami: [makeCard(13)] };
      expect(calculateScore(state, 'A').kamiTotal).toBe(13);
    });

    it('Joker は 0', () => {
      const state: GameState = { ...baseState, playerAKami: [makeCard(0, true)] };
      expect(calculateScore(state, 'A').kamiTotal).toBe(0);
    });
  });

  describe('手札合計', () => {
    it('手札が空の場合は 0', () => {
      const result = calculateScore(baseState, 'A');
      expect(result.handTotal).toBe(0);
    });

    it('手札の合計が正しい（3+7+10=20）', () => {
      const state: GameState = {
        ...baseState,
        players: [
          { id: 'A', name: 'A', hand: [makeCard(3), makeCard(7), makeCard(10)] },
          { id: 'B', name: 'B', hand: [] },
        ],
      };
      expect(calculateScore(state, 'A').handTotal).toBe(20);
    });

    it('プレイヤーが swap 後（players[0]=B の場合）でも id で正しく取得できる', () => {
      const state: GameState = {
        ...baseState,
        players: [
          { id: 'B', name: 'B', hand: [makeCard(5)] },
          { id: 'A', name: 'A', hand: [makeCard(8)] },
        ],
      };
      expect(calculateScore(state, 'A').handTotal).toBe(8);
      expect(calculateScore(state, 'B').handTotal).toBe(5);
    });
  });

  describe('ブーイングペナルティ', () => {
    it('curtainCallReason が set-last-1 以外の場合はペナルティ 0', () => {
      const state: GameState = { ...baseState, curtainCallReason: 'joker', playerABooCnt: 0 };
      expect(calculateScore(state, 'A').penalty).toBe(0);
    });

    it('hand-shortage でもペナルティ 0', () => {
      const state: GameState = { ...baseState, curtainCallReason: 'hand-shortage', playerABooCnt: 1 };
      expect(calculateScore(state, 'A').penalty).toBe(0);
    });

    it('set-last-1 かつブーイング 3 回でペナルティ 0', () => {
      const state: GameState = { ...baseState, curtainCallReason: 'set-last-1', playerABooCnt: 3 };
      expect(calculateScore(state, 'A').penalty).toBe(0);
    });

    it('set-last-1 かつブーイング 2 回（不足 1 回）→ 15 マイナス', () => {
      const state: GameState = { ...baseState, curtainCallReason: 'set-last-1', playerABooCnt: 2 };
      expect(calculateScore(state, 'A').penalty).toBe(15);
    });

    it('set-last-1 かつブーイング 1 回（不足 2 回）→ 30 マイナス', () => {
      const state: GameState = { ...baseState, curtainCallReason: 'set-last-1', playerABooCnt: 1 };
      expect(calculateScore(state, 'A').penalty).toBe(30);
    });

    it('set-last-1 かつブーイング 0 回（不足 3 回）→ 45 マイナス', () => {
      const state: GameState = { ...baseState, curtainCallReason: 'set-last-1', playerABooCnt: 0 };
      expect(calculateScore(state, 'A').penalty).toBe(45);
    });

    it('プレイヤー B のペナルティも正しく計算される', () => {
      const state: GameState = { ...baseState, curtainCallReason: 'set-last-1', playerBBooCnt: 1 };
      expect(calculateScore(state, 'B').penalty).toBe(30);
    });
  });

  describe('最終ポイント合計', () => {
    it('カミ合計 - 手札合計 - ペナルティ の計算が正しい', () => {
      const state: GameState = {
        ...baseState,
        playerAKami: [makeCard(10)],
        players: [
          { id: 'A', name: 'A', hand: [makeCard(3), makeCard(2)] }, // hand=5
          { id: 'B', name: 'B', hand: [] },
        ],
        curtainCallReason: 'set-last-1',
        playerABooCnt: 1, // 不足2回 → penalty=30
      };
      const result = calculateScore(state, 'A');
      expect(result.kamiTotal).toBe(10);
      expect(result.handTotal).toBe(5);
      expect(result.penalty).toBe(30);
      expect(result.total).toBe(-25); // 10 - 5 - 30
    });

    it('ペナルティなしの場合のトータル計算', () => {
      const state: GameState = {
        ...baseState,
        playerAKami: [makeCard(8)],
        players: [
          { id: 'A', name: 'A', hand: [makeCard(3)] }, // hand=3
          { id: 'B', name: 'B', hand: [] },
        ],
        curtainCallReason: 'joker',
      };
      const result = calculateScore(state, 'A');
      expect(result.total).toBe(5); // 8 - 3 - 0
    });
  });

  describe('累積カミ配列によるスコア計算（Issue #76）', () => {
    it('playerAKami が複数枚の場合、合計が kamiTotal になる', () => {
      const state: GameState = {
        ...baseState,
        playerAKami: [makeCard(5), makeCard(10), makeCard(3)],
        playerBKami: [],
      };
      expect(calculateScore(state, 'A').kamiTotal).toBe(18); // 5+10+3
    });

    it('playerBKami が複数枚の場合、合計が kamiTotal になる', () => {
      const state: GameState = {
        ...baseState,
        playerAKami: [],
        playerBKami: [makeCard(7), makeCard(13)],
      };
      expect(calculateScore(state, 'B').kamiTotal).toBe(20); // 7+13
    });

    it('playerAKami が空の場合、kamiTotal は 0（stage.kami は無視される）', () => {
      const state: GameState = {
        ...baseState,
        stage: { kami: { ...makeCard(9), isFaceUp: true }, shimo: null },
        playerAKami: [],
      };
      // stage.kami ではなく playerAKami を参照するため 0 になる
      expect(calculateScore(state, 'A').kamiTotal).toBe(0);
    });

    it('Joker を含む playerAKami の場合、Joker は 0 として合算される', () => {
      const state: GameState = {
        ...baseState,
        playerAKami: [makeCard(5), makeCard(0, true)], // Joker=0
      };
      expect(calculateScore(state, 'A').kamiTotal).toBe(5);
    });

    it('A と B の kamiTotal が互いに独立している', () => {
      const state: GameState = {
        ...baseState,
        playerAKami: [makeCard(8)],
        playerBKami: [makeCard(12), makeCard(3)],
      };
      expect(calculateScore(state, 'A').kamiTotal).toBe(8);
      expect(calculateScore(state, 'B').kamiTotal).toBe(15);
    });
  });
});
