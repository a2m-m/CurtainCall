import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GameProvider, useGameDispatch, useGameState } from '@/game/context';
import ActionScreen from './ActionScreen';

// INIT_GAME → START_SCOUT → SCOUT_CARD → action フェーズまで進めるラッパー
function ActionWrapper() {
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
    return <button onClick={() => dispatch({ type: 'START_SCOUT' })}>start</button>;
  }
  if (state.phase === 'scout') {
    return (
      <button onClick={() => dispatch({ type: 'SCOUT_CARD', cardIndex: 0 })}>scout</button>
    );
  }
  if (state.phase === 'action') {
    return <ActionScreen />;
  }
  return <div data-testid="after-action">phase: {state.phase}</div>;
}

function renderAction() {
  render(
    <GameProvider>
      <ActionWrapper />
    </GameProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'init' }));
  fireEvent.click(screen.getByRole('button', { name: 'start' }));
  fireEvent.click(screen.getByRole('button', { name: 'scout' }));
}

describe('ActionScreen', () => {
  it('アクション画面が表示される', () => {
    renderAction();
    expect(screen.getByText('アクション')).toBeDefined();
  });

  it('手札が表向きで表示される', () => {
    renderAction();
    // 表向きカードはスート・ランクのいずれかが含まれる（role="button"でclickable）
    // 少なくとも16枚（スカウト後: 15+1=16枚）表示される
    const buttons = screen.getAllByRole('button');
    // ステージへ出すボタン + 手札分
    expect(buttons.length).toBeGreaterThanOrEqual(16);
  });

  it('初期状態で「ステージへ出す」ボタンはdisabled', () => {
    renderAction();
    const btn = screen.getByRole('button', { name: 'ステージへ出す' });
    expect(btn.hasAttribute('disabled')).toBe(true);
  });

  it('役者札を選択するとプレビューエリアに表示される', () => {
    renderAction();
    const cardButtons = screen.getAllByRole('button').filter(
      (b) => b.getAttribute('aria-label') !== 'ステージへ出す',
    );
    fireEvent.click(cardButtons[0]);
    expect(screen.getByText('役者（カミ）')).toBeDefined();
    // 確定ボタンはまだdisabled（黒子未選択）
    expect(screen.getByRole('button', { name: 'ステージへ出す' }).hasAttribute('disabled')).toBe(true);
  });

  it('役者札を選択する前は「ステージへ出す」はdisabled', () => {
    renderAction();
    expect(screen.getByRole('button', { name: 'ステージへ出す' }).hasAttribute('disabled')).toBe(true);
  });

  it('役者札・黒子札を選択後に「ステージへ出す」が有効になる', () => {
    renderAction();
    const cardButtons = screen.getAllByRole('button').filter(
      (b) => b.getAttribute('aria-label') !== 'ステージへ出す',
    );
    // 役者札を選択
    fireEvent.click(cardButtons[0]);
    // 黒子札を選択（別のカード）
    fireEvent.click(cardButtons[1]);
    expect(screen.getByRole('button', { name: 'ステージへ出す' }).hasAttribute('disabled')).toBe(false);
  });

  it('同一カードを役者・黒子の両方に選択できない', () => {
    renderAction();
    const cardButtons = screen.getAllByRole('button').filter(
      (b) => b.getAttribute('aria-label') !== 'ステージへ出す',
    );
    // 役者札を選択
    fireEvent.click(cardButtons[0]);
    // 同じカードをもう一度クリック → 無視されるはず
    fireEvent.click(cardButtons[0]);
    // 確定ボタンはまだdisabled
    expect(screen.getByRole('button', { name: 'ステージへ出す' }).hasAttribute('disabled')).toBe(true);
  });

  it('「ステージへ出す」でPassDevice画面に遷移する', () => {
    renderAction();
    const cardButtons = screen.getAllByRole('button').filter(
      (b) => b.getAttribute('aria-label') !== 'ステージへ出す',
    );
    fireEvent.click(cardButtons[0]);
    fireEvent.click(cardButtons[1]);
    fireEvent.click(screen.getByRole('button', { name: 'ステージへ出す' }));
    expect(screen.getByText('さんに渡してください')).toBeDefined();
  });

  it('PassDevice完了後にwatchフェーズへ遷移する（長押しボタンが表示される）', () => {
    renderAction();
    const cardButtons = screen.getAllByRole('button').filter(
      (b) => b.getAttribute('aria-label') !== 'ステージへ出す',
    );
    fireEvent.click(cardButtons[0]);
    fireEvent.click(cardButtons[1]);
    fireEvent.click(screen.getByRole('button', { name: 'ステージへ出す' }));
    expect(screen.getByRole('button', { name: '長押しで進む' })).toBeDefined();
  });

  it('PassDeviceにはウォッチャー（ボブ）の名前が表示される', () => {
    renderAction();
    const cardButtons = screen.getAllByRole('button').filter(
      (b) => b.getAttribute('aria-label') !== 'ステージへ出す',
    );
    fireEvent.click(cardButtons[0]);
    fireEvent.click(cardButtons[1]);
    fireEvent.click(screen.getByRole('button', { name: 'ステージへ出す' }));
    // PassDevice はウォッチャー（ボブ）に渡すもの
    expect(screen.getByText('ボブ')).toBeDefined();
    // アクター（アリス）の名前は表示されない
    expect(screen.queryByText('アリス')).toBeNull();
  });
});
