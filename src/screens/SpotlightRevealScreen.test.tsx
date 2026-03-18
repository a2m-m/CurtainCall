import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GameProvider, useGameDispatch, useGameState } from '@/game/context';
import SpotlightRevealScreen from './SpotlightRevealScreen';

// INIT_GAME → START_SCOUT → SCOUT_CARD → ACTION_PLAY → WATCH_BOO → spotlight フェーズまで進めるラッパー
function SpotlightWrapper() {
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
    return <button onClick={() => dispatch({ type: 'WATCH_BOO' })}>boo</button>;
  }
  if (state.phase === 'spotlight') {
    return <SpotlightRevealScreen />;
  }
  return <div data-testid="after-spotlight">phase: {state.phase}</div>;
}

function renderSpotlight() {
  render(
    <GameProvider>
      <SpotlightWrapper />
    </GameProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'init' }));
  fireEvent.click(screen.getByRole('button', { name: 'start' }));
  fireEvent.click(screen.getByRole('button', { name: 'scout' }));
  fireEvent.click(screen.getByRole('button', { name: 'action' }));
  fireEvent.click(screen.getByRole('button', { name: 'boo' }));
}

describe('SpotlightRevealScreen', () => {
  it('スポットライト画面が表示される', () => {
    renderSpotlight();
    expect(screen.getByText('スポットライト')).toBeDefined();
  });

  it('役者（カミ）と黒子（シモ）のスロットが表示される', () => {
    renderSpotlight();
    expect(screen.getByText('役者（カミ）')).toBeDefined();
    expect(screen.getByText('黒子（シモ）')).toBeDefined();
  });

  it('開示前: 「黒子札を開示」ボタンが表示される', () => {
    renderSpotlight();
    expect(screen.getByRole('button', { name: '黒子札を開示' })).toBeDefined();
  });

  it('開示後: 「黒子札を開示」ボタンが消える', () => {
    renderSpotlight();
    fireEvent.click(screen.getByRole('button', { name: '黒子札を開示' }));
    expect(screen.queryByRole('button', { name: '黒子札を開示' })).toBeNull();
  });

  it('開示後: ブーイング正解またはブーイング不正解が表示される', () => {
    renderSpotlight();
    fireEvent.click(screen.getByRole('button', { name: '黒子札を開示' }));
    const correct = screen.queryByText('ブーイング正解！');
    const incorrect = screen.queryByText('ブーイング不正解！');
    expect(correct !== null || incorrect !== null).toBe(true);
  });

  it('開示後: セットを開くまたはスキップボタンが表示される', () => {
    renderSpotlight();
    fireEvent.click(screen.getByRole('button', { name: '黒子札を開示' }));
    expect(screen.getByRole('button', { name: 'セットを開く' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'スキップ' })).toBeDefined();
  });

  it('スキップで backstage フェーズに遷移する', () => {
    renderSpotlight();
    fireEvent.click(screen.getByRole('button', { name: '黒子札を開示' }));
    fireEvent.click(screen.getByRole('button', { name: 'スキップ' }));
    expect(screen.getByTestId('after-spotlight').textContent).toBe('phase: backstage');
  });
});
