import { describe, it, expect } from 'vitest';
import { buildPublicInfos } from './publicInfo';
import type { Card } from '@/types/game';

const c = (rank: number): Card => ({ suit: 'spades', rank, isJoker: false, isFaceUp: false });

describe('buildPublicInfos', () => {
  it('backstageIndex を各エントリに保持する', () => {
    const result = buildPublicInfos([], [c(3), c(7), c(10)], 'A', 1, [2, 5, 8]);
    expect(result[0].backstageIndex).toBe(2);
    expect(result[1].backstageIndex).toBe(5);
    expect(result[2].backstageIndex).toBe(8);
  });

  it('既存エントリを保持しつつ追記する', () => {
    const existing = [{ playerId: 'A', card: c(1), round: 1, backstageIndex: 0 }];
    const result = buildPublicInfos(existing, [c(5)], 'B', 2, [3]);
    expect(result).toHaveLength(2);
    expect(result[1].backstageIndex).toBe(3);
  });
});
