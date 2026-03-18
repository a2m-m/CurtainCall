import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GameProvider, useGameDispatch, useGameState } from '@/game/context';
import WatchScreen from './WatchScreen';

// INIT_GAME → START_SCOUT → SCOUT_CARD → ACTION_PLAY → watch フェーズまで進めるラッパー
function WatchWrapper() {
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
    return (
      <button onClick={() => dispatch({ type: 'ACTION_PLAY', kamiIndex: 0, shimoIndex: 1 })}>
        action
      </button>
    );
  }
  if (state.phase === 'watch') {
    return <WatchScreen />;
  }
  return <div data-testid="after-watch">phase: {state.phase}</div>;
}

function renderWatch() {
  render(
    <GameProvider>
      <WatchWrapper />
    </GameProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'init' }));
  fireEvent.click(screen.getByRole('button', { name: 'start' }));
  fireEvent.click(screen.getByRole('button', { name: 'scout' }));
  fireEvent.click(screen.getByRole('button', { name: 'action' }));
}

describe('WatchScreen', () => {
  it('ウォッチ画面が表示される', () => {
    renderWatch();
    expect(screen.getByText('ウォッチ')).toBeDefined();
  });

  it('役者札（表向き）と黒子札（裏向き）のスロットが表示される', () => {
    renderWatch();
    expect(screen.getByText('役者（カミ）')).toBeDefined();
    expect(screen.getByText('黒子（シモ）')).toBeDefined();
  });

  it('「クラップ」ボタンが表示される', () => {
    renderWatch();
    expect(screen.getByRole('button', { name: 'クラップ' })).toBeDefined();
  });

  it('「ブーイング」ボタンが表示される', () => {
    renderWatch();
    expect(screen.getByRole('button', { name: 'ブーイング' })).toBeDefined();
  });

  it('「クラップ」でインターミッションフェーズに遷移する', () => {
    renderWatch();
    fireEvent.click(screen.getByRole('button', { name: 'クラップ' }));
    expect(screen.getByTestId('after-watch').textContent).toBe('phase: intermission');
  });

  it('「ブーイング」でスポットライトフェーズに遷移する', () => {
    renderWatch();
    fireEvent.click(screen.getByRole('button', { name: 'ブーイング' }));
    expect(screen.getByTestId('after-watch').textContent).toBe('phase: spotlight');
  });
});
