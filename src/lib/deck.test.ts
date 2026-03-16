import { describe, it, expect } from 'vitest';
import { createDeck, createDeckWithJoker, shuffle, deal } from './deck';

describe('createDeck', () => {
  it('52枚を返す', () => {
    expect(createDeck()).toHaveLength(52);
  });

  it('ジョーカーを含まない', () => {
    expect(createDeck().every((c) => !c.isJoker)).toBe(true);
  });

  it('各スート13枚ずつ', () => {
    const deck = createDeck();
    for (const suit of ['spades', 'hearts', 'diamonds', 'clubs'] as const) {
      expect(deck.filter((c) => c.suit === suit)).toHaveLength(13);
    }
  });

  it('全カードが裏向き', () => {
    expect(createDeck().every((c) => !c.isFaceUp)).toBe(true);
  });
});

describe('createDeckWithJoker', () => {
  it('53枚を返す', () => {
    expect(createDeckWithJoker()).toHaveLength(53);
  });

  it('ジョーカーを1枚含む', () => {
    expect(createDeckWithJoker().filter((c) => c.isJoker)).toHaveLength(1);
  });
});

describe('shuffle', () => {
  it('同じ枚数を返す', () => {
    const deck = createDeck();
    expect(shuffle(deck)).toHaveLength(deck.length);
  });

  it('元の配列を変更しない', () => {
    const deck = createDeck();
    const original = [...deck];
    shuffle(deck);
    expect(deck).toEqual(original);
  });

  it('同じカードセットを含む（順番が変わる可能性がある）', () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    expect(shuffled.length).toBe(deck.length);
    // 全カードが存在することを確認（順序不問）
    for (const card of deck) {
      expect(shuffled.some((c) => c.suit === card.suit && c.rank === card.rank)).toBe(true);
    }
  });
});

describe('deal', () => {
  it('指定通りの枚数で分配する', () => {
    const deck = createDeckWithJoker(); // 53枚
    const hands = deal(deck, [15, 15, 10, 13]);
    expect(hands[0]).toHaveLength(15);
    expect(hands[1]).toHaveLength(15);
    expect(hands[2]).toHaveLength(10);
    expect(hands[3]).toHaveLength(13);
  });

  it('スタンバイフェーズ配布（15+15+10+13=53）のテスト', () => {
    const deck = shuffle(createDeckWithJoker());
    const [handA, handB, backstage, set] = deal(deck, [15, 15, 10, 13]);
    expect(handA.length + handB.length + backstage.length + set.length).toBe(53);
  });

  it('枚数不足の場合はエラーを投げる', () => {
    const deck = createDeck(); // 52枚
    expect(() => deal(deck, [30, 30])).toThrow();
  });

  it('空配列を指定した場合は空の結果を返す', () => {
    const deck = createDeck();
    expect(deal(deck, [])).toEqual([]);
  });
});
