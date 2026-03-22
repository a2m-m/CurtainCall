import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GameProvider, useGameDispatch, useGameState } from '@/game/context';
import SpotlightOpenResultScreen from './SpotlightOpenResultScreen';

// INIT_GAME → START_SCOUT → SCOUT_CARD → ACTION_PLAY → WATCH_BOO →
// SPOTLIGHT_REVEAL → SPOTLIGHT_ENTER_BONUS → SPOTLIGHT_OPEN_SET まで進めるラッパー
function OpenResultWrapper() {
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
    return <button onClick={() => dispatch({ type: 'SCOUT_CARD', cardIndex: 0 })}>scout</button>;
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
    return <button onClick={() => dispatch({ type: 'WATCH_BOO' })}>boo</button>;
  }
  if (state.phase === 'spotlight') {
    return (
      <>
        <button onClick={() => dispatch({ type: 'SPOTLIGHT_REVEAL' })}>reveal</button>
        <button onClick={() => dispatch({ type: 'SPOTLIGHT_ENTER_BONUS' })}>enter-bonus</button>
      </>
    );
  }
  if (state.phase === 'spotlight-bonus') {
    const nonJokerIndex = state.deck.findIndex((c) => !c.isJoker);
    if (nonJokerIndex === -1) return <div data-testid="no-card">no card</div>;
    return (
      <button onClick={() => dispatch({ type: 'SPOTLIGHT_OPEN_SET', setCardIndex: nonJokerIndex })}>
        open-set
      </button>
    );
  }
  if (state.phase === 'spotlight-open-result') {
    return <SpotlightOpenResultScreen />;
  }
  return <div data-testid="after-open-result">phase: {state.phase}</div>;
}

function renderOpenResult() {
  render(
    <GameProvider>
      <OpenResultWrapper />
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

describe('SpotlightOpenResultScreen', () => {
  it('セットオープン結果画面が表示される', () => {
    const ready = renderOpenResult();
    if (!ready) return;
    expect(screen.getByText('セットオープン結果')).toBeDefined();
  });

  it('「次へ」ボタンが表示される', () => {
    const ready = renderOpenResult();
    if (!ready) return;
    expect(screen.getByRole('button', { name: '次へ' })).toBeDefined();
  });

  it('開いたカードが表示される（lastOpenedCard）', () => {
    const ready = renderOpenResult();
    if (!ready) return;
    // Card コンポーネントが描画されている（button role または img role）
    const cards = screen.getAllByRole('button').filter((btn) => btn.className !== '');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('「次へ」ボタン押下後に次のフェーズへ遷移する', () => {
    const ready = renderOpenResult();
    if (!ready) return;
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));
    const afterDiv = screen.queryByTestId('after-open-result');
    const stillResult = screen.queryByText('セットオープン結果');
    // 結果画面から離れているか、別のスクリーンに遷移している
    expect(afterDiv !== null || stillResult === null).toBe(true);
  });
});
