import {
  CARD_COMPOSITION,
  CardRank,
  CardSnapshot,
  CardSuit,
  PlayerId,
  PLAYER_IDS,
  SetCardState,
  StandardCardRank,
  StandardCardSuit,
} from './state.js';
import { rankValue } from './rank.js';

const STANDARD_RANKS: readonly StandardCardRank[] = [
  'A',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
];

const STANDARD_SUITS: readonly StandardCardSuit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

const SUIT_ID: Record<CardSuit, string> = {
  spades: 'S',
  hearts: 'H',
  diamonds: 'D',
  clubs: 'C',
  joker: 'J',
};

const createCardId = (suit: CardSuit, rank: CardRank): string => `${SUIT_ID[suit]}-${rank}`;

const createCardSnapshot = (suit: CardSuit, rank: CardRank): CardSnapshot => ({
  id: createCardId(suit, rank),
  suit,
  rank,
  value: rankValue(rank),
  face: 'down',
});

export const createStandardDeck = (): CardSnapshot[] => {
  const deck: CardSnapshot[] = [];

  for (const suit of STANDARD_SUITS) {
    for (const rank of STANDARD_RANKS) {
      deck.push(createCardSnapshot(suit, rank));
    }
  }

  deck.push(createCardSnapshot('joker', 'JOKER'));

  ensureUniqueCards(deck);

  return deck;
};

const ensureUniqueCards = (cards: CardSnapshot[]): void => {
  const ids = new Set<string>();
  for (const card of cards) {
    if (ids.has(card.id)) {
      throw new Error(`カードIDが重複しています: ${card.id}`);
    }
    ids.add(card.id);
  }
};

const swap = <T>(items: T[], a: number, b: number): void => {
  const temp = items[a];
  items[a] = items[b];
  items[b] = temp;
};

const defaultRandom = (): number => Math.random();

const hashSeed = (seed: string): number => {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^ (h >>> 16)) >>> 0;
};

export const createSeededRandom = (seed: string): (() => number) => {
  let state = hashSeed(seed);
  if (state === 0) {
    state = 0x1a2b3c4d;
  }
  return () => {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export interface ShuffleOptions {
  random?: () => number;
}

export const shuffleCards = <T>(cards: readonly T[], options: ShuffleOptions = {}): T[] => {
  const random = options.random ?? defaultRandom;
  const result = Array.from(cards);

  for (let i = result.length - 1; i > 0; i -= 1) {
    const r = random();
    const j = Math.floor(r * (i + 1));
    swap(result, i, j);
  }

  return result;
};

export interface InitialDealResult {
  deck: CardSnapshot[];
  set: SetCardState[];
  hands: Record<PlayerId, CardSnapshot[]>;
}

export type DealOptions = ShuffleOptions;

export const dealInitialSetup = (options: DealOptions = {}): InitialDealResult => {
  const deck = shuffleCards(createStandardDeck(), options);

  const setCards = deck.slice(0, CARD_COMPOSITION.set).map<SetCardState>((card, index) => ({
    id: `set-${String(index + 1).padStart(2, '0')}`,
    card,
    position: index,
  }));

  const hands: Record<PlayerId, CardSnapshot[]> = {
    lumina: [],
    nox: [],
  };

  let offset: number = CARD_COMPOSITION.set;
  for (const player of PLAYER_IDS) {
    const start = offset;
    const end = start + CARD_COMPOSITION.perHand;
    const cards = deck.slice(start, end);
    if (cards.length !== CARD_COMPOSITION.perHand) {
      throw new Error('初期手札の配布に十分なカードがありません。');
    }
    hands[player] = cards;
    offset = end;
  }

  if (offset !== deck.length) {
    throw new Error('配布後に未使用のカードが残っています。');
  }

  return { deck, set: setCards, hands };
};
