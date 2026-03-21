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

// 指定した reason で CURTAIN_CALL を発火するラッパー
function ReasonWrapper({ reason }: { reason: 'joker' | 'set-last-1' | 'hand-shortage' }) {
  const dispatch = useGameDispatch();
  const state = useGameState();

  if (state.phase !== 'curtain-call') {
    return (
      <button onClick={() => dispatch({ type: 'CURTAIN_CALL', reason })}>curtain-call</button>
    );
  }
  return <ResultScreen />;
}

function renderWithReason(reason: 'joker' | 'set-last-1' | 'hand-shortage') {
  render(
    <GameProvider>
      <ReasonWrapper reason={reason} />
    </GameProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'curtain-call' }));
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

  it('reason=joker のとき「ジョーカーが登場しました」が表示される', () => {
    renderWithReason('joker');
    expect(screen.getByText('ジョーカーが登場しました')).toBeDefined();
  });

  it('reason=set-last-1 のとき正しいメッセージが表示される', () => {
    renderWithReason('set-last-1');
    expect(screen.getByText('セットの裏向きカードが残り1枚になりました')).toBeDefined();
  });

  it('reason=hand-shortage のとき正しいメッセージが表示される', () => {
    renderWithReason('hand-shortage');
    expect(screen.getByText('手札不足により継続不能となりました')).toBeDefined();
  });
});
