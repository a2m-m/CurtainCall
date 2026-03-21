import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GameProvider, useGameDispatch, useGameState } from '@/game/context';
import IntermissionScreen from './IntermissionScreen';

// INIT_GAME → START_SCOUT → SCOUT_CARD → ACTION_PLAY → WATCH_CLAP → intermission フェーズまで進めるラッパー
function IntermissionWrapper() {
  const dispatch = useGameDispatch();
  const state = useGameState();

  if (state.phase === 'intermission') {
    return <IntermissionScreen />;
  }
  // ラウンド2のscoutフェーズ = インターミッション後（「次のラウンドへ」ボタン押下済み）
  if (state.round === 2 && state.phase === 'scout') {
    return <div data-testid="after-intermission">phase: {state.phase}</div>;
  }
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
  if (state.phase === 'scout-result') {
    return <button onClick={() => dispatch({ type: 'SCOUT_RESULT_PROCEED' })}>scout-proceed</button>;
  }
  if (state.phase === 'action') {
    return (
      <button onClick={() => dispatch({ type: 'ACTION_PLAY', kamiIndex: 0, shimoIndex: 1 })}>
        action
      </button>
    );
  }
  if (state.phase === 'action-result') {
    return <button onClick={() => dispatch({ type: 'ACTION_RESULT_PROCEED' })}>action-proceed</button>;
  }
  if (state.phase === 'watch') {
    return <button onClick={() => dispatch({ type: 'WATCH_CLAP' })}>clap</button>;
  }
  return null;
}

function renderIntermission() {
  render(
    <GameProvider>
      <IntermissionWrapper />
    </GameProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'init' }));
  fireEvent.click(screen.getByRole('button', { name: 'start' }));
  fireEvent.click(screen.getByRole('button', { name: 'scout' }));
  fireEvent.click(screen.getByRole('button', { name: 'scout-proceed' }));
  fireEvent.click(screen.getByRole('button', { name: 'action' }));
  fireEvent.click(screen.getByRole('button', { name: 'action-proceed' }));
  fireEvent.click(screen.getByRole('button', { name: 'clap' }));
}

describe('IntermissionScreen', () => {
  it('インターミッション画面が表示される', () => {
    renderIntermission();
    expect(screen.getByText('インターミッション')).toBeDefined();
  });

  it('ラウンド情報が表示される', () => {
    renderIntermission();
    expect(screen.getByText('ラウンド 1 終了')).toBeDefined();
  });

  it('次のスカウト担当ラベルが表示される', () => {
    renderIntermission();
    expect(screen.getByText('次のスカウト担当')).toBeDefined();
  });

  it('次のスカウト担当として players[1] のプレイヤー名（ボブ）が表示される', () => {
    renderIntermission();
    // players[1] = ボブ が次スカウト
    expect(screen.getAllByText('ボブ').length).toBeGreaterThanOrEqual(1);
  });

  it('スカウト交代の矢印表示にプレイヤー名が使われる（固定「A/B」でない）', () => {
    renderIntermission();
    // "アリス → ボブ" のような表示が含まれる
    expect(screen.getByText('アリス → ボブ')).toBeDefined();
  });

  it('「次のラウンドへ」ボタンで scout フェーズに遷移する', () => {
    renderIntermission();
    fireEvent.click(screen.getByRole('button', { name: '次のラウンドへ' }));
    expect(screen.getByTestId('after-intermission').textContent).toBe('phase: scout');
  });
});
