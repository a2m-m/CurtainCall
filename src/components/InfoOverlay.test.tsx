import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import InfoOverlay from './InfoOverlay';
import type { GameState } from '@/types/game';

const baseState: GameState = {
  phase: 'scout',
  players: [
    { id: 'A', name: 'アリス', hand: [] },
    { id: 'B', name: 'ボブ', hand: [] },
  ],
  stage: { kami: null, shimo: null },
  deck: [],
  backstage: [],
  setRemainingCount: 9,
  publicInfos: [],
  playerABooCnt: 1,
  playerBBooCnt: 2,
  playerAKami: [],
  playerBKami: [],
  playerAShimo: [],
  playerBShimo: [],
  round: 1,
  curtainCallReason: null,
  booResult: null,
  spotlightCard: null,
  backstageRevealedCards: [],
  backstageResult: null,
  backstagePlayerId: null,
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
          playerId: 'A',
          card: { suit: 'spades', rank: 5, isJoker: false, isFaceUp: true },
          round: 1,
        },
      ],
    };
    render(<InfoOverlay isOpen={true} onClose={() => {}} gameState={state} />);
    expect(screen.getByText('♠5')).toBeDefined();
  });

  it('カミ札が0枚の場合は「なし」が表示される（ステージ・蓄積ペア・スコアの各セクション）', () => {
    render(<InfoOverlay isOpen={true} onClose={() => {}} gameState={baseState} />);
    // ステージ:1 + スコアA:1 + スコアB:1 + 蓄積ペアA:1 + 蓄積ペアB:1 = 5
    const nasiElements = screen.getAllByText('なし');
    expect(nasiElements.length).toBe(5);
  });

  it('カミ札がある場合はランク＋スート形式で表示される', () => {
    const state: GameState = {
      ...baseState,
      playerAKami: [{ suit: 'spades', rank: 13, isJoker: false, isFaceUp: true }],
      playerBKami: [{ suit: 'hearts', rank: 7, isJoker: false, isFaceUp: true }],
    };
    render(<InfoOverlay isOpen={true} onClose={() => {}} gameState={state} />);
    // スコアセクションと蓄積ペアセクションの両方に表示されるため getAllByText を使用
    expect(screen.getAllByText('♠K').length).toBeGreaterThan(0);
    expect(screen.getAllByText('♥7').length).toBeGreaterThan(0);
  });

  it('swap後（偶数ラウンド）もA/Bのブーイング数が正しいプレイヤー欄に表示される', () => {
    // players が swap された状態（偶数ラウンド）を再現
    const state: GameState = {
      ...baseState,
      players: [
        { id: 'B', name: 'ボブ', hand: [] },
        { id: 'A', name: 'アリス', hand: [] },
      ],
      playerABooCnt: 1,
      playerBBooCnt: 2,
    };
    render(<InfoOverlay isOpen={true} onClose={() => {}} gameState={state} />);
    // 「1 / 3」(Aのブーイング数) が表示されている行に「アリス」が含まれるべき
    // Bug時: players[0]=ボブ に Aのデータ(1)が表示されるため「ボブ」が含まれてしまう
    const oneThirdSpan = screen.getAllByText('1 / 3')[0];
    expect(oneThirdSpan.parentElement?.parentElement?.textContent).toContain('アリス');
    const twoThirdSpan = screen.getAllByText('2 / 3')[0];
    expect(twoThirdSpan.parentElement?.parentElement?.textContent).toContain('ボブ');
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
