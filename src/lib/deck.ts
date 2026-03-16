import type { Card, Suit } from '../types/game';

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

export function createDeck(): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      cards.push({ suit, rank, isJoker: false, isFaceUp: false });
    }
  }
  return cards;
}

export function createDeckWithJoker(): Card[] {
  const joker: Card = { suit: 'spades', rank: 0, isJoker: true, isFaceUp: false };
  return [...createDeck(), joker];
}

export function shuffle(cards: Card[]): Card[] {
  const result = [...cards];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function deal(deck: Card[], counts: number[]): Card[][] {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total > deck.length) {
    throw new Error(`Not enough cards: need ${total}, have ${deck.length}`);
  }
  const hands: Card[][] = [];
  let offset = 0;
  for (const count of counts) {
    hands.push(deck.slice(offset, offset + count));
    offset += count;
  }
  return hands;
}
