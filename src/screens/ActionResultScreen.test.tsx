import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GameProvider, useGameDispatch, useGameState } from '@/game/context';
import GameRouter from '@/components/GameRouter';

// action-result フェーズまで進めるラッパー
function ActionResultWrapper() {
  const dispatch = useGameDispatch();
  const state = useGameState();

  return (
    <>
      {state.phase === 'standby' && state.players[0].name === '' && (
        <button onClick={() => dispatch({ type: 'INIT_GAME', playerAName: 'アリス', playerBName: 'ボブ' })}>
          init
        </button>
      )}
      {state.phase === 'standby' && state.players[0].name !== '' && (
        <button onClick={() => dispatch({ type: 'START_SCOUT' })}>start</button>
      )}
      {state.phase === 'scout' && (
        <button onClick={() => dispatch({ type: 'SCOUT_CARD', cardIndex: 0 })}>scout</button>
      )}
      {state.phase === 'scout-result' && (
        <button onClick={() => dispatch({ type: 'SCOUT_RESULT_PROCEED' })}>scout-proceed</button>
      )}
      {state.phase === 'action' && (
        <button onClick={() => dispatch({ type: 'ACTION_PLAY', kamiIndex: 0, shimoIndex: 1 })}>action</button>
      )}
      <GameRouter />
    </>
  );
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
  fireEvent.click(screen.getByRole('button', { name: 'scout-proceed' }));
  fireEvent.click(screen.getByRole('button', { name: 'action' }));
}

describe('action-result フェーズの ResultModal 表示', () => {
  it('ステージ確認モーダルが表示される', () => {
    renderActionResult();
    expect(screen.getByText('ステージ確認')).toBeDefined();
  });

  it('「ウォッチへ」ボタンが表示される', () => {
    renderActionResult();
    expect(screen.getByRole('button', { name: 'ウォッチへ' })).toBeDefined();
  });

  it('「ウォッチへ」をタップすると watch フェーズへ進む', () => {
    renderActionResult();
    fireEvent.click(screen.getByRole('button', { name: 'ウォッチへ' }));
    expect(screen.getByText('ウォッチフェーズ')).toBeDefined();
  });
});
