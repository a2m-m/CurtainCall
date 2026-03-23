import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GameProvider, useGameDispatch, useGameState } from '@/game/context';
import GameRouter from '@/components/GameRouter';

// scout-result フェーズまで進めるラッパー
function ScoutResultWrapper() {
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
      <GameRouter />
    </>
  );
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

describe('scout-result フェーズの ResultModal 表示', () => {
  it('スカウト完了モーダルが表示される', () => {
    renderScoutResult();
    expect(screen.getByText('スカウト完了')).toBeDefined();
  });

  it('手札枚数の案内が表示される', () => {
    renderScoutResult();
    const matches = screen.getAllByText(/手札/);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('引いたカードが表示される', () => {
    renderScoutResult();
    const suitSymbols = ['♠', '♥', '♦', '♣', 'JOKER'];
    const hasSuit = suitSymbols.some((s) => document.body.textContent?.includes(s));
    expect(hasSuit).toBe(true);
  });

  it('「アクションへ」ボタンが表示される', () => {
    renderScoutResult();
    expect(screen.getByRole('button', { name: 'アクションへ' })).toBeDefined();
  });

  it('「アクションへ」をタップすると action フェーズへ進む', () => {
    renderScoutResult();
    fireEvent.click(screen.getByRole('button', { name: 'アクションへ' }));
    expect(screen.getByText('アクションフェーズ')).toBeDefined();
  });
});
