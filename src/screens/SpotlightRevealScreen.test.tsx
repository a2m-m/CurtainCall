import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameProvider, useGameDispatch, useGameState } from '@/game/context';
import SpotlightRevealScreen from './SpotlightRevealScreen';

// INIT_GAME → START_SCOUT → SCOUT_CARD → ACTION_PLAY → WATCH_BOO → spotlight フェーズまで進めるラッパー
function SpotlightWrapper() {
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
    return <SpotlightRevealScreen />;
  }
  return <div data-testid="after-spotlight">phase: {state.phase}</div>;
}

function renderSpotlight() {
  render(
    <GameProvider>
      <SpotlightWrapper />
    </GameProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'init' }));
  fireEvent.click(screen.getByRole('button', { name: 'start' }));
  fireEvent.click(screen.getByRole('button', { name: 'scout' }));
  fireEvent.click(screen.getByRole('button', { name: 'scout-proceed' }));
  fireEvent.click(screen.getByRole('button', { name: 'action' }));
  fireEvent.click(screen.getByRole('button', { name: 'boo' }));
}

// Math.random を 0.999 に固定 → shuffle が恒等置換になる
// 恒等シャッフル時の手札:
//   players[0]: ♠1-13, ♥1, ♥2 (15枚) + SCOUT_CARD で ♥3 追加 = [♠1..♠13, ♥1, ♥2, ♥3]
//   kamiIndex:0=♠1(rank1), shimoIndex:13=♥1(rank1) → 同ランク → booResult='incorrect'
function SpotlightBooIncorrectWrapper() {
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
    return (
      <button onClick={() => dispatch({ type: 'SCOUT_RESULT_PROCEED' })}>scout-proceed</button>
    );
  }
  if (state.phase === 'action') {
    // kamiIndex:0=♠1, shimoIndex:13=♥1 → 同ランク → boo 不正解確定
    return (
      <button
        onClick={() => dispatch({ type: 'ACTION_PLAY', kamiIndex: 0, shimoIndex: 13 })}
      >
        action
      </button>
    );
  }
  if (state.phase === 'watch') {
    return <button onClick={() => dispatch({ type: 'WATCH_BOO' })}>boo</button>;
  }
  if (state.phase === 'spotlight') {
    return <SpotlightRevealScreen />;
  }
  return <div data-testid="after-spotlight">phase: {state.phase}</div>;
}

function renderSpotlightBooIncorrect() {
  render(
    <GameProvider>
      <SpotlightBooIncorrectWrapper />
    </GameProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'init' }));
  fireEvent.click(screen.getByRole('button', { name: 'start' }));
  fireEvent.click(screen.getByRole('button', { name: 'scout' }));
  fireEvent.click(screen.getByRole('button', { name: 'scout-proceed' }));
  fireEvent.click(screen.getByRole('button', { name: 'action' }));
  fireEvent.click(screen.getByRole('button', { name: 'boo' }));
}

describe('SpotlightRevealScreen', () => {
  it('スポットライト画面が表示される', () => {
    renderSpotlight();
    expect(screen.getByText('スポットライト')).toBeDefined();
  });

  it('役者（カミ）と黒子（シモ）のスロットが表示される', () => {
    renderSpotlight();
    expect(screen.getByText('役者（カミ）')).toBeDefined();
    expect(screen.getByText('黒子（シモ）')).toBeDefined();
  });

  it('開示前: 「黒子札を開示」ボタンが表示される', () => {
    renderSpotlight();
    expect(screen.getByRole('button', { name: '黒子札を開示' })).toBeDefined();
  });

  it('開示後: 「黒子札を開示」ボタンが消える', () => {
    renderSpotlight();
    fireEvent.click(screen.getByRole('button', { name: '黒子札を開示' }));
    expect(screen.queryByRole('button', { name: '黒子札を開示' })).toBeNull();
  });

  it('開示後: ブーイング正解またはブーイング不正解が表示される', () => {
    renderSpotlight();
    fireEvent.click(screen.getByRole('button', { name: '黒子札を開示' }));
    const correct = screen.queryByText('ブーイング正解！');
    const incorrect = screen.queryByText('ブーイング不正解！');
    expect(correct !== null || incorrect !== null).toBe(true);
  });

  it('開示後: セットを開くまたはスキップボタンが表示される（boo 正解時）', () => {
    renderSpotlight();
    fireEvent.click(screen.getByRole('button', { name: '黒子札を開示' }));
    if (screen.queryByText('ブーイング正解！') === null) return; // boo 不正解の場合はスキップ
    expect(screen.getByRole('button', { name: 'セットを開く' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'スキップ' })).toBeDefined();
  });

  it('スキップで intermission フェーズに遷移する（boo 正解時）', () => {
    renderSpotlight();
    fireEvent.click(screen.getByRole('button', { name: '黒子札を開示' }));
    if (screen.queryByText('ブーイング正解！') === null) return; // boo 不正解の場合はスキップ
    fireEvent.click(screen.getByRole('button', { name: 'スキップ' }));
    expect(screen.getByTestId('after-spotlight').textContent).toBe('phase: intermission');
  });

  it('場のカード欄が表示される（Issue #132 リグレッション）', () => {
    renderSpotlight();
    expect(screen.getByText('場のカード')).toBeDefined();
  });

  it('ブーイング正解時の移動先案内にウォッチャーのプレイヤー名が表示される（固定「B」でない）', () => {
    renderSpotlight();
    fireEvent.click(screen.getByRole('button', { name: '黒子札を開示' }));
    if (screen.queryByText('ブーイング正解！') !== null) {
      // watcher = players[1] = ボブ
      expect(screen.queryByText('カードがBのステージへ移動します')).toBeNull();
      expect(screen.getByText('カードがボブのステージへ移動します')).toBeDefined();
    }
  });
});

describe('SpotlightRevealScreen – ブーイング不正解シナリオ', () => {
  beforeEach(() => vi.spyOn(Math, 'random').mockReturnValue(0.999));
  afterEach(() => vi.restoreAllMocks());

  it('（再現テスト）開示後に役者（アリス）へのPassDeviceが表示され、セットボタンは未表示', () => {
    renderSpotlightBooIncorrect();
    fireEvent.click(screen.getByRole('button', { name: '黒子札を開示' }));

    // boo 不正解（kami=shimo=rank1）が確定していることを検証
    expect(screen.getByText('ブーイング不正解！')).toBeDefined();

    // 修正後: PassDevice が役者（アリス）向けに表示される（複数箇所にアリスが表示される場合あり）
    expect(screen.getAllByText('アリス').length).toBeGreaterThanOrEqual(1);
    // 修正後: PassDevice 完了前はセットボタンが非表示
    expect(screen.queryByRole('button', { name: 'セットを開く' })).toBeNull();
  });
});
