import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GameProvider, useGameDispatch, useGameState } from '@/game/context';
import ActionResultScreen from './ActionResultScreen';

function ActionResultWrapper() {
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
    return <button onClick={() => dispatch({ type: 'SCOUT_RESULT_PROCEED' })}>scout-result-proceed</button>;
  }
  if (state.phase === 'action') {
    return (
      <button onClick={() => dispatch({ type: 'ACTION_PLAY', kamiIndex: 0, shimoIndex: 1 })}>action</button>
    );
  }
  if (state.phase === 'action-result') {
    return <ActionResultScreen />;
  }
  return <div data-testid="after-action-result">phase: {state.phase}</div>;
}

function renderActionResult() {
  render(
    <GameProvider>
      <ActionResultWrapper />
    </GameProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'init' }));
  fireEvent.click(screen.getByRole('button', { name: 'start' }));
  fireEvent.click(screen.getByRole('button', { name: 'scout' }));
  fireEvent.click(screen.getByRole('button', { name: 'scout-result-proceed' }));
  fireEvent.click(screen.getByRole('button', { name: 'action' }));
}

describe('ActionResultScreen', () => {
  it('ステージ確認画面が表示される', () => {
    renderActionResult();
    expect(screen.getByText('ステージ確認')).toBeDefined();
  });

  it('役者（カミ）ラベルが表示される', () => {
    renderActionResult();
    expect(screen.getByText('役者（カミ）')).toBeDefined();
  });

  it('黒子（シモ）ラベルが表示される', () => {
    renderActionResult();
    expect(screen.getByText('黒子（シモ）')).toBeDefined();
  });

  it('「ウォッチへ」ボタンが表示される', () => {
    renderActionResult();
    expect(screen.getByRole('button', { name: 'ウォッチへ' })).toBeDefined();
  });

  it('「ウォッチへ」をタップすると watch フェーズへ進む', () => {
    renderActionResult();
    fireEvent.click(screen.getByRole('button', { name: 'ウォッチへ' }));
    expect(screen.getByTestId('after-action-result').textContent).toBe('phase: watch');
  });
});
