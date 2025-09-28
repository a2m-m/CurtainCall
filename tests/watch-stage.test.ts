import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/state.js';
import type { CardSnapshot, StageCardPlacement, StagePair } from '../src/state.js';
import {
  findLatestActionStagePair,
  findLatestCompleteStagePair,
  findLatestWatchStagePair,
  findStagePairById,
  resolveActiveWatchStagePair,
} from '../src/watch-stage.js';

const createCard = (id: string, rank: CardSnapshot['rank'] = 'A'): CardSnapshot => ({
  id,
  rank,
  suit: 'spades',
  value: 1,
  face: 'up',
});

const createPlacement = (
  card: CardSnapshot,
  face: CardSnapshot['face'],
  placedAt: number,
): StageCardPlacement => ({
  card: { ...card, face },
  from: 'hand',
  placedAt,
});

const createPair = (
  id: string,
  origin: StagePair['origin'],
  owner: StagePair['owner'],
  createdAt: number,
  actorFace: CardSnapshot['face'] = 'up',
  kurokoFace: CardSnapshot['face'] = 'down',
): StagePair => {
  const actorCard = createCard(`${id}-actor`);
  const kurokoCard = createCard(`${id}-kuroko`, 'K');

  return {
    id,
    origin,
    owner,
    createdAt,
    actor: createPlacement(actorCard, actorFace, createdAt),
    kuroko: createPlacement(kurokoCard, kurokoFace, createdAt),
  };
};

describe('watch-stage helpers', () => {
  it('findLatestCompleteStagePairは末尾の完全なペアを返す', () => {
    const stage = { pairs: [createPair('p1', 'spotlight', 'lumina', 1), createPair('p2', 'joker', 'lumina', 2)] };
    expect(findLatestCompleteStagePair(stage)).toBe(stage.pairs[1]);
  });

  it('findLatestActionStagePairはアクション由来の最新ペアを優先する', () => {
    const stage = {
      pairs: [
        createPair('p1', 'spotlight', 'lumina', 1),
        createPair('p2', 'action', 'lumina', 2),
        createPair('p3', 'spotlight', 'lumina', 3),
      ],
    };
    expect(findLatestActionStagePair(stage)).toBe(stage.pairs[1]);
  });

  it('findLatestWatchStagePairは相手のアクション由来ペアを優先する', () => {
    const state = createInitialState();
    state.activePlayer = 'nox';
    const actionPair = createPair('action-1', 'action', 'lumina', 1);
    const spotlightPair = createPair('spotlight-1', 'spotlight', 'lumina', 2);
    state.players.lumina.stage.pairs = [actionPair, spotlightPair];

    const result = findLatestWatchStagePair(state);
    expect(result).toBe(actionPair);
  });

  it('findLatestWatchStagePairは相手にアクションペアが無い場合は自分のアクションペアを返す', () => {
    const state = createInitialState();
    state.activePlayer = 'nox';
    const ownActionPair = createPair('action-2', 'action', 'nox', 3);
    state.players.lumina.stage.pairs = [createPair('spotlight-2', 'spotlight', 'lumina', 1)];
    state.players.nox.stage.pairs = [ownActionPair];

    const result = findLatestWatchStagePair(state);
    expect(result).toBe(ownActionPair);
  });

  it('findLatestWatchStagePairはアクションペアが無ければ最新の完全なペアを返す', () => {
    const state = createInitialState();
    state.activePlayer = 'nox';
    const fallbackPair = createPair('spotlight-3', 'spotlight', 'lumina', 5);
    state.players.lumina.stage.pairs = [fallbackPair];
    state.players.nox.stage.pairs = [];

    const result = findLatestWatchStagePair(state);
    expect(result).toBe(fallbackPair);
  });

  it('findStagePairByIdは両プレイヤーのステージから一致するペアを探す', () => {
    const state = createInitialState();
    const luminaPair = createPair('lumina-pair', 'action', 'lumina', 1);
    const noxPair = createPair('nox-pair', 'spotlight', 'nox', 2);
    state.players.lumina.stage.pairs = [luminaPair];
    state.players.nox.stage.pairs = [noxPair];

    expect(findStagePairById(state, 'lumina-pair')).toBe(luminaPair);
    expect(findStagePairById(state, 'nox-pair')).toBe(noxPair);
    expect(findStagePairById(state, 'unknown')).toBeNull();
  });

  it('resolveActiveWatchStagePairはより新しいペアを優先する', () => {
    const state = createInitialState();
    state.activePlayer = 'nox';
    const olderPair = createPair('older', 'action', 'lumina', 1);
    const newerPair = createPair('newer', 'action', 'lumina', 10);
    state.players.lumina.stage.pairs = [olderPair, newerPair];
    state.watch.pairId = olderPair.id;

    const result = resolveActiveWatchStagePair(state);
    expect(result).toBe(newerPair);
  });

  it('resolveActiveWatchStagePairは選択済みペアが有効な場合は維持する', () => {
    const state = createInitialState();
    state.activePlayer = 'nox';
    const existingPair = createPair('current', 'action', 'lumina', 5);
    state.players.lumina.stage.pairs = [existingPair];
    state.watch.pairId = existingPair.id;

    const result = resolveActiveWatchStagePair(state);
    expect(result).toBe(existingPair);
  });
});
