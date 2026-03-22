/**
 * Issue #130 リグレッションテスト
 * バックステージ画面で既知カードの位置情報アイコンが表示されてしまうバグの再現確認
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GameState } from '@/types/game';
import { initialState } from '@/game/reducer';

vi.mock('@/game/context', () => ({
  useGameState: vi.fn(),
  useGameDispatch: vi.fn(() => vi.fn()),
}));

import { useGameState } from '@/game/context';
import BackstageScreen from './BackstageScreen';

const card = (rank: number) => ({ suit: 'spades' as const, rank, isJoker: false, isFaceUp: false });

const baseBackstage: GameState['backstage'] = Array.from({ length: 10 }, (_, i) => card(i + 1));

const baseState: GameState = {
  ...initialState,
  phase: 'backstage',
  backstage: baseBackstage,
  spotlightCard: { suit: 'hearts', rank: 5, isJoker: false, isFaceUp: true },
  players: [
    { id: 'A', name: 'アリス', hand: [] },
    { id: 'B', name: 'ボブ', hand: [] },
  ],
};

describe('BackstageScreen - Issue #138 リグレッション', () => {
  it('BACKSTAGE_TAKE_HAND 後（lastBackstageDrawnCard あり）に引いたカードが表示される', () => {
    vi.mocked(useGameState).mockReturnValue({
      ...baseState,
      phase: 'backstage-result',
      backstageResult: 'no-match',
      backstageRevealedCards: [card(1), card(2), card(3)],
      lastBackstageDrawnCard: { suit: 'diamonds', rank: 7, isJoker: false, isFaceUp: true },
    });
    render(<BackstageScreen />);
    expect(screen.getByText('手札に加えたカード')).toBeTruthy();
    expect(screen.getByText('インターミッションへ')).toBeTruthy();
  });

  it('lastBackstageDrawnCard=null のとき引いたカード表示が出ない', () => {
    vi.mocked(useGameState).mockReturnValue({
      ...baseState,
      phase: 'backstage-result',
      backstageResult: 'no-match',
      backstageRevealedCards: [card(1), card(2), card(3)],
      lastBackstageDrawnCard: null,
    });
    render(<BackstageScreen />);
    expect(screen.queryByText('手札に加えたカード')).toBeNull();
  });
});

describe('BackstageScreen - Issue #130 リグレッション', () => {
  beforeEach(() => {
    vi.mocked(useGameState).mockReturnValue(baseState);
  });

  it('publicInfos が空のとき「既知」バッジが表示されない', () => {
    vi.mocked(useGameState).mockReturnValue({ ...baseState, publicInfos: [] });
    render(<BackstageScreen />);
    expect(screen.queryByText('既知')).toBeNull();
  });

  it('publicInfos に backstageIndex を含むエントリがあっても「既知」バッジが表示されない', () => {
    vi.mocked(useGameState).mockReturnValue({
      ...baseState,
      publicInfos: [
        { playerId: 'A', card: card(1), round: 1, backstageIndex: 0 },
        { playerId: 'A', card: card(2), round: 1, backstageIndex: 1 },
        { playerId: 'A', card: card(3), round: 1, backstageIndex: 2 },
      ],
    });
    render(<BackstageScreen />);
    expect(screen.queryByText('既知')).toBeNull();
  });

  it('backstage-result (no-match) フェーズでも「既知」バッジが表示されない', () => {
    vi.mocked(useGameState).mockReturnValue({
      ...baseState,
      phase: 'backstage-result',
      backstageResult: 'no-match',
      backstageRevealedCards: [card(1), card(2), card(3)],
      publicInfos: [
        { playerId: 'A', card: card(1), round: 1, backstageIndex: 0 },
        { playerId: 'A', card: card(2), round: 1, backstageIndex: 1 },
        { playerId: 'A', card: card(3), round: 1, backstageIndex: 2 },
      ],
    });
    render(<BackstageScreen />);
    expect(screen.queryByText('既知')).toBeNull();
  });
});
