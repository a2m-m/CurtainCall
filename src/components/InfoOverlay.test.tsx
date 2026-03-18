import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import InfoOverlay from './InfoOverlay';
import type { GameState } from '@/types/game';

const baseState: GameState = {
  phase: 'scout',
  players: [
    { id: 'a', name: 'アリス', hand: [] },
    { id: 'b', name: 'ボブ', hand: [] },
  ],
  stage: { kami: null, shimo: null },
  deck: [],
  backstage: [],
  setRemainingCount: 9,
  publicInfos: [],
  playerABooCnt: 1,
  playerBBooCnt: 2,
  round: 1,
  curtainCallReason: null,
  spotlightCard: null,
  backstageRevealedCards: [],
  backstageResult: null,
};

describe('InfoOverlay', () => {
  it('isOpen=trueでパネルが表示される', () => {
    render(<InfoOverlay isOpen={true} onClose={() => {}} gameState={baseState} />);
    expect(screen.getByRole('dialog', { name: 'ゲーム情報' })).toBeDefined();
  });

  it('isOpen=falseでパネルが非表示になる（aria-hidden）', () => {
    const { container } = render(
      <InfoOverlay isOpen={false} onClose={() => {}} gameState={baseState} />
    );
    const backdrop = container.firstElementChild;
    expect(backdrop?.getAttribute('aria-hidden')).toBe('true');
  });

  it('スコア速報のプレイヤー名が表示される', () => {
    render(<InfoOverlay isOpen={true} onClose={() => {}} gameState={baseState} />);
    expect(screen.getAllByText('アリス').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ボブ').length).toBeGreaterThan(0);
  });

  it('ブーイング数が3ドット形式で表示される', () => {
    render(<InfoOverlay isOpen={true} onClose={() => {}} gameState={baseState} />);
    expect(screen.getByText('1 / 3')).toBeDefined();
    expect(screen.getByText('2 / 3')).toBeDefined();
  });

  it('セット残枚数が表示される', () => {
    render(<InfoOverlay isOpen={true} onClose={() => {}} gameState={baseState} />);
    expect(screen.getByText('9 枚')).toBeDefined();
  });

  it('公開情報（バックステージ既知カード）の表示エリアがある', () => {
    render(<InfoOverlay isOpen={true} onClose={() => {}} gameState={baseState} />);
    expect(screen.getByText('バックステージ（公開情報）', { exact: false })).toBeDefined();
  });

  it('publicInfosがある場合カード情報が表示される', () => {
    const state: GameState = {
      ...baseState,
      publicInfos: [
        {
          playerId: 'a',
          card: { suit: 'spades', rank: 5, isJoker: false, isFaceUp: true },
          round: 1,
        },
      ],
    };
    render(<InfoOverlay isOpen={true} onClose={() => {}} gameState={state} />);
    expect(screen.getByText('♠5')).toBeDefined();
  });

  it('バックドロップタップでonCloseが呼ばれる', () => {
    const handleClose = vi.fn();
    render(<InfoOverlay isOpen={true} onClose={handleClose} gameState={baseState} />);
    fireEvent.click(screen.getByLabelText('オーバーレイを閉じる'));
    expect(handleClose).toHaveBeenCalledOnce();
  });

  it('閉じるボタンクリックでonCloseが呼ばれる', () => {
    const handleClose = vi.fn();
    render(<InfoOverlay isOpen={true} onClose={handleClose} gameState={baseState} />);
    fireEvent.click(screen.getByRole('button', { name: '閉じる' }));
    expect(handleClose).toHaveBeenCalledOnce();
  });
});
