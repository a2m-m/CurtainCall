import type { CardDefinition, CardRank } from './state.js';

export type RankValueRuleId = string;

export type RankValueResolver = (rank: CardRank) => number;

export const DEFAULT_RANK_VALUE_RULE = 'rulebook_default';

const STANDARD_RANK_VALUES: Readonly<Record<CardRank, number>> = {
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

const registry = new Map<RankValueRuleId, RankValueResolver>();
registry.set(DEFAULT_RANK_VALUE_RULE, (rank: CardRank) => {
  const value = STANDARD_RANK_VALUES[rank];
  if (typeof value !== 'number') {
    throw new Error(`未対応のランクです: ${rank}`);
  }
  return value;
});

let activeRuleId: RankValueRuleId = DEFAULT_RANK_VALUE_RULE;

const resolveRule = (ruleId: RankValueRuleId): RankValueResolver => {
  const resolver = registry.get(ruleId);
  if (!resolver) {
    throw new Error(`未登録のランク変換ルールです: ${ruleId}`);
  }
  return resolver;
};

export const listRankValueRules = (): RankValueRuleId[] => Array.from(registry.keys());

export const registerRankValueRule = (
  ruleId: RankValueRuleId,
  resolver: RankValueResolver,
): void => {
  registry.set(ruleId, resolver);
};

export const setActiveRankValueRule = (ruleId: RankValueRuleId): void => {
  resolveRule(ruleId);
  activeRuleId = ruleId;
};

export const getActiveRankValueRule = (): RankValueRuleId => activeRuleId;

export type RankValueTarget = CardRank | Pick<CardDefinition, 'rank'>;

const extractRank = (target: RankValueTarget): CardRank =>
  typeof target === 'string' ? target : target.rank;

export const rankValue = (target: RankValueTarget): number => {
  const resolver = resolveRule(activeRuleId);
  return resolver(extractRank(target));
};
