import type { Card, CurtainCallReason, GamePhase, GameState, Player } from '@/types/game';
import { createDeck, createDeckWithJoker, deal, shuffle } from '@/lib/deck';

export type GameAction =
  | { type: 'INIT_GAME'; playerAName: string; playerBName: string }
  | { type: 'START_SCOUT' }
  | { type: 'SCOUT_CARD'; cardIndex: number }
  | { type: 'ACTION_PLAY'; kamiIndex: number; shimoIndex: number }
  | { type: 'WATCH_CLAP' }
  | { type: 'WATCH_BOO' }
  | { type: 'SPOTLIGHT_REVEAL' }
  | { type: 'SPOTLIGHT_OPEN_SET'; setCardIndex: number }
  | { type: 'SPOTLIGHT_SKIP_SET' }
  | { type: 'BACKSTAGE_OPEN' }
  | { type: 'INTERMISSION' }
  | { type: 'CURTAIN_CALL'; reason: CurtainCallReason }
  | { type: 'RESET_GAME' };

export const initialState: GameState = {
  phase: 'standby',
  players: [
    { id: 'A', name: '', hand: [] },
    { id: 'B', name: '', hand: [] },
  ],
  stage: { kami: null, shimo: null },
  deck: [],
  backstage: [],
  setRemainingCount: 0,
  publicInfos: [],
  playerABooCnt: 0,
  playerBBooCnt: 0,
  round: 0,
  curtainCallReason: null,
};

