import type { GameState, StageArea, StagePair } from './state.js';
import { getOpponentId } from './turn.js';

const findLatestStagePair = (
  stage: StageArea | undefined,
  predicate?: (pair: StagePair) => boolean,
): StagePair | null => {
  if (!stage?.pairs?.length) {
    return null;
  }

  for (let index = stage.pairs.length - 1; index >= 0; index -= 1) {
    const pair = stage.pairs[index];
    if (!pair?.actor?.card || !pair.kuroko?.card) {
      continue;
    }
    if (predicate && !predicate(pair)) {
      continue;
    }
    return pair;
  }

  return null;
};

export const findLatestCompleteStagePair = (stage: StageArea | undefined): StagePair | null =>
  findLatestStagePair(stage);

export const findLatestActionStagePair = (stage: StageArea | undefined): StagePair | null =>
  findLatestStagePair(stage, (pair) => pair.origin === 'action');

export const findStagePairById = (state: GameState, pairId: string): StagePair | null => {
  if (!pairId) {
    return null;
  }

  const players = state.players ?? {};

  for (const player of Object.values(players)) {
    const stage = player?.stage;
    if (!stage?.pairs?.length) {
      continue;
    }
    const target = stage.pairs.find((pair) => pair?.id === pairId);
    if (target) {
      return target;
    }
  }

  return null;
};

export const findLatestWatchStagePair = (state: GameState): StagePair | null => {
  const opponentId = getOpponentId(state.activePlayer);
  const opponent = state.players[opponentId];
  const activePlayer = state.players[state.activePlayer];

  const opponentActionPair = findLatestActionStagePair(opponent?.stage);
  if (opponentActionPair) {
    return opponentActionPair;
  }

  const activeActionPair = findLatestActionStagePair(activePlayer?.stage);
  if (activeActionPair) {
    return activeActionPair;
  }

  const opponentPair = findLatestCompleteStagePair(opponent?.stage);
  if (opponentPair) {
    return opponentPair;
  }

  return findLatestCompleteStagePair(activePlayer?.stage);
};

const isStagePairComplete = (pair: StagePair | null): pair is StagePair =>
  Boolean(pair?.actor?.card && pair?.kuroko?.card);

const getCreatedAt = (pair: StagePair | null): number =>
  Number.isFinite(pair?.createdAt) ? (pair?.createdAt as number) : Number.NEGATIVE_INFINITY;

export const resolveActiveWatchStagePair = (state: GameState): StagePair | null => {
  const watchPairId = state.watch?.pairId ?? null;
  const selectedPair = watchPairId ? findStagePairById(state, watchPairId) : null;
  const latestPair = findLatestWatchStagePair(state);

  if (!latestPair) {
    return isStagePairComplete(selectedPair) ? selectedPair : null;
  }

  if (!isStagePairComplete(selectedPair)) {
    return latestPair;
  }

  const selectedCreatedAt = getCreatedAt(selectedPair);
  const latestCreatedAt = getCreatedAt(latestPair);

  return latestCreatedAt > selectedCreatedAt ? latestPair : selectedPair;
};
