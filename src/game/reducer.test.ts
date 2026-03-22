import { describe, it, expect, beforeEach } from 'vitest';
import { gameReducer, initialState } from './reducer';
import type { Card, GameState } from '@/types/game';

describe('gameReducer', () => {
  describe('INIT_GAME', () => {
    const state = gameReducer(initialState, {
      type: 'INIT_GAME',
      playerAName: 'Alice',
      playerBName: 'Bob',
    });

    it('phase が standby のまま（START_SCOUT 前）', () => {
      expect(state.phase).toBe('standby');
    });

    it('プレイヤーAの手札が15枚になる', () => {
      expect(state.players[0].hand).toHaveLength(15);
    });

    it('プレイヤーBの手札が15枚になる', () => {
      expect(state.players[1].hand).toHaveLength(15);
    });

    it('バックステージが10枚になる', () => {
      expect(state.backstage).toHaveLength(10);
    });

    it('セット（deck）が13枚になる', () => {
      expect(state.deck).toHaveLength(13);
    });

    it('setRemainingCount が 13 になる', () => {
      expect(state.setRemainingCount).toBe(13);
    });

    it('プレイヤー名が正しくセットされる', () => {
      expect(state.players[0].name).toBe('Alice');
      expect(state.players[1].name).toBe('Bob');
    });

    it('round が 1 になる', () => {
      expect(state.round).toBe(1);
    });

    it('セットにJokerが1枚含まれる', () => {
      expect(state.deck.filter((c) => c.isJoker)).toHaveLength(1);
    });
  });

  describe('START_SCOUT', () => {
    it('INIT_GAME 後に START_SCOUT で phase が scout になる', () => {
      const afterInit = gameReducer(initialState, {
        type: 'INIT_GAME',
        playerAName: 'Alice',
        playerBName: 'Bob',
      });
      const result = gameReducer(afterInit, { type: 'START_SCOUT' });
      expect(result.phase).toBe('scout');
    });

    it('プレイヤー名が未設定の standby では START_SCOUT が無効', () => {
      const result = gameReducer(initialState, { type: 'START_SCOUT' });
      expect(result).toBe(initialState);
    });

    it('standby 以外のフェーズでは START_SCOUT が無効', () => {
      const afterInit = gameReducer(initialState, {
        type: 'INIT_GAME',
        playerAName: 'Alice',
        playerBName: 'Bob',
      });
      const scoutState = gameReducer(afterInit, { type: 'START_SCOUT' });
      const result = gameReducer(scoutState, { type: 'START_SCOUT' });
      expect(result).toBe(scoutState);
    });
  });

  describe('SCOUT_CARD', () => {
    let scoutState: GameState;
    beforeEach(() => {
      const afterInit = gameReducer(initialState, {
        type: 'INIT_GAME',
        playerAName: 'Alice',
        playerBName: 'Bob',
      });
      scoutState = gameReducer(afterInit, { type: 'START_SCOUT' });
    });

    it('phase が scout-result になる', () => {
      const result = gameReducer(scoutState, { type: 'SCOUT_CARD', cardIndex: 0 });
      expect(result.phase).toBe('scout-result');
    });

    it('Aの手札が1枚増える', () => {
      const result = gameReducer(scoutState, { type: 'SCOUT_CARD', cardIndex: 0 });
      expect(result.players[0].hand).toHaveLength(16);
    });

    it('Bの手札が1枚減る', () => {
      const result = gameReducer(scoutState, { type: 'SCOUT_CARD', cardIndex: 0 });
      expect(result.players[1].hand).toHaveLength(14);
    });

    it('選択したカードがAの手札末尾に追加される', () => {
      const targetCard = scoutState.players[1].hand[3];
      const result = gameReducer(scoutState, { type: 'SCOUT_CARD', cardIndex: 3 });
      expect(result.players[0].hand.at(-1)).toEqual(targetCard);
    });
  });

  describe('ACTION_PLAY', () => {
    it('phase が action-result になる', () => {
      const afterInit = gameReducer(initialState, {
        type: 'INIT_GAME',
        playerAName: 'Alice',
        playerBName: 'Bob',
      });
      const afterStart = gameReducer(afterInit, { type: 'START_SCOUT' });
      const afterScout = gameReducer(afterStart, { type: 'SCOUT_CARD', cardIndex: 0 });
      const afterProceed = gameReducer(afterScout, { type: 'SCOUT_RESULT_PROCEED' });
      const result = gameReducer(afterProceed, { type: 'ACTION_PLAY', kamiIndex: 0, shimoIndex: 1 });
      expect(result.phase).toBe('action-result');
    });

    it('ステージにkami/shimoがセットされる', () => {
      const afterInit = gameReducer(initialState, {
        type: 'INIT_GAME',
        playerAName: 'Alice',
        playerBName: 'Bob',
      });
      const afterStart = gameReducer(afterInit, { type: 'START_SCOUT' });
      const afterScout = gameReducer(afterStart, { type: 'SCOUT_CARD', cardIndex: 0 });
      const afterProceed = gameReducer(afterScout, { type: 'SCOUT_RESULT_PROCEED' });
      const kami = afterProceed.players[0].hand[0];
      const shimo = afterProceed.players[0].hand[1];
      const result = gameReducer(afterProceed, { type: 'ACTION_PLAY', kamiIndex: 0, shimoIndex: 1 });
      expect(result.stage.kami).toEqual({ ...kami, isFaceUp: true });
      expect(result.stage.shimo).toEqual({ ...shimo, isFaceUp: false });
    });
  });

  describe('WATCH_CLAP / WATCH_BOO', () => {
    let watchState: GameState;
    beforeEach(() => {
      const s1 = gameReducer(initialState, { type: 'INIT_GAME', playerAName: 'A', playerBName: 'B' });
      const s2 = gameReducer(s1, { type: 'START_SCOUT' });
      const s3 = gameReducer(s2, { type: 'SCOUT_CARD', cardIndex: 0 });
      const s4 = gameReducer(s3, { type: 'SCOUT_RESULT_PROCEED' });
      const s5 = gameReducer(s4, { type: 'ACTION_PLAY', kamiIndex: 0, shimoIndex: 1 });
      watchState = gameReducer(s5, { type: 'ACTION_RESULT_PROCEED' });
    });

    it('WATCH_CLAP で phase が intermission になる', () => {
      expect(gameReducer(watchState, { type: 'WATCH_CLAP' }).phase).toBe('intermission');
    });

    it('WATCH_BOO で phase が spotlight になる', () => {
      expect(gameReducer(watchState, { type: 'WATCH_BOO' }).phase).toBe('spotlight');
    });

    it('WATCH_BOO で playerBBooCnt が増える', () => {
      const result = gameReducer(watchState, { type: 'WATCH_BOO' });
      expect(result.playerBBooCnt).toBe(1);
    });

    it('ラウンド偶数時（round=2）に WATCH_BOO で playerABooCnt が増える', () => {
      const round2WatchState = { ...watchState, round: 2 };
      const result = gameReducer(round2WatchState, { type: 'WATCH_BOO' });
      expect(result.playerABooCnt).toBe(1);
      expect(result.playerBBooCnt).toBe(0);
    });
  });

  describe('SPOTLIGHT_REVEAL', () => {
    let spotlightState: GameState;
    beforeEach(() => {
      const s1 = gameReducer(initialState, { type: 'INIT_GAME', playerAName: 'A', playerBName: 'B' });
      const s2 = gameReducer(s1, { type: 'START_SCOUT' });
      const s3 = gameReducer(s2, { type: 'SCOUT_CARD', cardIndex: 0 });
      const s4 = gameReducer(s3, { type: 'SCOUT_RESULT_PROCEED' });
      const s5 = gameReducer(s4, { type: 'ACTION_PLAY', kamiIndex: 0, shimoIndex: 1 });
      const s6 = gameReducer(s5, { type: 'ACTION_RESULT_PROCEED' });
      spotlightState = gameReducer(s6, { type: 'WATCH_BOO' });
    });

    it('shimo が表向きになる', () => {
      const result = gameReducer(spotlightState, { type: 'SPOTLIGHT_REVEAL' });
      expect(result.stage.shimo?.isFaceUp).toBe(true);
    });

    it('phase が spotlight のまま', () => {
      const result = gameReducer(spotlightState, { type: 'SPOTLIGHT_REVEAL' });
      expect(result.phase).toBe('spotlight');
    });

    it('kami は変化しない', () => {
      const result = gameReducer(spotlightState, { type: 'SPOTLIGHT_REVEAL' });
      expect(result.stage.kami).toEqual(spotlightState.stage.kami);
    });

    it('spotlight 以外のフェーズでは SPOTLIGHT_REVEAL が無効', () => {
      const result = gameReducer(initialState, { type: 'SPOTLIGHT_REVEAL' });
      expect(result).toBe(initialState);
    });
  });

  describe('SPOTLIGHT_ENTER_BONUS', () => {
    let spotlightState: GameState;
    beforeEach(() => {
      const s1 = gameReducer(initialState, { type: 'INIT_GAME', playerAName: 'A', playerBName: 'B' });
      const s2 = gameReducer(s1, { type: 'START_SCOUT' });
      const s3 = gameReducer(s2, { type: 'SCOUT_CARD', cardIndex: 0 });
      const s4 = gameReducer(s3, { type: 'SCOUT_RESULT_PROCEED' });
      const s5 = gameReducer(s4, { type: 'ACTION_PLAY', kamiIndex: 0, shimoIndex: 1 });
      const s6 = gameReducer(s5, { type: 'ACTION_RESULT_PROCEED' });
      const s7 = gameReducer(s6, { type: 'WATCH_BOO' });
      spotlightState = gameReducer(s7, { type: 'SPOTLIGHT_REVEAL' });
    });

    it('spotlight → spotlight-bonus に遷移する', () => {
      const result = gameReducer(spotlightState, { type: 'SPOTLIGHT_ENTER_BONUS' });
      expect(result.phase).toBe('spotlight-bonus');
    });

    it('spotlight 以外では無効', () => {
      const result = gameReducer(initialState, { type: 'SPOTLIGHT_ENTER_BONUS' });
      expect(result).toBe(initialState);
    });
  });

  describe('SPOTLIGHT_OPEN_SET', () => {
    let bonusState: GameState;
    beforeEach(() => {
      const s1 = gameReducer(initialState, { type: 'INIT_GAME', playerAName: 'A', playerBName: 'B' });
      const s2 = gameReducer(s1, { type: 'START_SCOUT' });
      const s3 = gameReducer(s2, { type: 'SCOUT_CARD', cardIndex: 0 });
      const s4 = gameReducer(s3, { type: 'SCOUT_RESULT_PROCEED' });
      const s5 = gameReducer(s4, { type: 'ACTION_PLAY', kamiIndex: 0, shimoIndex: 1 });
      const s6 = gameReducer(s5, { type: 'ACTION_RESULT_PROCEED' });
      const s7 = gameReducer(s6, { type: 'WATCH_BOO' });
      const s8 = gameReducer(s7, { type: 'SPOTLIGHT_REVEAL' });
      const s9 = gameReducer(s8, { type: 'SPOTLIGHT_ENTER_BONUS' });
      // 既存テストは boo 不正解（actor の手札参照）パスを検証するため明示的に設定
      bonusState = { ...s9, booResult: 'incorrect' as const };
    });

    it('spotlight-bonus 以外では無効', () => {
      const result = gameReducer(initialState, { type: 'SPOTLIGHT_OPEN_SET', setCardIndex: 0 });
      expect(result).toBe(initialState);
    });

    it('ジョーカーを開いたとき spotlight-open-result に遷移し、PROCEED 後に spotlight-joker へ遷移する', () => {
      const jokerIndex = bonusState.deck.findIndex((c) => c.isJoker);
      if (jokerIndex === -1) return; // jokerがない場合はスキップ
      const afterOpen = gameReducer(bonusState, { type: 'SPOTLIGHT_OPEN_SET', setCardIndex: jokerIndex });
      expect(afterOpen.phase).toBe('spotlight-open-result');
      expect(afterOpen.stage.shimo?.isJoker).toBe(true);
      const result = gameReducer(afterOpen, { type: 'SPOTLIGHT_OPEN_RESULT_PROCEED' });
      expect(result.phase).toBe('spotlight-joker');
    });

    it('setRemainingCount が減少する', () => {
      const nonJokerIndex = bonusState.deck.findIndex((c) => !c.isJoker);
      if (nonJokerIndex === -1) return;
      const result = gameReducer(bonusState, { type: 'SPOTLIGHT_OPEN_SET', setCardIndex: nonJokerIndex });
      expect(result.setRemainingCount).toBe(bonusState.setRemainingCount - 1);
    });

    it('ペア成立時に spotlight-open-result に遷移し、PROCEED 後に intermission へ遷移する', () => {
      // 手札に同じrankのカードがあるsetカードを探す
      const playerAHand = bonusState.players[0].hand;
      const pairableSetIndex = bonusState.deck.findIndex(
        (sc) => !sc.isJoker && playerAHand.some((hc) => !hc.isJoker && hc.rank === sc.rank),
      );
      if (pairableSetIndex === -1) return; // ペアなし状態ではスキップ
      const afterOpen = gameReducer(bonusState, { type: 'SPOTLIGHT_OPEN_SET', setCardIndex: pairableSetIndex });
      expect(afterOpen.phase).toBe('spotlight-open-result');
      expect(afterOpen.spotlightOpenResultNextPhase).toBe('intermission');
      const result = gameReducer(afterOpen, { type: 'SPOTLIGHT_OPEN_RESULT_PROCEED' });
      expect(result.phase).toBe('intermission');
    });

    it('ペア成立時に手札が1枚減る', () => {
      const playerAHand = bonusState.players[0].hand;
      const pairableSetIndex = bonusState.deck.findIndex(
        (sc) => !sc.isJoker && playerAHand.some((hc) => !hc.isJoker && hc.rank === sc.rank),
      );
      if (pairableSetIndex === -1) return;
      const result = gameReducer(bonusState, { type: 'SPOTLIGHT_OPEN_SET', setCardIndex: pairableSetIndex });
      expect(result.players[0].hand).toHaveLength(playerAHand.length - 1);
    });

    it('ペア不成立時に spotlight-open-result に遷移し、PROCEED 後に backstage へ遷移する', () => {
      // 手札にないrankのsetカードを探す
      const playerAHand = bonusState.players[0].hand;
      const noPairSetIndex = bonusState.deck.findIndex(
        (sc) => !sc.isJoker && !playerAHand.some((hc) => !hc.isJoker && hc.rank === sc.rank),
      );
      if (noPairSetIndex === -1) return;
      const afterOpen = gameReducer(bonusState, { type: 'SPOTLIGHT_OPEN_SET', setCardIndex: noPairSetIndex });
      expect(afterOpen.phase).toBe('spotlight-open-result');
      expect(afterOpen.spotlightOpenResultNextPhase).toBe('backstage');
      const result = gameReducer(afterOpen, { type: 'SPOTLIGHT_OPEN_RESULT_PROCEED' });
      expect(result.phase).toBe('backstage');
    });

    describe('セットオープン結果表示（Issue #129）', () => {
      it('SPOTLIGHT_OPEN_SET 後に spotlight-open-result フェーズへ遷移する', () => {
        const nonJokerIndex = bonusState.deck.findIndex((c) => !c.isJoker);
        if (nonJokerIndex === -1) return;
        const result = gameReducer(bonusState, { type: 'SPOTLIGHT_OPEN_SET', setCardIndex: nonJokerIndex });
        // セットオープン直後は結果表示フェーズに入る（現在は直接次フェーズへ遷移してしまう）
        expect(result.phase).toBe('spotlight-open-result');
      });

      it('SPOTLIGHT_OPEN_SET 後に lastOpenedCard に開いたカードが保持される', () => {
        const nonJokerIndex = bonusState.deck.findIndex((c) => !c.isJoker);
        if (nonJokerIndex === -1) return;
        const result = gameReducer(bonusState, { type: 'SPOTLIGHT_OPEN_SET', setCardIndex: nonJokerIndex });
        // 開いたカード情報が state に保持されているべき（現在は null のまま）
        expect(result.lastOpenedCard).not.toBeNull();
      });

      it('ジョーカーを開いた場合も spotlight-open-result フェーズへ遷移し lastOpenedCard に保持される', () => {
        const jokerIndex = bonusState.deck.findIndex((c) => c.isJoker);
        if (jokerIndex === -1) return;
        const result = gameReducer(bonusState, { type: 'SPOTLIGHT_OPEN_SET', setCardIndex: jokerIndex });
        expect(result.phase).toBe('spotlight-open-result');
        expect(result.lastOpenedCard?.isJoker).toBe(true);
      });

      it('SPOTLIGHT_OPEN_RESULT_PROCEED で spotlightOpenResultNextPhase のフェーズへ遷移する', () => {
        const nonJokerIndex = bonusState.deck.findIndex((c) => !c.isJoker);
        if (nonJokerIndex === -1) return;
        const afterOpen = gameReducer(bonusState, { type: 'SPOTLIGHT_OPEN_SET', setCardIndex: nonJokerIndex });
        if (afterOpen.phase !== 'spotlight-open-result') return; // 再現テストが先に失敗する
        const result = gameReducer(afterOpen, { type: 'SPOTLIGHT_OPEN_RESULT_PROCEED' });
        expect(result.phase).toBe(afterOpen.spotlightOpenResultNextPhase);
        expect(result.lastOpenedCard).toBeNull();
        expect(result.spotlightOpenResultNextPhase).toBeNull();
      });
    });

    describe('boo 正解時（booResult=correct）の手札参照（Issue #64）', () => {
      const mk = (rank: number): Card => ({ suit: 'spades', rank, isJoker: false, isFaceUp: false });

      it('boo 正解時に players[1].hand でペア判定し spotlight-open-result 経由で intermission へ遷移する', () => {
        const booCorrectState: GameState = {
          phase: 'spotlight-bonus',
          booResult: 'correct',
          players: [
            { id: 'A', name: 'A', hand: [mk(3), mk(7)] },  // actor: rank-5 なし
            { id: 'B', name: 'B', hand: [mk(5), mk(9)] },  // watcher: rank-5 あり
          ],
          stage: { kami: { ...mk(4), isFaceUp: true }, shimo: { ...mk(6), isFaceUp: true } },
          deck: [mk(5), mk(11), mk(8)],
          backstage: [],
          setRemainingCount: 3,
          publicInfos: [],
          playerABooCnt: 0,
          playerBBooCnt: 0,
          playerAKami: [],
          playerBKami: [],
          playerAShimo: [],
          playerBShimo: [],
          round: 1,
          curtainCallReason: null,
          spotlightCard: null, lastOpenedCard: null, spotlightOpenResultNextPhase: null, lastScoutedCard: null, lastBackstageDrawnCard: null,
          backstageRevealedCards: [],
          backstageResult: null,
          backstagePlayerId: null,
        };
        const afterOpen = gameReducer(booCorrectState, { type: 'SPOTLIGHT_OPEN_SET', setCardIndex: 0 });
        expect(afterOpen.phase).toBe('spotlight-open-result');
        expect(afterOpen.spotlightOpenResultNextPhase).toBe('intermission');
        expect(afterOpen.players[1].hand).toHaveLength(1);
        expect(afterOpen.players[0].hand).toHaveLength(2);
        const result = gameReducer(afterOpen, { type: 'SPOTLIGHT_OPEN_RESULT_PROCEED' });
        expect(result.phase).toBe('intermission');
      });

      it('boo 正解時は players[0].hand にペアがあっても players[1].hand を使う', () => {
        const booCorrectState: GameState = {
          phase: 'spotlight-bonus',
          booResult: 'correct',
          players: [
            { id: 'A', name: 'A', hand: [mk(5), mk(7)] },  // actor: rank-5 あり（だが参照されない）
            { id: 'B', name: 'B', hand: [mk(9), mk(11)] }, // watcher: rank-5 なし → ペア不成立
          ],
          stage: { kami: { ...mk(4), isFaceUp: true }, shimo: { ...mk(6), isFaceUp: true } },
          deck: [mk(5), mk(11), mk(8)],
          backstage: [],
          setRemainingCount: 3,
          publicInfos: [],
          playerABooCnt: 0,
          playerBBooCnt: 0,
          playerAKami: [],
          playerBKami: [],
          playerAShimo: [],
          playerBShimo: [],
          round: 1,
          curtainCallReason: null,
          spotlightCard: null, lastOpenedCard: null, spotlightOpenResultNextPhase: null, lastScoutedCard: null, lastBackstageDrawnCard: null,
          backstageRevealedCards: [],
          backstageResult: null,
          backstagePlayerId: null,
        };
        const afterOpen = gameReducer(booCorrectState, { type: 'SPOTLIGHT_OPEN_SET', setCardIndex: 0 });
        expect(afterOpen.spotlightOpenResultNextPhase).toBe('backstage');
        const result = gameReducer(afterOpen, { type: 'SPOTLIGHT_OPEN_RESULT_PROCEED' });
        expect(result.phase).toBe('backstage');
      });
    });
  });

  describe('SPOTLIGHT_SKIP_SET（spotlight / spotlight-bonus フェーズ）', () => {
    it('spotlight-bonus → intermission に遷移する（バックステージなし）', () => {
      const s1 = gameReducer(initialState, { type: 'INIT_GAME', playerAName: 'A', playerBName: 'B' });
      const s2 = gameReducer(s1, { type: 'START_SCOUT' });
      const s3 = gameReducer(s2, { type: 'SCOUT_CARD', cardIndex: 0 });
      const s4 = gameReducer(s3, { type: 'SCOUT_RESULT_PROCEED' });
      const s5 = gameReducer(s4, { type: 'ACTION_PLAY', kamiIndex: 0, shimoIndex: 1 });
      const s6 = gameReducer(s5, { type: 'ACTION_RESULT_PROCEED' });
      const s7 = gameReducer(s6, { type: 'WATCH_BOO' });
      const s8 = gameReducer(s7, { type: 'SPOTLIGHT_REVEAL' });
      const bonusState = gameReducer(s8, { type: 'SPOTLIGHT_ENTER_BONUS' });
      const result = gameReducer(bonusState, { type: 'SPOTLIGHT_SKIP_SET' });
      expect(result.phase).toBe('intermission');
      expect(result.backstagePlayerId).toBeNull();
    });

    it('spotlight → intermission に遷移する（バックステージなし）', () => {
      const s1 = gameReducer(initialState, { type: 'INIT_GAME', playerAName: 'A', playerBName: 'B' });
      const s2 = gameReducer(s1, { type: 'START_SCOUT' });
      const s3 = gameReducer(s2, { type: 'SCOUT_CARD', cardIndex: 0 });
      const s4 = gameReducer(s3, { type: 'SCOUT_RESULT_PROCEED' });
      const s5 = gameReducer(s4, { type: 'ACTION_PLAY', kamiIndex: 0, shimoIndex: 1 });
      const s6 = gameReducer(s5, { type: 'ACTION_RESULT_PROCEED' });
      const s7 = gameReducer(s6, { type: 'WATCH_BOO' });
      const s8 = gameReducer(s7, { type: 'SPOTLIGHT_REVEAL' });
      const result = gameReducer(s8, { type: 'SPOTLIGHT_SKIP_SET' });
      expect(result.phase).toBe('intermission');
      expect(result.backstagePlayerId).toBeNull();
    });
  });

  describe('SPOTLIGHT_OPEN_JOKER_EXTRA', () => {
    const mk = (rank: number): Card => ({ suit: 'spades', rank, isJoker: false, isFaceUp: false });
    const joker: Card = { suit: 'spades', rank: 0, isJoker: true, isFaceUp: true };

    // spotlight-joker 状態：ジョーカーが stage.shimo に格納されている
    const jokerPhaseState: GameState = {
      phase: 'spotlight-joker',
      booResult: 'incorrect',
      players: [
        { id: 'A', name: 'A', hand: [mk(3), mk(7)] },
        { id: 'B', name: 'B', hand: [mk(5), mk(9)] },
      ],
      stage: { kami: { ...mk(4), isFaceUp: true }, shimo: joker },
      deck: [mk(6), mk(11), mk(8)],
      backstage: [],
      setRemainingCount: 3,
      publicInfos: [],
      playerABooCnt: 0,
      playerBBooCnt: 0,
      playerAKami: [],
      playerBKami: [],
      playerAShimo: [],
      playerBShimo: [],
      round: 1,
      curtainCallReason: null,
      spotlightCard: null, lastOpenedCard: null, spotlightOpenResultNextPhase: null, lastScoutedCard: null, lastBackstageDrawnCard: null,
      backstageRevealedCards: [],
      backstageResult: null,
      backstagePlayerId: null,
    };

    it('SPOTLIGHT_OPEN_JOKER_EXTRA で curtain-call に遷移する', () => {
      const result = gameReducer(jokerPhaseState, { type: 'SPOTLIGHT_OPEN_JOKER_EXTRA', setCardIndex: 0 });
      expect(result.phase).toBe('curtain-call');
      expect(result.curtainCallReason).toBe('joker');
    });

    it('booResult=incorrect のとき追加カードが players[0] のカミに、ジョーカーがシモに記録される', () => {
      const result = gameReducer(jokerPhaseState, { type: 'SPOTLIGHT_OPEN_JOKER_EXTRA', setCardIndex: 0 });
      expect(result.playerAKami).toHaveLength(1);
      expect(result.playerAKami[0].rank).toBe(6);
      expect(result.playerAShimo).toHaveLength(1);
      expect(result.playerAShimo[0].isJoker).toBe(true);
      expect(result.playerBKami).toHaveLength(0);
    });

    it('booResult=correct のとき追加カードが players[1] のカミに、ジョーカーがシモに記録される', () => {
      const correctState: GameState = { ...jokerPhaseState, booResult: 'correct' };
      const result = gameReducer(correctState, { type: 'SPOTLIGHT_OPEN_JOKER_EXTRA', setCardIndex: 0 });
      expect(result.playerBKami).toHaveLength(1);
      expect(result.playerBShimo).toHaveLength(1);
      expect(result.playerBShimo[0].isJoker).toBe(true);
      expect(result.playerAKami).toHaveLength(0);
    });

    it('spotlight-joker 以外では無効', () => {
      const result = gameReducer(initialState, { type: 'SPOTLIGHT_OPEN_JOKER_EXTRA', setCardIndex: 0 });
      expect(result).toBe(initialState);
    });
  });

  describe('BACKSTAGE_OPEN / BACKSTAGE_PROCEED / BACKSTAGE_TAKE_HAND', () => {
    // backstage フェーズへ到達するヘルパー（SPOTLIGHT_OPEN_SET でペア不成立）
    function buildBackstageState() {
      const s1 = gameReducer(initialState, { type: 'INIT_GAME', playerAName: 'A', playerBName: 'B' });
      const s2 = gameReducer(s1, { type: 'START_SCOUT' });
      const s3 = gameReducer(s2, { type: 'SCOUT_CARD', cardIndex: 0 });
      const s4 = gameReducer(s3, { type: 'SCOUT_RESULT_PROCEED' });
      const s5 = gameReducer(s4, { type: 'ACTION_PLAY', kamiIndex: 0, shimoIndex: 1 });
      const s6 = gameReducer(s5, { type: 'ACTION_RESULT_PROCEED' });
      const s7 = gameReducer(s6, { type: 'WATCH_BOO' });
      const s8 = gameReducer(s7, { type: 'SPOTLIGHT_REVEAL' });
      const s9raw = gameReducer(s8, { type: 'SPOTLIGHT_ENTER_BONUS' });
      // boo 不正解パスを確定させて既存テストを安定化
      const s9 = { ...s9raw, booResult: 'incorrect' as const };

      // ペア不成立のセットカードを探す
      const playerAHand = s9.players[0].hand;
      const noPairSetIndex = s9.deck.findIndex(
        (sc) => !sc.isJoker && !playerAHand.some((hc) => !hc.isJoker && hc.rank === sc.rank),
      );
      if (noPairSetIndex === -1) return null;
      const afterOpen = gameReducer(s9, { type: 'SPOTLIGHT_OPEN_SET', setCardIndex: noPairSetIndex });
      return gameReducer(afterOpen, { type: 'SPOTLIGHT_OPEN_RESULT_PROCEED' });
    }

    it('backstage フェーズで spotlightCard がセットされている', () => {
      const state = buildBackstageState();
      if (!state) return;
      expect(state.phase).toBe('backstage');
      expect(state.spotlightCard).not.toBeNull();
    });

    it('BACKSTAGE_OPEN で backstage-result に遷移する', () => {
      const state = buildBackstageState();
      if (!state) return;
      const result = gameReducer(state, { type: 'BACKSTAGE_OPEN', cardIndices: [0, 1, 2] });
      expect(result.phase).toBe('backstage-result');
    });

    it('BACKSTAGE_OPEN で publicInfos が3件増える（no-match シナリオ）', () => {
      const state = buildBackstageState();
      if (!state) return;
      // spotlightCard と一致しないインデックスを3つ選んで no-match を確定させる
      const noMatchIndices = state.backstage
        .map((card, i) => ({ card, i }))
        .filter(({ card }) =>
          !state.spotlightCard ||
          card.isJoker ||
          state.spotlightCard.isJoker ||
          card.rank !== state.spotlightCard.rank,
        )
        .slice(0, 3)
        .map(({ i }) => i);
      if (noMatchIndices.length < 3) return;
      const before = state.publicInfos.length;
      const result = gameReducer(state, { type: 'BACKSTAGE_OPEN', cardIndices: noMatchIndices as [number, number, number] });
      expect(result.publicInfos.length).toBe(before + 3);
    });

    it('backstage 以外では BACKSTAGE_OPEN が無効', () => {
      const result = gameReducer(initialState, { type: 'BACKSTAGE_OPEN', cardIndices: [0, 1, 2] });
      expect(result).toBe(initialState);
    });

    it('ペア成立時に backstage-result で backstageResult が match になる', () => {
      const s1 = gameReducer(initialState, { type: 'INIT_GAME', playerAName: 'A', playerBName: 'B' });
      const s2 = gameReducer(s1, { type: 'START_SCOUT' });
      const s3 = gameReducer(s2, { type: 'SCOUT_CARD', cardIndex: 0 });
      const s4 = gameReducer(s3, { type: 'SCOUT_RESULT_PROCEED' });
      const s5 = gameReducer(s4, { type: 'ACTION_PLAY', kamiIndex: 0, shimoIndex: 1 });
      const s6 = gameReducer(s5, { type: 'ACTION_RESULT_PROCEED' });
      const s7 = gameReducer(s6, { type: 'WATCH_BOO' });
      const s8 = gameReducer(s7, { type: 'SPOTLIGHT_REVEAL' });
      const s9raw = gameReducer(s8, { type: 'SPOTLIGHT_ENTER_BONUS' });
      const s9 = { ...s9raw, booResult: 'incorrect' as const };
      const noPairSetIndex = s9.deck.findIndex(
        (sc) => !sc.isJoker && !s9.players[0].hand.some((hc) => !hc.isJoker && hc.rank === sc.rank),
      );
      if (noPairSetIndex === -1) return;
      const afterOpen = gameReducer(s9, { type: 'SPOTLIGHT_OPEN_SET', setCardIndex: noPairSetIndex });
      const backstageState = gameReducer(afterOpen, { type: 'SPOTLIGHT_OPEN_RESULT_PROCEED' });
      if (backstageState.spotlightCard === null) return;

      // バックステージからスポットライトカードと同rankのカードを含む3枚を探す
      const { spotlightCard, backstage } = backstageState;
      const pairIdx = backstage.findIndex((c) => !c.isJoker && c.rank === spotlightCard.rank);
      if (pairIdx === -1) return; // バックステージにペアなし → スキップ

      const others = backstage
        .map((_, i) => i)
        .filter((i) => i !== pairIdx)
        .slice(0, 2);
      const result = gameReducer(backstageState, {
        type: 'BACKSTAGE_OPEN',
        cardIndices: [pairIdx, others[0], others[1]],
      });
      expect(result.backstageResult).toBe('match');
      expect(result.stage.kami?.rank).toBe(spotlightCard.rank);
    });

    it('BACKSTAGE_PROCEED で backstage-result → intermission に遷移する', () => {
      const state = buildBackstageState();
      if (!state) return;
      const resultState = gameReducer(state, { type: 'BACKSTAGE_OPEN', cardIndices: [0, 1, 2] });
      if (resultState.backstageResult === 'match') {
        const final = gameReducer(resultState, { type: 'BACKSTAGE_PROCEED' });
        expect(final.phase).toBe('intermission');
      } else {
        // no-match → BACKSTAGE_TAKE_HAND で backstage-result に留まる
        const afterTake = gameReducer(resultState, { type: 'BACKSTAGE_TAKE_HAND', cardIndex: 0 });
        expect(afterTake.phase).toBe('backstage-result');
        // → BACKSTAGE_PROCEED で intermission へ
        const final = gameReducer(afterTake, { type: 'BACKSTAGE_PROCEED' });
        expect(final.phase).toBe('intermission');
      }
    });

    it('BACKSTAGE_TAKE_HAND 後に lastBackstageDrawnCard が引いたカードになる', () => {
      const state = buildBackstageState();
      if (!state) return;
      const resultState = gameReducer(state, { type: 'BACKSTAGE_OPEN', cardIndices: [0, 1, 2] });
      if (resultState.backstageResult !== 'no-match') return;
      const drawnCard = resultState.backstage[0];
      const afterTake = gameReducer(resultState, { type: 'BACKSTAGE_TAKE_HAND', cardIndex: 0 });
      expect(afterTake.lastBackstageDrawnCard).toEqual(drawnCard);
    });

    it('BACKSTAGE_PROCEED 後に lastBackstageDrawnCard が null になる', () => {
      const state = buildBackstageState();
      if (!state) return;
      const resultState = gameReducer(state, { type: 'BACKSTAGE_OPEN', cardIndices: [0, 1, 2] });
      if (resultState.backstageResult !== 'no-match') return;
      const afterTake = gameReducer(resultState, { type: 'BACKSTAGE_TAKE_HAND', cardIndex: 0 });
      const final = gameReducer(afterTake, { type: 'BACKSTAGE_PROCEED' });
      expect(final.lastBackstageDrawnCard).toBeNull();
    });

    it('BACKSTAGE_TAKE_HAND で手札が1枚増える', () => {
      const state = buildBackstageState();
      if (!state) return;
      const resultState = gameReducer(state, { type: 'BACKSTAGE_OPEN', cardIndices: [0, 1, 2] });
      if (resultState.backstageResult !== 'no-match') return;
      // buildBackstageState は booResult='incorrect' → watcher(players[1]) がバックステージ担当
      const backstagePlayerIndex = resultState.players[0].id === resultState.backstagePlayerId ? 0 : 1;
      const handBefore = resultState.players[backstagePlayerIndex].hand.length;
      const final = gameReducer(resultState, { type: 'BACKSTAGE_TAKE_HAND', cardIndex: 0 });
      expect(final.players[backstagePlayerIndex].hand).toHaveLength(handBefore + 1);
    });

    it('BACKSTAGE_TAKE_HAND でバックステージが1枚減る', () => {
      const state = buildBackstageState();
      if (!state) return;
      const resultState = gameReducer(state, { type: 'BACKSTAGE_OPEN', cardIndices: [0, 1, 2] });
      if (resultState.backstageResult !== 'no-match') return;
      const backstageBefore = resultState.backstage.length;
      const final = gameReducer(resultState, { type: 'BACKSTAGE_TAKE_HAND', cardIndex: 0 });
      expect(final.backstage).toHaveLength(backstageBefore - 1);
    });

    it('BACKSTAGE_OPEN でペア成立時、publicInfos は +3 後にマッチ分 -1 で net +2 になる', () => {
      const s1 = gameReducer(initialState, { type: 'INIT_GAME', playerAName: 'A', playerBName: 'B' });
      const s2 = gameReducer(s1, { type: 'START_SCOUT' });
      const s3 = gameReducer(s2, { type: 'SCOUT_CARD', cardIndex: 0 });
      const s4 = gameReducer(s3, { type: 'SCOUT_RESULT_PROCEED' });
      const s5 = gameReducer(s4, { type: 'ACTION_PLAY', kamiIndex: 0, shimoIndex: 1 });
      const s6 = gameReducer(s5, { type: 'ACTION_RESULT_PROCEED' });
      const s7 = gameReducer(s6, { type: 'WATCH_BOO' });
      const s8 = gameReducer(s7, { type: 'SPOTLIGHT_REVEAL' });
      const s9raw = gameReducer(s8, { type: 'SPOTLIGHT_ENTER_BONUS' });
      const s9 = { ...s9raw, booResult: 'incorrect' as const };
      const noPairSetIndex = s9.deck.findIndex(
        (sc) => !sc.isJoker && !s9.players[0].hand.some((hc) => !hc.isJoker && hc.rank === sc.rank),
      );
      if (noPairSetIndex === -1) return;
      const afterOpen = gameReducer(s9, { type: 'SPOTLIGHT_OPEN_SET', setCardIndex: noPairSetIndex });
      const backstageState = gameReducer(afterOpen, { type: 'SPOTLIGHT_OPEN_RESULT_PROCEED' });
      if (backstageState.spotlightCard === null) return;

      const { spotlightCard, backstage } = backstageState;
      const pairIdx = backstage.findIndex((c) => !c.isJoker && c.rank === spotlightCard.rank);
      if (pairIdx === -1) return;

      const others = backstage.map((_, i) => i).filter((i) => i !== pairIdx).slice(0, 2);
      const before = backstageState.publicInfos.length;
      const result = gameReducer(backstageState, {
        type: 'BACKSTAGE_OPEN',
        cardIndices: [pairIdx, others[0], others[1]],
      });
      expect(result.backstageResult).toBe('match');
      // 3件追加、マッチしたカードの publicInfo が削除されるため net +2
      expect(result.publicInfos.length).toBe(before + 2);
    });

    it('BACKSTAGE_TAKE_HAND で取得したカードの publicInfo が削除される', () => {
      const state = buildBackstageState();
      if (!state) return;
      const resultState = gameReducer(state, { type: 'BACKSTAGE_OPEN', cardIndices: [0, 1, 2] });
      if (resultState.backstageResult !== 'no-match') return;
      const countBefore = resultState.publicInfos.length;
      const final = gameReducer(resultState, { type: 'BACKSTAGE_TAKE_HAND', cardIndex: 0 });
      // 手札に取ったカードの publicInfo が削除される → 1件減る
      expect(final.publicInfos.length).toBe(countBefore - 1);
      // 残存エントリのインデックスはすべて現在の backstage 長内に収まる
      expect(final.publicInfos.every((p) => p.backstageIndex < final.backstage.length)).toBe(true);
    });

    it('BACKSTAGE_OPEN で publicInfos に backstageIndex が記録される', () => {
      const mk = (rank: number): Card => ({ suit: 'spades', rank, isJoker: false, isFaceUp: false });
      const backstage: Card[] = Array.from({ length: 10 }, (_, i) => mk(i + 1));
      const state: GameState = {
        phase: 'backstage',
        booResult: 'incorrect',
        players: [
          { id: 'A', name: 'A', hand: [mk(1)] },
          { id: 'B', name: 'B', hand: [mk(2)] },
        ],
        stage: { kami: null, shimo: null },
        deck: [],
        backstage,
        setRemainingCount: 0,
        publicInfos: [],
        playerABooCnt: 0,
        playerBBooCnt: 0,
        playerAKami: [],
        playerBKami: [],
        playerAShimo: [],
        playerBShimo: [],
        round: 1,
        curtainCallReason: null,
        spotlightCard: null, lastOpenedCard: null, spotlightOpenResultNextPhase: null, lastScoutedCard: null, lastBackstageDrawnCard: null,
        backstageRevealedCards: [],
        backstageResult: null,
        backstagePlayerId: 'B',
      };
      const result = gameReducer(state, { type: 'BACKSTAGE_OPEN', cardIndices: [2, 5, 7] });
      const indices = result.publicInfos.map((p) => p.backstageIndex);
      expect(indices).toEqual([2, 5, 7]);
    });

    it('BACKSTAGE_OPEN でペア成立時、残存 publicInfos の backstageIndex がシフトされる', () => {
      const mk = (rank: number): Card => ({ suit: 'spades', rank, isJoker: false, isFaceUp: false });
      // backstage[4] (rank=5) がスポットライト (rank=5) とペア成立
      const backstage: Card[] = Array.from({ length: 10 }, (_, i) => mk(i + 1));
      const state: GameState = {
        phase: 'backstage',
        booResult: 'incorrect',
        players: [
          { id: 'A', name: 'A', hand: [mk(1)] },
          { id: 'B', name: 'B', hand: [mk(2)] },
        ],
        stage: { kami: null, shimo: null },
        deck: [],
        backstage,
        setRemainingCount: 0,
        // 事前に index=6, index=8 が公開済み
        publicInfos: [
          { playerId: 'B', card: mk(7), round: 1, backstageIndex: 6 },
          { playerId: 'B', card: mk(9), round: 1, backstageIndex: 8 },
        ],
        playerABooCnt: 0,
        playerBBooCnt: 0,
        playerAKami: [],
        playerBKami: [],
        playerAShimo: [],
        playerBShimo: [],
        round: 2,
        curtainCallReason: null,
        spotlightCard: mk(5),
        backstageRevealedCards: [],
        backstageResult: null,
        backstagePlayerId: 'B',
        lastOpenedCard: null,
        spotlightOpenResultNextPhase: null, lastScoutedCard: null, lastBackstageDrawnCard: null,
      };
      // cardIndices=[3,4,7]: index=4 (rank=5) がペア成立 → backstage から削除
      const result = gameReducer(state, { type: 'BACKSTAGE_OPEN', cardIndices: [3, 4, 7] });
      expect(result.backstageResult).toBe('match');
      // 既存の index=6 → 5（index=4 削除により 1 シフト）
      // 既存の index=8 → 7
      const existing = result.publicInfos.filter((p) => p.round === 1);
      expect(existing[0].backstageIndex).toBe(5);
      expect(existing[1].backstageIndex).toBe(7);
    });

    it('BACKSTAGE_TAKE_HAND 後、取得カードの publicInfo が削除され残存インデックスがシフトされる', () => {
      const mk = (rank: number): Card => ({ suit: 'spades', rank, isJoker: false, isFaceUp: false });
      const backstage: Card[] = Array.from({ length: 8 }, (_, i) => mk(i + 1));
      const state: GameState = {
        phase: 'backstage-result',
        booResult: 'incorrect',
        players: [
          { id: 'A', name: 'A', hand: [mk(1)] },
          { id: 'B', name: 'B', hand: [mk(2)] },
        ],
        stage: { kami: null, shimo: null },
        deck: [],
        backstage,
        setRemainingCount: 0,
        // index=3,5,6 が公開済み
        publicInfos: [
          { playerId: 'B', card: mk(4), round: 1, backstageIndex: 3 },
          { playerId: 'B', card: mk(6), round: 1, backstageIndex: 5 },
          { playerId: 'B', card: mk(7), round: 1, backstageIndex: 6 },
        ],
        playerABooCnt: 0,
        playerBBooCnt: 0,
        playerAKami: [],
        playerBKami: [],
        playerAShimo: [],
        playerBShimo: [],
        round: 1,
        curtainCallReason: null,
        spotlightCard: null, lastOpenedCard: null, spotlightOpenResultNextPhase: null, lastScoutedCard: null, lastBackstageDrawnCard: null,
        backstageRevealedCards: [mk(4), mk(6), mk(7)],
        backstageResult: 'no-match',
        backstagePlayerId: 'B',
      };
      // index=3 のカード (rank=4) を手札に取る
      const result = gameReducer(state, { type: 'BACKSTAGE_TAKE_HAND', cardIndex: 3 });
      // 取得したカードの publicInfo は削除される
      expect(result.publicInfos.find((p) => p.backstageIndex === 3)).toBeUndefined();
      // index=5 → 4
      expect(result.publicInfos.find((p) => p.backstageIndex === 4)).toBeDefined();
      // index=6 → 5
      expect(result.publicInfos.find((p) => p.backstageIndex === 5)).toBeDefined();
    });

    it('SPOTLIGHT_SKIP_SET 経由では backstage フェーズを経ずに intermission へ到達する', () => {
      const s1 = gameReducer(initialState, { type: 'INIT_GAME', playerAName: 'A', playerBName: 'B' });
      const s2 = gameReducer(s1, { type: 'START_SCOUT' });
      const s3 = gameReducer(s2, { type: 'SCOUT_CARD', cardIndex: 0 });
      const s4 = gameReducer(s3, { type: 'SCOUT_RESULT_PROCEED' });
      const s5 = gameReducer(s4, { type: 'ACTION_PLAY', kamiIndex: 0, shimoIndex: 1 });
      const s6 = gameReducer(s5, { type: 'ACTION_RESULT_PROCEED' });
      const s7 = gameReducer(s6, { type: 'WATCH_BOO' });
      const s8 = gameReducer(s7, { type: 'SPOTLIGHT_REVEAL' });
      const s9 = gameReducer(s8, { type: 'SPOTLIGHT_ENTER_BONUS' });
      const result = gameReducer(s9, { type: 'SPOTLIGHT_SKIP_SET' });
      expect(result.phase).toBe('intermission');
    });
  });

  describe('INTERMISSION', () => {
    // intermission フェーズに到達するベース状態を構築（WATCH_CLAP 経由）
    function buildIntermissionState() {
      const s1 = gameReducer(initialState, { type: 'INIT_GAME', playerAName: 'A', playerBName: 'B' });
      const s2 = gameReducer(s1, { type: 'START_SCOUT' });
      const s3 = gameReducer(s2, { type: 'SCOUT_CARD', cardIndex: 0 });
      const s4 = gameReducer(s3, { type: 'SCOUT_RESULT_PROCEED' });
      const s5 = gameReducer(s4, { type: 'ACTION_PLAY', kamiIndex: 0, shimoIndex: 1 });
      const s6 = gameReducer(s5, { type: 'ACTION_RESULT_PROCEED' });
      return gameReducer(s6, { type: 'WATCH_CLAP' });
    }

    it('通常継続時に scout フェーズへ遷移する', () => {
      const intermissionState = buildIntermissionState();
      const result = gameReducer(intermissionState, { type: 'INTERMISSION' });
      expect(result.phase).toBe('scout');
    });

    it('通常継続時に round が +1 される', () => {
      const intermissionState = buildIntermissionState();
      const result = gameReducer(intermissionState, { type: 'INTERMISSION' });
      expect(result.round).toBe(intermissionState.round + 1);
    });

    it('通常継続時にプレイヤーが入れ替わる', () => {
      const intermissionState = buildIntermissionState();
      const prevScoutId = intermissionState.players[0].id;
      const result = gameReducer(intermissionState, { type: 'INTERMISSION' });
      expect(result.players[0].id).not.toBe(prevScoutId);
    });

    it('次スカウト担当の手札が0枚のとき curtain-call に遷移する', () => {
      const base = buildIntermissionState();
      // players[1] が次スカウト（round=1 の場合 nextScoutIsA=false → players[1] を参照）
      const stateWithEmptyHand = {
        ...base,
        players: [base.players[0], { ...base.players[1], hand: [] }] as typeof base.players,
      };
      const result = gameReducer(stateWithEmptyHand, { type: 'INTERMISSION' });
      expect(result.phase).toBe('curtain-call');
      expect(result.curtainCallReason).toBe('hand-shortage');
    });

    it('次スカウト担当が1枚かつ相手が0枚のとき curtain-call に遷移する', () => {
      const base = buildIntermissionState();
      const oneCard = [base.players[1].hand[0]];
      const stateWith1And0 = {
        ...base,
        players: [
          { ...base.players[0], hand: [] },
          { ...base.players[1], hand: oneCard },
        ] as typeof base.players,
      };
      const result = gameReducer(stateWith1And0, { type: 'INTERMISSION' });
      expect(result.phase).toBe('curtain-call');
      expect(result.curtainCallReason).toBe('hand-shortage');
    });

    it('偶数ラウンドでも次スカウトは players[1] であり players[0] の手札不足では curtain-call にならない', () => {
      const base = buildIntermissionState();
      // round=2 相当: players[0] が手札 0 枚、players[1] は手札あり
      // 次のスカウトは常に players[1] なので hand-shortage にならないはず
      const stateRound2 = {
        ...base,
        round: 2,
        players: [
          { ...base.players[0], hand: [] },
          { ...base.players[1] },
        ] as typeof base.players,
      };
      const result = gameReducer(stateRound2, { type: 'INTERMISSION' });
      expect(result.phase).toBe('scout');
    });

    it('偶数ラウンドで players[1] の手札が 0 枚のとき curtain-call に遷移する', () => {
      const base = buildIntermissionState();
      const stateRound2Empty = {
        ...base,
        round: 2,
        players: [
          { ...base.players[0] },
          { ...base.players[1], hand: [] },
        ] as typeof base.players,
      };
      const result = gameReducer(stateRound2Empty, { type: 'INTERMISSION' });
      expect(result.phase).toBe('curtain-call');
      expect(result.curtainCallReason).toBe('hand-shortage');
    });

    it('intermission 以外のフェーズでは INTERMISSION が無効', () => {
      const result = gameReducer(initialState, { type: 'INTERMISSION' });
      expect(result).toBe(initialState);
    });
  });

  describe('RESET_GAME', () => {
    it('phase が standby に戻る', () => {
      const afterInit = gameReducer(initialState, {
        type: 'INIT_GAME',
        playerAName: 'Alice',
        playerBName: 'Bob',
      });
      const afterStart = gameReducer(afterInit, { type: 'START_SCOUT' });
      const result = gameReducer(afterStart, { type: 'RESET_GAME' });
      expect(result.phase).toBe('standby');
    });

    it('initialState と同一の値を返す', () => {
      const afterInit = gameReducer(initialState, {
        type: 'INIT_GAME',
        playerAName: 'Alice',
        playerBName: 'Bob',
      });
      const afterStart = gameReducer(afterInit, { type: 'START_SCOUT' });
      const result = gameReducer(afterStart, { type: 'RESET_GAME' });
      expect(result).toEqual(initialState);
    });
  });

  describe('バックステージ担当者判定（Issue #80）', () => {
    const mk = (rank: number): Card => ({ suit: 'spades', rank, isJoker: false, isFaceUp: false });

    // SPOTLIGHT_OPEN_SET でペア不成立 → backstage に入るヘルパー
    function buildFromNoPair(booResult: 'correct' | 'incorrect'): GameState | null {
      const bonusState: GameState = {
        phase: 'spotlight-bonus',
        booResult,
        players: [
          { id: 'A', name: 'A', hand: [mk(3), mk(7)] },  // rank=5 なし
          { id: 'B', name: 'B', hand: [mk(9), mk(11)] }, // rank=5 なし
        ],
        stage: { kami: { ...mk(4), isFaceUp: true }, shimo: { ...mk(6), isFaceUp: true } },
        deck: [mk(5), mk(12), mk(8)],
        backstage: [mk(9), mk(11), mk(4)],
        setRemainingCount: 3,
        publicInfos: [],
        playerABooCnt: 0,
        playerBBooCnt: 0,
        playerAKami: [],
        playerBKami: [],
        playerAShimo: [],
        playerBShimo: [],
        round: 1,
        curtainCallReason: null,
        spotlightCard: null, lastOpenedCard: null, spotlightOpenResultNextPhase: null, lastScoutedCard: null, lastBackstageDrawnCard: null,
        backstageRevealedCards: [],
        backstageResult: null,
        backstagePlayerId: null,
      };
      const afterOpen = gameReducer(bonusState, { type: 'SPOTLIGHT_OPEN_SET', setCardIndex: 0 });
      const result = gameReducer(afterOpen, { type: 'SPOTLIGHT_OPEN_RESULT_PROCEED' });
      return result.phase === 'backstage' ? result : null;
    }

    it('boo 不正解時: SPOTLIGHT_OPEN_SET（ペア不成立）→ backstagePlayerId が watcher(players[1].id=B) になる', () => {
      const state = buildFromNoPair('incorrect');
      if (!state) throw new Error('backstage state を構築できませんでした');
      expect(state.backstagePlayerId).toBe('B');
    });

    it('boo 正解時: SPOTLIGHT_OPEN_SET（ペア不成立）→ backstagePlayerId が actor(players[0].id=A) になる', () => {
      const state = buildFromNoPair('correct');
      if (!state) throw new Error('backstage state を構築できませんでした');
      expect(state.backstagePlayerId).toBe('A');
    });

    it('boo 不正解時: SPOTLIGHT_SKIP_SET → intermission に遷移し backstagePlayerId は null のまま', () => {
      const bonusState: GameState = {
        phase: 'spotlight-bonus',
        booResult: 'incorrect',
        players: [
          { id: 'A', name: 'A', hand: [mk(3)] },
          { id: 'B', name: 'B', hand: [mk(2)] },
        ],
        stage: { kami: null, shimo: null },
        deck: [],
        backstage: [],
        setRemainingCount: 0,
        publicInfos: [],
        playerABooCnt: 0,
        playerBBooCnt: 0,
        playerAKami: [],
        playerBKami: [],
        playerAShimo: [],
        playerBShimo: [],
        round: 1,
        curtainCallReason: null,
        spotlightCard: null, lastOpenedCard: null, spotlightOpenResultNextPhase: null, lastScoutedCard: null, lastBackstageDrawnCard: null,
        backstageRevealedCards: [],
        backstageResult: null,
        backstagePlayerId: null,
      };
      const result = gameReducer(bonusState, { type: 'SPOTLIGHT_SKIP_SET' });
      expect(result.phase).toBe('intermission');
      expect(result.backstagePlayerId).toBeNull();
    });

    it('boo 不正解時: BACKSTAGE_OPEN の publicInfos が watcher(B) のIDで記録される', () => {
      const state: GameState = {
        phase: 'backstage',
        booResult: 'incorrect',
        players: [
          { id: 'A', name: 'A', hand: [mk(3)] },
          { id: 'B', name: 'B', hand: [mk(2)] },
        ],
        stage: { kami: null, shimo: null },
        deck: [],
        backstage: [mk(9), mk(11), mk(4)],
        setRemainingCount: 0,
        publicInfos: [],
        playerABooCnt: 0,
        playerBBooCnt: 0,
        playerAKami: [],
        playerBKami: [],
        playerAShimo: [],
        playerBShimo: [],
        round: 1,
        curtainCallReason: null,
        spotlightCard: null, lastOpenedCard: null, spotlightOpenResultNextPhase: null, lastScoutedCard: null, lastBackstageDrawnCard: null,
        backstageRevealedCards: [],
        backstageResult: null,
        backstagePlayerId: 'B', // watcher = B（修正後にセットされる値）
      };
      const result = gameReducer(state, { type: 'BACKSTAGE_OPEN', cardIndices: [0, 1, 2] });
      expect(result.publicInfos.every((p) => p.playerId === 'B')).toBe(true);
    });

    it('boo 不正解時: BACKSTAGE_TAKE_HAND でカードが watcher(players[1]=B) に追加される', () => {
      const state: GameState = {
        phase: 'backstage-result',
        booResult: 'incorrect',
        players: [
          { id: 'A', name: 'A', hand: [mk(3)] },
          { id: 'B', name: 'B', hand: [mk(2)] },
        ],
        stage: { kami: null, shimo: null },
        deck: [],
        backstage: [mk(9), mk(11), mk(4)],
        setRemainingCount: 0,
        publicInfos: [],
        playerABooCnt: 0,
        playerBBooCnt: 0,
        playerAKami: [],
        playerBKami: [],
        playerAShimo: [],
        playerBShimo: [],
        round: 1,
        curtainCallReason: null,
        spotlightCard: null, lastOpenedCard: null, spotlightOpenResultNextPhase: null, lastScoutedCard: null, lastBackstageDrawnCard: null,
        backstageRevealedCards: [mk(9), mk(11), mk(4)],
        backstageResult: 'no-match',
        backstagePlayerId: 'B', // watcher = B
      };
      const result = gameReducer(state, { type: 'BACKSTAGE_TAKE_HAND', cardIndex: 0 });
      expect(result.players[1].hand).toHaveLength(2); // B: 1 + 1
      expect(result.players[0].hand).toHaveLength(1); // A: 変化なし
    });

    it('boo 正解時: BACKSTAGE_TAKE_HAND でカードが actor(players[0]=A) に追加される', () => {
      const state: GameState = {
        phase: 'backstage-result',
        booResult: 'correct',
        players: [
          { id: 'A', name: 'A', hand: [mk(3)] },
          { id: 'B', name: 'B', hand: [mk(2)] },
        ],
        stage: { kami: null, shimo: null },
        deck: [],
        backstage: [mk(9), mk(11), mk(4)],
        setRemainingCount: 0,
        publicInfos: [],
        playerABooCnt: 0,
        playerBBooCnt: 0,
        playerAKami: [],
        playerBKami: [],
        playerAShimo: [],
        playerBShimo: [],
        round: 1,
        curtainCallReason: null,
        spotlightCard: null, lastOpenedCard: null, spotlightOpenResultNextPhase: null, lastScoutedCard: null, lastBackstageDrawnCard: null,
        backstageRevealedCards: [mk(9), mk(11), mk(4)],
        backstageResult: 'no-match',
        backstagePlayerId: 'A', // actor = A
      };
      const result = gameReducer(state, { type: 'BACKSTAGE_TAKE_HAND', cardIndex: 0 });
      expect(result.players[0].hand).toHaveLength(2); // A: 1 + 1
      expect(result.players[1].hand).toHaveLength(1); // B: 変化なし
    });
  });

  describe('SCOUT_RESULT_PROCEED', () => {
    it('scout-result フェーズで SCOUT_RESULT_PROCEED → action になる', () => {
      const s1 = gameReducer(initialState, { type: 'INIT_GAME', playerAName: 'Alice', playerBName: 'Bob' });
      const s2 = gameReducer(s1, { type: 'START_SCOUT' });
      const afterScout = gameReducer(s2, { type: 'SCOUT_CARD', cardIndex: 0 });
      const result = gameReducer(afterScout, { type: 'SCOUT_RESULT_PROCEED' });
      expect(result.phase).toBe('action');
    });
  });

  describe('ACTION_RESULT_PROCEED', () => {
    it('action-result フェーズで ACTION_RESULT_PROCEED → watch になる', () => {
      const s1 = gameReducer(initialState, { type: 'INIT_GAME', playerAName: 'Alice', playerBName: 'Bob' });
      const s2 = gameReducer(s1, { type: 'START_SCOUT' });
      const s3 = gameReducer(s2, { type: 'SCOUT_CARD', cardIndex: 0 });
      const s4 = gameReducer(s3, { type: 'SCOUT_RESULT_PROCEED' });
      const afterAction = gameReducer(s4, { type: 'ACTION_PLAY', kamiIndex: 0, shimoIndex: 1 });
      const result = gameReducer(afterAction, { type: 'ACTION_RESULT_PROCEED' });
      expect(result.phase).toBe('watch');
    });
  });

  describe('不正遷移', () => {
    it('standby フェーズで SCOUT_CARD を dispatch しても state が変わらない', () => {
      const result = gameReducer(initialState, { type: 'SCOUT_CARD', cardIndex: 0 });
      expect(result).toBe(initialState);
    });

    it('standby フェーズで ACTION_PLAY を dispatch しても state が変わらない', () => {
      const result = gameReducer(initialState, { type: 'ACTION_PLAY', kamiIndex: 0, shimoIndex: 1 });
      expect(result).toBe(initialState);
    });

    it('standby フェーズで WATCH_CLAP を dispatch しても state が変わらない', () => {
      const result = gameReducer(initialState, { type: 'WATCH_CLAP' });
      expect(result).toBe(initialState);
    });
  });

  describe('ステージ累積（Issue #76）', () => {
    const mk = (rank: number): Card => ({ suit: 'spades', rank, isJoker: false, isFaceUp: false });

    // watch フェーズまで進めるヘルパー（round=1: players[0]=A がアクター）
    function buildWatchState(kamiRank: number, shimoRank: number): GameState {
      const kamiCard = mk(kamiRank);
      const shimoCard = mk(shimoRank);
      return {
        phase: 'watch',
        players: [
          { id: 'A', name: 'A', hand: [kamiCard, shimoCard] },
          { id: 'B', name: 'B', hand: [mk(3), mk(7)] },
        ],
        stage: { kami: { ...kamiCard, isFaceUp: true }, shimo: { ...shimoCard, isFaceUp: false } },
        deck: [mk(2), mk(4), mk(6), mk(8), mk(10)],
        backstage: [mk(2), mk(4), mk(6), mk(8), mk(10)],
        setRemainingCount: 5,
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
        spotlightCard: null, lastOpenedCard: null, spotlightOpenResultNextPhase: null, lastScoutedCard: null, lastBackstageDrawnCard: null,
        backstageRevealedCards: [],
        backstageResult: null,
        backstagePlayerId: null,
      };
    }

    describe('WATCH_CLAP: アクターのカミが playerAKami に追加される', () => {
      it('round=1 (players[0].id=A) の CLAP で playerAKami に stage.kami が追加される', () => {
        const watchState = buildWatchState(5, 9);
        const result = gameReducer(watchState, { type: 'WATCH_CLAP' });
        expect(result.playerAKami).toHaveLength(1);
        expect(result.playerAKami[0].rank).toBe(5);
      });

      it('players[0].id=B の CLAP で playerBKami に stage.kami が追加される', () => {
        const watchState: GameState = {
          ...buildWatchState(7, 3),
          players: [
            { id: 'B', name: 'B', hand: [mk(7), mk(3)] },
            { id: 'A', name: 'A', hand: [mk(2), mk(8)] },
          ],
        };
        const result = gameReducer(watchState, { type: 'WATCH_CLAP' });
        expect(result.playerBKami).toHaveLength(1);
        expect(result.playerBKami[0].rank).toBe(7);
        expect(result.playerAKami).toHaveLength(0);
      });

      it('CLAP を複数回重ねても playerAKami が累積される', () => {
        const watchState1 = buildWatchState(5, 9);
        const afterClap1 = gameReducer(watchState1, { type: 'WATCH_CLAP' });
        // 2ラウンド目: 手動でステージを設定して再度CLAP
        const watchState2: GameState = {
          ...afterClap1,
          phase: 'watch',
          stage: { kami: { ...mk(10), isFaceUp: true }, shimo: { ...mk(3), isFaceUp: false } },
        };
        const result = gameReducer(watchState2, { type: 'WATCH_CLAP' });
        expect(result.playerAKami).toHaveLength(2);
        expect(result.playerAKami[0].rank).toBe(5);
        expect(result.playerAKami[1].rank).toBe(10);
      });
    });

    describe('SPOTLIGHT_REVEAL: booResult に応じてカミが累積される', () => {
      it('boo 正解（kami !== shimo）: watcher=players[1].id=B の playerBKami に追加される', () => {
        // kami と shimo のランクが異なる → booResult='correct'
        const spotlightState: GameState = {
          ...buildWatchState(5, 9),
          phase: 'spotlight',
        };
        const result = gameReducer(spotlightState, { type: 'SPOTLIGHT_REVEAL' });
        expect(result.booResult).toBe('correct');
        expect(result.playerBKami).toHaveLength(1);
        expect(result.playerBKami[0].rank).toBe(5);
        expect(result.playerAKami).toHaveLength(0);
      });

      it('boo 不正解（kami === shimo）: actor=players[0].id=A の playerAKami に追加される', () => {
        // kami と shimo のランクが同じ → booResult='incorrect'
        const spotlightState: GameState = {
          ...buildWatchState(5, 5),
          phase: 'spotlight',
        };
        const result = gameReducer(spotlightState, { type: 'SPOTLIGHT_REVEAL' });
        expect(result.booResult).toBe('incorrect');
        expect(result.playerAKami).toHaveLength(1);
        expect(result.playerAKami[0].rank).toBe(5);
        expect(result.playerBKami).toHaveLength(0);
      });
    });

    describe('SPOTLIGHT_OPEN_SET: ペア成立時にセットのカミが累積される', () => {
      it('boo 不正解パス: ペア成立時に openedCard が playerAKami に追加される', () => {
        // boo incorrect: actor=A がセット開示、ペア成立 → A がカミを得る
        const bonusState: GameState = {
          phase: 'spotlight-bonus',
          booResult: 'incorrect',
          players: [
            { id: 'A', name: 'A', hand: [mk(6), mk(7)] },  // rank=5 なし → pair card は手札にない
            { id: 'B', name: 'B', hand: [mk(5), mk(9)] },
          ],
          stage: { kami: { ...mk(3), isFaceUp: true }, shimo: { ...mk(3), isFaceUp: true } },
          deck: [mk(6), mk(11), mk(8)],
          backstage: [],
          setRemainingCount: 3,
          publicInfos: [],
          playerABooCnt: 0,
          playerBBooCnt: 0,
          playerAKami: [mk(3)], // 既に1枚蓄積済み（SPOTLIGHT_REVEAL で追加済み想定）
          playerBKami: [],
          playerAShimo: [],
          playerBShimo: [],
          round: 1,
          curtainCallReason: null,
          spotlightCard: null, lastOpenedCard: null, spotlightOpenResultNextPhase: null, lastScoutedCard: null, lastBackstageDrawnCard: null,
          backstageRevealedCards: [],
          backstageResult: null,
          backstagePlayerId: null,
        };
        // deck[0]=rank6, players[0].hand にrank6あり → ペア成立
        const afterOpen = gameReducer(bonusState, { type: 'SPOTLIGHT_OPEN_SET', setCardIndex: 0 });
        expect(afterOpen.phase).toBe('spotlight-open-result');
        // playerAKami は既に spotlight-open-result 時点で追加済み（kami累積はオープン時に確定）
        expect(afterOpen.playerAKami).toHaveLength(2);
        expect(afterOpen.playerAKami[1].rank).toBe(6);
        const result = gameReducer(afterOpen, { type: 'SPOTLIGHT_OPEN_RESULT_PROCEED' });
        expect(result.phase).toBe('intermission');
      });

      it('boo 正解パス: ペア成立時に openedCard が playerBKami に追加される', () => {
        const bonusState: GameState = {
          phase: 'spotlight-bonus',
          booResult: 'correct',
          players: [
            { id: 'A', name: 'A', hand: [mk(3), mk(7)] },
            { id: 'B', name: 'B', hand: [mk(5), mk(9)] },  // rank=5 あり → ペア成立
          ],
          stage: { kami: { ...mk(4), isFaceUp: true }, shimo: { ...mk(6), isFaceUp: true } },
          deck: [mk(5), mk(11), mk(8)],
          backstage: [],
          setRemainingCount: 3,
          publicInfos: [],
          playerABooCnt: 0,
          playerBBooCnt: 0,
          playerAKami: [],
          playerBKami: [mk(4)], // 既に1枚蓄積済み（SPOTLIGHT_REVEAL で追加済み想定）
          playerAShimo: [],
          playerBShimo: [],
          round: 1,
          curtainCallReason: null,
          spotlightCard: null, lastOpenedCard: null, spotlightOpenResultNextPhase: null, lastScoutedCard: null, lastBackstageDrawnCard: null,
          backstageRevealedCards: [],
          backstageResult: null,
          backstagePlayerId: null,
        };
        // deck[0]=rank5, players[1].hand にrank5あり → ペア成立
        const afterOpen = gameReducer(bonusState, { type: 'SPOTLIGHT_OPEN_SET', setCardIndex: 0 });
        expect(afterOpen.phase).toBe('spotlight-open-result');
        // playerBKami は既に spotlight-open-result 時点で追加済み
        expect(afterOpen.playerBKami).toHaveLength(2);
        expect(afterOpen.playerBKami[1].rank).toBe(5);
        const result = gameReducer(afterOpen, { type: 'SPOTLIGHT_OPEN_RESULT_PROCEED' });
        expect(result.phase).toBe('intermission');
      });
    });

    describe('BACKSTAGE_OPEN: ペア成立時に spotlightCard がバックステージ担当者のカミに追加される', () => {
      it('boo 不正解時: ペア成立で spotlightCard が watcher(B=players[1]) のカミ配列に追加される', () => {
        const spotlightCard = mk(7);
        const matchCard = mk(7);
        const backstageState: GameState = {
          phase: 'backstage',
          booResult: 'incorrect',
          players: [
            { id: 'A', name: 'A', hand: [mk(3)] },
            { id: 'B', name: 'B', hand: [mk(2)] },
          ],
          stage: { kami: { ...mk(5), isFaceUp: true }, shimo: { ...mk(5), isFaceUp: true } },
          deck: [],
          backstage: [matchCard, mk(2), mk(9)],
          setRemainingCount: 0,
          publicInfos: [],
          playerABooCnt: 0,
          playerBBooCnt: 0,
          playerAKami: [mk(5)], // SPOTLIGHT_REVEAL で蓄積済み
          playerBKami: [],
          playerAShimo: [],
          playerBShimo: [],
          round: 1,
          curtainCallReason: null,
          spotlightCard,
          backstageRevealedCards: [],
          backstageResult: null,
          backstagePlayerId: 'B', // boo incorrect → watcher = B
          lastOpenedCard: null,
          spotlightOpenResultNextPhase: null, lastScoutedCard: null,
        };
        const result = gameReducer(backstageState, { type: 'BACKSTAGE_OPEN', cardIndices: [0, 1, 2] });
        expect(result.backstageResult).toBe('match');
        // playerBKami に spotlightCard (rank=7) が追加される（watcher=B が担当）
        expect(result.playerBKami).toHaveLength(1);
        expect(result.playerBKami[0].rank).toBe(7);
        expect(result.playerAKami).toHaveLength(1); // A は変化なし
      });
    });
  });
});
