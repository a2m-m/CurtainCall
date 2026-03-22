import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import * as gameContext from '@/game/context';
import { GameProvider, useGameDispatch, useGameState } from '@/game/context';
import ActionScreen from './ActionScreen';
import type { GameState } from '@/types/game';

// INIT_GAME → START_SCOUT → SCOUT_CARD → action フェーズまで進めるラッパー
function ActionWrapper() {
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
  if (state.phase === 'scout-result') {
    return (
      <button onClick={() => dispatch({ type: 'SCOUT_RESULT_PROCEED' })}>scout-proceed</button>
    );
  }
  if (state.phase === 'action') {
    return <ActionScreen />;
  }
  return <div data-testid="after-action">phase: {state.phase}</div>;
}

function renderAction() {
  render(
    <GameProvider>
      <ActionWrapper />
    </GameProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'init' }));
  fireEvent.click(screen.getByRole('button', { name: 'start' }));
  fireEvent.click(screen.getByRole('button', { name: 'scout' }));
  fireEvent.click(screen.getByRole('button', { name: 'scout-proceed' }));
}

describe('ActionScreen', () => {
  it('アクション画面が表示される', () => {
    renderAction();
    expect(screen.getByText('アクション')).toBeDefined();
  });

  it('手札が表向きで表示される', () => {
    renderAction();
    // 表向きカードはスート・ランクのいずれかが含まれる（role="button"でclickable）
    // 少なくとも16枚（スカウト後: 15+1=16枚）表示される
    const buttons = screen.getAllByRole('button');
    // ステージへ出すボタン + 手札分
    expect(buttons.length).toBeGreaterThanOrEqual(16);
  });

  it('直前のスカウトで引いたカードが表示される', () => {
    renderAction();
    expect(screen.getByText('直前のスカウト')).toBeDefined();
  });

  it('初期状態で「ステージへ出す」ボタンはdisabled', () => {
    renderAction();
    const btn = screen.getByRole('button', { name: 'ステージへ出す' });
    expect(btn.hasAttribute('disabled')).toBe(true);
  });

  it('役者札を選択するとプレビューエリアに表示される', () => {
    renderAction();
    const cardButtons = screen.getAllByRole('button').filter(
      (b) => b.getAttribute('aria-label') !== 'ステージへ出す',
    );
    fireEvent.click(cardButtons[0]);
    expect(screen.getByText('役者（カミ）')).toBeDefined();
    // 確定ボタンはまだdisabled（黒子未選択）
    expect(screen.getByRole('button', { name: 'ステージへ出す' }).hasAttribute('disabled')).toBe(true);
  });

  it('役者札を選択する前は「ステージへ出す」はdisabled', () => {
    renderAction();
    expect(screen.getByRole('button', { name: 'ステージへ出す' }).hasAttribute('disabled')).toBe(true);
  });

  it('役者札・黒子札を選択後に「ステージへ出す」が有効になる', () => {
    renderAction();
    const cardButtons = screen.getAllByRole('button').filter(
      (b) => b.getAttribute('aria-label') !== 'ステージへ出す',
    );
    // 役者札を選択
    fireEvent.click(cardButtons[0]);
    // 黒子札を選択（別のカード）
    fireEvent.click(cardButtons[1]);
    expect(screen.getByRole('button', { name: 'ステージへ出す' }).hasAttribute('disabled')).toBe(false);
  });

  it('同一カードを役者・黒子の両方に選択できない', () => {
    renderAction();
    const cardButtons = screen.getAllByRole('button').filter(
      (b) => b.getAttribute('aria-label') !== 'ステージへ出す',
    );
    // 役者札を選択
    fireEvent.click(cardButtons[0]);
    // 同じカードをもう一度クリック → 無視されるはず
    fireEvent.click(cardButtons[0]);
    // 確定ボタンはまだdisabled
    expect(screen.getByRole('button', { name: 'ステージへ出す' }).hasAttribute('disabled')).toBe(true);
  });

  it('役者札選択後に同じカードを再タップするとselectingActorに戻る', () => {
    renderAction();
    const cardButtons = screen.getAllByRole('button').filter(
      (b) => b.getAttribute('aria-label') !== 'ステージへ出す',
    );
    // card[0]を役者として選択、再タップで解除
    fireEvent.click(cardButtons[0]);
    fireEvent.click(cardButtons[0]);
    // selectingActorに戻っているはずなので、次に別カードをタップすると役者になる（黒子にはならない）
    // → 確定ボタンはまだdisabled（黒子未選択）
    fireEvent.click(cardButtons[1]);
    expect(screen.getByRole('button', { name: 'ステージへ出す' }).hasAttribute('disabled')).toBe(true);
  });

  it('確定後に黒子札をタップすると選択が解除されてボタンがdisabledになる', () => {
    renderAction();
    const cardButtons = screen.getAllByRole('button').filter(
      (b) => b.getAttribute('aria-label') !== 'ステージへ出す',
    );
    fireEvent.click(cardButtons[0]); // 役者
    fireEvent.click(cardButtons[1]); // 黒子 → confirmed
    expect(screen.getByRole('button', { name: 'ステージへ出す' }).hasAttribute('disabled')).toBe(false);
    // 黒子札を再タップ → 解除
    fireEvent.click(cardButtons[1]);
    expect(screen.getByRole('button', { name: 'ステージへ出す' }).hasAttribute('disabled')).toBe(true);
  });

  it('確定後に役者札をタップすると両方の選択が解除される', () => {
    renderAction();
    const cardButtons = screen.getAllByRole('button').filter(
      (b) => b.getAttribute('aria-label') !== 'ステージへ出す',
    );
    fireEvent.click(cardButtons[0]); // 役者
    fireEvent.click(cardButtons[1]); // 黒子 → confirmed
    // 役者札を再タップ → 両方解除
    fireEvent.click(cardButtons[0]);
    expect(screen.getByRole('button', { name: 'ステージへ出す' }).hasAttribute('disabled')).toBe(true);
  });

  it('「ステージへ出す」でPassDevice画面に遷移する', () => {
    renderAction();
    const cardButtons = screen.getAllByRole('button').filter(
      (b) => b.getAttribute('aria-label') !== 'ステージへ出す',
    );
    fireEvent.click(cardButtons[0]);
    fireEvent.click(cardButtons[1]);
    fireEvent.click(screen.getByRole('button', { name: 'ステージへ出す' }));
    expect(screen.getByText('さんに渡してください')).toBeDefined();
  });

  it('PassDevice完了後にwatchフェーズへ遷移する（長押しボタンが表示される）', () => {
    renderAction();
    const cardButtons = screen.getAllByRole('button').filter(
      (b) => b.getAttribute('aria-label') !== 'ステージへ出す',
    );
    fireEvent.click(cardButtons[0]);
    fireEvent.click(cardButtons[1]);
    fireEvent.click(screen.getByRole('button', { name: 'ステージへ出す' }));
    expect(screen.getByRole('button', { name: '長押しで進む' })).toBeDefined();
  });

  it('PassDeviceにはウォッチャー（ボブ）の名前が表示される', () => {
    renderAction();
    const cardButtons = screen.getAllByRole('button').filter(
      (b) => b.getAttribute('aria-label') !== 'ステージへ出す',
    );
    fireEvent.click(cardButtons[0]);
    fireEvent.click(cardButtons[1]);
    fireEvent.click(screen.getByRole('button', { name: 'ステージへ出す' }));
    // PassDevice はウォッチャー（ボブ）に渡すもの
    expect(screen.getByText('ボブ')).toBeDefined();
    // アクター（アリス）の名前は表示されない
    expect(screen.queryByText('アリス')).toBeNull();
  });

  it('場のカード欄が表示される（Issue #132 リグレッション）', () => {
    renderAction();
    expect(screen.getByText('場のカード')).toBeDefined();
  });
});