function removeCardAt(cards: Card[], index: number): Card[] {
  return [...cards.slice(0, index), ...cards.slice(index + 1)];
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'INIT_GAME': {
      // 52枚シャッフルして A15枚 / B15枚 / バックステージ10枚 に配布
      const shuffled52 = shuffle(createDeck());
      const dealt = deal(shuffled52, [15, 15, 10]);
      const handA: Card[] = dealt[0];
      const handB: Card[] = dealt[1];
      const backstage: Card[] = dealt[2];
      // 残り12枚 + Joker1枚 = 13枚をシャッフルしてセットに
      const remaining12 = shuffled52.slice(40);
      const joker = createDeckWithJoker().slice(52)[0];
      const setDeck = shuffle([...remaining12, joker]);

      const playerA: Player = { id: 'A', name: action.playerAName, hand: handA };
      const playerB: Player = { id: 'B', name: action.playerBName, hand: handB };
      const players: [Player, Player] = [playerA, playerB];

      return {
        ...initialState,
        phase: 'standby',
        players,
        deck: setDeck,
        backstage,
        setRemainingCount: setDeck.length,
        round: 1,
      };
    }

    case 'START_SCOUT': {
      if (state.phase !== 'standby') return state;
      if (state.players[0].name === '') return state;
      return { ...state, phase: 'scout' };
    }

    case 'SCOUT_CARD': {
      if (state.phase !== 'scout') return state;
      const scoutedCard = state.players[1].hand[action.cardIndex];
      if (scoutedCard === undefined) return state;

      const newPlayerA: Player = {
        ...state.players[0],
        hand: [...state.players[0].hand, scoutedCard],
      };
      const newPlayerB: Player = {
        ...state.players[1],
        hand: removeCardAt(state.players[1].hand, action.cardIndex),
      };
      const players: [Player, Player] = [newPlayerA, newPlayerB];

      return { ...state, phase: 'action', players };
    }

    case 'ACTION_PLAY': {
      if (state.phase !== 'action') return state;
      const hand = state.players[0].hand;
      const kamiCard = hand[action.kamiIndex];
      const shimoCard = hand[action.shimoIndex];
      if (kamiCard === undefined || shimoCard === undefined) return state;
      if (action.kamiIndex === action.shimoIndex) return state;

      const kami: Card = { ...kamiCard, isFaceUp: true };
      const shimo: Card = { ...shimoCard, isFaceUp: false };

      // kamiIndex と shimoIndex の大きい方から順に除去してインデックスずれを防ぐ
      const [firstRemove, secondRemove] =
        action.kamiIndex > action.shimoIndex
          ? [action.kamiIndex, action.shimoIndex]
          : [action.shimoIndex, action.kamiIndex];
      const handAfterFirst = removeCardAt(hand, firstRemove);
      const newHand = removeCardAt(handAfterFirst, secondRemove);

      const newPlayerA: Player = { ...state.players[0], hand: newHand };
      const players: [Player, Player] = [newPlayerA, state.players[1]];

      return { ...state, phase: 'watch', players, stage: { kami, shimo } };
    }

    case 'WATCH_CLAP': {
      if (state.phase !== 'watch') return state;
      return { ...state, phase: 'intermission' };
    }

    case 'WATCH_BOO': {
      if (state.phase !== 'watch') return state;
      const isPlayerA = state.round % 2 === 1;
      return {
        ...state,
        phase: 'spotlight',
        playerABooCnt: isPlayerA ? state.playerABooCnt : state.playerABooCnt,
        playerBBooCnt: isPlayerA ? state.playerBBooCnt + 1 : state.playerBBooCnt,
      };
    }

    case 'SPOTLIGHT_REVEAL': {
      if (state.phase !== 'spotlight') return state;
      if (state.stage.shimo === null) return state;
      const revealedShimo: Card = { ...state.stage.shimo, isFaceUp: true };
      return { ...state, stage: { ...state.stage, shimo: revealedShimo } };
    }

    case 'SPOTLIGHT_OPEN_SET': {
      if (state.phase !== 'spotlight') return state;
      const setCard = state.deck[action.setCardIndex];
      if (setCard === undefined) return state;

      const openedCard: Card = { ...setCard, isFaceUp: true };
      const newDeck = [...state.deck];
      newDeck[action.setCardIndex] = openedCard;
      const newSetRemainingCount = state.setRemainingCount - 1;

      if (openedCard.isJoker) {
        return {
          ...state,
          deck: newDeck,
          setRemainingCount: newSetRemainingCount,
          phase: 'curtain-call',
          curtainCallReason: 'joker',
        };
      }
      if (newSetRemainingCount <= 1) {
        return {
          ...state,
          deck: newDeck,
          setRemainingCount: newSetRemainingCount,
          phase: 'curtain-call',
          curtainCallReason: 'set-last-1',
        };
      }

      // ペア判定などの詳細ロジックは後続Issueで実装
      return {
        ...state,
        deck: newDeck,
        setRemainingCount: newSetRemainingCount,
        phase: 'backstage',
      };
    }

    case 'SPOTLIGHT_SKIP_SET': {
      if (state.phase !== 'spotlight') return state;
      return { ...state, phase: 'backstage' };
    }

    case 'BACKSTAGE_OPEN': {
      if (state.phase !== 'backstage') return state;
      return { ...state, phase: 'intermission' };
    }

    case 'INTERMISSION': {
      if (state.phase !== 'intermission') return state;

      // 手札不足チェック：次のスカウト担当（ラウンド偶数でBがスカウト）の手札0枚
      const nextScoutIsA = state.round % 2 === 0;
      const nextScoutHand = nextScoutIsA
        ? state.players[0].hand
        : state.players[1].hand;
      const otherHand = nextScoutIsA ? state.players[1].hand : state.players[0].hand;

      if (nextScoutHand.length === 0 || (nextScoutHand.length === 1 && otherHand.length === 0)) {
        return { ...state, phase: 'curtain-call', curtainCallReason: 'hand-shortage' };
      }

      // AとBを入れ替え（ラウンド交代）、次フェーズはscout
      const swappedPlayers: [Player, Player] = [state.players[1], state.players[0]];
      return {
        ...state,
        phase: 'scout',
        players: swappedPlayers,
        round: state.round + 1,
        stage: { kami: null, shimo: null },
      };
    }

    case 'CURTAIN_CALL': {
      return { ...state, phase: 'curtain-call', curtainCallReason: action.reason };
    }

    case 'RESET_GAME': {
      return initialState;
    }

    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export type { GamePhase };
