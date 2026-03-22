import type { Card, CurtainCallReason, GamePhase, GameState, Player, Stage } from '@/types/game';
import { createDeck, createDeckWithJoker, deal, shuffle } from '@/lib/deck';
import { buildPublicInfos } from './publicInfo';

export type GameAction =
  | { type: 'INIT_GAME'; playerAName: string; playerBName: string }
  | { type: 'START_SCOUT' }
  | { type: 'SCOUT_CARD'; cardIndex: number }
  | { type: 'SCOUT_RESULT_PROCEED' }
  | { type: 'ACTION_PLAY'; kamiIndex: number; shimoIndex: number }
  | { type: 'ACTION_RESULT_PROCEED' }
  | { type: 'WATCH_CLAP' }
  | { type: 'WATCH_BOO' }
  | { type: 'SPOTLIGHT_REVEAL' }
  | { type: 'SPOTLIGHT_ENTER_BONUS' }
  | { type: 'SPOTLIGHT_OPEN_SET'; setCardIndex: number }
  | { type: 'SPOTLIGHT_OPEN_JOKER_EXTRA'; setCardIndex: number }
  | { type: 'SPOTLIGHT_SKIP_SET' }
  | { type: 'BACKSTAGE_OPEN'; cardIndices: [number, number, number] }
  | { type: 'BACKSTAGE_PROCEED' }
  | { type: 'BACKSTAGE_TAKE_HAND'; cardIndex: number }
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
  playerAKami: [],
  playerBKami: [],
  playerAShimo: [],
  playerBShimo: [],
  round: 0,
  curtainCallReason: null,
  booResult: null,
  spotlightCard: null,
  backstageRevealedCards: [],
  backstageResult: null,
  backstagePlayerId: null,
};

function removeCardAt(cards: Card[], index: number): Card[] {
  return [...cards.slice(0, index), ...cards.slice(index + 1)];
}

