import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GameProvider, useGameDispatch, useGameState } from '@/game/context';
import ScoutResultScreen from './ScoutResultScreen';

function ScoutResultWrapper() {
  const dispatch = useGameDispatch();
  const state = useGameState();

  if (state.phase === 'standby' && state.players[0].name === '') {
    return (
      <button onClick={() => dispatch({ type: 'INIT_GAME', playerAName: 'アリス', playerBName: 'ボブ' })}>
        init
      </button>
    );
  }
  if (state.phase === 'standby') {
    return <button onClick={() => dispatch({ type: 'START_SCOUT' })}>start</button>;
  }
  if (state.phase === 'scout') {
    return <button onClick={() => dispatch({ type: 'SCOUT_CARD', cardIndex: 0 })}>scout</button>;
  }
  if (state.phase === 'scout-result') {
    return <ScoutResultScreen />;
  }
  return <div data-testid="after-scout-result">phase: {state.phase}</div>;
}

function renderScoutResult() {
  render(
    <GameProvider>
      <ScoutResultWrapper />
    </GameProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'init' }));
  fireEvent.click(screen.getByRole('button', { name: 'start' }));
  fireEvent.click(screen.getByRole('button', { name: 'scout' }));
}

describe('ScoutResultScreen', () => {
  it('スカウト完了画面が表示される', () => {
    renderScoutResult();
    expect(screen.getByText('スカウト完了')).toBeDefined();
  });

  it('手札枚数の案内が表示される', () => {
    renderScoutResult();
    expect(screen.getByText(/手札/)).toBeDefined();
  });

  it('「アクションへ」ボタンが表示される', () => {
    renderScoutResult();
    expect(screen.getByRole('button', { name: 'アクションへ' })).toBeDefined();
  });

  it('「アクションへ」をタップすると action フェーズへ進む', () => {
    renderScoutResult();
    fireEvent.click(screen.getByRole('button', { name: 'アクションへ' }));
    expect(screen.getByTestId('after-scout-result').textContent).toBe('phase: action');
  });
});
