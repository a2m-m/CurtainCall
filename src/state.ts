import type { RankValueRuleId } from './rank.js';

export type PhaseKey =
  | 'home'
  | 'standby'
  | 'scout'
  | 'action'
  | 'watch'
  | 'spotlight'
  | 'intermission'
  | 'curtaincall';

export const PLAYER_IDS = ['lumina', 'nox'] as const;

export type PlayerId = (typeof PLAYER_IDS)[number];
export type PlayerRole = PlayerId;

export type CardRank =
  | 'A'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'
  | 'JOKER';

export type StandardCardRank = Exclude<CardRank, 'JOKER'>;

export type CardSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs' | 'joker';
export type StandardCardSuit = Exclude<CardSuit, 'joker'>;

export type CardFace = 'up' | 'down';

export interface CardDefinition {
  id: string;
  rank: CardRank;
  suit: CardSuit;
  value: number;
}

export interface CardSnapshot extends CardDefinition {
  face: CardFace;
  annotation?: string;
}

export type StageCardOrigin = 'hand' | 'set' | 'jokerBonus';

export interface StageCardPlacement {
  card: CardSnapshot;
  from: StageCardOrigin;
  placedAt: number;
  revealedAt?: number;
}

export type StagePairOrigin = 'action' | 'spotlight' | 'joker';
export type StageJudgeResult = 'match' | 'mismatch';

export interface StagePair {
  id: string;
  owner: PlayerId;
  origin: StagePairOrigin;
  actor?: StageCardPlacement;
  kuroko?: StageCardPlacement;
  judge?: StageJudgeResult;
  createdAt: number;
  resolvedAt?: number;
}

export interface StageArea {
  pairs: StagePair[];
}

export interface PlayerScore {
  sumKami: number;
  sumHand: number;
  penalty: number;
  final: number;
}

export interface PlayerHand {
  cards: CardSnapshot[];
  maxSize: number;
  lastDrawnCardId: string | null;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  role: PlayerRole;
  hand: PlayerHand;
  stage: StageArea;
  booCount: number;
  clapCount: number;
  takenByOpponent: CardSnapshot[];
  score: PlayerScore;
}

export type WatchDecision = 'clap' | 'boo';

export interface WatchState extends Record<string, unknown> {
  decision: WatchDecision | null;
  nextRoute: string | null;
}

export interface SetCardState {
  id: string;
  card: CardSnapshot;
  position: number;
}

export type SetRevealBonus = 'joker' | 'pair' | 'secretPair';

export interface SetReveal {
  id: string;
  card: CardSnapshot;
  position: number;
  openedBy: PlayerId;
  openedAt: number;
  assignedTo?: PlayerId;
  bonus?: SetRevealBonus;
  pairId?: string;
}

export interface SetState {
  cards: SetCardState[];
  opened: SetReveal[];
}

export type CurtainCallReason = 'jokerBonus' | 'setRemaining1';

export interface CurtainCallPlayerSummary {
  kamiCards: CardSnapshot[];
  handCards: CardSnapshot[];
  sumKami: number;
  sumHand: number;
  penalty: number;
  final: number;
}

export interface CurtainCallSummary {
  reason: CurtainCallReason;
  preparedAt: number;
  rankValueRule: RankValueRuleId;
  booCount: Record<PlayerId, number>;
  winner: PlayerId | 'draw';
  margin: number;
  players: Record<PlayerId, CurtainCallPlayerSummary>;
  savedHistoryEntryId?: string | null;
  savedAt?: number | null;
}

export type HistoryEntryType =
  | 'setup'
  | 'standby'
  | 'scout'
  | 'action'
  | 'watch'
  | 'spotlight'
  | 'intermission'
  | 'curtaincall'
  | 'result';

export interface HistoryEntry {
  id: string;
  type: HistoryEntryType;
  turn: number;
  actor: PlayerId;
  payload?: Record<string, unknown>;
  createdAt: number;
}

export interface TurnState {
  count: number;
  startedAt: number;
}

export interface GameMeta {
  createdAt: number;
  composition: {
    total: number;
    joker: number;
    set: number;
    perHand: number;
  };
  seed?: string;
}

