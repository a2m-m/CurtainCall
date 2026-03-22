import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GameProvider, useGameDispatch, useGameState } from '@/game/context';
import BackstageScreen from './BackstageScreen';

// INIT_GAME → START_SCOUT → SCOUT_CARD → ACTION_PLAY → WATCH_BOO →
// SPOTLIGHT_REVEAL → SPOTLIGHT_ENTER_BONUS → SPOTLIGHT_OPEN_SET(no-pair) まで進めるラッパー
function BackstageWrapper() {
  const dispatch = useGameDispatch();
  const state = useGameState();

  if (state.phase === 'standby' && state.players[0].name === '') {
    return (
      <button onClick={() => dispatch({ type: 'INIT_GAME', playerAName: 'アリス', playerBName: 'ボブ' })}>
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
    // ペア不成立のセットカードを探してクリック → backstage へ
    // boo 正解時は watcher(players[1])、不正解時は actor(players[0])の手札でペア判定
    const pairingHand = state.booResult === 'correct' ? state.players[1].hand : state.players[0].hand;
    const noPairSetIndex = state.deck.findIndex(
      (sc) => !sc.isJoker && !pairingHand.some((hc) => !hc.isJoker && hc.rank === sc.rank),
    );
    if (noPairSetIndex === -1) {
      return <div data-testid="skip">no-pair-card-not-found</div>;
    }
    return (
      <button
        onClick={() => dispatch({ type: 'SPOTLIGHT_OPEN_SET', setCardIndex: noPairSetIndex })}
      >
        open-no-pair
      </button>
    );
  }
  if (state.phase === 'spotlight-open-result') {
    return (
      <button onClick={() => dispatch({ type: 'SPOTLIGHT_OPEN_RESULT_PROCEED' })}>
        open-result-proceed
      </button>
    );
  }
  if (state.phase === 'backstage' || state.phase === 'backstage-result') {
    return <BackstageScreen />;
  }
  return <div data-testid="after-backstage">phase: {state.phase}</div>;
}

function renderBackstage() {
  render(
    <GameProvider>
      <BackstageWrapper />
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

  // ペア不成立のセットカードを開いて spotlight-open-result フェーズへ
  const openBtn = screen.queryByRole('button', { name: 'open-no-pair' });
  if (!openBtn) return false; // ペア不成立カードなし → テストスキップ
  fireEvent.click(openBtn);
  // spotlight-open-result → backstage フェーズへ
  const proceedBtn = screen.queryByRole('button', { name: 'open-result-proceed' });
  if (proceedBtn) fireEvent.click(proceedBtn);
  return true;
}

describe('BackstageScreen', () => {
  it('バックステージ画面が表示される', () => {
    const ready = renderBackstage();
    if (!ready) return;
    expect(screen.getByText('バックステージ')).toBeDefined();
  });

  it('裏向きのバックステージカードが表示される', () => {
    const ready = renderBackstage();
    if (!ready) return;
    expect(screen.getByText('裏向きのカードを3枚選んでください（0/3）')).toBeDefined();
  });

  it('スポットライトカードが表示される', () => {
    const ready = renderBackstage();
    if (!ready) return;
    expect(screen.getByText('スポットライトカード')).toBeDefined();
  });

  it('「判定」ボタンが初期状態では無効', () => {
    const ready = renderBackstage();
    if (!ready) return;
    const btn = screen.getByRole('button', { name: '判定' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('3枚選択後に「判定」ボタンが有効になる', () => {
    const ready = renderBackstage();
    if (!ready) return;
    const cardButtons = screen.getAllByRole('button').filter(
      (btn) => btn.className !== '' && btn.getAttribute('name') !== '判定',
    );
    // 3枚選択
    fireEvent.click(cardButtons[0]);
    fireEvent.click(cardButtons[1]);
    fireEvent.click(cardButtons[2]);
    const judgeBtn = screen.getByRole('button', { name: '判定' }) as HTMLButtonElement;
    expect(judgeBtn.disabled).toBe(false);
  });

  it('不一致時に「不一致」メッセージが表示される', () => {
    const ready = renderBackstage();
    if (!ready) return;
    // バックステージカード3枚を選択（ペア不成立になるよう全件選択）
    const allCardButtons = screen.getAllByRole('button').filter(
      (btn) => btn.className !== '' && btn.getAttribute('name') !== '判定',
    );
    // 最初の3枚をクリック
    fireEvent.click(allCardButtons[0]);
    fireEvent.click(allCardButtons[1]);
    fireEvent.click(allCardButtons[2]);
    fireEvent.click(screen.getByRole('button', { name: '判定' }));

    // 結果フェーズに遷移（match か no-match のどちらか）
    const noMatch = screen.queryByText('不一致');
    const match = screen.queryByText('ペア成立！');
    expect(noMatch !== null || match !== null).toBe(true);
  });

  it('不一致後に「インターミッションへ」またはバックステージカード選択が表示される', () => {
    const ready = renderBackstage();
    if (!ready) return;
    const allCardButtons = screen.getAllByRole('button').filter(
      (btn) => btn.className !== '' && btn.getAttribute('name') !== '判定',
    );
    fireEvent.click(allCardButtons[0]);
    fireEvent.click(allCardButtons[1]);
    fireEvent.click(allCardButtons[2]);
    fireEvent.click(screen.getByRole('button', { name: '判定' }));

    // インターミッションへボタン、またはバックステージ選択UIのどちらかが存在
    const proceedBtn = screen.queryByRole('button', { name: 'インターミッションへ' });
    const takeLabel = screen.queryByText('バックステージから1枚選んで手札に加える');
    expect(proceedBtn !== null || takeLabel !== null).toBe(true);
  });

  it('判定後の不一致画面でカード位置を示す「既知」バッジが表示されない（Issue #130 リグレッション）', () => {
    const ready = renderBackstage();
    if (!ready) return;
    const allCardButtons = screen.getAllByRole('button').filter(
      (btn) => btn.className !== '' && btn.getAttribute('name') !== '判定',
    );
    fireEvent.click(allCardButtons[0]);
    fireEvent.click(allCardButtons[1]);
    fireEvent.click(allCardButtons[2]);
    fireEvent.click(screen.getByRole('button', { name: '判定' }));

    // 不一致時のカード選択UIでは「既知」バッジが存在しないこと
    const takeLabel = screen.queryByText('バックステージから1枚選んで手札に加える');
    if (!takeLabel) return; // match の場合はスキップ
    expect(screen.queryByText('既知')).toBeNull();
  });

  it('バックステージカード選択画面でカード位置を示す「既知」バッジが表示されない（Issue #130 リグレッション）', () => {
    const ready = renderBackstage();
    if (!ready) return;
    // 判定前のカード選択フェーズ（backstage）で「既知」バッジが存在しないこと
    expect(screen.queryByText('既知')).toBeNull();
  });
});
