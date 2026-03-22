import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GameProvider, useGameDispatch, useGameState } from '@/game/context';
import StageOverview from './StageOverview';

function StageOverviewWrapper() {
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
  return <StageOverview />;
}

function renderOverview() {
  render(
    <GameProvider>
      <StageOverviewWrapper />
    </GameProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'init' }));
}

describe('StageOverview', () => {
  it('「場のカード」ラベルが表示される', () => {
    renderOverview();
    expect(screen.getByText('場のカード')).toBeDefined();
  });

  it('両プレイヤーの名前が表示される', () => {
    renderOverview();
    expect(screen.getByText('アリス')).toBeDefined();
    expect(screen.getByText('ボブ')).toBeDefined();
  });

  it('カードがない場合は「—」が4つ表示される', () => {
    renderOverview();
    // 初期状態は蓄積カードなし → カミ・シモ × 2プレイヤー = 4つ
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBe(4);
  });
});
