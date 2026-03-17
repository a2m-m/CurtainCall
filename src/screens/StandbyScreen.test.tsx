import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GameProvider, useGameState } from '@/game/context';
import { useGameDispatch } from '@/game/context';
import StandbyScreen from './StandbyScreen';

// INIT_GAME を dispatch してから StandbyScreen を描画するラッパー
function StandbyWrapper() {
  const dispatch = useGameDispatch();
  const state = useGameState();

  if (state.players[0].name === '') {
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
  return <StandbyScreen />;
}

function renderStandby() {
  render(
    <GameProvider>
      <StandbyWrapper />
    </GameProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'init' }));
}

describe('StandbyScreen', () => {
  it('配布サマリーが表示される', () => {
    renderStandby();
    expect(screen.getByText('カード配布完了')).toBeDefined();
    expect(screen.getByText('アリス の手札')).toBeDefined();
    expect(screen.getByText('ボブ の手札')).toBeDefined();
    expect(screen.getByText('バックステージ')).toBeDefined();
    expect(screen.getByText('セット')).toBeDefined();
  });

  it('各プレイヤーに15枚の手札が表示される', () => {
    renderStandby();
    const counts = screen.getAllByText('15 枚');
    expect(counts).toHaveLength(2);
  });

  it('バックステージが10枚と表示される', () => {
    renderStandby();
    expect(screen.getByText('10 枚')).toBeDefined();
  });

  it('セットが13枚と表示される', () => {
    renderStandby();
    expect(screen.getByText('13 枚')).toBeDefined();
  });

  it('「準備完了」ボタンが表示される', () => {
    renderStandby();
    expect(screen.getByRole('button', { name: '準備完了' })).toBeDefined();
  });

  it('「準備完了」押下でPassDevice画面に遷移する', () => {
    renderStandby();
    fireEvent.click(screen.getByRole('button', { name: '準備完了' }));
    expect(screen.getByText('さんに渡してください')).toBeDefined();
    expect(screen.getByRole('button', { name: '長押しで進む' })).toBeDefined();
  });
});