// INTERMISSION でスワップされた後も PassDevice が正しいウォッチャー名を表示することを確認
describe('ActionScreen ラウンド2', () => {
  function Round2ActionWrapper() {
    const dispatch = useGameDispatch();
    const state = useGameState();

    if (state.phase === 'standby' && state.players[0].name === '') {
      return <button onClick={() => dispatch({ type: 'INIT_GAME', playerAName: 'アリス', playerBName: 'ボブ' })}>init</button>;
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
    // ラウンド1のアクション: アリス（players[0]）が actor → 自動で ACTION_PLAY
    if (state.phase === 'action' && state.players[0].name === 'アリス') {
      return <button onClick={() => dispatch({ type: 'ACTION_PLAY', kamiIndex: 0, shimoIndex: 1 })}>action1</button>;
    }
    if (state.phase === 'action-result' && state.players[0].name === 'アリス') {
      return <button onClick={() => dispatch({ type: 'ACTION_RESULT_PROCEED' })}>action-proceed1</button>;
    }
    if (state.phase === 'watch') {
      return <button onClick={() => dispatch({ type: 'WATCH_CLAP' })}>clap</button>;
    }
    if (state.phase === 'intermission') {
      return <button onClick={() => dispatch({ type: 'INTERMISSION' })}>inter</button>;
    }
    // ラウンド2のアクション: ボブ（players[0]）が actor → ActionScreen を表示
    if (state.phase === 'action' && state.players[0].name === 'ボブ') {
      return <ActionScreen />;
    }
    return <div data-testid="phase">{state.phase}</div>;
  }

  function renderActionRound2() {
    render(
      <GameProvider>
        <Round2ActionWrapper />
      </GameProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'init' }));
    fireEvent.click(screen.getByRole('button', { name: 'start' }));
    fireEvent.click(screen.getByRole('button', { name: 'scout' }));        // Round 1 scout
    fireEvent.click(screen.getByRole('button', { name: 'scout-proceed' })); // scout-result → action
    fireEvent.click(screen.getByRole('button', { name: 'action1' }));      // Round 1 action
    fireEvent.click(screen.getByRole('button', { name: 'action-proceed1' })); // action-result → watch
    fireEvent.click(screen.getByRole('button', { name: 'clap' }));         // Watch → Intermission
    fireEvent.click(screen.getByRole('button', { name: 'inter' }));        // Intermission → Round 2 scout
    fireEvent.click(screen.getByRole('button', { name: 'scout' }));        // Round 2 scout
    fireEvent.click(screen.getByRole('button', { name: 'scout-proceed' })); // scout-result → Round 2 action
  }

  it('ラウンド2のPassDeviceには新しいウォッチャー（アリス）の名前が表示される', () => {
    renderActionRound2();
    const cardButtons = screen.getAllByRole('button').filter(
      (b) => b.getAttribute('aria-label') !== 'ステージへ出す',
    );
    fireEvent.click(cardButtons[0]);
    fireEvent.click(cardButtons[1]);
    fireEvent.click(screen.getByRole('button', { name: 'ステージへ出す' }));
    // ラウンド2ではアリスがウォッチャー
    expect(screen.getByText('アリス')).toBeDefined();
    // アクター（ボブ）の名前は表示されない
    expect(screen.queryByText('ボブ')).toBeNull();
  });
});

describe('ActionScreen lastScoutedCard=null', () => {
  const nullScoutState: GameState = {
    phase: 'action',
    players: [
      { id: 'A', name: 'アリス', hand: [] },
      { id: 'B', name: 'ボブ', hand: [] },
    ],
    stage: { kami: null, shimo: null },
    deck: [],
    backstage: [],
    setRemainingCount: 9,
    publicInfos: [],
    playerABooCnt: 0,
    playerBBooCnt: 0,
    playerAKami: [],
    playerBKami: [],
    playerAShimo: [],
    playerBShimo: [],
    round: 1,
    curtainCallReason: null,
    booResult: null,
    spotlightCard: null,
    backstageRevealedCards: [],
    backstageResult: null,
    backstagePlayerId: null,
    lastOpenedCard: null,
    spotlightOpenResultNextPhase: null,
    lastScoutedCard: null,
    lastBackstageDrawnCard: null,
  };

  it('lastScoutedCard が null の場合は「直前のスカウト」が表示されない', () => {
    const spy = vi.spyOn(gameContext, 'useGameState').mockReturnValue(nullScoutState);

    render(<ActionScreen />);
    expect(screen.queryByText('直前のスカウト')).toBeNull();

    spy.mockRestore();
  });
});
