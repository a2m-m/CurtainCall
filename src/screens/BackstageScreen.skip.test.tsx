import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { initialState } from '@/game/reducer';

vi.mock('@/game/context', () => ({
  useGameState: () => ({ ...initialState, phase: 'backstage', spotlightCard: null }),
  useGameDispatch: () => vi.fn(),
}));

import BackstageScreen from './BackstageScreen';

describe('BackstageScreen (spotlightCard === null)', () => {
  it('スキップ経由時に説明テキストが表示される', () => {
    render(<BackstageScreen />);
    expect(
      screen.getByText('セットをオープンしなかったため、バックステージフェーズは発生しません。'),
    ).toBeDefined();
  });

  it('スキップ経由時に「インターミッションへ」ボタンが表示される', () => {
    render(<BackstageScreen />);
    expect(screen.getByRole('button', { name: 'インターミッションへ' })).toBeDefined();
  });
});