export interface ResumeSnapshot {
  at: number;
  phase: PhaseKey;
  player: PlayerId;
  route: string;
}

export interface ScoutState {
  selectedOpponentCardIndex: number | null;
}

export interface ActionState {
  selectedCardId: string | null;
  actorCardId: string | null;
  kurokoCardId: string | null;
}

export interface GameState extends Record<string, unknown> {
  matchId: string;
  phase: PhaseKey;
  route: string;
  revision: number;
  updatedAt: number;
  players: Record<PlayerId, PlayerState>;
  firstPlayer: PlayerId | null;
  activePlayer: PlayerId;
  turn: TurnState;
  set: SetState;
  history: HistoryEntry[];
  meta: GameMeta;
  resume?: ResumeSnapshot;
  recentScoutedCard: CardSnapshot | null;
  scout: ScoutState;
  action: ActionState;
  watch: WatchState;
  remainingWatchIncludingCurrent?: Record<PlayerId, number>;
  curtainCall?: CurtainCallSummary;
}

export type StateListener<TState> = (state: TState) => void;
export type StateUpdater<TState> = (state: TState) => TState;

export class Store<TState extends Record<string, unknown>> {
  private state: TState;
  private readonly listeners = new Set<StateListener<TState>>();

  constructor(initialState: TState) {
    this.state = initialState;
  }

  getState(): TState {
    return this.state;
  }

  setState(next: TState | StateUpdater<TState>): void {
    const value = typeof next === 'function' ? (next as StateUpdater<TState>)(this.state) : next;
    if (Object.is(value, this.state)) {
      return;
    }
    this.state = value;
    this.emit();
  }

  patch(patch: Partial<TState>): void {
    this.setState({
      ...this.state,
      ...patch,
    });
  }

  subscribe(listener: StateListener<TState>): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}

export const CARD_COMPOSITION = Object.freeze({
  total: 53,
  joker: 1,
  set: 13,
  perHand: 20,
});

export const REQUIRED_BOO_COUNT = 3;

const DEFAULT_PLAYER_NAMES: Record<PlayerId, string> = {
  lumina: 'プレイヤーA',
  nox: 'プレイヤーB',
};

const createInitialScore = (): PlayerScore => ({
  sumKami: 0,
  sumHand: 0,
  penalty: 0,
  final: 0,
});

const createEmptyStage = (): StageArea => ({
  pairs: [],
});

const createEmptyHand = (): PlayerHand => ({
  cards: [],
  maxSize: CARD_COMPOSITION.perHand,
  lastDrawnCardId: null,
});

const createPlayerState = (id: PlayerId): PlayerState => ({
  id,
  name: DEFAULT_PLAYER_NAMES[id],
  role: id,
  hand: createEmptyHand(),
  stage: createEmptyStage(),
  booCount: 0,
  clapCount: 0,
  takenByOpponent: [],
  score: createInitialScore(),
});

export const createInitialWatchState = (): WatchState => ({
  decision: null,
  nextRoute: null,
});

const createMatchId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const random = Math.random().toString(16).slice(2, 10);
  return `match-${Date.now()}-${random}`;
};

export const createInitialActionState = (): ActionState => ({
  selectedCardId: null,
  actorCardId: null,
  kurokoCardId: null,
});

export const createInitialState = (): GameState => {
  const timestamp = Date.now();
  return {
    matchId: createMatchId(),
    phase: 'home',
    route: '#/',
    revision: 0,
    updatedAt: timestamp,
    players: {
      lumina: createPlayerState('lumina'),
      nox: createPlayerState('nox'),
    },
    firstPlayer: null,
    activePlayer: 'lumina',
    turn: {
      count: 1,
      startedAt: timestamp,
    },
    set: {
      cards: [],
      opened: [],
    },
    history: [],
    meta: {
      createdAt: timestamp,
      composition: { ...CARD_COMPOSITION },
    },
    resume: undefined,
    recentScoutedCard: null,
    scout: {
      selectedOpponentCardIndex: null,
    },
    action: createInitialActionState(),
    watch: createInitialWatchState(),
  };
};

export const gameStore = new Store<GameState>(createInitialState());
