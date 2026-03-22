import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GameProvider, useGameDispatch, useGameState } from '@/game/context';
import ScoutScreen from './ScoutScreen';

// INIT_GAME → START_SCOUT まで進めてからScoutScreenを描画するラッパー
function ScoutWrapper() {
  const dispatch = useGameDispatch();
  const state = useGameState();

  if (state.phase === 'standby' && state.players[0].name === '') {
    return (
      <button
        onClick={() =>
          dispatch({ type: 'INIT_GAME', playerAName: 'アリス', playerBName: 'ボブ' })
        }
      >
        init
      </button>
    );
  }
  if (state.phase === 'standby') {
    return (
      <button onClick={() => dispatch({ type: 'START_SCOUT' })}>start</button>
    );
  }
  if (state.phase === 'scout') {
    return <ScoutScreen />;
  }
  // scout-result まで進んだら after-scout として扱う（GameRouter が ScoutResultScreen を担当）
  return <div data-testid="after-scout">phase: {state.phase}</div>;
}

function renderScout() {
  render(
    <GameProvider>
      <ScoutWrapper />
    </GameProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'init' }));
  fireEvent.click(screen.getByRole('button', { name: 'start' }));
}

describe('ScoutScreen', () => {
  it('スカウト画面が表示される', () => {
    renderScout();
    expect(screen.getByText('スカウト')).toBeDefined();
  });

  it('相手手札が裏向きカードとして表示される', () => {
    renderScout();
    // 裏向きカードはrole="button"として表示（clickableなもの）
    const cards = screen.getAllByRole('button');
    // スカウト確定ボタン + 裏向きカード15枚
    expect(cards.length).toBeGreaterThanOrEqual(15);
  });

  it('「スカウト確定」ボタンは初期状態でdisabled', () => {
    renderScout();
    const btn = screen.getByRole('button', { name: 'スカウト確定' });
    expect(btn.hasAttribute('disabled')).toBe(true);
  });

  it('カードをタップすると選択状態になり「スカウト確定」が有効になる', () => {
    renderScout();
    const cards = screen.getAllByRole('button');
    // 最初のカード（スカウト確定ボタン以外）をクリック
    const firstCard = cards.find((b) => b.getAttribute('aria-label') !== 'スカウト確定') ?? cards[0];
    fireEvent.click(firstCard);
    const btn = screen.getByRole('button', { name: 'スカウト確定' });
    expect(btn.hasAttribute('disabled')).toBe(false);
  });

  it('別のカードをタップすると選択が切り替わる（選び直し可）', () => {
    renderScout();
    const cardButtons = screen.getAllByRole('button').filter((b) => b.textContent === '');
    expect(cardButtons.length).toBeGreaterThanOrEqual(2);
    // 1枚目を選択
    fireEvent.click(cardButtons[0]);
    // 2枚目に選び直す
    fireEvent.click(cardButtons[1]);
    // 2枚目が選択されていることを確認：再タップで解除するとconfirmがdisabledになる
    fireEvent.click(cardButtons[1]);
    expect(screen.getByRole('button', { name: 'スカウト確定' }).hasAttribute('disabled')).toBe(true);
  });

  it('選択済みカードを再タップすると選択が解除される', () => {
    renderScout();
    const cardButtons = screen.getAllByRole('button').filter((b) => b.textContent === '');
    fireEvent.click(cardButtons[0]);
    expect(screen.getByRole('button', { name: 'スカウト確定' }).hasAttribute('disabled')).toBe(false);
    // 同じカードを再タップ → 解除
    fireEvent.click(cardButtons[0]);
    expect(screen.getByRole('button', { name: 'スカウト確定' }).hasAttribute('disabled')).toBe(true);
  });

  it('「スカウト確定」後、PassDeviceは表示されない', () => {
    renderScout();
    const allButtons = screen.getAllByRole('button');
    const firstCard = allButtons.find((b) => b.textContent === '') ?? allButtons[0];
    fireEvent.click(firstCard);
    fireEvent.click(screen.getByRole('button', { name: 'スカウト確定' }));
    expect(screen.queryByText('さんに渡してください')).toBeNull();
  });

  it('Enter キーでカードを選択でき「スカウト確定」が有効になる', () => {
    renderScout();
    const cardButtons = screen.getAllByRole('button').filter((b) => b.textContent === '');
    fireEvent.keyDown(cardButtons[0], { key: 'Enter' });
    expect(screen.getByRole('button', { name: 'スカウト確定' }).hasAttribute('disabled')).toBe(false);
  });

  it('Space キーでカードを選択でき「スカウト確定」が有効になる', () => {
    renderScout();
    const cardButtons = screen.getAllByRole('button').filter((b) => b.textContent === '');
    fireEvent.keyDown(cardButtons[0], { key: ' ' });
    expect(screen.getByRole('button', { name: 'スカウト確定' }).hasAttribute('disabled')).toBe(false);
  });

  it('「スカウト確定」後、scout-result フェーズへ遷移する', () => {
    renderScout();
    const allButtons = screen.getAllByRole('button');
    const firstCard = allButtons.find((b) => b.textContent === '') ?? allButtons[0];
    fireEvent.click(firstCard);
    fireEvent.click(screen.getByRole('button', { name: 'スカウト確定' }));
    expect(screen.getByTestId('after-scout').textContent).toBe('phase: scout-result');
  });
});
