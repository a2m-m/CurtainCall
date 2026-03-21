import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GameProvider, useGameDispatch, useGameState } from '@/game/context';
import GameRouter from './GameRouter';

function RouterWrapper() {
  const dispatch = useGameDispatch();
  const state = useGameState();
  return (
    <>
      {state.phase === 'standby' && state.players[0].name === '' && (
        <button
          onClick={() =>
            dispatch({ type: 'INIT_GAME', playerAName: 'アリス', playerBName: 'ボブ' })
          }
        >
          init
        </button>
      )}
      {state.phase === 'standby' && state.players[0].name !== '' && (
        <button onClick={() => dispatch({ type: 'START_SCOUT' })}>start</button>
      )}
      <GameRouter />
    </>
  );
}

function renderInScout() {
  render(
    <GameProvider>
      <RouterWrapper />
    </GameProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'init' }));
  fireEvent.click(screen.getByRole('button', { name: 'start' }));
}

describe('GameRouter: PhaseHeader と InfoOverlay の統合', () => {
  it('scout フェーズで「スカウトフェーズ」が表示される', () => {
    renderInScout();
    expect(screen.getByText('スカウトフェーズ')).toBeDefined();
  });

  it('scout フェーズでアクティブプレイヤー名（アリス）が表示される', () => {
    renderInScout();
    expect(screen.getAllByText('アリス').length).toBeGreaterThan(0);
  });

  it('📊ボタンが表示される', () => {
    renderInScout();
    expect(screen.getByRole('button', { name: 'ゲーム情報を開く' })).toBeDefined();
  });

  it('📊ボタンをクリックすると InfoOverlay（ゲーム情報ダイアログ）が開く', () => {
    renderInScout();
    fireEvent.click(screen.getByRole('button', { name: 'ゲーム情報を開く' }));
    expect(screen.getByRole('dialog', { name: 'ゲーム情報' })).toBeDefined();
  });

  it('InfoOverlay の閉じるボタンで閉じる', () => {
    renderInScout();
    fireEvent.click(screen.getByRole('button', { name: 'ゲーム情報を開く' }));
    fireEvent.click(screen.getByRole('button', { name: '閉じる' }));
    expect(screen.queryByRole('dialog', { name: 'ゲーム情報' })).toBeNull();
  });
});
