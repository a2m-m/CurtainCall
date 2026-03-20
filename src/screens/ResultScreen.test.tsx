import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GameProvider, useGameDispatch, useGameState } from '@/game/context';
import ResultScreen from './ResultScreen';

// INIT_GAME → CURTAIN_CALL まで進めるラッパー（プレイヤー名あり）
function ResultWrapper() {
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
  if (state.phase !== 'curtain-call') {
    return (
      <button onClick={() => dispatch({ type: 'CURTAIN_CALL', reason: 'joker' })}>
        curtain-call
      </button>
    );
  }
  return <ResultScreen />;
}

// CURTAIN_CALL を initialState から直接発火（両プレイヤーの手札空 → 引き分け確定）
function DrawWrapper() {
  const dispatch = useGameDispatch();
  const state = useGameState();

  if (state.phase !== 'curtain-call') {
    return (
      <button onClick={() => dispatch({ type: 'CURTAIN_CALL', reason: 'joker' })}>
        curtain-call
      </button>
    );
  }
  return <ResultScreen />;
}

function renderResult() {
  render(
    <GameProvider>
      <ResultWrapper />
    </GameProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'init' }));
  fireEvent.click(screen.getByRole('button', { name: 'curtain-call' }));
}

function renderDraw() {
  render(
    <GameProvider>
      <DrawWrapper />
    </GameProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'curtain-call' }));
}

describe('ResultScreen', () => {
  it('カーテンコール見出しが表示される', () => {
    renderResult();
    expect(screen.getByText('カーテンコール')).toBeDefined();
  });

  it('両プレイヤー名が表示される', () => {
    renderResult();
    expect(screen.getAllByText('アリス').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ボブ').length).toBeGreaterThan(0);
  });

  it('スコアテーブルのラベルが表示される', () => {
    renderResult();
    expect(screen.getByText('カミ合計')).toBeDefined();
    expect(screen.getByText('手札合計')).toBeDefined();
    expect(screen.getByText('ペナルティ')).toBeDefined();
    expect(screen.getByText('最終ポイント')).toBeDefined();
  });

  it('勝者またはドローが表示される', () => {
    renderResult();
    const winner = screen.queryByText(/の勝利！/);
    const draw = screen.queryByText('引き分け');
    expect(winner !== null || draw !== null).toBe(true);
  });

  it('引き分けの場合「引き分け」が表示される', () => {
    // 手札・stage.kami ともに初期値（空・null）→ 両者 total=0 → 引き分け
    renderDraw();
    expect(screen.getByText('引き分け')).toBeDefined();
  });

  it('「もう一度」ボタンが表示される', () => {
    renderResult();
    expect(screen.getByRole('button', { name: 'もう一度' })).toBeDefined();
  });

  it('「もう一度」でRESET_GAMEがdispatchされカーテンコール画面が非表示になる', () => {
    renderResult();
    fireEvent.click(screen.getByRole('button', { name: 'もう一度' }));
    // RESET_GAME後はstandbyフェーズ → ResultScreenが非表示
    expect(screen.queryByText('カーテンコール')).toBeNull();
  });
});
