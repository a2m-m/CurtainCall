import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GameProvider, useGameDispatch, useGameState } from '@/game/context';
import SpotlightBonusScreen from './SpotlightBonusScreen';

// INIT_GAME → START_SCOUT → SCOUT_CARD → ACTION_PLAY → WATCH_BOO → SPOTLIGHT_REVEAL → SPOTLIGHT_ENTER_BONUS まで進めるラッパー
function BonusWrapper() {
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
    return (
      <>
        <button onClick={() => dispatch({ type: 'SPOTLIGHT_REVEAL' })}>reveal</button>
        <button onClick={() => dispatch({ type: 'SPOTLIGHT_ENTER_BONUS' })}>enter-bonus</button>
      </>
    );
  }
  if (state.phase === 'spotlight-bonus') {
    return <SpotlightBonusScreen />;
  }
  return <div data-testid="after-bonus">phase: {state.phase}</div>;
}

function renderBonus() {
  render(
    <GameProvider>
      <BonusWrapper />
    </GameProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'init' }));
  fireEvent.click(screen.getByRole('button', { name: 'start' }));
  fireEvent.click(screen.getByRole('button', { name: 'scout' }));
  fireEvent.click(screen.getByRole('button', { name: 'action' }));
  fireEvent.click(screen.getByRole('button', { name: 'boo' }));
  fireEvent.click(screen.getByRole('button', { name: 'reveal' }));
  fireEvent.click(screen.getByRole('button', { name: 'enter-bonus' }));
}

describe('SpotlightBonusScreen', () => {
  it('ボーナス画面が表示される', () => {
    renderBonus();
    expect(screen.getByText('セットを開く')).toBeDefined();
  });

  it('裏向きカードが表示される', () => {
    renderBonus();
    expect(screen.getByText('裏向きのカードを1枚選んでください')).toBeDefined();
  });

  it('「開かない」ボタンが表示される', () => {
    renderBonus();
    expect(screen.getByRole('button', { name: '開かない' })).toBeDefined();
  });

  it('「開かない」で intermission フェーズに遷移する（バックステージなし）', () => {
    renderBonus();
    fireEvent.click(screen.getByRole('button', { name: '開かない' }));
    expect(screen.getByTestId('after-bonus').textContent).toBe('phase: intermission');
  });

  it('セットカードをクリックすると curtain-call か backstage か intermission に遷移する', () => {
    renderBonus();
    const cardButtons = screen.getAllByRole('button').filter((btn) => btn.className !== '');
    // 裏向きカード（Card コンポーネントの button role）が存在する
    expect(cardButtons.length).toBeGreaterThan(0);
    fireEvent.click(cardButtons[0]);
    const afterDiv = screen.queryByTestId('after-bonus');
    const stillBonus = screen.queryByText('セットを開く');
    // ボーナス画面から離れているか、カーテンコール等に遷移している
    expect(afterDiv !== null || stillBonus === null).toBe(true);
  });
});
