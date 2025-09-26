import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_RANK_VALUE_RULE,
  getActiveRankValueRule,
  listRankValueRules,
  rankValue,
  registerRankValueRule,
  setActiveRankValueRule,
} from '../src/rank.js';

import type { CardDefinition, CardRank } from '../src/state.js';

afterEach(() => {
  setActiveRankValueRule(DEFAULT_RANK_VALUE_RULE);
});

describe('rank.ts', () => {
  it('標準ルールではランクごとの既定値を返す', () => {
    expect(rankValue('A')).toBe(1);
    expect(rankValue('10')).toBe(10);
    expect(rankValue('JOKER')).toBe(0);
  });

  it('CardDefinitionからもランク値を解決できる', () => {
    const card: Pick<CardDefinition, 'rank'> = { rank: 'Q' };
    expect(rankValue(card)).toBe(12);
  });

  it('カスタムルールを登録して切り替えられる', () => {
    const ruleId = 'test/double';
    const baseValues: Record<CardRank, number> = {
      A: 1,
      '2': 2,
      '3': 3,
      '4': 4,
      '5': 5,
      '6': 6,
      '7': 7,
      '8': 8,
      '9': 9,
      '10': 10,
      J: 11,
      Q: 12,
      K: 13,
      JOKER: 0,
    };
    registerRankValueRule(ruleId, (rank) => baseValues[rank] * 2);

    setActiveRankValueRule(ruleId);
    expect(getActiveRankValueRule()).toBe(ruleId);
    expect(rankValue('5')).toBe(10);
    expect(listRankValueRules()).toContain(ruleId);
  });

  it('未登録ルールに切り替えようとすると例外を投げる', () => {
    expect(() => setActiveRankValueRule('unknown-rule')).toThrowError('未登録のランク変換ルールです');
    expect(getActiveRankValueRule()).toBe(DEFAULT_RANK_VALUE_RULE);
  });
});
