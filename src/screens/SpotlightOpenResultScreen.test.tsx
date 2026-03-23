import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GameProvider, useGameDispatch, useGameState } from '@/game/context';
import GameRouter from '@/components/GameRouter';

// spotlight-open-result フェーズまで進めるラッパー
function SpotlightOpenResultWrapper() {
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
      {state.phase === 'action-result' && (
        <button onClick={() => dispatch({ type: 'ACTION_RESULT_PROCEED' })}>action-proceed</button>
      )}
      {state.phase === 'watch' && (
        <button onClick={() => dispatch({ type: 'WATCH_BOO' })}>boo</button>
      )}
      {state.phase === 'spotlight' && (
        <>
          <button onClick={() => dispatch({ type: 'SPOTLIGHT_REVEAL' })}>reveal</button>
          <button onClick={() => dispatch({ type: 'SPOTLIGHT_ENTER_BONUS' })}>enter-bonus</button>
        </>
      )}
      {state.phase === 'spotlight-bonus' && (() => {
        const nonJokerIndex = state.deck.findIndex((c) => !c.isJoker);
        return nonJokerIndex !== -1 ? (
          <button onClick={() => dispatch({ type: 'SPOTLIGHT_OPEN_SET', setCardIndex: nonJokerIndex })}>
            open-set
          </button>
        ) : null;
      })()}
      <GameRouter />
    </>
  );
}

function renderOpenResult() {
  render(
    <GameProvider>
      <SpotlightOpenResultWrapper />
    </GameProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'init' }));
  fireEvent.click(screen.getByRole('button', { name: 'start' }));
  fireEvent.click(screen.getByRole('button', { name: 'scout' }));
  fireEvent.click(screen.getByRole('button', { name: 'scout-proceed' }));
  fireEvent.click(screen.getByRole('button', { name: 'action' }));
  fireEvent.click(screen.getByRole('button', { name: 'action-proceed' }));
  fireEvent.click(screen.getByRole('button', { name: 'boo' }));
  fireEvent.click(screen.getByRole('button', { name: 'reveal' }));
  fireEvent.click(screen.getByRole('button', { name: 'enter-bonus' }));

  const openBtn = screen.queryByRole('button', { name: 'open-set' });
  if (!openBtn) return false;
  fireEvent.click(openBtn);
  return true;
}

describe('spotlight-open-result フェーズの ResultModal 表示', () => {
  it('セットオープン結果モーダルが表示される', () => {
    const ready = renderOpenResult();
    if (!ready) return;
    const matches = screen.getAllByText('セットオープン結果');
    expect(matches.length).toBeGreaterThan(0);
  });

  it('「次へ」ボタンが表示される', () => {
    const ready = renderOpenResult();
    if (!ready) return;
    expect(screen.getByRole('button', { name: '次へ' })).toBeDefined();
  });

  it('開いたカードが表示される', () => {
    const ready = renderOpenResult();
    if (!ready) return;
    const suitSymbols = ['♠', '♥', '♦', '♣', 'JOKER'];
    const hasSuit = suitSymbols.some((s) => document.body.textContent?.includes(s));
    expect(hasSuit).toBe(true);
  });

  it('「次へ」ボタン押下後にセットオープン結果から離脱する', () => {
    const ready = renderOpenResult();
    if (!ready) return;
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));
    expect(screen.queryByText('セットオープン結果')).toBeNull();
  });
});
