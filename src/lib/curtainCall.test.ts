import { describe, it, expect } from 'vitest';
import { checkCurtainCall } from './curtainCall';
import type { Card, GameState, Player } from '@/types/game';

function makeCard(rank: number, isJoker = false, isFaceUp = false): Card {
  return { suit: 'spades', rank, isJoker, isFaceUp };
}

function makePlayer(id: string, handSize: number): Player {
  return {
    id,
    name: id,
    hand: Array.from({ length: handSize }, (_, i) => makeCard(i + 1)),
  };
}

const baseState: GameState = {
  phase: 'intermission',
  players: [makePlayer('A', 5), makePlayer('B', 5)],
  stage: { kami: null, shimo: null },
  deck: [makeCard(1), makeCard(2), makeCard(3)],
  backstage: [],
  setRemainingCount: 3,
  publicInfos: [],
  playerABooCnt: 0,
  playerBBooCnt: 0,
  playerAKami: [],
  playerBKami: [],
  round: 1,
  curtainCallReason: null,
  booResult: null,
  spotlightCard: null,
  backstageRevealedCards: [],
  backstageResult: null,
  backstagePlayerId: null,
};

describe('checkCurtainCall', () => {
  describe('条件①: ジョーカーがセットからオープンされた', () => {
    it('face-up のジョーカーがデッキにある場合 joker を返す', () => {
      const state: GameState = {
        ...baseState,
        deck: [makeCard(0, true, true), makeCard(1), makeCard(2)],
        setRemainingCount: 2,
      };
      expect(checkCurtainCall(state)).toBe('joker');
    });

    it('ジョーカーが裏向きの場合は joker を返さない', () => {
      const state: GameState = {
        ...baseState,
        deck: [makeCard(0, true, false), makeCard(1), makeCard(2)],
        setRemainingCount: 3,
      };
      expect(checkCurtainCall(state)).toBeNull();
    });
  });

  describe('条件②: セットの裏向きカードが残り1枚以下', () => {
    it('setRemainingCount が 1 のとき set-last-1 を返す', () => {
      const state: GameState = {
        ...baseState,
        deck: [makeCard(1, false, true), makeCard(2, false, true), makeCard(3)],
        setRemainingCount: 1,
      };
      expect(checkCurtainCall(state)).toBe('set-last-1');
    });

    it('setRemainingCount が 0 のとき set-last-1 を返す', () => {
      const state: GameState = {
        ...baseState,
        deck: [makeCard(1, false, true), makeCard(2, false, true)],
        setRemainingCount: 0,
      };
      // deck.length > 0 かつ setRemainingCount <= 1 → set-last-1
      expect(checkCurtainCall(state)).toBe('set-last-1');
    });

    it('ゲーム未開始（deck が空）のとき set-last-1 を返さない', () => {
      const state: GameState = {
        ...baseState,
        deck: [],
        setRemainingCount: 0,
      };
      expect(checkCurtainCall(state)).toBeNull();
    });

    it('setRemainingCount が 2 以上のとき set-last-1 を返さない', () => {
      const state: GameState = {
        ...baseState,
        setRemainingCount: 2,
      };
      expect(checkCurtainCall(state)).toBeNull();
    });
  });

  describe('条件③: 手札不足', () => {
    it('次スカウト担当の手札が 0 枚のとき hand-shortage を返す', () => {
      // round=1: players[0] がスカウト → 次は players[1]（round 偶数でA）
      // round=1 → nextScoutIsA = (1 % 2 === 0) = false → nextScout = players[1]
      const state: GameState = {
        ...baseState,
        round: 1,
        players: [makePlayer('A', 3), makePlayer('B', 0)],
      };
      expect(checkCurtainCall(state)).toBe('hand-shortage');
    });

    it('次スカウト担当が 1 枚かつ相手が 0 枚のとき hand-shortage を返す', () => {
      const state: GameState = {
        ...baseState,
        round: 1,
        players: [makePlayer('A', 0), makePlayer('B', 1)],
      };
      expect(checkCurtainCall(state)).toBe('hand-shortage');
    });

    it('次スカウト担当が 2 枚以上のとき hand-shortage を返さない', () => {
      const state: GameState = {
        ...baseState,
        round: 1,
        players: [makePlayer('A', 3), makePlayer('B', 2)],
      };
      expect(checkCurtainCall(state)).toBeNull();
    });

    it('ラウンド偶数でも次スカウトは players[1] であり players[0] の手札不足では hand-shortage にならない', () => {
      // round=2: players[0] = 現在のスカウト → 次のスカウトは players[1]
      // players[0] が 0 枚でも players[1] が 5 枚あれば継続できる
      const state: GameState = {
        ...baseState,
        round: 2,
        players: [makePlayer('A', 0), makePlayer('B', 5)],
      };
      expect(checkCurtainCall(state)).toBeNull();
    });

    it('偶数ラウンドで players[1] の手札が 0 枚のとき hand-shortage を返す', () => {
      const state: GameState = {
        ...baseState,
        round: 2,
        players: [makePlayer('A', 5), makePlayer('B', 0)],
      };
      expect(checkCurtainCall(state)).toBe('hand-shortage');
    });
  });

  describe('条件に該当しない場合', () => {
    it('全条件を満たさない場合は null を返す', () => {
      expect(checkCurtainCall(baseState)).toBeNull();
    });
  });
});