function addKamiToPlayer(state: GameState, playerId: string, card: Card): GameState {
  const shimo = state.stage.shimo;
  if (playerId === 'A') {
    return {
      ...state,
      playerAKami: [...state.playerAKami, card],
      playerAShimo: shimo ? [...state.playerAShimo, shimo] : state.playerAShimo,
    };
  }
  return {
    ...state,
    playerBKami: [...state.playerBKami, card],
    playerBShimo: shimo ? [...state.playerBShimo, shimo] : state.playerBShimo,
  };
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

      return { ...state, phase: 'scout-result', players };
    }

    case 'SCOUT_RESULT_PROCEED': {
      if (state.phase !== 'scout-result') return state;
      return { ...state, phase: 'action' };
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

      return { ...state, phase: 'action-result', players, stage: { kami, shimo } };
    }

    case 'ACTION_RESULT_PROCEED': {
      if (state.phase !== 'action-result') return state;
      return { ...state, phase: 'watch' };
    }

    case 'WATCH_CLAP': {
      if (state.phase !== 'watch') return state;
      const actorId = state.players[0].id;
      const kamiCard = state.stage.kami;
      const nextState = { ...state, phase: 'intermission' as const };
      return kamiCard ? addKamiToPlayer(nextState, actorId, kamiCard) : nextState;
    }

    case 'WATCH_BOO': {
      if (state.phase !== 'watch') return state;
      const isPlayerA = state.round % 2 === 1;
      return {
        ...state,
        phase: 'spotlight',
        playerABooCnt: isPlayerA ? state.playerABooCnt : state.playerABooCnt + 1,
        playerBBooCnt: isPlayerA ? state.playerBBooCnt + 1 : state.playerBBooCnt,
      };
    }

    case 'SPOTLIGHT_REVEAL': {
      if (state.phase !== 'spotlight') return state;
      if (state.stage.shimo === null || state.stage.kami === null) return state;
      const revealedShimo: Card = { ...state.stage.shimo, isFaceUp: true };
      const booResult: 'correct' | 'incorrect' =
        state.stage.kami.rank !== state.stage.shimo.rank ? 'correct' : 'incorrect';
      // ブーイング正解: watcher(players[1])がカミを獲得、不正解: actor(players[0])が保持
      const winnerId = booResult === 'correct' ? state.players[1].id : state.players[0].id;
      const nextState = { ...state, stage: { ...state.stage, shimo: revealedShimo }, booResult };
      return addKamiToPlayer(nextState, winnerId, state.stage.kami);
    }

    case 'SPOTLIGHT_ENTER_BONUS': {
      if (state.phase !== 'spotlight') return state;
      return { ...state, phase: 'spotlight-bonus' };
    }

    case 'SPOTLIGHT_OPEN_SET': {
      if (state.phase !== 'spotlight-bonus') return state;
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
          stage: { ...state.stage, shimo: openedCard },
          phase: 'spotlight-joker',
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

      // ペア判定: boo 正解時は watcher(players[1])、不正解時は actor(players[0])の手札を使う
      const booCorrect = state.booResult === 'correct';
      const pairingPlayer = booCorrect ? state.players[1] : state.players[0];
      const pairingHand = pairingPlayer.hand;
      const pairCardIndex = pairingHand.findIndex((c) => !c.isJoker && c.rank === openedCard.rank);
      if (pairCardIndex !== -1) {
        const pairCard = pairingHand[pairCardIndex];
        const newHand = removeCardAt(pairingHand, pairCardIndex);
        const newPairingPlayer: Player = { ...pairingPlayer, hand: newHand };
        const players: [Player, Player] = booCorrect
          ? [state.players[0], newPairingPlayer]
          : [newPairingPlayer, state.players[1]];
        // ペア成立: セットカード(kami)を勝者のカミ配列に追加
        const winnerId = booCorrect ? state.players[1].id : state.players[0].id;
        const pairState = {
          ...state,
          deck: newDeck,
          setRemainingCount: newSetRemainingCount,
          stage: { kami: { ...openedCard }, shimo: { ...pairCard, isFaceUp: true } },
          players,
          phase: 'intermission' as const,
        };
        return addKamiToPlayer(pairState, winnerId, openedCard);
      }

      // boo 正解: actor(players[0])が敗者 → バックステージ担当
      // boo 不正解: watcher(players[1])が敗者 → バックステージ担当
      const backstagePlayerId =
        state.booResult === 'correct' ? state.players[0].id : state.players[1].id;
      return {
        ...state,
        deck: newDeck,
        setRemainingCount: newSetRemainingCount,
        spotlightCard: openedCard,
        phase: 'backstage',
        backstagePlayerId,
      };
    }

    case 'SPOTLIGHT_OPEN_JOKER_EXTRA': {
      if (state.phase !== 'spotlight-joker') return state;
      const setCard = state.deck[action.setCardIndex];
      if (setCard === undefined) return state;

      const openedCard: Card = { ...setCard, isFaceUp: true };
      const newDeck = [...state.deck];
      newDeck[action.setCardIndex] = openedCard;

      // boo 正解: watcher(players[1])が勝者、不正解: actor(players[0])が勝者
      const booCorrect = state.booResult === 'correct';
      const winnerId = booCorrect ? state.players[1].id : state.players[0].id;

      // stage.shimo にジョーカーが格納されているので addKamiToPlayer でそのまま記録される
      const jokerState = {
        ...state,
        deck: newDeck,
        setRemainingCount: state.setRemainingCount - 1,
        stage: { kami: openedCard, shimo: state.stage.shimo },
        phase: 'curtain-call' as const,
        curtainCallReason: 'joker' as const,
      };
      return addKamiToPlayer(jokerState, winnerId, openedCard);
    }

    case 'SPOTLIGHT_SKIP_SET': {
      if (state.phase !== 'spotlight' && state.phase !== 'spotlight-bonus') return state;
      // セット未オープン時は比較対象カードが存在しないため
      // バックステージフェーズは発生せずインターミッションへ直行する
      return { ...state, phase: 'intermission' };
    }

    case 'BACKSTAGE_OPEN': {
      if (state.phase !== 'backstage') return state;
      const { cardIndices } = action;
      if (new Set(cardIndices).size !== 3) return state;
      if (cardIndices.some((i) => i < 0 || i >= state.backstage.length)) return state;

      const selectedCards = cardIndices.map((i) => state.backstage[i]) as [Card, Card, Card];

      const backstagePlayerId = state.backstagePlayerId!;
      const newPublicInfos = buildPublicInfos(
        state.publicInfos,
        selectedCards,
        backstagePlayerId,
        state.round,
      );

      const spotlightCard = state.spotlightCard;
      const matchLocalIndex =
        spotlightCard !== null
          ? selectedCards.findIndex((c) => !c.isJoker && !spotlightCard.isJoker && c.rank === spotlightCard.rank)
          : -1;

      if (matchLocalIndex !== -1) {
        const matchedBackstageIndex = cardIndices[matchLocalIndex];
        const matchedCard = selectedCards[matchLocalIndex];
        const newBackstage = removeCardAt(state.backstage, matchedBackstageIndex);
        const stage: Stage = {
          kami: { ...spotlightCard!, isFaceUp: true },
          shimo: { ...matchedCard, isFaceUp: true },
        };
        const matchState = {
          ...state,
          backstage: newBackstage,
          publicInfos: newPublicInfos,
          stage,
          backstageRevealedCards: selectedCards,
          backstageResult: 'match' as const,
          phase: 'backstage-result' as const,
        };
        return addKamiToPlayer(matchState, backstagePlayerId, spotlightCard!);
      }

      return {
        ...state,
        publicInfos: newPublicInfos,
        backstageRevealedCards: selectedCards,
        backstageResult: 'no-match',
        phase: 'backstage-result',
      };
    }

    case 'BACKSTAGE_PROCEED': {
      if (state.phase !== 'backstage-result' && state.phase !== 'backstage') return state;
      return {
        ...state,
        spotlightCard: null,
        backstageRevealedCards: [],
        backstageResult: null,
        backstagePlayerId: null,
        phase: 'intermission',
      };
    }

    case 'BACKSTAGE_TAKE_HAND': {
      if (state.phase !== 'backstage-result') return state;
      if (state.backstageResult !== 'no-match') return state;
      const card = state.backstage[action.cardIndex];
      if (card === undefined) return state;
      const newBackstage = removeCardAt(state.backstage, action.cardIndex);
      const backstagePlayerIndex = state.players[0].id === state.backstagePlayerId ? 0 : 1;
      const backstagePlayer = state.players[backstagePlayerIndex];
      const newPlayer: Player = { ...backstagePlayer, hand: [...backstagePlayer.hand, card] };
      const players: [Player, Player] = backstagePlayerIndex === 0
        ? [newPlayer, state.players[1]]
        : [state.players[0], newPlayer];
      return {
        ...state,
        backstage: newBackstage,
        players,
        spotlightCard: null,
        backstageRevealedCards: [],
        backstageResult: null,
        backstagePlayerId: null,
        phase: 'intermission',
      };
    }

    case 'INTERMISSION': {
      if (state.phase !== 'intermission') return state;

      // 手札不足チェック：players 配列はラウンドごとに入れ替わるため、次のスカウトは常に players[1]
      const nextScoutHand = state.players[1].hand;
      const otherHand = state.players[0].hand;

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
