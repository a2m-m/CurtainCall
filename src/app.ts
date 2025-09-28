import { Router, RouteDefinition } from './router.js';
import type { RouteContext } from './router.js';
import {
  createSeededRandom,
  dealInitialSetup,
  shuffleCards,
  sortCardsByDescendingValue,
} from './cards.js';
import type { InitialDealResult } from './cards.js';
import {
  clearGame,
  deleteResult,
  getSavedGameMetadata,
  listResultHistory,
  loadGame,
  ResultHistoryEntry,
  saveGame,
  saveResult,
  type SaveMetadata,
} from './storage.js';
import { getOpponentId, resolveNextIntermissionActivePlayer } from './turn.js';
import {
  findLatestCompleteStagePair,
  findLatestWatchStagePair,
  findStagePairById,
} from './watch-stage.js';
import {
  createInitialBackstageState,
  createInitialState,
  createInitialWatchState,
  DEFAULT_PLAYER_NAMES,
  gameStore,
  PLAYER_IDS,
  REQUIRED_BOO_COUNT,
  type CurtainCallReason,
  type BackstageItemState,
  type BackstageState,
  type CardSnapshot,
  type GameState,
  type PhaseKey,
  type PlayerId,
  type PlayerState,
  type SetCardState,
  type SetReveal,
  type StageArea,
  type StageCardPlacement,
  type StagePair,
  type StageJudgeResult,
  type WatchDecision,
  type TurnState,
  type CurtainCallPlayerSummary,
  type CurtainCallSummary,
} from './state.js';
import { getActiveRankValueRule, rankValue } from './rank.js';
import { ModalController } from './ui/modal.js';
import { ToastManager } from './ui/toast.js';
import { animationManager } from './ui/animation.js';
import { CardComponent } from './ui/card.js';
import { showBoardCheck } from './ui/board-check.js';
import { setGateModalController, showGate } from './ui/gate.js';
import { createGateView } from './views/gate.js';
import { UIButton, type ButtonVariant } from './ui/button.js';
import { createHomeView } from './views/home.js';
import { createPlaceholderView } from './views/placeholder.js';
import {
  ActionHandCardViewModel,
  ActionHandSelectionState,
  createActionView,
} from './views/action.js';
import { createWatchView, WatchStageViewModel, WatchStatusViewModel } from './views/watch.js';
import { createSpotlightView, SpotlightStageViewModel } from './views/spotlight.js';
import {
  createBackstageView,
  type BackstageViewContent,
  type BackstageRevealItemViewModel,
} from './views/backstage.js';
import {
  createIntermissionView,
  type IntermissionResumeInfo,
} from './views/intermission.js';
import {
  createCurtainCallView,
  CurtainCallPlayerSummaryViewModel,
  CurtainCallResultViewModel,
  CurtainCallCardViewModel,
} from './views/curtaincall.js';
import { createScoutView } from './views/scout.js';
import type {
  ScoutOpponentHandCardViewModel,
  ScoutRecentTakenCardViewModel,
} from './views/scout.js';
import { createStandbyView } from './views/standby.js';
import * as messages from './messages.js';
import { TurnIndicator, type TurnIndicatorState } from './ui/turn-indicator.js';

interface GateActionDescriptor {
  label: string;
  variant?: ButtonVariant;
  preventRapid?: boolean;
  lockDuration?: number;
  onSelect?: (context: { router: Router }) => void;
}

interface GateDescriptor {
  message?: string | HTMLElement;
  resolveMessage?: (state: GameState) => string | HTMLElement;
  confirmLabel?: string;
  hints?: string[];
  modalNotes?: string[];
  resolveModalNotes?: (state: GameState) => string[] | undefined;
  modalTitle?: string;
  preventRapid?: boolean;
  lockDuration?: number;
  nextPath?: string | null;
  onPass?: (router: Router) => void;
  resolveSubtitle?: (state: GameState) => string | undefined;
  resolveActions?: (context: { state: GameState; router: Router }) => GateActionDescriptor[];
  content?: HTMLElement | null;
  resolveContent?: (context: { state: GameState; router: Router }) => HTMLElement | null;
}

interface RouteDescriptor {
  path: string;
  title: string;
  heading: string;
  subtitle: string;
  phase: PhaseKey;
  gate?: GateDescriptor;
}

declare global {
  interface Window {
    curtainCall?: {
      router: Router;
      modal: ModalController;
      toast: ToastManager;
      animation: typeof animationManager;
    };
  }
}

const NAVIGATION_BLOCKED_PHASES = new Set<PhaseKey>([
  'standby',
  'scout',
  'action',
  'watch',
  'spotlight',
  'backstage',
  'intermission',
]);

const {
  DEFAULT_GATE_CONFIRM_LABEL,
  DEFAULT_CLOSE_LABEL,
  NAVIGATION_BLOCK_TITLE,
  NAVIGATION_BLOCK_MESSAGE,
  NAVIGATION_BLOCK_CONFIRM_LABEL,
  HANDOFF_GATE_HINTS,
  HANDOFF_GATE_MODAL_NOTES,
  INTERMISSION_GATE_TITLE,
  INTERMISSION_GATE_CONFIRM_LABEL,
  INTERMISSION_BOARD_CHECK_LABEL,
  INTERMISSION_SUMMARY_LABEL,
  INTERMISSION_SUMMARY_TITLE,
  INTERMISSION_SUMMARY_CAPTION,
  INTERMISSION_SUMMARY_EMPTY,
  INTERMISSION_BACKSTAGE_ACTION_LABEL,
  INTERMISSION_BACKSTAGE_DESCRIPTION,
  INTERMISSION_BACKSTAGE_REVEAL_LABEL,
  INTERMISSION_BACKSTAGE_REVEAL_TITLE,
  INTERMISSION_BACKSTAGE_SKIP_LABEL,
  INTERMISSION_BACKSTAGE_REVEAL_MESSAGE,
  INTERMISSION_BACKSTAGE_REVEAL_EMPTY_MESSAGE,
  INTERMISSION_BACKSTAGE_REVEAL_GUARD_MESSAGE,
  INTERMISSION_BACKSTAGE_PENDING_MESSAGE,
  INTERMISSION_BACKSTAGE_RESULT_MATCH,
  INTERMISSION_BACKSTAGE_RESULT_MISMATCH,
  INTERMISSION_BACKSTAGE_RESULT_TITLE,
  INTERMISSION_BACKSTAGE_RESULT_MATCH_OK_LABEL,
  INTERMISSION_BACKSTAGE_RESULT_MISMATCH_OK_LABEL,
  INTERMISSION_BACKSTAGE_DRAW_TITLE,
  INTERMISSION_BACKSTAGE_DRAW_MESSAGE,
  INTERMISSION_BACKSTAGE_DRAW_EMPTY_MESSAGE,
  INTERMISSION_BACKSTAGE_COMPLETE_MESSAGE,
  INTERMISSION_BACKSTAGE_DECIDE_LABEL,
  INTERMISSION_BACKSTAGE_CONFIRM_MESSAGE,
  INTERMISSION_BACKSTAGE_CONFIRM_OK_LABEL,
  INTERMISSION_BACKSTAGE_CONFIRM_CANCEL_LABEL,
  INTERMISSION_BACKSTAGE_PREVIEW_TITLE,
  INTERMISSION_BACKSTAGE_PREVIEW_MESSAGE,
  INTERMISSION_BACKSTAGE_PREVIEW_CONFIRM_LABEL,
  INTERMISSION_BACKSTAGE_REVEAL_READY_TITLE,
  INTERMISSION_BACKSTAGE_REVEAL_READY_MESSAGE,
  INTERMISSION_BACKSTAGE_REVEAL_READY_OK_LABEL,
  INTERMISSION_BACKSTAGE_RESULT_MISMATCH_INSTRUCTION,
  INTERMISSION_BACKSTAGE_STAGE_MOVE_MESSAGE,
  INTERMISSION_BACKSTAGE_DRAW_DECIDE_LABEL,
  INTERMISSION_BACKSTAGE_DRAW_CONFIRM_TITLE,
  INTERMISSION_BACKSTAGE_DRAW_CONFIRM_MESSAGE,
  INTERMISSION_BACKSTAGE_DRAW_RESULT_MESSAGE,
  INTERMISSION_VIEW_GATE_LABEL,
  INTERMISSION_VIEW_RESUME_LABEL,
  INTERMISSION_VIEW_RESUME_TITLE,
  INTERMISSION_VIEW_RESUME_CAPTION,
  INTERMISSION_VIEW_RESUME_EMPTY,
  INTERMISSION_VIEW_RESUME_SAVED_AT_PREFIX,
  INTERMISSION_VIEW_SUMMARY_TITLE,
  INTERMISSION_VIEW_NOTES_TITLE,
  INTERMISSION_TASK_NEXT_PLAYER,
  INTERMISSION_TASK_REVIEW,
  INTERMISSION_TASK_RESUME,
  INTERMISSION_TASK_GATE,
  BACKSTAGE_GATE_TITLE,
  BACKSTAGE_GATE_CONFIRM_LABEL,
  BACKSTAGE_GATE_MESSAGE,
  BACKSTAGE_GATE_SUBTITLE,
  STANDBY_DEAL_ERROR_MESSAGE,
  STANDBY_FIRST_PLAYER_ERROR_MESSAGE,
  SCOUT_PICK_CONFIRM_TITLE,
  SCOUT_PICK_CONFIRM_MESSAGE,
  SCOUT_PICK_CONFIRM_OK_LABEL,
  SCOUT_PICK_CONFIRM_CANCEL_LABEL,
  SCOUT_BOARD_CHECK_LABEL,
  MY_HAND_LABEL,
  MY_HAND_MODAL_TITLE,
  MY_HAND_SECTION_TITLE,
  MY_HAND_EMPTY_MESSAGE,
  MY_HAND_RECENT_EMPTY_MESSAGE,
  MY_HAND_RECENT_BADGE_LABEL,
  SCOUT_HELP_BUTTON_LABEL,
  SCOUT_HELP_ARIA_LABEL,
  ACTION_CONFIRM_BUTTON_LABEL,
  ACTION_BOARD_CHECK_LABEL,
  ACTION_CONFIRM_MODAL_TITLE,
  ACTION_CONFIRM_MODAL_MESSAGE,
  ACTION_CONFIRM_MODAL_OK_LABEL,
  ACTION_CONFIRM_MODAL_CANCEL_LABEL,
  ACTION_GUARD_SELECTION_MESSAGE,
  ACTION_GUARD_INSUFFICIENT_HAND_MESSAGE,
  ACTION_RESULT_TITLE,
  ACTION_RESULT_OK_LABEL,
  WATCH_BOARD_CHECK_LABEL,
  WATCH_MY_HAND_LABEL,
  WATCH_HELP_BUTTON_LABEL,
  WATCH_HELP_ARIA_LABEL,
  WATCH_CLAP_BUTTON_LABEL,
  WATCH_BOO_BUTTON_LABEL,
  WATCH_ACTOR_LABEL,
  WATCH_KUROKO_LABEL,
  WATCH_REMAINING_PLACEHOLDER,
  WATCH_WARNING_BADGE_LABEL,
  WATCH_CLAP_WARNING_MESSAGE,
  WATCH_STAGE_EMPTY_MESSAGE,
  WATCH_KUROKO_DEFAULT_DESCRIPTION,
  WATCH_DECISION_CONFIRM_TITLES,
  WATCH_DECISION_CONFIRM_MESSAGES,
  WATCH_DECISION_CONFIRM_OK_LABEL,
  WATCH_DECISION_CONFIRM_CANCEL_LABEL,
  WATCH_RESULT_TITLES,
  WATCH_RESULT_MESSAGES,
  WATCH_RESULT_OK_LABELS,
  WATCH_REDIRECTING_SUBTITLE,
  WATCH_GUARD_REDIRECTING_SUBTITLE,
  SPOTLIGHT_SECRET_GUARD_REDIRECTING_SUBTITLE,
  SPOTLIGHT_SET_OPEN_GUARD_REDIRECTING_SUBTITLE,
  SPOTLIGHT_BOARD_CHECK_LABEL,
  SPOTLIGHT_HELP_BUTTON_LABEL,
  SPOTLIGHT_HELP_ARIA_LABEL,
  SPOTLIGHT_REVEAL_BUTTON_LABEL,
  SPOTLIGHT_REVEAL_CAPTION,
  SPOTLIGHT_REVEAL_COMPLETED_CAPTION,
  SPOTLIGHT_REVEAL_UNAVAILABLE_CAPTION,
  SPOTLIGHT_REVEAL_CONFIRM_TITLE,
  SPOTLIGHT_REVEAL_CONFIRM_MESSAGE,
  SPOTLIGHT_REVEAL_CONFIRM_OK_LABEL,
  SPOTLIGHT_REVEAL_CONFIRM_CANCEL_LABEL,
  SPOTLIGHT_RESULT_TITLE,
  SPOTLIGHT_RESULT_MATCH_PREFIX,
  SPOTLIGHT_RESULT_MISMATCH_PREFIX,
  SPOTLIGHT_RESULT_MATCH_MESSAGE,
  SPOTLIGHT_RESULT_MISMATCH_MESSAGE,
  SPOTLIGHT_RESULT_SKIP_LABEL,
  SPOTLIGHT_SET_OPEN_BUTTON_LABEL,
  SPOTLIGHT_SET_PICKER_TITLE,
  SPOTLIGHT_SET_PICKER_MESSAGE,
  SPOTLIGHT_SET_PICKER_EMPTY_MESSAGE,
  SPOTLIGHT_SET_PICKER_CANCEL_LABEL,
  SPOTLIGHT_SET_CARD_LABEL_PREFIX,
  SPOTLIGHT_SET_CONFIRM_TITLE,
  SPOTLIGHT_SET_CONFIRM_MESSAGE,
  SPOTLIGHT_SET_CONFIRM_OK_LABEL,
  SPOTLIGHT_SET_CONFIRM_CANCEL_LABEL,
  SPOTLIGHT_SET_RESULT_TITLE,
  SPOTLIGHT_SET_RESULT_MESSAGE,
  SPOTLIGHT_SET_RESULT_OK_LABEL,
  SPOTLIGHT_SET_OPEN_GUARD_MESSAGE,
  SPOTLIGHT_SET_OPEN_GATE_MESSAGE,
  SPOTLIGHT_PAIR_CHECK_TITLE,
  SPOTLIGHT_PAIR_CHECK_MESSAGE,
  SPOTLIGHT_PAIR_CHECK_SKIPPED_MESSAGE,
  SPOTLIGHT_PAIR_CHECK_PAIRED_MESSAGE,
  SPOTLIGHT_PAIR_CHECK_UNPAIRED_MESSAGE,
  SPOTLIGHT_PAIR_CHECK_CAPTION,
  SPOTLIGHT_PAIR_CHECK_CONFIRM_LABEL,
  SPOTLIGHT_JOKER_BONUS_TITLE,
  SPOTLIGHT_JOKER_BONUS_MESSAGE,
  SPOTLIGHT_JOKER_BONUS_MULTI_PROMPT,
  SPOTLIGHT_JOKER_BONUS_EMPTY_MESSAGE,
  SPOTLIGHT_JOKER_BONUS_EMPTY_ACTION_LABEL,
  SPOTLIGHT_JOKER_BONUS_RESULT_MESSAGE,
  SPOTLIGHT_JOKER_BONUS_EMPTY_RESULT_MESSAGE,
  SPOTLIGHT_SECRET_PAIR_TITLE,
  SPOTLIGHT_SECRET_PAIR_MESSAGE,
  SPOTLIGHT_SECRET_PAIR_EMPTY_MESSAGE,
  SPOTLIGHT_SECRET_PAIR_SKIP_LABEL,
  SPOTLIGHT_SECRET_PAIR_GATE_MESSAGE,
  SPOTLIGHT_SECRET_PAIR_RESULT_MESSAGE,
  SPOTLIGHT_SECRET_PAIR_SKIP_RESULT_MESSAGE,
  CURTAINCALL_GATE_MODAL_TITLE,
  CURTAINCALL_GATE_MESSAGE,
  CURTAINCALL_GATE_CONFIRM_LABEL,
  CURTAINCALL_BOARD_CHECK_LABEL,
  CURTAINCALL_HOME_BUTTON_LABEL,
  CURTAINCALL_NEW_GAME_BUTTON_LABEL,
  CURTAINCALL_SAVE_BUTTON_LABEL,
  CURTAINCALL_SAVE_DIALOG_TITLE,
  CURTAINCALL_SAVE_TITLE_LABEL,
  CURTAINCALL_SAVE_TITLE_PLACEHOLDER,
  CURTAINCALL_SAVE_MEMO_LABEL,
  CURTAINCALL_SAVE_MEMO_PLACEHOLDER,
  CURTAINCALL_SAVE_SUBMIT_LABEL,
  CURTAINCALL_SAVE_CANCEL_LABEL,
  CURTAINCALL_SAVE_SUCCESS_MESSAGE,
  CURTAINCALL_SAVE_FAILURE_MESSAGE,
  CURTAINCALL_SAVE_REQUIRED_MESSAGE,
  CURTAINCALL_SAVE_UNAVAILABLE_MESSAGE,
  CURTAINCALL_SAVE_ALREADY_SAVED_MESSAGE,
  CURTAINCALL_SAVE_DIALOG_OPEN_MESSAGE,
  CURTAINCALL_SAVE_IN_PROGRESS_MESSAGE,
  CURTAINCALL_BREAKDOWN_KAMI_LABEL,
  CURTAINCALL_BREAKDOWN_HAND_LABEL,
  CURTAINCALL_BREAKDOWN_PENALTY_LABEL,
  CURTAINCALL_BREAKDOWN_FINAL_LABEL,
  CURTAINCALL_BOO_PROGRESS_LABEL,
  CURTAINCALL_KAMI_SECTION_LABEL,
  CURTAINCALL_HAND_SECTION_LABEL,
  CURTAINCALL_KAMI_EMPTY_MESSAGE,
  CURTAINCALL_HAND_EMPTY_MESSAGE,
  CURTAINCALL_SUMMARY_PREPARING_SUBTITLE,
  SCOUT_PICK_RESULT_TITLE,
  SCOUT_PICK_RESULT_OK_LABEL,
  SCOUT_PICK_RESULT_DRAWN_MESSAGE,
  SCOUT_PICK_RESULT_PREVIEW_CAPTION,
  SCOUT_PICK_RESULT_ACTION_NOTICE,
  HOME_SETTINGS_TITLE,
  HOME_SETTINGS_MESSAGE,
  HELP_POPUP_BLOCKED_TOAST_MESSAGE,
  HELP_POPUP_BLOCKED_CONSOLE_MESSAGE,
  HISTORY_DIALOG_TITLE,
  HISTORY_DIALOG_DESCRIPTION,
  HISTORY_EMPTY_MESSAGE,
  HISTORY_UNKNOWN_TIMESTAMP,
  HISTORY_COPY_BUTTON_LABEL,
  HISTORY_DELETE_BUTTON_LABEL,
  HISTORY_COPY_SUCCESS,
  HISTORY_COPY_FAILURE,
  HISTORY_DELETE_SUCCESS,
  HISTORY_DELETE_FAILURE,
} = messages;

const createHandOffGateConfig = (overrides: Partial<GateDescriptor> = {}): GateDescriptor => ({
  hints: [...HANDOFF_GATE_HINTS],
  modalNotes: [...HANDOFF_GATE_MODAL_NOTES],
  ...overrides,
});

const STANDBY_SEED_LOCK_VALUE = 'dev-fixed-0001';

const CARD_SUIT_LABEL: Record<CardSnapshot['suit'], string> = {
  spades: 'スペード',
  hearts: 'ハート',
  diamonds: 'ダイヤ',
  clubs: 'クラブ',
  joker: 'ジョーカー',
};

const SCOUT_TO_ACTION_PATH = '#/phase/action';
const INTERMISSION_TO_SCOUT_PATH = '#/phase/scout';

const SCOUT_MY_HAND_LABEL = MY_HAND_LABEL;
const INTERMISSION_MY_HAND_LABEL = MY_HAND_LABEL;
const SCOUT_RECENT_TAKEN_HISTORY_LIMIT = 5;

const ACTION_TO_WATCH_PATH = '#/phase/watch/gate';

const WATCH_TO_INTERMISSION_PATH = '#/phase/intermission';
const SPOTLIGHT_GATE_PATH = '#/phase/spotlight/gate';
const WATCH_TO_SPOTLIGHT_PATH = '#/phase/spotlight';
const SPOTLIGHT_TO_CURTAINCALL_PATH = '#/phase/curtaincall/gate';
const BACKSTAGE_PHASE_PATH = '#/phase/backstage';
const BACKSTAGE_GATE_PATH = '#/phase/backstage/gate';
const SPOTLIGHT_TO_BACKSTAGE_PATH = BACKSTAGE_GATE_PATH;
const SPOTLIGHT_TO_INTERMISSION_PATH = '#/phase/intermission';

const CURTAINCALL_BOO_PENALTY = 15;

const CURTAINCALL_REASON_DESCRIPTIONS: Record<CurtainCallReason, string> = {
  jokerBonus: '終了条件：JOKERボーナス',
  setRemaining1: '終了条件：山札残り1枚',
  handDepleted: '終了条件：手札枯渇',
};
const SPOTLIGHT_STAGE_EMPTY_MESSAGE = WATCH_STAGE_EMPTY_MESSAGE;
const SPOTLIGHT_KUROKO_HIDDEN_DESCRIPTION = WATCH_KUROKO_DEFAULT_DESCRIPTION;

const createWatchDecisionConfirmMessage = (decision: WatchDecision, playerName: string): string => {
  const base = WATCH_DECISION_CONFIRM_MESSAGES[decision];
  return `${playerName}のターンです。${base}`;
};

const createWatchResultMessage = (decision: WatchDecision, playerName: string): string =>
  `${playerName}が${WATCH_RESULT_MESSAGES[decision]}`;

let watchSecretAccessGranted = false;

const grantWatchSecretAccess = (): void => {
  watchSecretAccessGranted = true;
};

const revokeWatchSecretAccess = (): void => {
  watchSecretAccessGranted = false;
};

const hasWatchSecretAccess = (): boolean => watchSecretAccessGranted;

interface SpotlightSecretPairRequest {
  revealId: string;
  playerId: PlayerId;
}

let spotlightSecretAccessGranted = false;
let pendingSpotlightSecretPair: SpotlightSecretPairRequest | null = null;
interface SpotlightSetOpenRequest {
  playerId: PlayerId;
}
let pendingSpotlightSetOpen: SpotlightSetOpenRequest | null = null;
let isSpotlightSecretPairInProgress = false;
type SpotlightPairCheckOutcome = 'paired' | 'unpaired' | 'skipped';
let latestSpotlightPairCheckOutcome: SpotlightPairCheckOutcome | null = null;

interface SpotlightPairCards {
  actor: CardSnapshot;
  hand: CardSnapshot;
}

let latestSpotlightPairCards: SpotlightPairCards | null = null;

const grantSpotlightSecretAccess = (): void => {
  spotlightSecretAccessGranted = true;
};

const revokeSpotlightSecretAccess = (): void => {
  spotlightSecretAccessGranted = false;
};

const hasSpotlightSecretAccess = (): boolean => spotlightSecretAccessGranted;

const resetPendingSpotlightSecrets = (): void => {
  pendingSpotlightSecretPair = null;
  pendingSpotlightSetOpen = null;
  revokeSpotlightSecretAccess();
};

let lastActionGuardMessage: string | null = null;

const formatCardLabel = (card: CardSnapshot): string => {
  if (card.suit === 'joker') {
    return CARD_SUIT_LABEL[card.suit];
  }
  return `${CARD_SUIT_LABEL[card.suit]}の${card.rank}`;
};

const formatSetCardPositionLabel = (): string => SPOTLIGHT_SET_CARD_LABEL_PREFIX;

const createScoutPickSuccessMessage = (card: CardSnapshot): string =>
  `${formatCardLabel(card)}を引きました！アクションフェーズへ移行します`;

const cloneCardSnapshot = (card: CardSnapshot): CardSnapshot => ({
  id: card.id,
  rank: card.rank,
  suit: card.suit,
  value: card.value,
  face: card.face,
  annotation: card.annotation,
});

const cloneCurtainCallCard = (card: CardSnapshot): CardSnapshot => {
  const cloned = cloneCardSnapshot(card);
  cloned.value = rankValue(card.rank);
  return cloned;
};

const collectCurtainCallKamiCards = (player: PlayerState | undefined): CardSnapshot[] => {
  if (!player?.stage?.pairs?.length) {
    return [];
  }

  return player.stage.pairs
    .map((pair) => pair.actor?.card)
    .filter((card): card is CardSnapshot => Boolean(card))
    .map((card) => cloneCurtainCallCard(card));
};

const collectCurtainCallHandCards = (player: PlayerState | undefined): CardSnapshot[] => {
  if (!player?.hand?.cards?.length) {
    return [];
  }

  const clones = player.hand.cards.map((card) => cloneCurtainCallCard(card));
  return sortCardsByDescendingValue(clones);
};

const sumCardValues = (cards: readonly CardSnapshot[]): number =>
  cards.reduce((total, card) => total + card.value, 0);

const createEmptyCurtainCallPlayerSummary = (): CurtainCallPlayerSummary => ({
  kamiCards: [],
  handCards: [],
  sumKami: 0,
  sumHand: 0,
  penalty: 0,
  final: 0,
});

const createCurtainCallPlayerSummary = (
  player: PlayerState | undefined,
  reason: CurtainCallReason,
): CurtainCallPlayerSummary => {
  if (!player) {
    return createEmptyCurtainCallPlayerSummary();
  }

  const kamiCards = collectCurtainCallKamiCards(player);
  const handCards = collectCurtainCallHandCards(player);
  const sumKami = sumCardValues(kamiCards);
  const sumHand = sumCardValues(handCards);
  const missingBooCount = Math.max(0, REQUIRED_BOO_COUNT - (player.booCount ?? 0));
  const penalty = reason === 'setRemaining1' ? missingBooCount * CURTAINCALL_BOO_PENALTY : 0;
  const final = sumKami - sumHand - penalty;

  return {
    kamiCards,
    handCards,
    sumKami,
    sumHand,
    penalty,
    final,
  };
};

const determineCurtainCallOutcome = (
  summaries: Record<PlayerId, CurtainCallPlayerSummary>,
): { winner: PlayerId | 'draw'; margin: number } => {
  const luminaFinal = summaries.lumina?.final ?? 0;
  const noxFinal = summaries.nox?.final ?? 0;

  if (luminaFinal > noxFinal) {
    return { winner: 'lumina', margin: luminaFinal - noxFinal };
  }

  if (luminaFinal < noxFinal) {
    return { winner: 'nox', margin: noxFinal - luminaFinal };
  }

  return { winner: 'draw', margin: 0 };
};

const formatInteger = (value: number): string => value.toLocaleString('ja-JP');

const formatSignedInteger = (value: number): string => {
  if (value > 0) {
    return `+${formatInteger(value)}`;
  }
  if (value < 0) {
    return formatInteger(value);
  }
  return '0';
};

const mapCurtainCallCard = (card: CardSnapshot): CurtainCallCardViewModel => ({
  id: card.id,
  rank: card.rank,
  suit: card.suit,
  annotation: card.annotation,
  label: formatCardLabel(card),
});

const mapCurtainCallPlayerSummary = (
  state: GameState,
  playerId: PlayerId,
): CurtainCallPlayerSummaryViewModel => {
  const summary = state.curtainCall?.players[playerId];
  const booCount = state.curtainCall?.booCount[playerId] ?? 0;
  const finalScore = summary?.final ?? 0;
  const trend: CurtainCallPlayerSummaryViewModel['final']['trend'] =
    finalScore > 0 ? 'positive' : finalScore < 0 ? 'negative' : 'zero';

  return {
    id: playerId,
    name: getPlayerDisplayName(state, playerId),
    breakdown: [
      { label: CURTAINCALL_BREAKDOWN_KAMI_LABEL, value: formatInteger(summary?.sumKami ?? 0) },
      { label: CURTAINCALL_BREAKDOWN_HAND_LABEL, value: formatInteger(summary?.sumHand ?? 0) },
      {
        label: CURTAINCALL_BREAKDOWN_PENALTY_LABEL,
        value: formatInteger(summary?.penalty ?? 0),
      },
    ],
    final: {
      label: CURTAINCALL_BREAKDOWN_FINAL_LABEL,
      value: formatSignedInteger(finalScore),
      trend,
    },
    booProgress: {
      label: CURTAINCALL_BOO_PROGRESS_LABEL,
      value: `${Math.min(booCount, REQUIRED_BOO_COUNT)}/${REQUIRED_BOO_COUNT}`,
    },
    kami: {
      label: CURTAINCALL_KAMI_SECTION_LABEL,
      cards: (summary?.kamiCards ?? []).map((card) => mapCurtainCallCard(card)),
      emptyMessage: CURTAINCALL_KAMI_EMPTY_MESSAGE,
    },
    hand: {
      label: CURTAINCALL_HAND_SECTION_LABEL,
      cards: (summary?.handCards ?? []).map((card) => mapCurtainCallCard(card)),
      emptyMessage: CURTAINCALL_HAND_EMPTY_MESSAGE,
    },
  };
};

const mapCurtainCallPlayers = (state: GameState): CurtainCallPlayerSummaryViewModel[] =>
  PLAYER_IDS.map((playerId) => mapCurtainCallPlayerSummary(state, playerId));

const mapCurtainCallResult = (state: GameState): CurtainCallResultViewModel => {
  const summary = state.curtainCall;
  if (!summary) {
    return { label: '結果を表示できません。' };
  }

  const description = CURTAINCALL_REASON_DESCRIPTIONS[summary.reason];

  if (summary.winner === 'draw') {
    return {
      label: '引き分け',
      description,
    };
  }

  const winnerName = getPlayerDisplayName(state, summary.winner);
  const marginLabel = summary.margin > 0 ? `（${formatSignedInteger(summary.margin)}）` : '';

  return {
    label: `${winnerName}の勝ち${marginLabel}`,
    description,
  };
};

const prepareCurtainCall = (reason: CurtainCallReason): void => {
  gameStore.setState((current) => {
    if (current.curtainCall?.reason === reason) {
      return current;
    }

    const timestamp = Date.now();
    const nextPlayers: Record<PlayerId, PlayerState> = { ...current.players };
    const playerSummaries = {} as Record<PlayerId, CurtainCallPlayerSummary>;
    const booCount = {} as Record<PlayerId, number>;

    PLAYER_IDS.forEach((playerId) => {
      const player = current.players[playerId];
      const summary = createCurtainCallPlayerSummary(player, reason);
      playerSummaries[playerId] = summary;
      booCount[playerId] = player?.booCount ?? 0;

      if (player) {
        nextPlayers[playerId] = {
          ...player,
          score: {
            sumKami: summary.sumKami,
            sumHand: summary.sumHand,
            penalty: summary.penalty,
            final: summary.final,
          },
        };
      }
    });

    const { winner, margin } = determineCurtainCallOutcome(playerSummaries);

    const summary: CurtainCallSummary = {
      reason,
      preparedAt: timestamp,
      rankValueRule: getActiveRankValueRule(),
      booCount,
      winner,
      margin,
      players: playerSummaries,
      savedHistoryEntryId: null,
      savedAt: null,
    };

    return {
      ...current,
      players: nextPlayers,
      curtainCall: summary,
      revision: current.revision + 1,
      updatedAt: timestamp,
    };
  });
};

interface CurtainCallHistoryPayload {
  summary: string;
  detail: string;
}

const formatCurtainCallCardList = (cards: readonly CardSnapshot[] | undefined): string => {
  if (!cards || cards.length === 0) {
    return 'なし';
  }
  return cards.map((card) => formatCardLabel(card)).join('、');
};

const formatCurtainCallPenaltyDetail = (
  penalty: number,
  reason: CurtainCallReason,
  booCount: number,
): string => {
  if (reason !== 'setRemaining1') {
    return formatInteger(penalty);
  }
  if (penalty <= 0) {
    return `${formatInteger(0)}（条件達成）`;
  }
  const missing = Math.max(0, REQUIRED_BOO_COUNT - Math.max(booCount, 0));
  if (missing <= 0) {
    return formatInteger(penalty);
  }
  return `${formatInteger(penalty)}（ブーイング不足 ${missing} 回 × ${CURTAINCALL_BOO_PENALTY}）`;
};

const createCurtainCallStageSnapshotLines = (state: GameState): string[] => {
  const lines: string[] = [];
  const entries = PLAYER_IDS.map((playerId) => {
    const player = state.players[playerId];
    const playerName = getPlayerDisplayName(state, playerId);
    const stagePairs = player?.stage?.pairs ?? [];
    const visible: string[] = [];

    stagePairs.forEach((pair, index) => {
      const actorCard = pair.actor?.card;
      const actorLabel =
        actorCard && actorCard.face !== 'down' ? formatCardLabel(actorCard) : null;
      const kurokoCard = pair.kuroko?.card;
      const kurokoLabel =
        kurokoCard && kurokoCard.face === 'up' ? formatCardLabel(kurokoCard) : null;
      const details: string[] = [];
      if (actorLabel) {
        details.push(`役者：${actorLabel}`);
      }
      if (kurokoLabel) {
        details.push(`黒子：${kurokoLabel}`);
      }
      if (pair.judge) {
        details.push(`判定：${pair.judge === 'match' ? '一致' : '不一致'}`);
      }
      if (details.length > 0) {
        const prefix = `#${String(index + 1).padStart(2, '0')}`;
        visible.push(`${prefix} ${details.join(' ｜ ')}`);
      }
    });

    if (visible.length === 0) {
      return { hasVisible: false, line: `  ${playerName}：公開情報なし` };
    }

    return { hasVisible: true, line: `  ${playerName}：${visible.join(' ／ ')}` };
  });

  const hasVisible = entries.some((entry) => entry.hasVisible);
  if (!hasVisible) {
    return ['ステージ：公開情報なし'];
  }

  lines.push('ステージ：');
  entries.forEach((entry) => {
    lines.push(entry.line);
  });

  return lines;
};

const createCurtainCallSetSnapshotLines = (state: GameState): string[] => {
  const opened = state.set?.opened ?? [];
  const visible = opened
    .filter((reveal) => reveal?.card?.face === 'up')
    .slice()
    .sort((a, b) => a.position - b.position);

  if (visible.length === 0) {
    return ['公開済みセット：なし'];
  }

  const lines: string[] = ['公開済みセット：'];

  visible.forEach((reveal) => {
    const card = reveal.card;
    const label = formatCardLabel(card);
    const meta: string[] = [];
    const openedBy = getPlayerDisplayName(state, reveal.openedBy);
    meta.push(`公開：${openedBy}`);
    if (reveal.assignedTo) {
      meta.push(`帰属：${getPlayerDisplayName(state, reveal.assignedTo)}`);
    }
    if (reveal.bonus) {
      const bonusLabel =
        reveal.bonus === 'joker'
          ? 'ボーナス：JOKER'
          : reveal.bonus === 'pair'
            ? 'ボーナス：ペア'
            : 'ボーナス：シークレットペア';
      meta.push(bonusLabel);
    }
    const metaLabel = meta.length > 0 ? `（${meta.join('／')}）` : '';
    lines.push(`  ・${label}${metaLabel}`);
  });

  return lines;
};

const createCurtainCallHistoryPayload = (
  state: GameState,
  title: string,
  memo: string | null,
  savedAt: number,
): CurtainCallHistoryPayload | null => {
  const curtainCall = state.curtainCall;
  if (!curtainCall) {
    return null;
  }

  const resultView = mapCurtainCallResult(state);
  const summaryText = [title, resultView.label].filter(Boolean).join(' ｜ ') || title;

  const lines: string[] = [];
  lines.push(`対局ID: ${state.matchId}`);
  const createdAt = state.meta?.createdAt;
  if (Number.isFinite(createdAt)) {
    const formatted = formatTimestamp(createdAt as number);
    if (formatted) {
      lines.push(`対局開始: ${formatted}`);
    }
  }
  const preparedAt = formatTimestamp(curtainCall.preparedAt);
  if (preparedAt) {
    lines.push(`結果確定: ${preparedAt}`);
  }
  const savedTimestamp = formatTimestamp(savedAt);
  if (savedTimestamp) {
    lines.push(`保存日時: ${savedTimestamp}`);
  }
  const reasonLabel = CURTAINCALL_REASON_DESCRIPTIONS[curtainCall.reason];
  if (reasonLabel) {
    lines.push(`終了理由: ${reasonLabel}`);
  }
  lines.push(`勝敗: ${resultView.label}`);
  lines.push(`最終ポイント差: ${formatSignedInteger(curtainCall.margin)}`);

  const booSummary = PLAYER_IDS.map((playerId) => {
    const name = getPlayerDisplayName(state, playerId);
    const booCount = Math.max(0, curtainCall.booCount[playerId] ?? 0);
    return `${name} ${Math.min(booCount, REQUIRED_BOO_COUNT)}/${REQUIRED_BOO_COUNT}`;
  }).join(' ／ ');
  lines.push(`ブーイング達成: ${booSummary}`);
  lines.push('');

  PLAYER_IDS.forEach((playerId, index) => {
    const name = getPlayerDisplayName(state, playerId);
    const playerSummary = curtainCall.players[playerId] ?? createEmptyCurtainCallPlayerSummary();
    const booCount = Math.max(0, curtainCall.booCount[playerId] ?? 0);

    lines.push(`[${name}]`);
    lines.push(
      `カミ合計: ${formatInteger(playerSummary.sumKami)}（${formatCurtainCallCardList(playerSummary.kamiCards)}）`,
    );
    lines.push(
      `手札合計: ${formatInteger(playerSummary.sumHand)}（${formatCurtainCallCardList(playerSummary.handCards)}）`,
    );
    lines.push(
      `ペナルティ: ${formatCurtainCallPenaltyDetail(playerSummary.penalty, curtainCall.reason, booCount)}`,
    );
    lines.push(`最終ポイント: ${formatSignedInteger(playerSummary.final)}`);
    lines.push(`ブーイング達成: ${Math.min(booCount, REQUIRED_BOO_COUNT)}/${REQUIRED_BOO_COUNT}`);

    if (index < PLAYER_IDS.length - 1) {
      lines.push('');
    }
  });

  if (memo) {
    lines.push('');
    lines.push('[メモ]');
    lines.push(memo);
  }

  const stageLines = createCurtainCallStageSnapshotLines(state);
  const setLines = createCurtainCallSetSnapshotLines(state);
  if (stageLines.length > 0 || setLines.length > 0) {
    lines.push('');
    lines.push('[最終盤面]');
    stageLines.forEach((line) => lines.push(line));
    setLines.forEach((line) => lines.push(line));
  }

  const detail = lines.join('\n').trimEnd();

  return {
    summary: summaryText,
    detail,
  };
};

const formatTimestampForDefaultTitle = (timestamp: number): string | null => {
  if (!Number.isFinite(timestamp)) {
    return null;
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const pad = (value: number): string => value.toString().padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}`;
};

const createCurtainCallDefaultTitle = (state: GameState): string => {
  const curtainCall = state.curtainCall;
  const timestamp =
    formatTimestampForDefaultTitle(curtainCall?.preparedAt ?? state.updatedAt) ?? 'curtaincall';
  if (!curtainCall) {
    return `${timestamp}_結果`;
  }
  const outcome =
    curtainCall.winner === 'draw'
      ? '引き分け'
      : `${getPlayerDisplayName(state, curtainCall.winner)}勝利`;
  return `${timestamp}_${outcome}`;
};

const createPlayersForInitialDeal = (
  template: GameState,
  previous: GameState,
  deal: InitialDealResult,
): Record<PlayerId, PlayerState> =>
  PLAYER_IDS.reduce<Record<PlayerId, PlayerState>>(
    (acc, id) => {
      const basePlayer = template.players[id];
      const previousPlayer = previous.players[id];
      acc[id] = {
        ...basePlayer,
        name: previousPlayer?.name ?? basePlayer.name,
        hand: {
          ...basePlayer.hand,
          cards: sortCardsByDescendingValue(deal.hands[id].map((card) => cloneCardSnapshot(card))),
          lastDrawnCardId: null,
        },
      };
      return acc;
    },
    {} as Record<PlayerId, PlayerState>,
  );

const createBackstageItemsForInitialDeal = (
  cards: readonly CardSnapshot[],
): BackstageItemState[] =>
  cards.map((card, index) => ({
    id: `backstage-${String(index + 1).padStart(2, '0')}`,
    position: index,
    card: cloneCardSnapshot(card),
    status: 'backstage',
    holder: null,
    isPublic: false,
  }));

const createInitialDealState = (
  current: GameState,
  deal: InitialDealResult,
  timestamp: number,
): GameState => {
  const template = createInitialState();
  const firstPlayer = current.firstPlayer ?? current.activePlayer ?? 'lumina';
  return {
    ...template,
    phase: current.phase,
    route: current.route,
    players: createPlayersForInitialDeal(template, current, deal),
    firstPlayer: current.firstPlayer ?? firstPlayer,
    activePlayer: firstPlayer,
    turn: {
      count: 1,
      startedAt: timestamp,
    },
    set: {
      cards: deal.set.map((entry) => ({
        id: entry.id,
        position: entry.position,
        card: cloneCardSnapshot(entry.card),
      })),
      opened: [],
    },
    backstage: {
      ...createInitialBackstageState(),
      items: createBackstageItemsForInitialDeal(deal.backstage),
      pile: deal.backstage.length,
    },
    history: [],
    updatedAt: timestamp,
    revision: current.revision + 1,
    meta: {
      ...template.meta,
      createdAt: timestamp,
      composition: { ...template.meta.composition },
      seed: current.meta.seed ?? template.meta.seed,
    },
    resume: {
      at: timestamp,
      phase: current.phase,
      player: firstPlayer,
      route: current.route,
    },
    recentScoutedCard: null,
  };
};

const showStandbyErrorToast = (message: string): void => {
  if (typeof window === 'undefined') {
    console.error(message);
    return;
  }
  const toast = window.curtainCall?.toast;
  if (toast) {
    toast.show({ message, variant: 'danger' });
  } else {
    console.error(message);
  }
};

const handleStandbyGatePass = (router: Router): void => {
  const snapshot = gameStore.getState();
  if (!snapshot.firstPlayer) {
    console.warn('先手が未決定のため、デッキ配布を実行できません。');
    showStandbyErrorToast(STANDBY_FIRST_PLAYER_ERROR_MESSAGE);
    router.go('#/standby');
    return;
  }

  const seed = snapshot.meta?.seed;
  const dealOptions = seed ? { random: createSeededRandom(seed) } : undefined;

  let deal: InitialDealResult;
  try {
    deal = dealInitialSetup(dealOptions);
  } catch (error) {
    console.error('スタンバイの初期化処理でエラーが発生しました。', error);
    showStandbyErrorToast(STANDBY_DEAL_ERROR_MESSAGE);
    router.go('#/standby');
    return;
  }

  gameStore.setState((current) => {
    if (!current.firstPlayer) {
      return current;
    }
    const timestamp = Date.now();
    return createInitialDealState(current, deal, timestamp);
  });

  router.go('#/phase/scout');
};

const HOME_START_PATH = '#/standby';
const HOME_RESUME_GATE_PATH = '#/resume/gate';
const RULEBOOK_PATH = './rulebook.md';

const PLAYER_LABELS: Readonly<Record<PlayerId, string>> = DEFAULT_PLAYER_NAMES;

const PLAYER_ROLES: Record<PlayerId, string> = {
  lumina: 'プレイヤーA',
  nox: 'プレイヤーB',
};

const getPlayerDisplayName = (state: GameState, playerId: PlayerId): string => {
  const player = state.players[playerId];
  const name = player?.name?.trim();
  if (name) {
    return name;
  }
  return PLAYER_LABELS[playerId] ?? playerId;
};

const getTurnPlayerNames = (state: GameState): { activeName: string; opponentName: string } => {
  const activeName = getPlayerDisplayName(state, state.activePlayer);
  const opponentName = getPlayerDisplayName(state, getOpponentId(state.activePlayer));
  return { activeName, opponentName };
};

const createTurnIndicatorState = (state: GameState): TurnIndicatorState => {
  const { activeName, opponentName } = getTurnPlayerNames(state);
  return { activeName, opponentName };
};

const attachTurnIndicatorToView = (view: HTMLElement, state: GameState): (() => void) => {
  const target = view.querySelector('main') ?? view;
  if (!target) {
    return () => undefined;
  }

  const indicator = new TurnIndicator(createTurnIndicatorState(state));
  target.insertBefore(indicator.el, target.firstChild ?? null);

  const unsubscribe = gameStore.subscribe((nextState) => {
    indicator.setState(createTurnIndicatorState(nextState));
  });

  return () => {
    unsubscribe();
    indicator.el.remove();
  };
};

const createTurnGateMessage = (
  state: GameState,
  confirmLabel: string = DEFAULT_GATE_CONFIRM_LABEL,
): string => {
  const { activeName, opponentName } = getTurnPlayerNames(state);
  return `次は${activeName}のターンです。${opponentName}に画面が見えないことを確認したら「${confirmLabel}」を押してください。`;
};

const createPhaseGateMessage = (
  state: GameState,
  phaseLabel: string,
  confirmLabel: string = DEFAULT_GATE_CONFIRM_LABEL,
): string =>
  `${createTurnGateMessage(state, confirmLabel)}${phaseLabel ? `${phaseLabel}を始めましょう。` : ''}`;

const PHASE_LABELS: Record<PhaseKey, string> = {
  home: 'HOME',
  standby: 'スタンバイ',
  scout: 'スカウト',
  action: 'アクション',
  watch: 'ウォッチ',
  spotlight: 'スポットライト',
  backstage: 'バックステージ',
  intermission: 'インターミッション',
  curtaincall: 'カーテンコール',
};

const formatTimestamp = (timestamp: number): string | null => {
  if (!Number.isFinite(timestamp)) {
    return null;
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const pad = (value: number): string => value.toString().padStart(2, '0');
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatResumeTimestamp = (timestamp: number): string | null => formatTimestamp(timestamp);

const createResumeSummary = (player: PlayerId, phase: PhaseKey): string => {
  const playerLabel = PLAYER_LABELS[player] ?? player;
  const phaseLabel = PHASE_LABELS[phase] ?? phase;
  return `手番：${playerLabel}\u3000\uFF5C\u3000フェーズ：${phaseLabel}`;
};

const createResumeGateTitle = (metadata: SaveMetadata): string => {
  const playerLabel = PLAYER_LABELS[metadata.activePlayer] ?? metadata.activePlayer;
  return `${playerLabel}の番から再開`;
};

const createResumeGateSubtitle = (metadata: SaveMetadata): string => {
  const phaseLabel = PHASE_LABELS[metadata.phase] ?? metadata.phase;
  return `フェーズ：${phaseLabel}`;
};

const formatResumeTurnLabel = (turn: TurnState | undefined): string | null => {
  if (!turn || !Number.isFinite(turn.count)) {
    return null;
  }
  const count = Math.max(1, Math.floor(turn.count));
  return `第${count}ターン`;
};

const createResumeGateContent = (metadata: SaveMetadata): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'resume-gate';

  const summary = document.createElement('p');
  summary.className = 'resume-gate__summary';
  summary.textContent = createResumeSummary(metadata.activePlayer, metadata.phase);
  container.append(summary);

  const details = document.createElement('dl');
  details.className = 'resume-gate__details';

  const appendDetail = (label: string, value: string | null): void => {
    if (!value) {
      return;
    }
    const item = document.createElement('div');
    item.className = 'resume-gate__detail';
    const term = document.createElement('dt');
    term.textContent = label;
    const description = document.createElement('dd');
    description.textContent = value;
    item.append(term, description);
    details.append(item);
  };

  appendDetail('手番', PLAYER_LABELS[metadata.activePlayer] ?? metadata.activePlayer);
  appendDetail('フェーズ', PHASE_LABELS[metadata.phase] ?? metadata.phase);
  appendDetail('ターン', formatResumeTurnLabel(metadata.turn));

  const savedAt = formatResumeTimestamp(metadata.savedAt);
  appendDetail('保存日時', savedAt);

  container.append(details);

  return container;
};

const renderResumeGateHints = (): HTMLUListElement | null => {
  const hints = Array.from(messages.RESUME_GATE_HINTS ?? []);
  if (hints.length === 0) {
    return null;
  }
  const list = document.createElement('ul');
  list.className = 'gate-view__hints';
  hints.forEach((hint) => {
    const item = document.createElement('li');
    item.textContent = hint;
    list.append(item);
  });
  return list;
};

interface ResumeGateViewOptions {
  metadata: SaveMetadata;
  onResume: () => void;
  onHome: () => void;
  onDiscard: () => void;
}

const createResumeGateView = (options: ResumeGateViewOptions): HTMLElement => {
  const section = document.createElement('section');
  section.className = 'view gate-view';

  const main = document.createElement('main');
  main.className = 'gate-view__panel';
  main.setAttribute('data-focus-target', 'true');
  section.append(main);

  const headingId = `resume-gate-title-${Math.random().toString(36).slice(2, 8)}`;

  const heading = document.createElement('h1');
  heading.className = 'gate-view__title';
  heading.id = headingId;
  heading.textContent = createResumeGateTitle(options.metadata);
  main.append(heading);

  const subtitle = document.createElement('p');
  subtitle.className = 'gate-view__subtitle';
  subtitle.textContent = createResumeGateSubtitle(options.metadata);
  main.append(subtitle);

  const hints = renderResumeGateHints();
  if (hints) {
    main.append(hints);
  }

  main.append(createResumeGateContent(options.metadata));

  const actions = document.createElement('div');
  actions.className = 'gate-view__actions';

  const resumeButton = new UIButton({ label: messages.RESUME_GATE_CONFIRM_LABEL, variant: 'primary' });
  resumeButton.onClick(() => options.onResume());
  actions.append(resumeButton.el);

  const homeButton = new UIButton({ label: messages.RESUME_GATE_HOME_LABEL, variant: 'ghost' });
  homeButton.onClick(() => options.onHome());
  actions.append(homeButton.el);

  const discardButton = new UIButton({ label: messages.RESUME_GATE_DISCARD_LABEL, variant: 'danger' });
  discardButton.onClick(() => options.onDiscard());
  actions.append(discardButton.el);

  main.append(actions);
  main.setAttribute('aria-labelledby', headingId);

  return section;
};

const createResumeGateEmptyView = (onHome: () => void): HTMLElement => {
  const section = document.createElement('section');
  section.className = 'view gate-view';

  const main = document.createElement('main');
  main.className = 'gate-view__panel';
  main.setAttribute('data-focus-target', 'true');
  section.append(main);

  const headingId = `resume-gate-empty-${Math.random().toString(36).slice(2, 8)}`;

  const heading = document.createElement('h1');
  heading.className = 'gate-view__title';
  heading.id = headingId;
  heading.textContent = messages.RESUME_GATE_EMPTY_TITLE;
  main.append(heading);

  const subtitle = document.createElement('p');
  subtitle.className = 'gate-view__subtitle';
  subtitle.textContent = messages.RESUME_GATE_EMPTY_MESSAGE;
  main.append(subtitle);

  const actions = document.createElement('div');
  actions.className = 'gate-view__actions';

  const homeButton = new UIButton({ label: messages.RESUME_GATE_EMPTY_CONFIRM_LABEL, variant: 'primary' });
  homeButton.onClick(() => onHome());
  actions.append(homeButton.el);

  main.append(actions);
  main.setAttribute('aria-labelledby', headingId);

  return section;
};

function handleResumeGatePass(router: Router): void {
  try {
    const payload = loadGame({ currentPath: router.getCurrentPath() });
    if (!payload?.state) {
      showResumeLoadError(router);
      return;
    }
    gameStore.setState(payload.state);
    const target = payload.state.route && payload.state.route.length > 0 ? payload.state.route : '#/';
    router.go(target);
  } catch (error) {
    console.warn('セーブデータの復元に失敗しました。', error);
    showResumeLoadError(router);
  }
}

function reopenResumeGate(router: Router): void {
  router.go(HOME_RESUME_GATE_PATH);
}

function showResumeLoadError(router: Router): void {
  if (typeof window === 'undefined') {
    router.go('#/');
    return;
  }
  const modal = window.curtainCall?.modal ?? null;
  if (!modal) {
    router.go('#/');
    return;
  }
  modal.open({
    title: messages.RESUME_GATE_ERROR_TITLE,
    body: messages.RESUME_GATE_ERROR_MESSAGE,
    actions: [
      {
        label: messages.RESUME_GATE_ERROR_HOME_LABEL,
        variant: 'ghost',
        preventRapid: true,
        onSelect: () => router.go('#/'),
      },
      {
        label: messages.RESUME_GATE_ERROR_RETRY_LABEL,
        variant: 'primary',
        preventRapid: true,
        onSelect: () => reopenResumeGate(router),
      },
    ],
  });
}

function openResumeGateModal(router: Router): void {
  const notes = Array.from(messages.RESUME_GATE_MODAL_NOTES ?? []);
  showGate({
    title: messages.RESUME_GATE_MODAL_TITLE,
    text: messages.RESUME_GATE_MESSAGE,
    notes,
    confirmLabel: messages.RESUME_GATE_CONFIRM_LABEL,
    onOk: () => handleResumeGatePass(router),
  });
}

const openResumeDiscardDialog = (router: Router): void => {
  if (typeof window === 'undefined') {
    return;
  }
  const modal = window.curtainCall?.modal ?? null;
  if (!modal) {
    console.warn('破棄確認ダイアログを表示できません。');
    return;
  }

  const openFinalConfirm = (): void => {
    modal.open({
      title: messages.RESUME_GATE_DISCARD_FINAL_TITLE,
      body: messages.RESUME_GATE_DISCARD_FINAL_MESSAGE,
      dismissible: false,
      actions: [
        {
          label: messages.RESUME_GATE_CANCEL_LABEL,
          variant: 'ghost',
          preventRapid: true,
        },
        {
          label: messages.RESUME_GATE_DISCARD_FINAL_OK_LABEL,
          variant: 'danger',
          preventRapid: true,
          onSelect: () => {
            clearGame();
            const initialState = createInitialState();
            gameStore.setState(initialState);
            router.go(HOME_START_PATH);
          },
        },
      ],
    });
  };

  modal.open({
    title: messages.RESUME_GATE_DISCARD_CONFIRM_TITLE,
    body: messages.RESUME_GATE_DISCARD_CONFIRM_MESSAGE,
    dismissible: false,
    actions: [
      {
        label: messages.RESUME_GATE_CANCEL_LABEL,
        variant: 'ghost',
        preventRapid: true,
      },
      {
        label: messages.RESUME_GATE_DISCARD_CONFIRM_OK_LABEL,
        variant: 'danger',
        preventRapid: true,
        onSelect: () => openFinalConfirm(),
      },
    ],
  });
};

const openSettingsDialog = (): void => {
  if (typeof window === 'undefined') {
    return;
  }
  const modal = window.curtainCall?.modal;
  if (!modal) {
    console.warn('設定ダイアログを表示するモーダルが初期化されていません。');
    return;
  }

  modal.open({
    title: HOME_SETTINGS_TITLE,
    body: HOME_SETTINGS_MESSAGE,
    actions: [
      {
        label: DEFAULT_CLOSE_LABEL,
        variant: 'primary',
        preventRapid: true,
      },
    ],
  });
};

const openRulebookHelp = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const helpUrl = new URL(RULEBOOK_PATH, window.location.href);
  const opened = window.open(helpUrl.toString(), '_blank', 'noopener,noreferrer');

  if (!opened) {
    const toast = window.curtainCall?.toast;
    if (toast) {
      toast.show({
        message: HELP_POPUP_BLOCKED_TOAST_MESSAGE,
        variant: 'warning',
      });
    } else {
      console.warn(HELP_POPUP_BLOCKED_CONSOLE_MESSAGE);
    }
  }
};

const openMyHandDialog = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const modal = window.curtainCall?.modal;
  if (!modal) {
    console.warn(
      '自分の手札モーダルを表示するためのモーダルコントローラーが初期化されていません。',
    );
    return;
  }

  const state = gameStore.getState();
  const player = state.players[state.activePlayer];

  if (!player) {
    console.warn('自分の手札を表示できません。アクティブプレイヤーが見つかりません。');
    return;
  }

  const playerName = getPlayerDisplayName(state, player.id);

  const container = document.createElement('div');
  container.className = 'myhand';

  const handSection = document.createElement('section');
  handSection.className = 'myhand__section';
  container.append(handSection);

  const handHeading = document.createElement('h3');
  handHeading.className = 'myhand__heading';
  handHeading.textContent = `${playerName}の${MY_HAND_SECTION_TITLE}`;
  handSection.append(handHeading);

  const sortedHand = sortCardsByDescendingValue(player.hand.cards);

  const handCount = document.createElement('p');
  handCount.className = 'myhand__count';
  handCount.textContent = `${sortedHand.length}枚`;
  handSection.append(handCount);

  if (sortedHand.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'myhand__empty';
    empty.textContent = MY_HAND_EMPTY_MESSAGE;
    handSection.append(empty);
  } else {
    const handList = document.createElement('ul');
    handList.className = 'myhand__hand-list';
    handList.setAttribute('aria-label', `${playerName}の${MY_HAND_SECTION_TITLE}`);

    sortedHand.forEach((card) => {
      const item = document.createElement('li');
      item.className = 'myhand__hand-item';

      const cardComponent = new CardComponent({
        rank: card.rank,
        suit: card.suit,
        faceDown: false,
        annotation: card.annotation,
      });
      const cardLabel = formatCardLabel(card);
      cardComponent.el.classList.add('myhand__card');
      cardComponent.el.setAttribute('aria-label', cardLabel);

      const isRecent = player.hand.lastDrawnCardId === card.id;
      if (isRecent) {
        item.classList.add('is-recent');
        const badge = document.createElement('span');
        badge.className = 'myhand__badge';
        badge.textContent = MY_HAND_RECENT_BADGE_LABEL;
        item.append(badge);
      }

      const label = document.createElement('span');
      label.className = 'myhand__card-label';
      label.textContent = cardLabel;

      item.append(cardComponent.el, label);
      handList.append(item);
    });

    handSection.append(handList);
  }

  const recentSection = document.createElement('section');
  recentSection.className = 'myhand__section';
  container.append(recentSection);

  const recentHeading = document.createElement('h3');
  recentHeading.className = 'myhand__heading';
  recentHeading.textContent = `最近${playerName}から取られたカード`;
  recentSection.append(recentHeading);

  const recentList = document.createElement('ul');
  recentList.className = 'scout-recent__list myhand__recent-list';
  recentList.setAttribute('aria-label', `最近${playerName}から取られたカード`);

  if (player.takenByOpponent.length === 0) {
    const emptyRecent = document.createElement('li');
    emptyRecent.className = 'scout-recent__empty';
    emptyRecent.textContent = MY_HAND_RECENT_EMPTY_MESSAGE;
    recentList.append(emptyRecent);
  } else {
    player.takenByOpponent.forEach((card) => {
      const item = document.createElement('li');
      item.className = 'scout-recent__item';

      const cardComponent = new CardComponent({
        rank: card.rank,
        suit: card.suit,
        faceDown: false,
        annotation: card.annotation,
      });
      const cardLabel = formatCardLabel(card);
      cardComponent.el.classList.add('scout-recent__card');
      cardComponent.el.setAttribute('aria-label', cardLabel);

      item.append(cardComponent.el);
      recentList.append(item);
    });
  }

  recentSection.append(recentList);

  modal.open({
    title: `${playerName}の${MY_HAND_MODAL_TITLE}`,
    body: container,
    actions: [
      {
        label: DEFAULT_CLOSE_LABEL,
        variant: 'ghost',
        preventRapid: false,
      },
    ],
  });
};

const openHistoryDialog = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const modal = window.curtainCall?.modal;
  if (!modal) {
    console.warn('履歴ダイアログを表示するモーダルが初期化されていません。');
    return;
  }

  const toast = window.curtainCall?.toast;

  const container = document.createElement('div');
  container.className = 'home-history';

  const description = document.createElement('p');
  description.className = 'home-history__description';
  description.textContent = HISTORY_DIALOG_DESCRIPTION;
  container.append(description);

  const body = document.createElement('div');
  body.className = 'home-history__body';
  container.append(body);

  let entries = listResultHistory();

  const copyToClipboard = async (text: string): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        console.warn('クリップボードへの書き込みに失敗しました。', error);
      }
    }

    if (typeof document === 'undefined') {
      return false;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    let success = false;
    try {
      success = document.execCommand('copy');
    } catch (error) {
      console.warn('クリップボード API が利用できません。', error);
      success = false;
    }
    textarea.remove();
    return success;
  };

  const render = () => {
    body.replaceChildren();
    if (entries.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'home-history__empty';
      empty.textContent = HISTORY_EMPTY_MESSAGE;
      body.append(empty);
      return;
    }

    const list = document.createElement('ul');
    list.className = 'home-history__list';

    const createItem = (entry: ResultHistoryEntry): HTMLLIElement => {
      const item = document.createElement('li');
      item.className = 'home-history__item';

      const header = document.createElement('div');
      header.className = 'home-history__header';

      const summary = document.createElement('p');
      summary.className = 'home-history__summary';
      summary.textContent = entry.summary;
      header.append(summary);

      const timestamp = document.createElement('time');
      timestamp.className = 'home-history__timestamp';
      const formatted = formatTimestamp(entry.savedAt);
      if (formatted) {
        const date = new Date(entry.savedAt);
        if (!Number.isNaN(date.getTime())) {
          timestamp.dateTime = date.toISOString();
        }
        timestamp.textContent = formatted;
      } else {
        timestamp.textContent = HISTORY_UNKNOWN_TIMESTAMP;
      }
      header.append(timestamp);

      item.append(header);

      if (entry.detail) {
        const detail = document.createElement('pre');
        detail.className = 'home-history__detail';
        detail.textContent = entry.detail;
        item.append(detail);
      }

      const actions = document.createElement('div');
      actions.className = 'home-history__actions';

      const copyButton = document.createElement('button');
      copyButton.type = 'button';
      copyButton.className = 'home-history__action';
      copyButton.textContent = HISTORY_COPY_BUTTON_LABEL;
      copyButton.addEventListener('click', async () => {
        const text = [entry.summary, entry.detail].filter(Boolean).join('\n\n');
        const success = await copyToClipboard(text);
        if (success) {
          toast?.show({ message: HISTORY_COPY_SUCCESS, variant: 'success' });
        } else {
          toast?.show({ message: HISTORY_COPY_FAILURE, variant: 'warning' });
        }
      });

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'home-history__action home-history__action--danger';
      deleteButton.textContent = HISTORY_DELETE_BUTTON_LABEL;
      deleteButton.addEventListener('click', () => {
        const removed = deleteResult(entry.id);
        if (!removed) {
          toast?.show({ message: HISTORY_DELETE_FAILURE, variant: 'warning' });
          return;
        }
        entries = listResultHistory();
        render();
        toast?.show({ message: HISTORY_DELETE_SUCCESS, variant: 'info' });
      });

      actions.append(copyButton, deleteButton);
      item.append(actions);

      return item;
    };

    entries.forEach((entry) => {
      list.append(createItem(entry));
    });

    body.append(list);
  };

  render();

  modal.open({
    title: HISTORY_DIALOG_TITLE,
    body: container,
    actions: [
      {
        label: DEFAULT_CLOSE_LABEL,
        variant: 'primary',
        preventRapid: true,
      },
    ],
  });
};

const calculateRemainingWatchCounts = (
  state: GameState,
  options: { phase?: PhaseKey } = {},
): Record<PlayerId, number> => {
  const effectivePhase = options.phase ?? state.phase;
  const activeWatcher = effectivePhase === 'watch' ? state.activePlayer : null;

  return PLAYER_IDS.reduce<Record<PlayerId, number>>(
    (acc, playerId) => {
      const opponentId = getOpponentId(playerId);
      const opponent = state.players[opponentId];
      const opponentHandSize = opponent?.hand.cards.length ?? 0;
      const base = Math.ceil(opponentHandSize / 2);
      const includeCurrent = activeWatcher === playerId ? 1 : 0;
      const remaining = base + includeCurrent;
      acc[playerId] = remaining > 0 ? remaining : 0;
      return acc;
    },
    {} as Record<PlayerId, number>,
  );
};

const createScoutPickConfirmBody = (playerName: string): HTMLElement => {
  const container = document.createElement('div');

  const message = document.createElement('p');
  message.textContent = `${playerName}のターンです。${SCOUT_PICK_CONFIRM_MESSAGE}`;
  container.append(message);

  return container;
};

const createScoutPickResultContent = (
  card: CardSnapshot,
  playerName: string,
  opponentName: string,
): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'scout-complete';

  const message = document.createElement('p');
  message.className = 'scout-complete__message';
  const cardLabel = formatCardLabel(card);
  message.textContent = SCOUT_PICK_RESULT_DRAWN_MESSAGE(cardLabel);
  container.append(message);

  const preview = document.createElement('div');
  preview.className = 'scout-complete__preview';

  const cardPreview = new CardComponent({
    rank: card.rank,
    suit: card.suit,
    faceDown: false,
    annotation: card.annotation,
  });
  cardPreview.el.classList.add('scout-complete__card');
  preview.append(cardPreview.el);

  const previewCaption = document.createElement('p');
  previewCaption.className = 'scout-complete__caption';
  previewCaption.textContent = SCOUT_PICK_RESULT_PREVIEW_CAPTION;
  preview.append(previewCaption);

  container.append(preview);

  const actionNotice = document.createElement('p');
  actionNotice.className = 'scout-complete__caption';
  actionNotice.textContent = SCOUT_PICK_RESULT_ACTION_NOTICE(playerName, opponentName);
  container.append(actionNotice);

  return container;
};

let isScoutResultDialogOpen = false;

const showScoutPickResultDialog = (
  card: CardSnapshot,
  playerName: string,
  opponentName: string,
): void => {
  const message = `${playerName}｜${createScoutPickSuccessMessage(card)}`;

  const finalize = (): void => {
    isScoutResultDialogOpen = false;
    isScoutPickInProgress = false;
    navigateToActionPhase();
  };

  if (typeof window === 'undefined') {
    console.info(message);
    finalize();
    return;
  }

  const modal = window.curtainCall?.modal;
  if (!modal) {
    console.info(message);
    finalize();
    return;
  }

  const openDialog = (): void => {
    const body = createScoutPickResultContent(card, playerName, opponentName);
    isScoutResultDialogOpen = true;

    modal.open({
      title: SCOUT_PICK_RESULT_TITLE,
      body,
      dismissible: false,
      actions: [
        {
          label: SCOUT_PICK_RESULT_OK_LABEL,
          variant: 'primary',
          preventRapid: true,
          dismiss: false,
          onSelect: () => {
            modal.close();
            finalize();
          },
        },
      ],
    });
  };

  if (modal.opened) {
    modal.close();
    window.requestAnimationFrame(() => openDialog());
    return;
  }

  openDialog();
};

const navigateToActionPhase = (): void => {
  clearScoutSecretState();

  if (typeof window === 'undefined') {
    return;
  }
  const router = window.curtainCall?.router;
  if (router) {
    router.go(SCOUT_TO_ACTION_PATH);
  } else {
    window.location.hash = SCOUT_TO_ACTION_PATH;
  }
};

const completeScoutPick = (): CardSnapshot | null => {
  let pickedCard: CardSnapshot | null = null;
  gameStore.setState((current) => {
    const selectedCardId = current.scout.selectedOpponentCardId;
    if (!selectedCardId) {
      return current;
    }

    const activePlayerId = current.activePlayer;
    const opponentId = getOpponentId(activePlayerId);
    const activePlayer = current.players[activePlayerId];
    const opponent = current.players[opponentId];

    if (!activePlayer || !opponent) {
      return current;
    }

    const sourceIndex = opponent.hand.cards.findIndex((card) => card.id === selectedCardId);

    if (sourceIndex === -1) {
      return current;
    }

    const sourceCard = opponent.hand.cards[sourceIndex];
    if (!sourceCard) {
      return current;
    }

    const timestamp = Date.now();
    const transferredCard = cloneCardSnapshot(sourceCard);
    const recentCard = cloneCardSnapshot(sourceCard);
    const takenHistoryCard = cloneCardSnapshot(sourceCard);

    const nextOpponentCards = opponent.hand.cards.filter((card) => card.id !== selectedCardId);
    const nextPlayerCards = sortCardsByDescendingValue([
      ...activePlayer.hand.cards,
      transferredCard,
    ]);
    const nextOpponentTakenHistory = [...opponent.takenByOpponent, takenHistoryCard];
    const trimmedOpponentTakenHistory =
      SCOUT_RECENT_TAKEN_HISTORY_LIMIT > 0 &&
      nextOpponentTakenHistory.length > SCOUT_RECENT_TAKEN_HISTORY_LIMIT
        ? nextOpponentTakenHistory.slice(
            nextOpponentTakenHistory.length - SCOUT_RECENT_TAKEN_HISTORY_LIMIT,
          )
        : nextOpponentTakenHistory;

    pickedCard = recentCard;

    return {
      ...current,
      players: {
        ...current.players,
        [activePlayerId]: {
          ...activePlayer,
          hand: {
            ...activePlayer.hand,
            cards: nextPlayerCards,
            lastDrawnCardId: transferredCard.id,
          },
        },
        [opponentId]: {
          ...opponent,
          hand: {
            ...opponent.hand,
            cards: nextOpponentCards,
          },
          takenByOpponent: trimmedOpponentTakenHistory,
        },
      },
      scout: {
        ...current.scout,
        selectedOpponentCardId: null,
      },
      lastScoutPlayer: activePlayerId,
      recentScoutedCard: recentCard,
      revision: current.revision + 1,
      updatedAt: timestamp,
    };
  });

  return pickedCard;
};

const finalizeScoutPick = (): void => {
  if (isScoutPickInProgress) {
    console.warn('カードの取得処理を重複して実行しようとしました。');
    return;
  }

  const stateBefore = gameStore.getState();
  const playerName = getPlayerDisplayName(stateBefore, stateBefore.activePlayer);
  const opponentName = getPlayerDisplayName(stateBefore, getOpponentId(stateBefore.activePlayer));

  isScoutPickInProgress = true;

  const card = completeScoutPick();
  if (card) {
    if (typeof window !== 'undefined') {
      window.curtainCall?.modal?.close();
    }
    showScoutPickResultDialog(card, playerName, opponentName);
  } else {
    isScoutPickInProgress = false;
    console.warn('カードの取得に失敗しました。選択状態を再確認してください。');
  }
};

const openScoutPickConfirmDialog = (): void => {
  const state = gameStore.getState();
  if (state.scout.selectedOpponentCardId === null) {
    return;
  }

  if (isScoutPickInProgress) {
    console.warn('カードの取得処理が進行中です。');
    return;
  }

  if (typeof window === 'undefined') {
    finalizeScoutPick();
    return;
  }

  const modal = window.curtainCall?.modal;
  if (!modal) {
    console.warn('カード取得確認モーダルが初期化されていません。');
    finalizeScoutPick();
    return;
  }

  const playerName = getPlayerDisplayName(state, state.activePlayer);

  modal.open({
    title: SCOUT_PICK_CONFIRM_TITLE,
    body: createScoutPickConfirmBody(playerName),
    dismissible: false,
    actions: [
      {
        label: SCOUT_PICK_CONFIRM_CANCEL_LABEL,
        variant: 'ghost',
      },
      {
        label: SCOUT_PICK_CONFIRM_OK_LABEL,
        variant: 'primary',
        preventRapid: true,
        dismiss: false,
        onSelect: () => finalizeScoutPick(),
      },
    ],
  });
};

let scoutOpponentHandOwner: PlayerId | null = null;
let scoutOpponentHandOrder: string[] = [];

const resetScoutOpponentHandOrder = (): void => {
  scoutOpponentHandOwner = null;
  scoutOpponentHandOrder = [];
};

const resolveScoutOpponentHandOrder = (state: GameState): string[] => {
  const opponentId = getOpponentId(state.activePlayer);
  const opponent = state.players[opponentId];
  if (!opponent) {
    resetScoutOpponentHandOrder();
    return [];
  }

  const cardIds = opponent.hand.cards.map((card) => card.id);

  if (cardIds.length === 0) {
    scoutOpponentHandOwner = opponentId;
    scoutOpponentHandOrder = [];
    return scoutOpponentHandOrder;
  }

  if (scoutOpponentHandOwner !== opponentId) {
    scoutOpponentHandOwner = opponentId;
    scoutOpponentHandOrder = shuffleCards(cardIds);
    return scoutOpponentHandOrder;
  }

  let currentOrder = scoutOpponentHandOrder.filter((id) => cardIds.includes(id));
  const missingIds = cardIds.filter((id) => !currentOrder.includes(id));

  if (missingIds.length > 0) {
    currentOrder = shuffleCards([...currentOrder, ...missingIds]);
  }

  if (currentOrder.length !== cardIds.length) {
    currentOrder = shuffleCards(cardIds);
  }

  scoutOpponentHandOwner = opponentId;
  scoutOpponentHandOrder = currentOrder;
  return scoutOpponentHandOrder;
};

const mapOpponentHandCards = (state: GameState): ScoutOpponentHandCardViewModel[] => {
  const opponentId = getOpponentId(state.activePlayer);
  const opponent = state.players[opponentId];
  if (!opponent) {
    resetScoutOpponentHandOrder();
    return [];
  }

  const order = resolveScoutOpponentHandOrder(state);
  return order.map((id) => ({ id }));
};

const getOpponentHandCount = (state: GameState): number => {
  const opponentId = getOpponentId(state.activePlayer);
  const opponent = state.players[opponentId];
  return opponent?.hand.cards.length ?? 0;
};

const shouldAutoAdvanceFromScout = (state: GameState): boolean => getOpponentHandCount(state) === 0;

const mapRecentTakenCards = (state: GameState): ScoutRecentTakenCardViewModel[] => {
  const player = state.players[state.activePlayer];
  if (!player) {
    return [];
  }
  return player.takenByOpponent.map((card) => ({
    id: card.id,
    rank: card.rank,
    suit: card.suit,
    annotation: card.annotation,
  }));
};

const mapActionHandCards = (state: GameState): ActionHandCardViewModel[] => {
  const player = state.players[state.activePlayer];
  if (!player) {
    return [];
  }
  const sorted = sortCardsByDescendingValue(player.hand.cards);
  return sorted.map((card) => ({
    id: card.id,
    rank: card.rank,
    suit: card.suit,
    annotation: card.annotation,
    recentlyDrawn: player.hand.lastDrawnCardId === card.id,
  }));
};

const mapActionHandSelection = (state: GameState): Partial<ActionHandSelectionState> => ({
  selectedCardId: state.action.selectedCardId,
  actorCardId: state.action.actorCardId,
  kurokoCardId: state.action.kurokoCardId,
});

const canConfirmActionPlacement = (state: GameState): boolean => {
  const actorId = state.action.actorCardId;
  const kurokoId = state.action.kurokoCardId;

  if (!actorId || !kurokoId || actorId === kurokoId) {
    return false;
  }

  const player = state.players[state.activePlayer];
  if (!player) {
    return false;
  }

  if (player.hand.cards.length < 2) {
    return false;
  }

  const hasActor = player.hand.cards.some((card) => card.id === actorId);
  const hasKuroko = player.hand.cards.some((card) => card.id === kurokoId);

  return hasActor && hasKuroko;
};

const getActionPlacementGuardMessage = (state: GameState): string | null => {
  const player = state.players[state.activePlayer];
  if (!player) {
    return ACTION_GUARD_SELECTION_MESSAGE;
  }

  if (player.hand.cards.length < 2) {
    return ACTION_GUARD_INSUFFICIENT_HAND_MESSAGE;
  }

  const actorId = state.action.actorCardId;
  const kurokoId = state.action.kurokoCardId;

  if (!actorId || !kurokoId || actorId === kurokoId) {
    return ACTION_GUARD_SELECTION_MESSAGE;
  }

  const hasActor = player.hand.cards.some((card) => card.id === actorId);
  const hasKuroko = player.hand.cards.some((card) => card.id === kurokoId);

  if (!hasActor || !hasKuroko) {
    return ACTION_GUARD_SELECTION_MESSAGE;
  }

  return null;
};

const notifyActionGuardStatus = (state: GameState, options: { force?: boolean } = {}): void => {
  const message = getActionPlacementGuardMessage(state);

  if (!message) {
    if (lastActionGuardMessage !== null) {
      lastActionGuardMessage = null;
    }
    return;
  }

  if (!options.force && message === lastActionGuardMessage) {
    return;
  }

  lastActionGuardMessage = message;

  if (typeof window === 'undefined') {
    console.warn(message);
    return;
  }

  const toast = window.curtainCall?.toast;
  if (toast) {
    toast.show({ message, variant: 'warning' });
  } else {
    console.warn(message);
  }
};

const findLatestHiddenStagePair = (stage: StageArea | undefined): StagePair | null => {
  if (!stage) {
    return null;
  }

  for (let index = stage.pairs.length - 1; index >= 0; index -= 1) {
    const pair = stage.pairs[index];
    if (pair?.actor?.card && pair.kuroko?.card?.face === 'down') {
      return pair;
    }
  }

  return null;
};

const findActiveWatchStagePair = (state: GameState): StagePair | null => {
  const watchPairId = state.watch?.pairId ?? null;
  if (watchPairId) {
    const selectedPair = findStagePairById(state, watchPairId);
    if (selectedPair) {
      return selectedPair;
    }
  }

  return findLatestWatchStagePair(state);
};

const mapWatchStage = (state: GameState): WatchStageViewModel => {
  const latestPair = findActiveWatchStagePair(state);
  const actorPlacement = latestPair?.actor ?? null;
  const kurokoPlacement = latestPair?.kuroko ?? null;

  const actorCard = actorPlacement?.card ?? null;
  const kurokoCard = kurokoPlacement?.card ?? null;

  return {
    actorLabel: WATCH_ACTOR_LABEL,
    actorCard: actorCard
      ? {
          rank: actorCard.rank,
          suit: actorCard.suit,
          faceDown: actorCard.face === 'down',
          annotation: actorCard.annotation,
          description: formatCardLabel(actorCard),
        }
      : null,
    actorEmptyMessage: WATCH_STAGE_EMPTY_MESSAGE,
    kurokoLabel: WATCH_KUROKO_LABEL,
    kurokoCard: kurokoCard
      ? {
          rank: kurokoCard.rank,
          suit: kurokoCard.suit,
          faceDown: true,
          annotation: kurokoCard.annotation,
          description: WATCH_KUROKO_DEFAULT_DESCRIPTION,
        }
      : null,
    kurokoEmptyMessage: WATCH_STAGE_EMPTY_MESSAGE,
  };
};

const findLatestSpotlightPair = (state: GameState): StagePair | null => {
  const activePlayer = state.players[state.activePlayer];
  const opponentId = getOpponentId(state.activePlayer);
  const opponent = state.players[opponentId];

  const activeHiddenPair = findLatestHiddenStagePair(activePlayer?.stage);
  if (activeHiddenPair) {
    return activeHiddenPair;
  }

  const opponentHiddenPair = findLatestHiddenStagePair(opponent?.stage);
  if (opponentHiddenPair) {
    return opponentHiddenPair;
  }

  const activePair = findLatestCompleteStagePair(activePlayer?.stage);
  if (activePair) {
    return activePair;
  }

  return findLatestCompleteStagePair(opponent?.stage);
};

const mapSpotlightStage = (state: GameState): SpotlightStageViewModel => {
  const targetPair = findLatestSpotlightPair(state);
  const actorPlacement = targetPair?.actor ?? null;
  const kurokoPlacement = targetPair?.kuroko ?? null;

  const actorCard = actorPlacement?.card ?? null;
  const kurokoCard = kurokoPlacement?.card ?? null;

  const kurokoFaceLabel = kurokoCard?.face === 'up' ? '表' : '裏';

  return {
    actorLabel: WATCH_ACTOR_LABEL,
    actorCard: actorCard
      ? {
          rank: actorCard.rank,
          suit: actorCard.suit,
          faceDown: actorCard.face === 'down',
          annotation: actorCard.annotation,
          description: formatCardLabel(actorCard),
        }
      : null,
    actorEmptyMessage: SPOTLIGHT_STAGE_EMPTY_MESSAGE,
    kurokoLabel: `黒子（${kurokoFaceLabel}）`,
    kurokoCard: kurokoCard
      ? {
          rank: kurokoCard.rank,
          suit: kurokoCard.suit,
          faceDown: kurokoCard.face === 'down',
          annotation: kurokoCard.annotation,
          description:
            kurokoCard.face === 'up'
              ? formatCardLabel(kurokoCard)
              : SPOTLIGHT_KUROKO_HIDDEN_DESCRIPTION,
        }
      : null,
    kurokoEmptyMessage: SPOTLIGHT_STAGE_EMPTY_MESSAGE,
  };
};

const getBackstageState = (state: GameState): BackstageState =>
  state.backstage ?? createInitialBackstageState();

const getLatestSpotlightSetReveal = (state: GameState): SetReveal | null => {
  const opened = state.set?.opened ?? [];
  if (opened.length === 0) {
    return null;
  }
  return opened[opened.length - 1] ?? null;
};

const getBackstageRevealableItems = (state: GameState): BackstageItemState[] => {
  const backstage = getBackstageState(state);
  return backstage.items.filter((item) => item.status === 'backstage');
};

const shouldTriggerCurtainCallByHandDepletion = (state: GameState): boolean => {
  const nextPlayerId = resolveNextIntermissionActivePlayer(state);
  const opponentId = getOpponentId(nextPlayerId);
  const nextPlayer = state.players[nextPlayerId];
  const opponent = state.players[opponentId];
  const nextHandCount = nextPlayer?.hand.cards.length ?? 0;
  const opponentHandCount = opponent?.hand.cards.length ?? 0;

  if (nextHandCount === 0) {
    return true;
  }

  if (nextHandCount === 1 && opponentHandCount === 0) {
    return true;
  }

  return false;
};

const shouldEnterBackstagePhase = (state: GameState): boolean => {
  const backstage = getBackstageState(state);

  if (backstage.lastSpotlightPairFormed) {
    return false;
  }

  if (!backstage.canActPlayer) {
    return false;
  }

  if (backstage.actedThisIntermission) {
    return false;
  }

  const reveal = getLatestSpotlightSetReveal(state);
  if (!reveal || reveal.assignedTo) {
    return false;
  }

  const revealableItems = shuffleCards(getBackstageRevealableItems(state));
  if (revealableItems.length === 0) {
    return false;
  }

  return true;
};

const canPerformBackstageAction = (state: GameState): boolean => {
  const backstage = getBackstageState(state);

  if (backstage.actedThisIntermission) {
    return false;
  }

  if (backstage.lastSpotlightPairFormed) {
    return false;
  }

  if (!backstage.canActPlayer) {
    return false;
  }

  const reveal = getLatestSpotlightSetReveal(state);
  if (!reveal) {
    return false;
  }

  return getBackstageRevealableItems(state).length > 0;
};

const createIntermissionGateSubtitle = (state: GameState): string => {
  const nextPlayerName = getPlayerDisplayName(state, state.activePlayer);
  return `次は${nextPlayerName}の番です`;
};

const createBackstageGateSubtitle = (state: GameState): string => {
  const backstage = getBackstageState(state);
  const actorId = backstage.canActPlayer ?? state.activePlayer;
  const actorName = getPlayerDisplayName(state, actorId);
  return `${actorName}がバックステージアクションを実行します`;
};

const mapBackstageRevealItems = (state: GameState): BackstageRevealItemViewModel[] => {
  return getBackstageRevealableItems(state).map((item, index) => ({
    id: item.id,
    order: index + 1,
    rank: item.card.rank,
    suit: item.card.suit,
    annotation: item.card.annotation ?? null,
  }));
};

const mapBackstageViewContent = (state: GameState): BackstageViewContent => {
  if (!canPerformBackstageAction(state)) {
    return {
      hasAction: false,
      message: INTERMISSION_BACKSTAGE_REVEAL_EMPTY_MESSAGE,
      instruction: null,
      items: [],
    };
  }

  const items = mapBackstageRevealItems(state);

  return {
    hasAction: items.length > 0,
    message: INTERMISSION_BACKSTAGE_DESCRIPTION,
    instruction: INTERMISSION_BACKSTAGE_REVEAL_MESSAGE,
    items,
  };
};

const createIntermissionBackstageNotes = (state: GameState): string[] => {
  const backstage = getBackstageState(state);
  const notes: string[] = [];

  if (backstage.lastResultMessage) {
    notes.push(backstage.lastResultMessage);
  }

  if (
    backstage.lastCompletionMessage &&
    backstage.lastCompletionMessage !== backstage.lastResultMessage
  ) {
    notes.push(backstage.lastCompletionMessage);
  }

  return notes;
};

const createIntermissionTasks = (state: GameState): string[] => {
  const nextPlayerName = getPlayerDisplayName(state, state.activePlayer);
  return [
    INTERMISSION_TASK_NEXT_PLAYER(nextPlayerName),
    INTERMISSION_TASK_REVIEW,
    INTERMISSION_TASK_RESUME,
    INTERMISSION_TASK_GATE,
  ];
};

const mapIntermissionResumeInfo = (): IntermissionResumeInfo => {
  const metadata = getSavedGameMetadata();

  if (!metadata) {
    return {
      available: false,
      summary: INTERMISSION_VIEW_RESUME_EMPTY,
      savedAtLabel: null,
    };
  }

  const savedAt = formatResumeTimestamp(metadata.savedAt);
  const savedAtLabel = savedAt
    ? `${INTERMISSION_VIEW_RESUME_SAVED_AT_PREFIX}${savedAt}`
    : null;

  return {
    available: true,
    summary: createResumeSummary(metadata.activePlayer, metadata.phase),
    savedAtLabel,
  };
};

const findLatestStagePairForIntermission = (state: GameState): StagePair | null => {
  const spotlightPair = findLatestSpotlightPair(state);
  if (!spotlightPair) {
    return findLatestWatchStagePair(state);
  }

  const watchPair = findActiveWatchStagePair(state);
  if (!watchPair) {
    return spotlightPair;
  }

  return spotlightPair.createdAt >= watchPair.createdAt ? spotlightPair : watchPair;
};

const formatIntermissionPairSummary = (state: GameState): string => {
  const latestPair = findLatestStagePairForIntermission(state);
  if (!latestPair) {
    return INTERMISSION_SUMMARY_EMPTY;
  }

  const ownerName = getPlayerDisplayName(state, latestPair.owner);
  const judgeLabel =
    latestPair.judge === 'match'
      ? '（成立）'
      : latestPair.judge === 'mismatch'
        ? '（不成立）'
        : '';
  return `${ownerName}が保持${judgeLabel}`;
};

const formatIntermissionSetSummary = (state: GameState): string => {
  const opened = state.set?.opened ?? [];
  if (opened.length === 0) {
    return INTERMISSION_SUMMARY_EMPTY;
  }

  const reveal = opened[opened.length - 1];
  const cardLabel = formatCardLabel(reveal.card);
  const bonusLabel =
    reveal.bonus === 'pair'
      ? 'ペア成立'
      : reveal.bonus === 'joker'
        ? 'JOKERボーナス'
        : reveal.bonus === 'secretPair'
          ? '秘密のペア'
          : 'ペア未成立';
  const assignedName = reveal.assignedTo ? getPlayerDisplayName(state, reveal.assignedTo) : null;
  const fragments = [`${cardLabel}`, bonusLabel];
  const summary = fragments.filter(Boolean).join('｜');
  return assignedName ? `${summary}（${assignedName}へ）` : summary;
};

const formatIntermissionScoreSummary = (state: GameState): string => {
  const luminaScore = state.players.lumina?.score?.final ?? 0;
  const noxScore = state.players.nox?.score?.final ?? 0;
  const luminaName = getPlayerDisplayName(state, 'lumina');
  const noxName = getPlayerDisplayName(state, 'nox');
  const diff = luminaScore - noxScore;
  if (diff > 0) {
    return `${luminaName} +${diff}｜${luminaName} ${luminaScore} / ${noxName} ${noxScore}`;
  }
  if (diff < 0) {
    return `${noxName} +${Math.abs(diff)}｜${luminaName} ${luminaScore} / ${noxName} ${noxScore}`;
  }
  return `同点｜${luminaName} ${luminaScore} / ${noxName} ${noxScore}`;
};

const formatIntermissionBooSummary = (state: GameState): string => {
  const luminaBoo = state.players.lumina?.booCount ?? 0;
  const noxBoo = state.players.nox?.booCount ?? 0;
  const luminaName = getPlayerDisplayName(state, 'lumina');
  const noxName = getPlayerDisplayName(state, 'nox');
  return `${luminaName} ${luminaBoo} / 3 ｜ ${noxName} ${noxBoo} / 3`;
};

const formatIntermissionNextPlayerSummary = (state: GameState): string => {
  const nextPlayerName = getPlayerDisplayName(state, state.activePlayer);
  const turnNumber = (state.turn?.count ?? 0) + 1;
  return `${nextPlayerName}（ターン #${turnNumber}）`;
};

const formatIntermissionSetRemaining = (state: GameState): string => {
  const remaining = state.set?.cards?.filter((entry) => entry.card.face !== 'up').length ?? 0;
  return `残り ${remaining} 枚`;
};

const createIntermissionSummaryView = (state: GameState): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'intermission-summary';

  const caption = document.createElement('p');
  caption.className = 'intermission-summary__caption';
  caption.textContent = INTERMISSION_SUMMARY_CAPTION;
  container.append(caption);

  const list = document.createElement('div');
  list.className = 'intermission-summary__list';

  const appendItem = (label: string, description: string) => {
    const item = document.createElement('div');
    item.className = 'intermission-summary__item';

    const term = document.createElement('p');
    term.className = 'intermission-summary__term';
    term.textContent = label;

    const body = document.createElement('p');
    body.className = 'intermission-summary__description';
    body.textContent = description;

    item.append(term, body);
    list.append(item);
  };

  appendItem('次の手番', formatIntermissionNextPlayerSummary(state));
  appendItem('提示ペアの帰属', formatIntermissionPairSummary(state));
  appendItem('直近のセット公開', formatIntermissionSetSummary(state));
  appendItem('残りセット', formatIntermissionSetRemaining(state));
  appendItem('スコア差分', formatIntermissionScoreSummary(state));
  appendItem('ブーイング進捗', formatIntermissionBooSummary(state));

  container.append(list);
  return container;
};

const openIntermissionSummaryDialog = (): void => {
  const state = gameStore.getState();

  if (typeof window === 'undefined') {
    console.info(INTERMISSION_SUMMARY_TITLE);
    return;
  }

  const modal = window.curtainCall?.modal;
  if (!modal) {
    console.info(INTERMISSION_SUMMARY_TITLE);
    return;
  }

  const body = createIntermissionSummaryView(state);
  modal.open({
    title: INTERMISSION_SUMMARY_TITLE,
    body,
    actions: [
      {
        label: DEFAULT_CLOSE_LABEL,
        variant: 'ghost',
      },
    ],
  });
};

const showIntermissionBackstageGuard = (message: string): void => {
  if (typeof window === 'undefined') {
    console.warn(message);
    return;
  }

  const toast = window.curtainCall?.toast;
  if (toast) {
    toast.show({ message, variant: 'warning' });
  } else {
    console.warn(message);
  }
};

const completeBackstageSkip = (): void => {
  let skipped = false;

  gameStore.setState((current) => {
    const backstage = getBackstageState(current);
    if (backstage.actedThisIntermission || !backstage.canActPlayer) {
      return current;
    }

    skipped = true;
    const timestamp = Date.now();

    return {
      ...current,
      backstage: {
        ...backstage,
        actedThisIntermission: true,
        canActPlayer: backstage.canActPlayer,
        lastResult: null,
        lastResultMessage: null,
        lastCompletionMessage: INTERMISSION_BACKSTAGE_COMPLETE_MESSAGE,
      },
      revision: current.revision + 1,
      updatedAt: timestamp,
    };
  });

  if (!skipped) {
    showIntermissionBackstageGuard(INTERMISSION_BACKSTAGE_REVEAL_GUARD_MESSAGE);
    return;
  }

  const latest = gameStore.getState();
  saveGame(latest);

  if (typeof window === 'undefined') {
    console.info(INTERMISSION_BACKSTAGE_COMPLETE_MESSAGE);
    return;
  }

  const toast = window.curtainCall?.toast;
  if (toast) {
    toast.show({ message: INTERMISSION_BACKSTAGE_COMPLETE_MESSAGE, variant: 'info' });
  } else {
    console.info(INTERMISSION_BACKSTAGE_COMPLETE_MESSAGE);
  }

  autoAdvanceFromBackstage();
};

interface BackstageDrawResult {
  card: CardSnapshot;
  itemId: string;
  playerId: PlayerId;
}

const finalizeBackstageDraw = (itemId: string): BackstageDrawResult | null => {
  if (isIntermissionBackstageActionInProgress) {
    return null;
  }

  const state = gameStore.getState();
  const backstage = getBackstageState(state);
  const actingPlayerId = backstage.canActPlayer;

  if (!actingPlayerId) {
    showIntermissionBackstageGuard(INTERMISSION_BACKSTAGE_REVEAL_GUARD_MESSAGE);
    return null;
  }

  isIntermissionBackstageActionInProgress = true;

  let result: BackstageDrawResult | null = null;

  gameStore.setState((current) => {
    const latestBackstage = getBackstageState(current);
    const itemIndex = latestBackstage.items.findIndex((entry) => entry.id === itemId);
    const player = current.players[actingPlayerId];

    if (itemIndex === -1 || !player) {
      return current;
    }

    const item = latestBackstage.items[itemIndex];
    if (item.status !== 'backstage') {
      return current;
    }

    const timestamp = Date.now();
    const nextItems = latestBackstage.items.slice();
    const cardForHand = cloneCardSnapshot(item.card);
    cardForHand.face = 'down';
    const cardLabel = formatCardLabel(cardForHand);

    nextItems[itemIndex] = {
      ...item,
      status: 'hand',
      holder: actingPlayerId,
      isPublic: false,
    };

    const nextBackstage: BackstageState = {
      ...latestBackstage,
      items: nextItems,
      actedThisIntermission: true,
      canActPlayer: latestBackstage.canActPlayer,
      pile: Math.max(0, latestBackstage.pile - 1),
      lastResult: 'mismatch',
      lastResultMessage: INTERMISSION_BACKSTAGE_DRAW_RESULT_MESSAGE(cardLabel),
      lastCompletionMessage: INTERMISSION_BACKSTAGE_COMPLETE_MESSAGE,
    };

    result = { card: cardForHand, itemId, playerId: actingPlayerId };

    return {
      ...current,
      players: {
        ...current.players,
        [actingPlayerId]: {
          ...player,
          hand: {
            ...player.hand,
            cards: sortCardsByDescendingValue([...player.hand.cards, cardForHand]),
            lastDrawnCardId: cardForHand.id,
          },
        },
      },
      backstage: nextBackstage,
      revision: current.revision + 1,
      updatedAt: timestamp,
    };
  });

  isIntermissionBackstageActionInProgress = false;

  if (!result) {
    showIntermissionBackstageGuard(INTERMISSION_BACKSTAGE_REVEAL_GUARD_MESSAGE);
    return null;
  }

  const latest = gameStore.getState();
  saveGame(latest);

  return result;
};

interface BackstageRevealedCardResult {
  itemId: string;
  card: CardSnapshot;
  matched: boolean;
  order: number;
}

interface BackstageRevealResult {
  matched: boolean;
  reveal: SetReveal;
  revealedCards: BackstageRevealedCardResult[];
}

interface BackstageRevealContextItem {
  item: BackstageItemState;
  order: number;
}

interface BackstageRevealContext {
  items: BackstageRevealContextItem[];
  reveal: SetReveal;
}

const finalizeBackstageReveal = (itemIds: string[]): BackstageRevealResult | null => {
  if (isIntermissionBackstageActionInProgress) {
    return null;
  }

  const uniqueItemIds = Array.from(new Set(itemIds));
  if (uniqueItemIds.length === 0 || uniqueItemIds.length > 3) {
    showIntermissionBackstageGuard(INTERMISSION_BACKSTAGE_REVEAL_GUARD_MESSAGE);
    return null;
  }

  const state = gameStore.getState();
  const backstage = getBackstageState(state);
  const actingPlayerId = backstage.canActPlayer;

  if (!actingPlayerId) {
    showIntermissionBackstageGuard(INTERMISSION_BACKSTAGE_REVEAL_GUARD_MESSAGE);
    return null;
  }

  const revealableItems = getBackstageRevealableItems(state);
  if (!uniqueItemIds.every((itemId) => revealableItems.some((item) => item.id === itemId))) {
    showIntermissionBackstageGuard(INTERMISSION_BACKSTAGE_REVEAL_GUARD_MESSAGE);
    return null;
  }

  const setReveal = getLatestSpotlightSetReveal(state);
  if (!setReveal || setReveal.assignedTo) {
    showIntermissionBackstageGuard(INTERMISSION_BACKSTAGE_REVEAL_GUARD_MESSAGE);
    return null;
  }

  isIntermissionBackstageActionInProgress = true;

  let result: BackstageRevealResult | null = null;

  gameStore.setState((current) => {
    const latestBackstage = getBackstageState(current);
    const player = current.players[actingPlayerId];
    const revealIndex = current.set.opened.findIndex((entry) => entry.id === setReveal.id);

    if (!player || revealIndex === -1) {
      return current;
    }

    const timestamp = Date.now();
    const nextItems = latestBackstage.items.slice();
    const revealedCards: BackstageRevealedCardResult[] = [];
    const revealedItemIndices: number[] = [];
    let matchedItemIndex: number | null = null;

    for (let order = 0; order < uniqueItemIds.length; order += 1) {
      const itemId = uniqueItemIds[order]!;
      const itemIndex = nextItems.findIndex((entry) => entry.id === itemId);

      if (itemIndex === -1) {
        return current;
      }

      const item = nextItems[itemIndex];
      if (item.status !== 'backstage') {
        return current;
      }

      const revealedCard = cloneCardSnapshot(item.card);
      revealedCard.face = 'up';
      const isMatch = matchedItemIndex == null && revealedCard.rank === setReveal.card.rank;

      revealedCards.push({
        itemId,
        card: revealedCard,
        matched: isMatch,
        order: order + 1,
      });

      revealedItemIndices.push(itemIndex);

      nextItems[itemIndex] = {
        ...item,
        card: revealedCard,
        isPublic: true,
        revealedAt: timestamp,
        revealedBy: actingPlayerId,
      };

      if (isMatch) {
        matchedItemIndex = itemIndex;
      }
    }

    if (matchedItemIndex != null) {
      const pairId = createStagePairId(timestamp);
      const actorCard = cloneCardSnapshot(setReveal.card);
      actorCard.face = 'up';
      const actorPlacement: StageCardPlacement = {
        card: actorCard,
        from: 'set',
        placedAt: timestamp,
        revealedAt: setReveal.openedAt,
      };

      const matchedItem = nextItems[matchedItemIndex];
      const matchedCard = cloneCardSnapshot(matchedItem.card);
      matchedCard.face = 'up';
      const kurokoPlacement: StageCardPlacement = {
        card: matchedCard,
        from: 'backstage',
        placedAt: timestamp,
        revealedAt: timestamp,
      };

      const updatedReveal: SetReveal = {
        ...setReveal,
        assignedTo: actingPlayerId,
        bonus: 'pair',
      };

      const nextBackstage: BackstageState = {
        ...latestBackstage,
        items: nextItems.map((entry, index) =>
          index === matchedItemIndex
            ? {
                ...entry,
                status: 'stage',
                holder: actingPlayerId,
                stagePairId: pairId,
              }
            : entry,
        ),
        pile: Math.max(0, latestBackstage.pile - 1),
        lastSpotlightPairFormed: true,
        canActPlayer: latestBackstage.canActPlayer,
        actedThisIntermission: true,
        lastResult: 'match',
        lastResultMessage: INTERMISSION_BACKSTAGE_RESULT_MATCH,
        lastCompletionMessage: INTERMISSION_BACKSTAGE_COMPLETE_MESSAGE,
      };

      const nextOpened = current.set.opened.slice();
      nextOpened[revealIndex] = updatedReveal;

      result = { matched: true, reveal: updatedReveal, revealedCards };

      return {
        ...current,
        players: {
          ...current.players,
          [actingPlayerId]: {
            ...player,
            stage: {
              ...player.stage,
              pairs: [
                ...player.stage.pairs,
                {
                  id: pairId,
                  owner: actingPlayerId,
                  origin: 'spotlight',
                  actor: actorPlacement,
                  kuroko: kurokoPlacement,
                  createdAt: timestamp,
                },
              ],
            },
          },
        },
        set: {
          ...current.set,
          opened: nextOpened,
        },
        backstage: nextBackstage,
        revision: current.revision + 1,
        updatedAt: timestamp,
      };
    }

    revealedItemIndices.forEach((index) => {
      const currentItem = nextItems[index];
      if (currentItem.status !== 'backstage') {
        return;
      }
      nextItems[index] = {
        ...currentItem,
        card: {
          ...currentItem.card,
          face: 'down',
        },
      };
    });

    const nextBackstageBase: BackstageState = {
      ...latestBackstage,
      items: nextItems,
      lastResult: 'mismatch',
      lastResultMessage: INTERMISSION_BACKSTAGE_RESULT_MISMATCH,
      lastCompletionMessage: null,
    };

    result = { matched: false, reveal: setReveal, revealedCards };

    return {
      ...current,
      backstage: nextBackstageBase,
      revision: current.revision + 1,
      updatedAt: timestamp,
    };
  });

  isIntermissionBackstageActionInProgress = false;

  if (!result) {
    showIntermissionBackstageGuard(INTERMISSION_BACKSTAGE_REVEAL_GUARD_MESSAGE);
    return null;
  }

  const latest = gameStore.getState();
  saveGame(latest);

  return result;
};

const createBackstageCardButton = (
  item: BackstageItemState,
  order: number,
  onSelect: () => void,
): HTMLLIElement => {
  const listItem = document.createElement('li');
  listItem.className = 'intermission-backstage__item';
  listItem.dataset.itemId = item.id;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'intermission-backstage__button';
  button.dataset.itemId = item.id;
  button.addEventListener('click', () => onSelect());
  button.setAttribute(
    'aria-label',
    `${INTERMISSION_BACKSTAGE_REVEAL_LABEL}：カード ${String(order).padStart(2, '0')}`,
  );

  const cardComponent = new CardComponent({
    rank: item.card.rank,
    suit: item.card.suit,
    faceDown: true,
    annotation: item.card.annotation,
  });
  cardComponent.el.classList.add('intermission-backstage__card');
  button.append(cardComponent.el);

  listItem.append(button);
  return listItem;
};

const createBackstageSelectionList = (items: BackstageRevealContextItem[]): HTMLUListElement => {
  const list = document.createElement('ul');
  list.className = 'intermission-backstage__list';

  items
    .slice()
    .sort((a, b) => a.order - b.order)
    .forEach(({ item }) => {
      const element = document.createElement('li');
      element.className = 'intermission-backstage__item';

      const cardComponent = new CardComponent({
        rank: item.card.rank,
        suit: item.card.suit,
        faceDown: true,
        annotation: item.card.annotation,
      });
      cardComponent.el.classList.add('intermission-backstage__card');
      element.append(cardComponent.el);

      list.append(element);
    });

  return list;
};

const createBackstageRevealResultDisplay = (
  revealCard: CardSnapshot,
  revealedCards: BackstageRevealedCardResult[],
): HTMLDivElement => {
  const container = document.createElement('div');
  container.className = 'intermission-backstage__reveal';

  const createSection = (labelText: string): HTMLDivElement => {
    const section = document.createElement('div');
    section.className = 'intermission-backstage__reveal-section';

    const label = document.createElement('p');
    label.className = 'intermission-backstage__reveal-label';
    label.textContent = labelText;
    section.append(label);

    const cards = document.createElement('div');
    cards.className = 'intermission-backstage__reveal-cards';
    section.append(cards);

    return section;
  };

  const setSection = createSection('セット');
  const setCards = setSection.querySelector<HTMLDivElement>(
    '.intermission-backstage__reveal-cards',
  );
  if (setCards) {
    const setCardComponent = new CardComponent({
      rank: revealCard.rank,
      suit: revealCard.suit,
      faceDown: revealCard.face !== 'up',
      annotation: revealCard.annotation,
    });
    setCardComponent.el.classList.add('intermission-backstage__card');
    setCardComponent.el.setAttribute('aria-label', `セット：${formatCardLabel(revealCard)}`);
    setCards.append(setCardComponent.el);
  }
  container.append(setSection);

  const selectionSection = createSection('選択カード');
  const selectionCards = selectionSection.querySelector<HTMLDivElement>(
    '.intermission-backstage__reveal-cards',
  );
  if (selectionCards) {
    revealedCards
      .slice()
      .sort((a, b) => a.order - b.order)
      .forEach((entry) => {
        const cardComponent = new CardComponent({
          rank: entry.card.rank,
          suit: entry.card.suit,
          faceDown: false,
          annotation: entry.card.annotation,
        });
        cardComponent.el.classList.add('intermission-backstage__card');
        if (entry.matched) {
          cardComponent.el.classList.add('intermission-backstage__reveal-card--matched');
        }
        cardComponent.el.setAttribute(
          'aria-label',
          `選択カード（カード ${String(entry.order).padStart(2, '0')}）：${formatCardLabel(entry.card)}`,
        );
        selectionCards.append(cardComponent.el);
      });
  }
  container.append(selectionSection);

  return container;
};

const createBackstageMatchPairView = (
  revealCard: CardSnapshot,
  matchedCard: CardSnapshot,
): HTMLDivElement => {
  const pairContainer = document.createElement('div');
  pairContainer.className = 'intermission-backstage__pair';

  const createPairCard = (label: string, card: CardSnapshot): HTMLDivElement => {
    const item = document.createElement('div');
    item.className = 'intermission-backstage__pair-card';

    const component = new CardComponent({
      rank: card.rank,
      suit: card.suit,
      faceDown: card.face === 'down',
      annotation: card.annotation,
    });
    component.el.classList.add('intermission-backstage__card');
    item.append(component.el);

    const caption = document.createElement('p');
    caption.className = 'intermission-backstage__pair-label';
    caption.textContent = `${label}：${formatCardLabel(card)}`;
    item.append(caption);

    return item;
  };

  const actorCard = cloneCardSnapshot(revealCard);
  actorCard.face = 'up';
  const backstageCard = cloneCardSnapshot(matchedCard);
  backstageCard.face = 'up';

  pairContainer.append(createPairCard('セットカード', actorCard));

  const separator = document.createElement('span');
  separator.className = 'intermission-backstage__pair-separator';
  separator.textContent = '×';
  pairContainer.append(separator);

  pairContainer.append(createPairCard('バックステージカード', backstageCard));

  return pairContainer;
};

const resolveBackstageRevealContext = (itemIds: string[]): BackstageRevealContext | null => {
  const state = gameStore.getState();
  const backstage = getBackstageState(state);
  const actingPlayerId = backstage.canActPlayer;

  if (!actingPlayerId) {
    showIntermissionBackstageGuard(INTERMISSION_BACKSTAGE_REVEAL_GUARD_MESSAGE);
    return null;
  }

  const reveal = getLatestSpotlightSetReveal(state);
  if (!reveal || reveal.assignedTo) {
    showIntermissionBackstageGuard(INTERMISSION_BACKSTAGE_REVEAL_GUARD_MESSAGE);
    return null;
  }

  const uniqueIds = Array.from(new Set(itemIds));
  if (uniqueIds.length === 0 || uniqueIds.length > 3) {
    showIntermissionBackstageGuard(INTERMISSION_BACKSTAGE_REVEAL_GUARD_MESSAGE);
    return null;
  }

  const orderMap = new Map<string, number>();
  mapBackstageRevealItems(state).forEach((entry) => {
    orderMap.set(entry.id, entry.order);
  });

  const contextItems: BackstageRevealContextItem[] = [];

  for (const itemId of uniqueIds) {
    const targetItem = backstage.items.find((entry) => entry.id === itemId);
    if (!targetItem || targetItem.status !== 'backstage') {
      showIntermissionBackstageGuard(INTERMISSION_BACKSTAGE_REVEAL_GUARD_MESSAGE);
      return null;
    }
    const order = orderMap.get(itemId) ?? contextItems.length + 1;
    contextItems.push({ item: targetItem, order });
  }

  contextItems.sort((a, b) => a.order - b.order);

  return { items: contextItems, reveal };
};

const openBackstageRevealConfirmDialog = (
  modal: ModalController,
  context: BackstageRevealContext,
): void => {
  const container = document.createElement('div');
  container.className = 'intermission-backstage';

  const message = document.createElement('p');
  message.className = 'intermission-backstage__message';
  message.textContent = `${INTERMISSION_BACKSTAGE_CONFIRM_MESSAGE}（${context.items.length}枚）`;
  container.append(message);

  container.append(createBackstageSelectionList(context.items));

  modal.open({
    title: INTERMISSION_BACKSTAGE_REVEAL_TITLE,
    body: container,
    dismissible: false,
    actions: [
      {
        label: INTERMISSION_BACKSTAGE_CONFIRM_CANCEL_LABEL,
        variant: 'ghost',
      },
      {
        label: INTERMISSION_BACKSTAGE_CONFIRM_OK_LABEL,
        variant: 'primary',
        preventRapid: true,
        dismiss: false,
        onSelect: () => openBackstageRevealPreviewDialog(modal, context),
      },
    ],
  });
};

const openBackstageRevealPreviewDialog = (
  modal: ModalController,
  context: BackstageRevealContext,
): void => {
  const container = document.createElement('div');
  container.className = 'intermission-backstage';

  const message = document.createElement('p');
  message.className = 'intermission-backstage__message';
  message.textContent = INTERMISSION_BACKSTAGE_PREVIEW_MESSAGE;
  container.append(message);

  const setCardNote = document.createElement('p');
  setCardNote.className = 'intermission-backstage__note';
  setCardNote.textContent = `セットカード：${formatCardLabel(context.reveal.card)}`;
  container.append(setCardNote);

  container.append(createBackstageSelectionList(context.items));

  modal.open({
    title: INTERMISSION_BACKSTAGE_PREVIEW_TITLE,
    body: container,
    dismissible: false,
    actions: [
      {
        label: INTERMISSION_BACKSTAGE_CONFIRM_CANCEL_LABEL,
        variant: 'ghost',
      },
      {
        label: INTERMISSION_BACKSTAGE_PREVIEW_CONFIRM_LABEL,
        variant: 'primary',
        preventRapid: true,
        dismiss: false,
        onSelect: () => openBackstageRevealExecuteDialog(modal, context),
      },
    ],
  });
};

const openBackstageRevealExecuteDialog = (
  modal: ModalController,
  context: BackstageRevealContext,
): void => {
  const container = document.createElement('div');
  container.className = 'intermission-backstage';

  const message = document.createElement('p');
  message.className = 'intermission-backstage__message';
  message.textContent = INTERMISSION_BACKSTAGE_REVEAL_READY_MESSAGE;
  container.append(message);

  modal.open({
    title: INTERMISSION_BACKSTAGE_REVEAL_READY_TITLE,
    body: container,
    dismissible: false,
    actions: [
      {
        label: INTERMISSION_BACKSTAGE_REVEAL_READY_OK_LABEL,
        variant: 'primary',
        preventRapid: true,
        dismiss: false,
        onSelect: () => {
          const outcome = finalizeBackstageReveal(context.items.map((entry) => entry.item.id));
          if (!outcome) {
            modal.close();
            return;
          }
          openBackstageRevealResultDialog(modal, outcome);
        },
      },
    ],
  });
};

const openBackstageRevealResultDialog = (
  modal: ModalController,
  outcome: BackstageRevealResult,
): void => {
  const container = document.createElement('div');
  container.className = 'intermission-backstage';

  const message = document.createElement('p');
  message.className = 'intermission-backstage__message';
  message.textContent = outcome.matched
    ? INTERMISSION_BACKSTAGE_RESULT_MATCH
    : INTERMISSION_BACKSTAGE_RESULT_MISMATCH;
  container.append(message);

  const matchedEntry = outcome.revealedCards.find((entry) => entry.matched);
  if (outcome.matched && matchedEntry) {
    container.append(createBackstageMatchPairView(outcome.reveal.card, matchedEntry.card));
  }

  container.append(createBackstageRevealResultDisplay(outcome.reveal.card, outcome.revealedCards));

  if (outcome.matched) {
    const state = gameStore.getState();
    const assignedPlayerId =
      outcome.reveal.assignedTo ?? getBackstageState(state).canActPlayer ?? state.activePlayer;
    const note = document.createElement('p');
    note.className = 'intermission-backstage__note';
    note.textContent = INTERMISSION_BACKSTAGE_STAGE_MOVE_MESSAGE(
      getPlayerDisplayName(state, assignedPlayerId),
    );
    container.append(note);

    modal.open({
      title: INTERMISSION_BACKSTAGE_RESULT_TITLE,
      body: container,
      dismissible: false,
      actions: [
        {
          label: INTERMISSION_BACKSTAGE_RESULT_MATCH_OK_LABEL,
          variant: 'primary',
          preventRapid: true,
          onSelect: () => autoAdvanceFromBackstage(),
        },
      ],
    });
    return;
  }

  const note = document.createElement('p');
  note.className = 'intermission-backstage__note';
  note.textContent = INTERMISSION_BACKSTAGE_RESULT_MISMATCH_INSTRUCTION;
  container.append(note);

  modal.open({
    title: INTERMISSION_BACKSTAGE_RESULT_TITLE,
    body: container,
    dismissible: false,
    actions: [
      {
        label: INTERMISSION_BACKSTAGE_RESULT_MISMATCH_OK_LABEL,
        variant: 'primary',
        preventRapid: true,
        dismiss: false,
        onSelect: () => openIntermissionBackstageDrawDialog(),
      },
    ],
  });
};

const openBackstageDrawResultDialog = (
  modal: ModalController,
  result: BackstageDrawResult,
): void => {
  const container = document.createElement('div');
  container.className = 'intermission-backstage';

  const displayCard = cloneCardSnapshot(result.card);
  displayCard.face = 'up';

  const message = document.createElement('p');
  message.className = 'intermission-backstage__message';
  message.textContent = INTERMISSION_BACKSTAGE_DRAW_CONFIRM_MESSAGE(
    formatCardLabel(displayCard),
  );
  container.append(message);

  const list = document.createElement('ul');
  list.className = 'intermission-backstage__list';

  const item = document.createElement('li');
  item.className = 'intermission-backstage__item';

  const cardComponent = new CardComponent({
    rank: displayCard.rank,
    suit: displayCard.suit,
    faceDown: false,
    annotation: displayCard.annotation,
  });
  cardComponent.el.classList.add('intermission-backstage__card');
  item.append(cardComponent.el);

  const description = document.createElement('p');
  description.className = 'intermission-backstage__card-description';
  description.textContent = `取得したカード：${formatCardLabel(displayCard)}`;
  item.append(description);

  list.append(item);
  container.append(list);

  const note = document.createElement('p');
  note.className = 'intermission-backstage__note';
  note.textContent = INTERMISSION_BACKSTAGE_COMPLETE_MESSAGE;
  container.append(note);

  modal.open({
    title: INTERMISSION_BACKSTAGE_DRAW_CONFIRM_TITLE,
    body: container,
    dismissible: false,
    actions: [
      {
        label: INTERMISSION_BACKSTAGE_RESULT_MATCH_OK_LABEL,
        variant: 'primary',
        preventRapid: true,
        onSelect: () => autoAdvanceFromBackstage(),
      },
    ],
  });
};

const announceBackstageDrawResult = (result: BackstageDrawResult): void => {
  const message = INTERMISSION_BACKSTAGE_DRAW_RESULT_MESSAGE(formatCardLabel(result.card));

  if (typeof window === 'undefined') {
    console.info(message);
    return;
  }

  const toast = window.curtainCall?.toast;
  if (toast) {
    toast.show({ message, variant: 'info' });
    return;
  }

  console.info(message);
};

const handleBackstageDrawResult = (result: BackstageDrawResult): void => {
  if (typeof window === 'undefined') {
    announceBackstageDrawResult(result);
    autoAdvanceFromBackstage();
    return;
  }

  const modal = window.curtainCall?.modal;
  if (modal) {
    openBackstageDrawResultDialog(modal, result);
    return;
  }

  announceBackstageDrawResult(result);
  autoAdvanceFromBackstage();
};

const startBackstageRevealFlow = (itemIds: string[]): void => {
  if (typeof window === 'undefined') {
    const outcome = finalizeBackstageReveal(itemIds);
    if (outcome) {
      handleBackstageRevealOutcome(outcome);
    }
    return;
  }

  const modal = window.curtainCall?.modal;
  if (!modal) {
    const outcome = finalizeBackstageReveal(itemIds);
    if (outcome) {
      handleBackstageRevealOutcome(outcome);
    }
    return;
  }

  const context = resolveBackstageRevealContext(itemIds);
  if (!context) {
    return;
  }

  openBackstageRevealConfirmDialog(modal, context);
};

const handleBackstageRevealOutcome = (outcome: BackstageRevealResult): void => {
  if (typeof window === 'undefined') {
    const message = outcome.matched
      ? INTERMISSION_BACKSTAGE_RESULT_MATCH
      : INTERMISSION_BACKSTAGE_RESULT_MISMATCH;
    console.info(message);
    if (outcome.matched) {
      autoAdvanceFromBackstage();
    } else {
      openIntermissionBackstageDrawDialog();
    }
    return;
  }

  const modal = window.curtainCall?.modal;
  if (modal) {
    openBackstageRevealResultDialog(modal, outcome);
    return;
  }

  const message = outcome.matched
    ? INTERMISSION_BACKSTAGE_RESULT_MATCH
    : INTERMISSION_BACKSTAGE_RESULT_MISMATCH;
  console.info(message);
  if (outcome.matched) {
    autoAdvanceFromBackstage();
  } else {
    openIntermissionBackstageDrawDialog();
  }
};

const openIntermissionBackstageDrawDialog = (): void => {
  const state = gameStore.getState();
  const hiddenItems = shuffleCards(getBackstageRevealableItems(state));

  if (hiddenItems.length === 0) {
    showIntermissionBackstageGuard(INTERMISSION_BACKSTAGE_DRAW_EMPTY_MESSAGE);
    return;
  }

  if (typeof window === 'undefined') {
    const result = finalizeBackstageDraw(hiddenItems[0].id);
    if (result) {
      handleBackstageDrawResult(result);
    }
    return;
  }

  const modal = window.curtainCall?.modal;
  if (!modal) {
    const result = finalizeBackstageDraw(hiddenItems[0].id);
    if (result) {
      handleBackstageDrawResult(result);
    }
    return;
  }

  const container = document.createElement('div');
  container.className = 'intermission-backstage';

  const message = document.createElement('p');
  message.className = 'intermission-backstage__message';
  message.textContent = INTERMISSION_BACKSTAGE_DRAW_MESSAGE;
  container.append(message);

  const list = document.createElement('ul');
  list.className = 'intermission-backstage__list';

  const buttonMap = new Map<string, HTMLButtonElement>();
  let selectedItemId: string | null = null;

  const confirmActionId = 'intermission-backstage-draw-confirm';
  let confirmActionButton: UIButton | null = null;

  const updateSelection = (itemId: string | null) => {
    selectedItemId = itemId;
    buttonMap.forEach((button, id) => {
      button.classList.toggle('intermission-backstage__button--selected', id === itemId);
    });
    confirmActionButton?.setDisabled(!itemId);
  };

  hiddenItems.forEach((item, index) => {
    const listItem = createBackstageCardButton(item, index + 1, () => {
      const nextId = selectedItemId === item.id ? null : item.id;
      updateSelection(nextId);
    });
    const button = listItem.querySelector<HTMLButtonElement>('button');
    if (button) {
      buttonMap.set(item.id, button);
    }
    list.append(listItem);
  });

  container.append(list);

  modal.open({
    title: INTERMISSION_BACKSTAGE_DRAW_TITLE,
    body: container,
    dismissible: false,
    actions: [
      {
        id: confirmActionId,
        label: INTERMISSION_BACKSTAGE_DRAW_DECIDE_LABEL,
        variant: 'primary',
        preventRapid: true,
        dismiss: false,
        disabled: true,
        onSelect: () => {
          if (!selectedItemId) {
            return;
          }
          const result = finalizeBackstageDraw(selectedItemId);
          if (!result) {
            updateSelection(null);
            return;
          }
          handleBackstageDrawResult(result);
        },
      },
    ],
  });

  confirmActionButton = modal.getActionButton(confirmActionId);
  confirmActionButton?.setDisabled(!selectedItemId);
};

const canRevealSpotlightKuroko = (state: GameState): boolean => {
  const targetPair = findLatestSpotlightPair(state);
  if (!targetPair?.actor?.card || !targetPair.kuroko?.card) {
    return false;
  }

  return targetPair.kuroko.card.face === 'down';
};

const mapSpotlightRevealCaption = (state: GameState): string | null => {
  const targetPair = findLatestSpotlightPair(state);
  if (!targetPair?.kuroko?.card) {
    return SPOTLIGHT_REVEAL_UNAVAILABLE_CAPTION;
  }

  if (targetPair.kuroko.card.face === 'down') {
    return SPOTLIGHT_REVEAL_CAPTION;
  }

  return SPOTLIGHT_REVEAL_COMPLETED_CAPTION;
};

const getAvailableSpotlightSetCards = (state: GameState): SetCardState[] =>
  state.set.cards.filter((setCard) => setCard.card.face !== 'up');

const findPendingJokerBonusReveal = (
  state: GameState,
  pairId: string | null | undefined,
): SetReveal | null => {
  if (!pairId) {
    return null;
  }

  return (
    state.set.opened.find(
      (entry) => entry.pairId === pairId && entry.bonus === 'joker' && !entry.assignedTo,
    ) ?? null
  );
};

const canOpenSpotlightSet = (state: GameState): boolean => {
  const targetPair = findLatestSpotlightPair(state);
  if (!targetPair?.id || !targetPair.owner || !targetPair.actor?.card || !targetPair.kuroko?.card) {
    return false;
  }

  if (targetPair.kuroko.card.face !== 'up') {
    return false;
  }

  if (targetPair.owner !== state.activePlayer) {
    return false;
  }

  const relatedReveals = state.set.opened.filter((entry) => entry.pairId === targetPair.id);
  const pendingJoker = findPendingJokerBonusReveal(state, targetPair.id);

  if (pendingJoker) {
    return getAvailableSpotlightSetCards(state).length > 0;
  }

  if (relatedReveals.length > 0) {
    return false;
  }

  return getAvailableSpotlightSetCards(state).length > 0;
};

const createSetRevealId = (setCardId: string, timestamp: number): string =>
  `${setCardId}-open-${timestamp}`;

const openSpotlightSetCard = (setCardId: string): SetReveal | null => {
  let reveal: SetReveal | null = null;

  gameStore.setState((current) => {
    const targetPair = findLatestSpotlightPair(current);
    if (!targetPair?.id || !targetPair.owner || !targetPair.actor?.card || !targetPair.kuroko?.card) {
      return current;
    }

    if (targetPair.kuroko.card.face !== 'up') {
      return current;
    }

    if (targetPair.owner !== current.activePlayer) {
      return current;
    }

    const relatedReveals = current.set.opened.filter((entry) => entry.pairId === targetPair.id);
    const pendingJoker = findPendingJokerBonusReveal(current, targetPair.id);

    if (!pendingJoker && relatedReveals.length > 0) {
      return current;
    }

    const targetSetCard = current.set.cards.find((entry) => entry.id === setCardId);
    if (!targetSetCard || targetSetCard.card.face === 'up') {
      return current;
    }

    const timestamp = Date.now();
    const card = cloneCardSnapshot(targetSetCard.card);
    card.face = 'up';

    const nextReveal: SetReveal = {
      id: createSetRevealId(targetSetCard.id, timestamp),
      card,
      position: targetSetCard.position,
      openedBy: current.activePlayer,
      openedAt: timestamp,
      pairId: targetPair.id,
      bonus: card.rank === 'JOKER' ? 'joker' : undefined,
    };

    reveal = nextReveal;

    const previousBackstage = getBackstageState(current);
    const openerId = current.activePlayer;
    const nextBackstage: BackstageState = {
      ...previousBackstage,
      lastSpotlightPairFormed: false,
      canActPlayer: getOpponentId(openerId),
      actedThisIntermission: false,
      lastResult: null,
      lastResultMessage: null,
      lastCompletionMessage: null,
    };

    return {
      ...current,
      set: {
        cards: current.set.cards.map((entry) =>
          entry.id === targetSetCard.id ? { ...entry, card } : entry,
        ),
        opened: [...current.set.opened, nextReveal],
      },
      backstage: nextBackstage,
      revision: current.revision + 1,
      updatedAt: timestamp,
    };
  });

  return reveal;
};

const createSpotlightRevealResultContent = (
  result: RevealSpotlightKurokoResult,
  presenterName: string,
  booerName: string,
  openPlayerName: string,
): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'spotlight-reveal-result';

  const summary = document.createElement('p');
  summary.className = 'spotlight-reveal-result__summary';
  if (result.judge === 'match') {
    summary.textContent = `${SPOTLIGHT_RESULT_MATCH_PREFIX}${SPOTLIGHT_RESULT_MATCH_MESSAGE(
      openPlayerName,
    )}`;
  } else {
    summary.textContent = `${SPOTLIGHT_RESULT_MISMATCH_PREFIX}${SPOTLIGHT_RESULT_MISMATCH_MESSAGE(
      openPlayerName,
    )}`;
  }
  container.append(summary);

  const detail = document.createElement('p');
  detail.className = 'spotlight-reveal-result__detail';
  detail.textContent = `提示者：${presenterName} ／ ブーイング側：${booerName}`;
  container.append(detail);

  const stageInfo = document.createElement('p');
  stageInfo.className = 'spotlight-reveal-result__stage';
  stageInfo.textContent = `ペアの帰属：${openPlayerName}ステージ`;
  container.append(stageInfo);

  const cardList = document.createElement('ul');
  cardList.className = 'spotlight-reveal-result__cards';

  const createCardItem = (label: string, card: CardSnapshot): HTMLLIElement => {
    const item = document.createElement('li');
    item.className = 'spotlight-reveal-result__card';
    const cardComponent = new CardComponent({
      rank: card.rank,
      suit: card.suit,
      faceDown: false,
      annotation: card.annotation,
    });
    item.append(cardComponent.el);

    const description = document.createElement('p');
    description.className = 'spotlight-reveal-result__card-label';
    description.textContent = `${label}：${formatCardLabel(card)}`;
    item.append(description);

    return item;
  };

  cardList.append(
    createCardItem('役者', result.actorCard),
    createCardItem('黒子', result.kurokoCard),
  );
  container.append(cardList);

  return container;
};

const showSpotlightRevealResultDialog = (
  result: RevealSpotlightKurokoResult,
  presenterName: string,
  booerName: string,
  openPlayerId: PlayerId,
  canOpenSet: boolean,
): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const modal = window.curtainCall?.modal;
  if (!modal) {
    return;
  }

  const state = gameStore.getState();
  const openPlayerName = getPlayerDisplayName(state, openPlayerId);
  const body = createSpotlightRevealResultContent(result, presenterName, booerName, openPlayerName);
  const skipAction = {
    label: SPOTLIGHT_RESULT_SKIP_LABEL,
    preventRapid: true,
    dismiss: false,
    onSelect: () => {
      latestSpotlightPairCheckOutcome = 'skipped';
      modal.close();
      completeSpotlightPhaseTransition();
    },
  };

  const actions = canOpenSet
    ? [
        {
          ...skipAction,
          variant: 'ghost' as const,
        },
        {
          label: SPOTLIGHT_SET_OPEN_BUTTON_LABEL,
          variant: 'primary' as const,
          preventRapid: true,
          dismiss: false,
          onSelect: () => {
            modal.close();
            requestSpotlightSetOpen(openPlayerId);
          },
        },
      ]
    : [
        {
          ...skipAction,
          variant: 'primary' as const,
        },
      ];

  modal.open({
    title: SPOTLIGHT_RESULT_TITLE,
    body,
    dismissible: false,
    actions,
  });
};

const requestSpotlightSetOpen = (playerId: PlayerId): void => {
  const state = gameStore.getState();
  if (!canOpenSpotlightSet(state)) {
    console.warn(SPOTLIGHT_SET_OPEN_GUARD_MESSAGE);
    return;
  }

  if (typeof window === 'undefined') {
    openSpotlightSetPickerDialog(playerId);
    return;
  }

  const router = window.curtainCall?.router;

  pendingSpotlightSetOpen = { playerId };
  revokeSpotlightSecretAccess();

  if (state.route === SPOTLIGHT_GATE_PATH) {
    return;
  }

  if (router) {
    router.go(SPOTLIGHT_GATE_PATH);
  } else {
    window.location.hash = SPOTLIGHT_GATE_PATH;
  }
};

const requestSpotlightSecretPair = (
  request: SpotlightSecretPairRequest,
  candidates: CardSnapshot[],
): void => {
  if (typeof window === 'undefined') {
    finalizeSpotlightSecretPairSelection(request, candidates[0]?.id ?? null);
    return;
  }

  pendingSpotlightSecretPair = request;
  revokeSpotlightSecretAccess();

  const state = gameStore.getState();
  if (state.route === SPOTLIGHT_GATE_PATH) {
    return;
  }

  const router = window.curtainCall?.router;
  if (router) {
    router.go(SPOTLIGHT_GATE_PATH);
  } else {
    window.location.hash = SPOTLIGHT_GATE_PATH;
  }
};

interface SpotlightPickerLayout {
  container: HTMLDivElement;
  panel: HTMLDivElement;
}

const createSpotlightPickerLayout = (title: string): SpotlightPickerLayout => {
  const container = document.createElement('div');
  container.className = 'spotlight-set-picker';

  const panel = document.createElement('div');
  panel.className = 'spotlight-set-picker__panel';

  const header = document.createElement('div');
  header.className = 'spotlight-set-picker__header';

  const heading = document.createElement('h2');
  heading.className = 'spotlight-set-picker__title';
  heading.textContent = title;

  header.append(heading);
  panel.append(header);
  container.append(panel);

  return { container, panel };
};

const openSpotlightSetPickerDialog = (playerId: PlayerId): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const modal = window.curtainCall?.modal;
  if (!modal) {
    return;
  }

  const state = gameStore.getState();
  if (!canOpenSpotlightSet(state)) {
    console.warn(SPOTLIGHT_SET_OPEN_GUARD_MESSAGE);
    return;
  }

  const playerName = getPlayerDisplayName(state, playerId);
  const availableCards = shuffleCards(getAvailableSpotlightSetCards(state));

  const { container, panel } = createSpotlightPickerLayout(SPOTLIGHT_SET_PICKER_TITLE);

  const message = document.createElement('p');
  message.className = 'spotlight-set-picker__message';
  message.textContent = `${playerName}のターンです。${SPOTLIGHT_SET_PICKER_MESSAGE}`;
  panel.append(message);

  if (availableCards.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'spotlight-set-picker__empty';
    empty.textContent = SPOTLIGHT_SET_PICKER_EMPTY_MESSAGE;
    panel.append(empty);
  } else {
    const list = document.createElement('ul');
    list.className = 'spotlight-set-picker__list';

    availableCards.forEach((setCard) => {
      const item = document.createElement('li');
      item.className = 'spotlight-set-picker__item';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'spotlight-set-picker__button';
      button.setAttribute('aria-label', `${SPOTLIGHT_SET_CARD_LABEL_PREFIX}を公開する`);

      const cardComponent = new CardComponent({
        rank: setCard.card.rank,
        suit: setCard.card.suit,
        faceDown: setCard.card.face !== 'up',
        annotation: setCard.card.annotation,
      });
      cardComponent.el.classList.add('spotlight-set-picker__card');
      button.append(cardComponent.el);

      const label = document.createElement('span');
      label.className = 'spotlight-set-picker__label';
      label.textContent = SPOTLIGHT_SET_CARD_LABEL_PREFIX;
      button.append(label);

      button.addEventListener('click', () => {
        modal.close();
        openSpotlightSetConfirmDialog(setCard.id);
      });

      item.append(button);
      list.append(item);
    });

    panel.append(list);
  }

  modal.open({
    title: SPOTLIGHT_SET_PICKER_TITLE,
    body: container,
    className: 'modal--spotlight-set-picker',
    dismissible: false,
    actions: [
      {
        label: SPOTLIGHT_SET_PICKER_CANCEL_LABEL,
        variant: 'ghost',
      },
    ],
  });
};

const openSpotlightSetConfirmDialog = (setCardId: string): void => {
  if (typeof window === 'undefined') {
    finalizeSpotlightSetOpen(setCardId);
    return;
  }

  const modal = window.curtainCall?.modal;
  if (!modal) {
    finalizeSpotlightSetOpen(setCardId);
    return;
  }

  const state = gameStore.getState();
  if (!canOpenSpotlightSet(state)) {
    console.warn(SPOTLIGHT_SET_OPEN_GUARD_MESSAGE);
    return;
  }

  const setCard = state.set.cards.find((entry) => entry.id === setCardId);
  if (!setCard) {
    console.warn('公開対象のセットカードが見つかりません。');
    return;
  }

  const playerName = getPlayerDisplayName(state, state.activePlayer);
  const positionLabel = formatSetCardPositionLabel();

  const container = document.createElement('div');
  container.className = 'spotlight-set-confirm';

  const message = document.createElement('p');
  message.className = 'spotlight-set-confirm__message';
  message.textContent = `${playerName}のターンです。${positionLabel}を公開します。${SPOTLIGHT_SET_CONFIRM_MESSAGE}`;
  container.append(message);

  const preview = document.createElement('div');
  preview.className = 'spotlight-set-confirm__preview';
  const cardComponent = new CardComponent({
    rank: setCard.card.rank,
    suit: setCard.card.suit,
    faceDown: setCard.card.face !== 'up',
    annotation: setCard.card.annotation,
  });
  preview.append(cardComponent.el);
  container.append(preview);

  modal.open({
    title: SPOTLIGHT_SET_CONFIRM_TITLE,
    body: container,
    dismissible: false,
    actions: [
      {
        label: SPOTLIGHT_SET_CONFIRM_CANCEL_LABEL,
        variant: 'ghost',
        dismiss: false,
        onSelect: () => {
          const activePlayer = gameStore.getState().activePlayer;
          modal.close();
          if (!activePlayer) {
            return;
          }
          window.setTimeout(() => {
            openSpotlightSetPickerDialog(activePlayer);
          }, 0);
        },
      },
      {
        label: SPOTLIGHT_SET_CONFIRM_OK_LABEL,
        variant: 'primary',
        preventRapid: true,
        dismiss: false,
        onSelect: () => finalizeSpotlightSetOpen(setCardId),
      },
    ],
  });
};

const openSpotlightJokerBonusDialog = (jokerReveal: SetReveal, playerName: string): void => {
  const resolveAutomatically = (): void => {
    const state = gameStore.getState();
    const availableCards = shuffleCards(getAvailableSpotlightSetCards(state));

    if (availableCards.length === 0) {
      completeSpotlightJokerBonus(jokerReveal, null);
      return;
    }

    finalizeSpotlightSetOpen(availableCards[0].id);
  };

  if (typeof window === 'undefined') {
    resolveAutomatically();
    return;
  }

  const modal = window.curtainCall?.modal;
  if (!modal) {
    resolveAutomatically();
    return;
  }

  const state = gameStore.getState();
  const availableCards = shuffleCards(getAvailableSpotlightSetCards(state));

  const { container, panel } = createSpotlightPickerLayout(SPOTLIGHT_JOKER_BONUS_TITLE);

  const message = document.createElement('p');
  message.className = 'spotlight-set-picker__message';
  message.textContent = SPOTLIGHT_JOKER_BONUS_MESSAGE(playerName);
  panel.append(message);

  if (availableCards.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'spotlight-set-picker__empty';
    empty.textContent = SPOTLIGHT_JOKER_BONUS_EMPTY_MESSAGE;
    panel.append(empty);

    modal.open({
      title: SPOTLIGHT_JOKER_BONUS_TITLE,
      body: container,
      className: 'modal--spotlight-set-picker',
      dismissible: false,
      actions: [
        {
          label: SPOTLIGHT_JOKER_BONUS_EMPTY_ACTION_LABEL,
          variant: 'primary',
          preventRapid: true,
          dismiss: false,
          onSelect: () => {
            modal.close();
            completeSpotlightJokerBonus(jokerReveal, null);
          },
        },
      ],
    });
    return;
  }

  if (availableCards.length === 1) {
    resolveAutomatically();
    return;
  }

  const prompt = document.createElement('p');
  prompt.className = 'spotlight-set-picker__empty';
  prompt.textContent = SPOTLIGHT_JOKER_BONUS_MULTI_PROMPT;
  panel.append(prompt);

  const list = document.createElement('ul');
  list.className = 'spotlight-set-picker__list';

  availableCards.forEach((setCard) => {
    const item = document.createElement('li');
    item.className = 'spotlight-set-picker__item';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'spotlight-set-picker__button';
    button.setAttribute('aria-label', `${SPOTLIGHT_SET_CARD_LABEL_PREFIX}を公開する`);

    const cardComponent = new CardComponent({
      rank: setCard.card.rank,
      suit: setCard.card.suit,
      faceDown: setCard.card.face !== 'up',
      annotation: setCard.card.annotation,
    });
    cardComponent.el.classList.add('spotlight-set-picker__card');
    button.append(cardComponent.el);

    const label = document.createElement('span');
    label.className = 'spotlight-set-picker__label';
    label.textContent = SPOTLIGHT_SET_CARD_LABEL_PREFIX;
    button.append(label);

    button.addEventListener('click', () => {
      modal.close();
      openSpotlightSetConfirmDialog(setCard.id);
    });

    item.append(button);
    list.append(item);
  });

  panel.append(list);

  modal.open({
    title: SPOTLIGHT_JOKER_BONUS_TITLE,
    body: container,
    className: 'modal--spotlight-set-picker',
    dismissible: false,
    actions: [],
  });
};

const completeSpotlightJokerBonus = (
  jokerReveal: SetReveal,
  bonusReveal: SetReveal | null,
): void => {
  if (isSpotlightJokerBonusInProgress) {
    console.warn('JOKERボーナス処理が進行中です。');
    return;
  }

  isSpotlightJokerBonusInProgress = true;

  const stateBefore = gameStore.getState();
  const playerId = stateBefore.activePlayer;
  const playerName = getPlayerDisplayName(stateBefore, playerId);
  const bonusCardLabel = bonusReveal ? formatCardLabel(bonusReveal.card) : null;
  let paired = false;

  gameStore.setState((current) => {
    const player = current.players[playerId];
    if (!player) {
      return current;
    }

    const jokerIndex = current.set.opened.findIndex((entry) => entry.id === jokerReveal.id);
    if (jokerIndex === -1) {
      return current;
    }

    const timestamp = Date.now();
    const nextOpened = current.set.opened.slice();
    const jokerEntry = nextOpened[jokerIndex];
    const updatedJokerEntry: SetReveal = {
      ...jokerEntry,
      assignedTo: playerId,
    };
    nextOpened[jokerIndex] = updatedJokerEntry;

    if (!bonusReveal) {
      return {
        ...current,
        set: {
          ...current.set,
          opened: nextOpened,
        },
        revision: current.revision + 1,
        updatedAt: timestamp,
      };
    }

    const bonusIndex = current.set.opened.findIndex((entry) => entry.id === bonusReveal.id);
    if (bonusIndex === -1) {
      return current;
    }

    const bonusEntry = nextOpened[bonusIndex];
    const updatedBonusEntry: SetReveal = {
      ...bonusEntry,
      assignedTo: playerId,
    };
    nextOpened[bonusIndex] = updatedBonusEntry;

    const pairId = createStagePairId(timestamp);

    const actorCard = cloneCardSnapshot(updatedBonusEntry.card);
    actorCard.face = 'up';
    const actorPlacement: StageCardPlacement = {
      card: actorCard,
      from: 'set',
      placedAt: timestamp,
      revealedAt: updatedBonusEntry.openedAt,
    };

    const jokerCard = cloneCardSnapshot(updatedJokerEntry.card);
    jokerCard.face = 'down';
    const kurokoPlacement: StageCardPlacement = {
      card: jokerCard,
      from: 'jokerBonus',
      placedAt: timestamp,
      revealedAt: updatedJokerEntry.openedAt,
    };

    paired = true;

    return {
      ...current,
      players: {
        ...current.players,
        [playerId]: {
          ...player,
          stage: {
            ...player.stage,
            pairs: [
              ...player.stage.pairs,
              {
                id: pairId,
                owner: playerId,
                origin: 'joker',
                actor: actorPlacement,
                kuroko: kurokoPlacement,
                createdAt: timestamp,
              },
            ],
          },
        },
      },
      set: {
        ...current.set,
        opened: nextOpened,
      },
      revision: current.revision + 1,
      updatedAt: timestamp,
    };
  });

  prepareCurtainCall('jokerBonus');

  const latest = gameStore.getState();
  saveGame(latest);

  const summary = paired
    ? SPOTLIGHT_JOKER_BONUS_RESULT_MESSAGE(playerName, bonusCardLabel ?? '')
    : SPOTLIGHT_JOKER_BONUS_EMPTY_RESULT_MESSAGE(playerName);

  if (typeof window === 'undefined') {
    console.info(summary);
  } else {
    const toast = window.curtainCall?.toast;
    if (toast) {
      toast.show({ message: summary, variant: 'info' });
    } else {
      console.info(summary);
    }
  }

  navigateToCurtainCallGate();
  if (typeof window === 'undefined') {
    isSpotlightJokerBonusInProgress = false;
  }
};

const findSpotlightSecretPairCandidates = (
  player: PlayerState | undefined,
  rank: CardSnapshot['rank'],
): CardSnapshot[] => {
  if (!player || rank === 'JOKER') {
    return [];
  }
  const candidates = player.hand.cards.filter((card) => card.rank === rank);
  return sortCardsByDescendingValue(candidates);
};

const finalizeSpotlightSecretPairSelection = (
  request: SpotlightSecretPairRequest,
  handCardId: string | null,
): void => {
  if (isSpotlightSecretPairInProgress) {
    console.warn('シークレットペア処理が進行中です。');
    return;
  }

  const stateBefore = gameStore.getState();
  const playerName = getPlayerDisplayName(stateBefore, request.playerId);
  let paired = false;
  let openCardLabel: string | null = null;
  let handCardLabel: string | null = null;

  isSpotlightSecretPairInProgress = true;
  latestSpotlightPairCards = null;

  gameStore.setState((current) => {
    const player = current.players[request.playerId];
    if (!player) {
      return current;
    }

    const revealIndex = current.set.opened.findIndex((entry) => entry.id === request.revealId);
    if (revealIndex === -1) {
      return current;
    }

    const revealEntry = current.set.opened[revealIndex];
    openCardLabel = formatCardLabel(revealEntry.card);

    if (!handCardId) {
      return current;
    }

    const handCard = player.hand.cards.find((card) => card.id === handCardId);
    if (!handCard || handCard.rank !== revealEntry.card.rank) {
      return current;
    }

    const timestamp = Date.now();
    const nextOpened = current.set.opened.slice();
    const actorCard = cloneCardSnapshot(revealEntry.card);
    actorCard.face = 'up';
    const actorPlacement: StageCardPlacement = {
      card: actorCard,
      from: 'set',
      placedAt: timestamp,
      revealedAt: revealEntry.openedAt,
    };
    const kurokoPlacement = createStagePlacementFromHand(handCard, 'up', timestamp);
    const pairId = createStagePairId(timestamp);

    const nextHandCards = player.hand.cards.filter((card) => card.id !== handCardId);
    const nextLastDrawnCardId =
      player.hand.lastDrawnCardId === handCardId ? null : player.hand.lastDrawnCardId;

    const updatedReveal: SetReveal = {
      ...revealEntry,
      assignedTo: request.playerId,
      bonus: 'secretPair',
    };
    nextOpened[revealIndex] = updatedReveal;

    handCardLabel = formatCardLabel(handCard);
    paired = true;
    latestSpotlightPairCards = {
      actor: cloneCardSnapshot(actorPlacement.card),
      hand: cloneCardSnapshot(kurokoPlacement.card),
    };

    const nextBackstage: BackstageState = paired
      ? {
          ...getBackstageState(current),
          lastSpotlightPairFormed: true,
          canActPlayer: null,
          actedThisIntermission: false,
          lastResult: null,
          lastResultMessage: null,
          lastCompletionMessage: null,
        }
      : getBackstageState(current);

    return {
      ...current,
      players: {
        ...current.players,
        [request.playerId]: {
          ...player,
          hand: {
            ...player.hand,
            cards: nextHandCards,
            lastDrawnCardId: nextLastDrawnCardId,
          },
          stage: {
            ...player.stage,
            pairs: [
              ...player.stage.pairs,
              {
                id: pairId,
                owner: request.playerId,
                origin: 'spotlight',
                actor: actorPlacement,
                kuroko: kurokoPlacement,
                createdAt: timestamp,
              },
            ],
          },
        },
      },
      set: {
        ...current.set,
        opened: nextOpened,
      },
      backstage: nextBackstage,
      revision: current.revision + 1,
      updatedAt: timestamp,
    };
  });

  pendingSpotlightSecretPair = null;
  isSpotlightSecretPairInProgress = false;

  if (handCardId !== null && !paired) {
    console.warn('シークレットペアの成立に失敗しました。状態を確認してください。');
  }

  let infoMessage: string | null = null;

  if (paired) {
    const latest = gameStore.getState();
    saveGame(latest);
    infoMessage = SPOTLIGHT_SECRET_PAIR_RESULT_MESSAGE(
      playerName,
      openCardLabel ?? '',
      handCardLabel ?? '',
    );
  } else if (handCardId === null) {
    infoMessage = SPOTLIGHT_SECRET_PAIR_SKIP_RESULT_MESSAGE(playerName);
  }

  if (infoMessage) {
    if (typeof window === 'undefined') {
      console.info(infoMessage);
    } else {
      const toast = window.curtainCall?.toast;
      if (toast) {
        toast.show({ message: infoMessage, variant: 'info' });
      } else {
        console.info(infoMessage);
      }
    }
  }

  latestSpotlightPairCheckOutcome = paired ? 'paired' : 'unpaired';
  completeSpotlightPhaseTransition();
};

const openSpotlightSecretPairDialog = (request: SpotlightSecretPairRequest): void => {
  const state = gameStore.getState();
  const reveal = state.set.opened.find((entry) => entry.id === request.revealId);
  const player = state.players[request.playerId];

  if (!reveal || !player) {
    pendingSpotlightSecretPair = null;
    return;
  }

  const playerName = getPlayerDisplayName(state, request.playerId);
  const openCardLabel = formatCardLabel(reveal.card);
  const candidates = findSpotlightSecretPairCandidates(player, reveal.card.rank);

  if (typeof window === 'undefined') {
    finalizeSpotlightSecretPairSelection(request, candidates[0]?.id ?? null);
    return;
  }

  const modal = window.curtainCall?.modal;
  if (!modal) {
    finalizeSpotlightSecretPairSelection(request, candidates[0]?.id ?? null);
    return;
  }

  const { container, panel } = createSpotlightPickerLayout(SPOTLIGHT_SECRET_PAIR_TITLE);

  const message = document.createElement('p');
  message.className = 'spotlight-set-picker__message';
  message.textContent = SPOTLIGHT_SECRET_PAIR_MESSAGE(playerName, openCardLabel);
  panel.append(message);

  if (candidates.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'spotlight-set-picker__empty';
    empty.textContent = SPOTLIGHT_SECRET_PAIR_EMPTY_MESSAGE;
    panel.append(empty);
  } else {
    const list = document.createElement('ul');
    list.className = 'spotlight-set-picker__list';

    candidates.forEach((card) => {
      const item = document.createElement('li');
      item.className = 'spotlight-set-picker__item';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'spotlight-set-picker__button';
      button.setAttribute('aria-label', `${formatCardLabel(card)}でペアを作る`);

      const cardComponent = new CardComponent({
        rank: card.rank,
        suit: card.suit,
        faceDown: false,
        annotation: card.annotation,
      });
      cardComponent.el.classList.add('spotlight-set-picker__card');
      button.append(cardComponent.el);

      const label = document.createElement('span');
      label.className = 'spotlight-set-picker__label';
      label.textContent = formatCardLabel(card);
      button.append(label);

      button.addEventListener('click', () => {
        modal.close();
        finalizeSpotlightSecretPairSelection(request, card.id);
      });

      item.append(button);
      list.append(item);
    });

    panel.append(list);
  }

  modal.open({
    title: SPOTLIGHT_SECRET_PAIR_TITLE,
    body: container,
    className: 'modal--spotlight-set-picker',
    dismissible: false,
    actions: [
      {
        label: SPOTLIGHT_SECRET_PAIR_SKIP_LABEL,
        variant: 'ghost',
        preventRapid: true,
        dismiss: false,
        onSelect: () => {
          modal.close();
          finalizeSpotlightSecretPairSelection(request, null);
        },
      },
    ],
  });
};

const maybeTriggerSpotlightSecretPair = (reveal: SetReveal): void => {
  if (reveal.card.rank === 'JOKER') {
    return;
  }

  const state = gameStore.getState();
  const playerId = state.activePlayer;
  const player = state.players[playerId];

  if (!player) {
    return;
  }

  const candidates = findSpotlightSecretPairCandidates(player, reveal.card.rank);
  if (candidates.length === 0) {
    latestSpotlightPairCheckOutcome = 'unpaired';
    latestSpotlightPairCards = null;
    completeSpotlightPhaseTransition();
    return;
  }

  const request: SpotlightSecretPairRequest = { revealId: reveal.id, playerId };
  requestSpotlightSecretPair(request, candidates);
};

const presentSpotlightSetOpenResult = (
  playerName: string,
  reveal: SetReveal,
  onConfirm: () => void,
): void => {
  const cardLabel = formatCardLabel(reveal.card);
  const message = SPOTLIGHT_SET_RESULT_MESSAGE(playerName, cardLabel);

  if (typeof window === 'undefined') {
    console.info(message);
    onConfirm();
    return;
  }

  const modal = window.curtainCall?.modal;
  if (!modal) {
    console.info(message);
    onConfirm();
    return;
  }

  const container = document.createElement('div');
  container.className = 'spotlight-set-result';

  const text = document.createElement('p');
  text.className = 'spotlight-set-result__message';
  text.textContent = message;
  container.append(text);

  const preview = document.createElement('div');
  preview.className = 'spotlight-set-result__preview';
  const cardComponent = new CardComponent({
    rank: reveal.card.rank,
    suit: reveal.card.suit,
    faceDown: false,
    annotation: reveal.card.annotation,
  });
  cardComponent.el.classList.add('spotlight-set-result__card');
  preview.append(cardComponent.el);
  container.append(preview);

  modal.open({
    title: SPOTLIGHT_SET_RESULT_TITLE,
    body: container,
    dismissible: false,
    actions: [
      {
        label: SPOTLIGHT_SET_RESULT_OK_LABEL,
        variant: 'primary',
        preventRapid: true,
        dismiss: false,
        onSelect: () => {
          modal.close();
          onConfirm();
        },
      },
    ],
  });
};

const finalizeSpotlightSetOpen = (setCardId: string): void => {
  if (isSpotlightSetOpenInProgress) {
    console.warn('セットカードの公開処理が進行中です。');
    return;
  }

  const stateBefore = gameStore.getState();
  if (!canOpenSpotlightSet(stateBefore)) {
    console.warn(SPOTLIGHT_SET_OPEN_GUARD_MESSAGE);
    return;
  }

  const targetPairBefore = findLatestSpotlightPair(stateBefore);
  const pendingJokerBefore = findPendingJokerBonusReveal(stateBefore, targetPairBefore?.id);
  const playerName = getPlayerDisplayName(stateBefore, stateBefore.activePlayer);

  isSpotlightSetOpenInProgress = true;
  const reveal = openSpotlightSetCard(setCardId);
  isSpotlightSetOpenInProgress = false;

  if (!reveal) {
    console.warn('セットカードの公開に失敗しました。状態を確認してください。');
    return;
  }

  if (!pendingJokerBefore) {
    const latest = gameStore.getState();
    saveGame(latest);
  }

  const proceed = () => {
    if (pendingJokerBefore) {
      completeSpotlightJokerBonus(pendingJokerBefore, reveal);
      return;
    }

    if (reveal.bonus === 'joker') {
      openSpotlightJokerBonusDialog(reveal, playerName);
      return;
    }

    maybeTriggerSpotlightSecretPair(reveal);
  };

  if (typeof window !== 'undefined') {
    window.curtainCall?.modal?.close();
  }

  presentSpotlightSetOpenResult(playerName, reveal, proceed);
};

const getRemainingWatchCount = (state: GameState): number | null => {
  const watchState = state.watch;
  if (watchState && typeof watchState === 'object') {
    const watchRecord = watchState as Record<string, unknown>;
    const directRemaining = watchRecord.remaining;
    if (typeof directRemaining === 'number') {
      return directRemaining;
    }

    const perPlayer = watchRecord.remainingWatchIncludingCurrent;
    if (perPlayer && typeof perPlayer === 'object') {
      const record = perPlayer as Record<string, unknown>;
      const value = record[state.activePlayer];
      if (typeof value === 'number') {
        return value;
      }
    }
  }

  const rootRemaining = state.remainingWatchIncludingCurrent;
  if (rootRemaining && typeof rootRemaining === 'object') {
    const record = rootRemaining as Record<string, unknown>;
    const value = record[state.activePlayer];
    if (typeof value === 'number') {
      return value;
    }
  }

  return null;
};

const mapWatchStatus = (state: GameState): WatchStatusViewModel => {
  const player = state.players[state.activePlayer];
  const booCount = player?.booCount ?? 0;
  const remaining = getRemainingWatchCount(state);
  const needed = Math.max(0, REQUIRED_BOO_COUNT - booCount);
  const warning = remaining !== null && needed >= remaining;

  const turnLabel = `ターン：#${state.turn.count}`;
  const booLabel = `あなたのブーイング：${booCount} / ${REQUIRED_BOO_COUNT}`;
  const remainingLabelValue = remaining !== null ? String(remaining) : WATCH_REMAINING_PLACEHOLDER;
  const remainingLabel = `残りウォッチ機会：${remainingLabelValue}`;

  return {
    turnLabel,
    booLabel,
    remainingLabel,
    warning,
    warningLabel: WATCH_WARNING_BADGE_LABEL,
    warningMessage: warning ? WATCH_CLAP_WARNING_MESSAGE : undefined,
    clapDisabled: false,
  };
};

const notifyWatchClapWarning = (): void => {
  if (typeof window === 'undefined') {
    console.warn(WATCH_CLAP_WARNING_MESSAGE);
    return;
  }

  const toast = window.curtainCall?.toast;
  if (toast) {
    toast.show({ message: WATCH_CLAP_WARNING_MESSAGE, variant: 'warning' });
  } else {
    console.warn(WATCH_CLAP_WARNING_MESSAGE);
  }
};

const navigateFromWatchTo = (path: string): void => {
  if (typeof window === 'undefined') {
    return;
  }
  const router = window.curtainCall?.router;
  if (router) {
    router.go(path);
  } else {
    window.location.hash = path;
  }
};

const navigateToSpotlightGate = (): void => {
  if (typeof window === 'undefined') {
    return;
  }
  const router = window.curtainCall?.router;
  if (router) {
    router.go(SPOTLIGHT_GATE_PATH);
  } else {
    window.location.hash = SPOTLIGHT_GATE_PATH;
  }
};

const navigateToCurtainCallGate = (): void => {
  if (typeof window === 'undefined') {
    return;
  }
  const router = window.curtainCall?.router;
  if (router) {
    router.go(SPOTLIGHT_TO_CURTAINCALL_PATH);
  } else {
    window.location.hash = SPOTLIGHT_TO_CURTAINCALL_PATH;
  }
};

const handleCurtainCallGoHome = (router: Router): void => {
  router.go('#/');
};

const handleCurtainCallStartNewGame = (router: Router): void => {
  router.go(HOME_START_PATH);
};

const showCurtainCallGuardMessage = (message: string, variant: 'info' | 'warning' = 'info'): void => {
  if (typeof window === 'undefined') {
    if (variant === 'warning') {
      console.warn(message);
    } else {
      console.info(message);
    }
    return;
  }

  const toast = window.curtainCall?.toast;
  if (toast) {
    toast.show({ message, variant });
    return;
  }

  if (variant === 'warning') {
    console.warn(message);
  } else {
    console.info(message);
  }
};

const markCurtainCallSaved = (entryId: string, savedAt: number): void => {
  gameStore.setState((current) => {
    const summary = current.curtainCall;
    if (!summary) {
      return current;
    }

    if (summary.savedHistoryEntryId === entryId && summary.savedAt === savedAt) {
      return current;
    }

    const timestamp = Number.isFinite(savedAt) ? savedAt : Date.now();

    return {
      ...current,
      curtainCall: {
        ...summary,
        savedHistoryEntryId: entryId,
        savedAt: timestamp,
      },
      revision: current.revision + 1,
      updatedAt: timestamp,
    };
  });

  const latest = gameStore.getState();
  saveGame(latest);
};

const handleCurtainCallSaveRequest = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const state = gameStore.getState();
  const toast = window.curtainCall?.toast;

  if (!state.curtainCall) {
    const message = CURTAINCALL_SAVE_UNAVAILABLE_MESSAGE;
    if (toast) {
      toast.show({ message, variant: 'warning' });
    } else {
      console.warn(message);
    }
    return;
  }

  if (state.curtainCall.savedHistoryEntryId) {
    showCurtainCallGuardMessage(CURTAINCALL_SAVE_ALREADY_SAVED_MESSAGE, 'info');
    return;
  }

  const modal = window.curtainCall?.modal;

  if (!modal) {
    if (toast) {
      toast.show({ message: CURTAINCALL_SAVE_FAILURE_MESSAGE, variant: 'warning' });
    } else {
      console.warn('結果の保存ダイアログを表示できませんでした。');
    }
    return;
  }

  if (isCurtainCallSaveDialogOpen) {
    showCurtainCallGuardMessage(CURTAINCALL_SAVE_DIALOG_OPEN_MESSAGE, 'info');
    return;
  }

  const form = document.createElement('form');
  form.className = 'curtaincall-save';
  form.noValidate = true;

  const titleField = document.createElement('div');
  titleField.className = 'curtaincall-save__field';

  const titleLabel = document.createElement('label');
  titleLabel.className = 'curtaincall-save__label';
  titleLabel.textContent = CURTAINCALL_SAVE_TITLE_LABEL;
  const titleId = 'curtaincall-save-title';
  titleLabel.htmlFor = titleId;
  titleField.append(titleLabel);

  const titleInput = document.createElement('input');
  titleInput.className = 'curtaincall-save__input';
  titleInput.type = 'text';
  titleInput.id = titleId;
  titleInput.name = 'title';
  titleInput.required = true;
  titleInput.placeholder = CURTAINCALL_SAVE_TITLE_PLACEHOLDER;
  titleInput.value = createCurtainCallDefaultTitle(state);
  titleInput.autocomplete = 'off';
  titleInput.maxLength = 100;
  titleField.append(titleInput);

  const titleError = document.createElement('p');
  titleError.className = 'curtaincall-save__error';
  titleError.textContent = CURTAINCALL_SAVE_REQUIRED_MESSAGE;
  titleError.hidden = true;
  titleField.append(titleError);

  const memoField = document.createElement('div');
  memoField.className = 'curtaincall-save__field';

  const memoLabel = document.createElement('label');
  memoLabel.className = 'curtaincall-save__label';
  memoLabel.textContent = CURTAINCALL_SAVE_MEMO_LABEL;
  const memoId = 'curtaincall-save-memo';
  memoLabel.htmlFor = memoId;
  memoField.append(memoLabel);

  const memoInput = document.createElement('textarea');
  memoInput.className = 'curtaincall-save__textarea';
  memoInput.id = memoId;
  memoInput.name = 'memo';
  memoInput.placeholder = CURTAINCALL_SAVE_MEMO_PLACEHOLDER;
  memoInput.rows = 4;
  memoInput.maxLength = 800;
  memoField.append(memoInput);

  form.append(titleField, memoField);

  const submit = () => {
    if (isCurtainCallSaveInProgress) {
      showCurtainCallGuardMessage(CURTAINCALL_SAVE_IN_PROGRESS_MESSAGE, 'warning');
      return;
    }

    const latestState = gameStore.getState();
    const latestSummary = latestState.curtainCall;
    if (!latestSummary) {
      const message = CURTAINCALL_SAVE_UNAVAILABLE_MESSAGE;
      if (toast) {
        toast.show({ message, variant: 'warning' });
      } else {
        console.warn(message);
      }
      isCurtainCallSaveDialogOpen = false;
      modal.close();
      return;
    }

    if (latestSummary.savedHistoryEntryId) {
      showCurtainCallGuardMessage(CURTAINCALL_SAVE_ALREADY_SAVED_MESSAGE, 'info');
      isCurtainCallSaveDialogOpen = false;
      modal.close();
      return;
    }

    const title = titleInput.value.trim();
    if (!title) {
      titleError.hidden = false;
      titleInput.focus();
      return;
    }
    titleError.hidden = true;

    const memo = memoInput.value.trim();
    const savedAt = Date.now();

    isCurtainCallSaveInProgress = true;

    try {
      const payload = createCurtainCallHistoryPayload(
        latestState,
        title,
        memo.length > 0 ? memo : null,
        savedAt,
      );
      if (!payload) {
        if (toast) {
          toast.show({ message: CURTAINCALL_SAVE_FAILURE_MESSAGE, variant: 'warning' });
        } else {
          console.warn(CURTAINCALL_SAVE_FAILURE_MESSAGE);
        }
        return;
      }

      const entry = saveResult(payload.summary, payload.detail, savedAt);
      if (!entry) {
        if (toast) {
          toast.show({ message: CURTAINCALL_SAVE_FAILURE_MESSAGE, variant: 'warning' });
        } else {
          console.warn(CURTAINCALL_SAVE_FAILURE_MESSAGE);
        }
        return;
      }

      markCurtainCallSaved(entry.id, savedAt);
      isCurtainCallSaveDialogOpen = false;
      modal.close();
      if (toast) {
        toast.show({ message: CURTAINCALL_SAVE_SUCCESS_MESSAGE, variant: 'success' });
      } else {
        console.info(CURTAINCALL_SAVE_SUCCESS_MESSAGE);
      }
    } finally {
      isCurtainCallSaveInProgress = false;
    }
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submit();
  });

  titleInput.addEventListener('input', () => {
    if (titleInput.value.trim()) {
      titleError.hidden = true;
    }
  });

  isCurtainCallSaveDialogOpen = true;
  isCurtainCallSaveInProgress = false;

  modal.open({
    title: CURTAINCALL_SAVE_DIALOG_TITLE,
    body: form,
    dismissible: false,
    actions: [
      {
        label: CURTAINCALL_SAVE_CANCEL_LABEL,
        variant: 'ghost',
        onSelect: () => {
          isCurtainCallSaveDialogOpen = false;
          isCurtainCallSaveInProgress = false;
        },
      },
      {
        label: CURTAINCALL_SAVE_SUBMIT_LABEL,
        variant: 'primary',
        preventRapid: true,
        dismiss: false,
        onSelect: () => submit(),
      },
    ],
  });

  window.setTimeout(() => titleInput.focus(), 0);
};

const navigateToIntermissionGate = (): void => {
  if (typeof window === 'undefined') {
    return;
  }
  const router = window.curtainCall?.router;
  if (router) {
    router.go(SPOTLIGHT_TO_INTERMISSION_PATH);
  } else {
    window.location.hash = SPOTLIGHT_TO_INTERMISSION_PATH;
  }
};

const navigateToBackstageGate = (): void => {
  if (typeof window === 'undefined') {
    return;
  }
  const router = window.curtainCall?.router;
  if (router) {
    router.go(SPOTLIGHT_TO_BACKSTAGE_PATH);
  } else {
    window.location.hash = SPOTLIGHT_TO_BACKSTAGE_PATH;
  }
};

const handleIntermissionGatePass = (router: Router): void => {
  const state = gameStore.getState();
  if (shouldEnterBackstagePhase(state)) {
    showIntermissionBackstageGuard(INTERMISSION_BACKSTAGE_PENDING_MESSAGE);
    return;
  }

  if (shouldTriggerCurtainCallByHandDepletion(state)) {
    prepareCurtainCall('handDepleted');
    const latest = gameStore.getState();
    saveGame(latest);
    router.go(SPOTLIGHT_TO_CURTAINCALL_PATH);
    return;
  }

  gameStore.setState((current) => {
    const timestamp = Date.now();
    const currentTurn = current.turn ?? { count: 0, startedAt: timestamp };
    const previousWatchState = current.watch ?? createInitialWatchState();
    const nextActivePlayerId = resolveNextIntermissionActivePlayer(current);
    const backstage = getBackstageState(current);

    return {
      ...current,
      activePlayer: nextActivePlayerId,
      turn: {
        count: currentTurn.count + 1,
        startedAt: timestamp,
      },
      backstage: {
        ...backstage,
        lastResult: null,
        lastResultMessage: null,
        lastCompletionMessage: null,
      },
      watch: {
        ...previousWatchState,
        decision: null,
        nextRoute: null,
        pairId: null,
      },
      revision: current.revision + 1,
      updatedAt: timestamp,
    };
  });

  router.go(INTERMISSION_TO_SCOUT_PATH);
};

const handleBackstageGatePass = (router: Router): void => {
  const state = gameStore.getState();
  if (shouldEnterBackstagePhase(state)) {
    router.go(BACKSTAGE_PHASE_PATH);
    return;
  }

  router.go(SPOTLIGHT_TO_INTERMISSION_PATH);
};

const navigateFromSpotlightToNextPhase = (): void => {
  const latestState = gameStore.getState();
  if (shouldEnterBackstagePhase(latestState)) {
    navigateToBackstageGate();
  } else {
    navigateToIntermissionGate();
  }
};

const autoAdvanceFromBackstage = (): void => {
  const currentState = gameStore.getState();
  if (shouldEnterBackstagePhase(currentState)) {
    return;
  }

  if (typeof window === 'undefined') {
    return;
  }

  const router = window.curtainCall?.router;
  if (!router) {
    const currentHash = window.location.hash || '';
    if (currentHash === BACKSTAGE_GATE_PATH || currentHash === BACKSTAGE_PHASE_PATH) {
      window.location.hash = SPOTLIGHT_TO_INTERMISSION_PATH;
    }
    return;
  }

  const currentPath = router.getCurrentPath();
  if (currentPath === BACKSTAGE_GATE_PATH || currentPath === BACKSTAGE_PHASE_PATH) {
    handleBackstageGatePass(router);
  }
};

const completeSpotlightPhaseTransition = (): void => {
  if (isSpotlightExitInProgress) {
    return;
  }

  const state = gameStore.getState();
  const pairCards = latestSpotlightPairCards;

  if (pendingSpotlightSecretPair) {
    return;
  }

  const targetPair = findLatestSpotlightPair(state);
  const pendingJoker = findPendingJokerBonusReveal(state, targetPair?.id);
  if (pendingJoker) {
    return;
  }

  const remainingSetCards = state.set.cards.filter((entry) => entry.card.face !== 'up').length;
  const nextPath =
    remainingSetCards === 1 ? SPOTLIGHT_TO_CURTAINCALL_PATH : SPOTLIGHT_TO_INTERMISSION_PATH;
  const pairCheckOutcome = latestSpotlightPairCheckOutcome;

  isSpotlightExitInProgress = true;

  if (nextPath === SPOTLIGHT_TO_CURTAINCALL_PATH) {
    prepareCurtainCall('setRemaining1');
    latestSpotlightPairCheckOutcome = null;
    latestSpotlightPairCards = null;
    const latestState = gameStore.getState();
    saveGame(latestState);
    navigateToCurtainCallGate();
    return;
  }

  saveGame(state);

  if (typeof window === 'undefined') {
    latestSpotlightPairCheckOutcome = null;
    latestSpotlightPairCards = null;
    navigateFromSpotlightToNextPhase();
    return;
  }

  const modal = window.curtainCall?.modal;
  if (!modal) {
    latestSpotlightPairCheckOutcome = null;
    latestSpotlightPairCards = null;
    navigateFromSpotlightToNextPhase();
    return;
  }

  const body = document.createElement('div');
  body.className = 'spotlight-pair-check';

  const message = document.createElement('p');
  message.className = 'spotlight-pair-check__message';
  const messageText =
    pairCheckOutcome === 'paired'
      ? SPOTLIGHT_PAIR_CHECK_PAIRED_MESSAGE
      : pairCheckOutcome === 'unpaired'
        ? SPOTLIGHT_PAIR_CHECK_UNPAIRED_MESSAGE
        : pairCheckOutcome === 'skipped'
          ? SPOTLIGHT_PAIR_CHECK_SKIPPED_MESSAGE
          : SPOTLIGHT_PAIR_CHECK_MESSAGE;
  message.textContent = messageText;
  body.append(message);

  if (pairCheckOutcome === 'paired' && pairCards) {
    const cards = document.createElement('div');
    cards.className = 'spotlight-pair-check__cards';

    const createCardPreview = (labelText: string, card: CardSnapshot): HTMLDivElement => {
      const container = document.createElement('div');
      container.className = 'spotlight-pair-check__card';

      const label = document.createElement('p');
      label.className = 'spotlight-pair-check__card-label';
      label.textContent = labelText;
      container.append(label);

      const cardComponent = new CardComponent({
        rank: card.rank,
        suit: card.suit,
        faceDown: false,
        annotation: card.annotation,
      });
      cardComponent.el.classList.add('spotlight-pair-check__card-image');
      container.append(cardComponent.el);

      return container;
    };

    cards.append(createCardPreview('カミ', pairCards.actor));
    cards.append(createCardPreview('シモ', pairCards.hand));
    body.append(cards);
  }

  const caption = document.createElement('p');
  caption.className = 'spotlight-pair-check__caption';
  caption.textContent = SPOTLIGHT_PAIR_CHECK_CAPTION;
  body.append(caption);

  latestSpotlightPairCheckOutcome = null;
  latestSpotlightPairCards = null;
  modal.open({
    title: SPOTLIGHT_PAIR_CHECK_TITLE,
    body,
    dismissible: false,
    actions: [
      {
        label: SPOTLIGHT_PAIR_CHECK_CONFIRM_LABEL,
        variant: 'primary',
        preventRapid: true,
        dismiss: false,
        onSelect: () => {
          modal.close();
          navigateFromSpotlightToNextPhase();
        },
      },
    ],
  });
};

const handleSpotlightGatePass = (router: Router): void => {
  grantSpotlightSecretAccess();
  router.go('#/phase/spotlight');
  const secretPairRequest = pendingSpotlightSecretPair;
  const setOpenRequest = pendingSpotlightSetOpen;

  queueMicrotask(() => {
    if (
      secretPairRequest &&
      pendingSpotlightSecretPair?.revealId === secretPairRequest.revealId
    ) {
      openSpotlightSecretPairDialog(secretPairRequest);
      return;
    }

    if (setOpenRequest && pendingSpotlightSetOpen?.playerId === setOpenRequest.playerId) {
      pendingSpotlightSetOpen = null;
      openSpotlightSetPickerDialog(setOpenRequest.playerId);
    }
  });
};

const createWatchResultContent = (
  decision: WatchDecision,
  playerName: string,
  opponentName: string,
): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'watch-complete';

  const message = document.createElement('p');
  message.className = 'watch-complete__message';
  message.textContent = createWatchResultMessage(decision, playerName);
  container.append(message);

  const handoff = document.createElement('p');
  handoff.className = 'watch-complete__caption';
  handoff.textContent = `ウォッチフェーズが終わります。${opponentName}に端末を渡してください。`;
  container.append(handoff);

  const instruction = document.createElement('p');
  instruction.className = 'watch-complete__caption';
  instruction.textContent = `${opponentName}が準備できたら「${WATCH_RESULT_OK_LABELS[decision]}」を押して次へ進みましょう。`;
  container.append(instruction);

  return container;
};

interface CompleteWatchDecisionResult {
  decision: WatchDecision;
  nextRoute: string;
}

const WATCH_DECISION_TO_PATH: Record<WatchDecision, string> = {
  clap: WATCH_TO_INTERMISSION_PATH,
  boo: WATCH_TO_SPOTLIGHT_PATH,
};

const completeWatchDecision = (decision: WatchDecision): CompleteWatchDecisionResult | null => {
  let result: CompleteWatchDecisionResult | null = null;

  gameStore.setState((current) => {
    const player = current.players[current.activePlayer];
    if (!player) {
      return current;
    }

    const timestamp = Date.now();
    const nextRoute = WATCH_DECISION_TO_PATH[decision];
    const nextPlayer: PlayerState = {
      ...player,
      clapCount: decision === 'clap' ? player.clapCount + 1 : player.clapCount,
      booCount: decision === 'boo' ? player.booCount + 1 : player.booCount,
    };

    const previousWatchState = current.watch ?? createInitialWatchState();

    result = { decision, nextRoute };

    return {
      ...current,
      players: {
        ...current.players,
        [current.activePlayer]: nextPlayer,
      },
      watch: {
        ...previousWatchState,
        decision,
        nextRoute,
      },
      revision: current.revision + 1,
      updatedAt: timestamp,
    };
  });

  return result;
};

let isWatchDecisionInProgress = false;
let isWatchResultDialogOpen = false;
let isSpotlightRevealInProgress = false;
let isSpotlightSetOpenInProgress = false;
let isSpotlightJokerBonusInProgress = false;
let isSpotlightExitInProgress = false;
let isCurtainCallSaveDialogOpen = false;
let isCurtainCallSaveInProgress = false;
let isIntermissionBackstageActionInProgress = false;

const showWatchResultDialog = (
  { decision, nextRoute }: CompleteWatchDecisionResult,
  playerName: string,
  opponentName: string,
): void => {
  const summary = `${playerName}｜${WATCH_RESULT_TITLES[decision]} ${WATCH_RESULT_MESSAGES[decision]}`;

  const finalize = (): void => {
    isWatchResultDialogOpen = false;
    const latest = gameStore.getState();
    saveGame(latest);
    navigateFromWatchTo(nextRoute);
  };

  if (isWatchResultDialogOpen) {
    return;
  }

  if (typeof window === 'undefined') {
    console.info(summary);
    finalize();
    return;
  }

  const modal = window.curtainCall?.modal;
  if (!modal) {
    console.info(summary);
    finalize();
    return;
  }

  const openDialog = (): void => {
    const body = createWatchResultContent(decision, playerName, opponentName);
    isWatchResultDialogOpen = true;
    modal.open({
      title: WATCH_RESULT_TITLES[decision],
      body,
      dismissible: false,
      actions: [
        {
          label: WATCH_RESULT_OK_LABELS[decision],
          variant: 'primary',
          preventRapid: true,
          dismiss: false,
          onSelect: () => {
            modal.close();
            finalize();
          },
        },
      ],
    });
  };

  if (modal.opened) {
    modal.close();
    window.requestAnimationFrame(() => openDialog());
    return;
  }

  openDialog();
};

const finalizeWatchDecision = (decision: WatchDecision): void => {
  if (isWatchDecisionInProgress) {
    console.warn('ウォッチの宣言処理が進行中です。');
    return;
  }

  const stateBefore = gameStore.getState();
  const playerName = getPlayerDisplayName(stateBefore, stateBefore.activePlayer);
  const opponentName = getPlayerDisplayName(stateBefore, getOpponentId(stateBefore.activePlayer));

  isWatchDecisionInProgress = true;

  const result = completeWatchDecision(decision);

  if (!result) {
    isWatchDecisionInProgress = false;
    console.warn('宣言処理を完了できませんでした。状態を確認してください。');
    return;
  }

  if (typeof window !== 'undefined') {
    window.curtainCall?.modal?.close();
  }

  isWatchDecisionInProgress = false;
  showWatchResultDialog(result, playerName, opponentName);
};

const openWatchConfirmDialog = (decision: WatchDecision): void => {
  if (isWatchDecisionInProgress || isWatchResultDialogOpen) {
    return;
  }

  if (typeof window === 'undefined') {
    finalizeWatchDecision(decision);
    return;
  }

  const modal = window.curtainCall?.modal;
  if (!modal) {
    finalizeWatchDecision(decision);
    return;
  }

  const state = gameStore.getState();
  const playerName = getPlayerDisplayName(state, state.activePlayer);

  const title = WATCH_DECISION_CONFIRM_TITLES[decision];
  const message = createWatchDecisionConfirmMessage(decision, playerName);

  modal.open({
    title,
    body: message,
    dismissible: false,
    actions: [
      {
        label: WATCH_DECISION_CONFIRM_CANCEL_LABEL,
        variant: 'ghost',
      },
      {
        label: WATCH_DECISION_CONFIRM_OK_LABEL,
        variant: 'primary',
        preventRapid: true,
        dismiss: false,
        onSelect: () => finalizeWatchDecision(decision),
      },
    ],
  });
};

const requestWatchDeclaration = (decision: WatchDecision): void => {
  const status = mapWatchStatus(gameStore.getState());
  if (decision === 'clap' && status.warning && status.warningMessage) {
    notifyWatchClapWarning();
  }

  openWatchConfirmDialog(decision);
};

interface RevealSpotlightKurokoResult {
  judge: StageJudgeResult;
  actorCard: CardSnapshot;
  kurokoCard: CardSnapshot;
  owner: PlayerId;
}

const revealSpotlightKuroko = (): RevealSpotlightKurokoResult | null => {
  let result: RevealSpotlightKurokoResult | null = null;

  gameStore.setState((current) => {
    const targetPair = findLatestSpotlightPair(current);
    if (!targetPair?.actor?.card || !targetPair.kuroko?.card) {
      return current;
    }

    if (targetPair.kuroko.card.face === 'up') {
      return current;
    }

    const presenterId = targetPair.owner;
    const presenter = current.players[presenterId];
    if (!presenter) {
      return current;
    }

    const booerId = getOpponentId(presenterId);
    const booer = current.players[booerId];
    if (!booer) {
      return current;
    }

    const timestamp = Date.now();
    const actorCard = cloneCardSnapshot(targetPair.actor.card);
    const kurokoCard = cloneCardSnapshot(targetPair.kuroko.card);
    kurokoCard.face = 'up';

    const judge: StageJudgeResult = actorCard.rank === kurokoCard.rank ? 'match' : 'mismatch';

    const updatedPair: StagePair = {
      ...targetPair,
      owner: judge === 'match' ? presenterId : booerId,
      judge,
      kuroko: targetPair.kuroko
        ? {
            ...targetPair.kuroko,
            card: kurokoCard,
            revealedAt: timestamp,
          }
        : undefined,
    };

    const nextPlayers: Record<PlayerId, PlayerState> = {
      ...current.players,
      [presenterId]: {
        ...presenter,
        stage: {
          ...presenter.stage,
          pairs:
            judge === 'match'
              ? presenter.stage.pairs.map((pair) => (pair.id === targetPair.id ? updatedPair : pair))
              : presenter.stage.pairs.filter((pair) => pair.id !== targetPair.id),
        },
      },
    };

    if (judge === 'mismatch') {
      nextPlayers[booerId] = {
        ...booer,
        stage: {
          ...booer.stage,
          pairs: [...booer.stage.pairs, updatedPair],
        },
      };
    } else {
      nextPlayers[booerId] = booer;
    }

    result = {
      judge,
      actorCard,
      kurokoCard,
      owner: updatedPair.owner,
    };

    return {
      ...current,
      players: nextPlayers,
      activePlayer: updatedPair.owner,
      revision: current.revision + 1,
      updatedAt: timestamp,
    };
  });

  return result;
};

const createSpotlightRevealConfirmBody = (playerName: string): HTMLElement => {
  const container = document.createElement('div');

  const message = document.createElement('p');
  message.textContent = `${playerName}のターンです。${SPOTLIGHT_REVEAL_CONFIRM_MESSAGE}`;
  container.append(message);

  return container;
};

const finalizeSpotlightReveal = (): void => {
  if (isSpotlightRevealInProgress) {
    console.warn('黒子公開処理が進行中です。');
    return;
  }

  const stateBefore = gameStore.getState();
  if (!canRevealSpotlightKuroko(stateBefore)) {
    console.warn('公開可能な黒子が見つかりません。');
    return;
  }

  const targetPair = findLatestSpotlightPair(stateBefore);
  if (!targetPair?.owner || !targetPair.actor?.card || !targetPair.kuroko?.card) {
    console.warn('黒子公開の対象ペアが見つかりません。');
    return;
  }

  const presenterId = targetPair.owner;
  const booerId = getOpponentId(presenterId);
  const presenterName = getPlayerDisplayName(stateBefore, presenterId);
  const booerName = getPlayerDisplayName(stateBefore, booerId);
  const playerName = getPlayerDisplayName(stateBefore, stateBefore.activePlayer);
  isSpotlightRevealInProgress = true;

  const result = revealSpotlightKuroko();

  isSpotlightRevealInProgress = false;

  if (!result) {
    console.warn('黒子の公開に失敗しました。状態を確認してください。');
    return;
  }

  const latest = gameStore.getState();
  saveGame(latest);

  const canOpenSet = canOpenSpotlightSet(latest);

  const summary = `${playerName}が黒子を公開しました：役者=${formatCardLabel(
    result.actorCard,
  )}／黒子=${formatCardLabel(result.kurokoCard)}｜判定=${
    result.judge === 'match' ? '一致' : '不一致'
  }`;

  if (typeof window === 'undefined') {
    console.info(summary);
    return;
  }

  console.info(summary);
  window.curtainCall?.modal?.close();
  showSpotlightRevealResultDialog(result, presenterName, booerName, result.owner, canOpenSet);
};

const openSpotlightRevealConfirmDialog = (): void => {
  if (isSpotlightRevealInProgress) {
    return;
  }

  const state = gameStore.getState();
  if (!canRevealSpotlightKuroko(state)) {
    console.warn('公開可能な黒子が見つかりません。');
    return;
  }

  const playerName = getPlayerDisplayName(state, state.activePlayer);

  if (typeof window === 'undefined') {
    finalizeSpotlightReveal();
    return;
  }

  const modal = window.curtainCall?.modal;
  if (!modal) {
    finalizeSpotlightReveal();
    return;
  }

  modal.open({
    title: SPOTLIGHT_REVEAL_CONFIRM_TITLE,
    body: createSpotlightRevealConfirmBody(playerName),
    dismissible: false,
    actions: [
      {
        label: SPOTLIGHT_REVEAL_CONFIRM_CANCEL_LABEL,
        variant: 'ghost',
      },
      {
        label: SPOTLIGHT_REVEAL_CONFIRM_OK_LABEL,
        variant: 'primary',
        preventRapid: true,
        dismiss: false,
        onSelect: () => finalizeSpotlightReveal(),
      },
    ],
  });
};

const createStagePairId = (timestamp: number): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const random = Math.random().toString(16).slice(2, 10);
  return `pair-${timestamp}-${random}`;
};

const createStagePlacementFromHand = (
  card: CardSnapshot,
  face: CardSnapshot['face'],
  timestamp: number,
): StageCardPlacement => ({
  card: { ...cloneCardSnapshot(card), face },
  from: 'hand',
  placedAt: timestamp,
});

interface CompleteActionPlacementResult {
  placed: boolean;
  actorCard?: CardSnapshot;
  kurokoCard?: CardSnapshot;
}

const completeActionPlacement = (): CompleteActionPlacementResult => {
  const result: CompleteActionPlacementResult = { placed: false };

  gameStore.setState((current) => {
    const actorId = current.action.actorCardId;
    const kurokoId = current.action.kurokoCardId;

    if (!actorId || !kurokoId || actorId === kurokoId) {
      return current;
    }

    const player = current.players[current.activePlayer];
    if (!player) {
      return current;
    }

    const actorCard = player.hand.cards.find((card) => card.id === actorId);
    const kurokoCard = player.hand.cards.find((card) => card.id === kurokoId);

    if (!actorCard || !kurokoCard) {
      return current;
    }

    const timestamp = Date.now();
    const nextActivePlayerId = getOpponentId(current.activePlayer);
    const pairId = createStagePairId(timestamp);
    const actorPlacement = createStagePlacementFromHand(actorCard, 'up', timestamp);
    const kurokoPlacement = createStagePlacementFromHand(kurokoCard, 'down', timestamp);

    const nextHandCards = player.hand.cards.filter(
      (card) => card.id !== actorId && card.id !== kurokoId,
    );
    const removedCardIds = new Set([actorId, kurokoId]);
    const nextLastDrawnCardId =
      player.hand.lastDrawnCardId && removedCardIds.has(player.hand.lastDrawnCardId)
        ? null
        : player.hand.lastDrawnCardId;

    result.placed = true;
    result.actorCard = cloneCardSnapshot(actorCard);
    result.kurokoCard = cloneCardSnapshot(kurokoCard);

    return {
      ...current,
      players: {
        ...current.players,
        [current.activePlayer]: {
          ...player,
          hand: {
            ...player.hand,
            cards: nextHandCards,
            lastDrawnCardId: nextLastDrawnCardId,
          },
          stage: {
            ...player.stage,
            pairs: [
              ...player.stage.pairs,
              {
                id: pairId,
                owner: current.activePlayer,
                origin: 'action',
                actor: actorPlacement,
                kuroko: kurokoPlacement,
                createdAt: timestamp,
              },
            ],
          },
        },
      },
      activePlayer: nextActivePlayerId,
      action: {
        selectedCardId: null,
        actorCardId: null,
        kurokoCardId: null,
      },
      watch: {
        ...(current.watch ?? createInitialWatchState()),
        decision: null,
        nextRoute: null,
        pairId,
      },
      revision: current.revision + 1,
      updatedAt: timestamp,
    };
  });

  return result;
};

const createActionConfirmModalBody = (
  actorCard: CardSnapshot,
  kurokoCard: CardSnapshot,
  playerName: string,
): HTMLElement => {
  const container = document.createElement('div');

  const message = document.createElement('p');
  message.textContent = `${playerName}のターンです。${ACTION_CONFIRM_MODAL_MESSAGE}`;
  container.append(message);

  const list = document.createElement('dl');
  list.className = 'action-confirm__list';

  const appendEntry = (label: string, card: CardSnapshot, face: 'up' | 'down') => {
    const term = document.createElement('dt');
    term.textContent = label;
    const description = document.createElement('dd');
    const faceLabel = face === 'up' ? '（表）' : '（裏）';
    description.textContent = `${formatCardLabel(card)}${faceLabel}`;
    list.append(term, description);
  };

  appendEntry('役者', actorCard, 'up');
  appendEntry('黒子', kurokoCard, 'down');

  container.append(list);
  return container;
};

let isActionConfirmInProgress = false;
let isActionResultDialogOpen = false;

const navigateToWatchGate = (): void => {
  if (typeof window === 'undefined') {
    return;
  }
  const router = window.curtainCall?.router;
  if (router) {
    router.go(ACTION_TO_WATCH_PATH);
  } else {
    window.location.hash = ACTION_TO_WATCH_PATH;
  }
};

const createActionPlacementResultContent = (
  actorCard: CardSnapshot,
  kurokoCard: CardSnapshot,
  playerName: string,
  opponentName: string,
): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'action-complete';

  const message = document.createElement('p');
  message.className = 'action-complete__message';
  message.textContent = `${playerName}のアクションが完了しました。`;
  container.append(message);

  const summary = document.createElement('p');
  summary.className = 'action-complete__summary';
  summary.textContent = `役者：${formatCardLabel(actorCard)} ／ 黒子：${formatCardLabel(
    kurokoCard,
  )}`;
  container.append(summary);

  const notice = document.createElement('p');
  notice.className = 'action-complete__caption';
  notice.textContent = `アクションフェーズが終わります。${opponentName}に端末を渡し、準備が整ったら「${ACTION_RESULT_OK_LABEL}」を押してウォッチフェーズへ進みましょう。`;
  container.append(notice);

  return container;
};

const showActionPlacementResultDialog = (
  actorCard: CardSnapshot,
  kurokoCard: CardSnapshot,
  playerName: string,
  opponentName: string,
): void => {
  if (isActionResultDialogOpen) {
    return;
  }

  const summaryMessage = `${playerName}｜${ACTION_RESULT_TITLE}｜役者：${formatCardLabel(
    actorCard,
  )}／黒子：${formatCardLabel(kurokoCard)}`;

  const finalize = (): void => {
    isActionResultDialogOpen = false;
    const latestState = gameStore.getState();
    saveGame(latestState);
    navigateToWatchGate();
  };

  if (typeof window === 'undefined') {
    console.info(summaryMessage);
    finalize();
    return;
  }

  const modal = window.curtainCall?.modal;
  if (!modal) {
    console.info(summaryMessage);
    finalize();
    return;
  }

  const openDialog = (): void => {
    const body = createActionPlacementResultContent(
      actorCard,
      kurokoCard,
      playerName,
      opponentName,
    );
    isActionResultDialogOpen = true;

    modal.open({
      title: ACTION_RESULT_TITLE,
      body,
      dismissible: false,
      actions: [
        {
          label: ACTION_RESULT_OK_LABEL,
          variant: 'primary',
          preventRapid: true,
          dismiss: false,
          onSelect: () => {
            modal.close();
            finalize();
          },
        },
      ],
    });
  };

  if (modal.opened) {
    modal.close();
    window.requestAnimationFrame(() => openDialog());
    return;
  }

  openDialog();
};

const finalizeActionPlacement = (): void => {
  if (isActionConfirmInProgress) {
    console.warn('配置確定処理が進行中です。');
    return;
  }

  const stateBefore = gameStore.getState();
  const playerName = getPlayerDisplayName(stateBefore, stateBefore.activePlayer);
  const opponentName = getPlayerDisplayName(stateBefore, getOpponentId(stateBefore.activePlayer));
  isActionConfirmInProgress = true;

  const result = completeActionPlacement();

  if (!result.placed || !result.actorCard || !result.kurokoCard) {
    isActionConfirmInProgress = false;
    console.warn('配置確定に失敗しました。選択状態を確認してください。');
    return;
  }

  if (typeof window !== 'undefined') {
    window.curtainCall?.modal?.close();
  }

  isActionConfirmInProgress = false;

  showActionPlacementResultDialog(result.actorCard, result.kurokoCard, playerName, opponentName);
};

const openActionConfirmDialog = (): void => {
  const state = gameStore.getState();

  if (!canConfirmActionPlacement(state)) {
    notifyActionGuardStatus(state, { force: true });
    return;
  }

  const actorId = state.action.actorCardId;
  const kurokoId = state.action.kurokoCardId;

  if (!actorId || !kurokoId) {
    return;
  }

  const player = state.players[state.activePlayer];
  if (!player) {
    return;
  }

  const actorCard = player.hand.cards.find((card) => card.id === actorId);
  const kurokoCard = player.hand.cards.find((card) => card.id === kurokoId);

  if (!actorCard || !kurokoCard) {
    return;
  }

  const playerName = getPlayerDisplayName(state, state.activePlayer);

  if (isActionConfirmInProgress) {
    console.warn('配置確定処理が進行中です。');
    return;
  }

  if (typeof window === 'undefined') {
    finalizeActionPlacement();
    return;
  }

  const modal = window.curtainCall?.modal;
  if (!modal) {
    finalizeActionPlacement();
    return;
  }

  modal.open({
    title: ACTION_CONFIRM_MODAL_TITLE,
    body: createActionConfirmModalBody(actorCard, kurokoCard, playerName),
    dismissible: false,
    actions: [
      {
        label: ACTION_CONFIRM_MODAL_CANCEL_LABEL,
        variant: 'ghost',
      },
      {
        label: ACTION_CONFIRM_MODAL_OK_LABEL,
        variant: 'primary',
        preventRapid: true,
        dismiss: false,
        onSelect: () => finalizeActionPlacement(),
      },
    ],
  });
};

const toggleActionActorCard = (cardId: string): void => {
  gameStore.setState((current) => {
    const player = current.players[current.activePlayer];
    if (!player) {
      return current;
    }

    const hasCard = player.hand.cards.some((card) => card.id === cardId);
    if (!hasCard) {
      return current;
    }

    const nextActorCardId = current.action.actorCardId === cardId ? null : cardId;
    const nextKurokoCardId =
      nextActorCardId !== null && current.action.kurokoCardId === nextActorCardId
        ? null
        : current.action.kurokoCardId;

    if (
      nextActorCardId === current.action.actorCardId &&
      nextKurokoCardId === current.action.kurokoCardId &&
      current.action.selectedCardId === null
    ) {
      return current;
    }

    const timestamp = Date.now();

    return {
      ...current,
      action: {
        ...current.action,
        selectedCardId: null,
        actorCardId: nextActorCardId,
        kurokoCardId: nextKurokoCardId,
      },
      updatedAt: timestamp,
      revision: current.revision + 1,
    };
  });
};

const toggleActionKurokoCard = (cardId: string): void => {
  gameStore.setState((current) => {
    const player = current.players[current.activePlayer];
    if (!player) {
      return current;
    }

    const hasCard = player.hand.cards.some((card) => card.id === cardId);
    if (!hasCard) {
      return current;
    }

    const nextKurokoCardId = current.action.kurokoCardId === cardId ? null : cardId;
    const nextActorCardId =
      nextKurokoCardId !== null && current.action.actorCardId === nextKurokoCardId
        ? null
        : current.action.actorCardId;

    if (
      nextActorCardId === current.action.actorCardId &&
      nextKurokoCardId === current.action.kurokoCardId &&
      current.action.selectedCardId === null
    ) {
      return current;
    }

    const timestamp = Date.now();

    return {
      ...current,
      action: {
        ...current.action,
        selectedCardId: null,
        actorCardId: nextActorCardId,
        kurokoCardId: nextKurokoCardId,
      },
      updatedAt: timestamp,
      revision: current.revision + 1,
    };
  });
};

let isScoutPickInProgress = false;

const clearScoutSecretState = (): void => {
  gameStore.setState((current) => {
    const hasSelection = current.scout.selectedOpponentCardId !== null;
    const hasRecent = current.recentScoutedCard !== null;

    if (!hasSelection && !hasRecent) {
      return current;
    }

    const timestamp = Date.now();

    return {
      ...current,
      scout: {
        ...current.scout,
        selectedOpponentCardId: null,
      },
      recentScoutedCard: null,
      updatedAt: timestamp,
      revision: current.revision + 1,
    };
  });

  resetScoutOpponentHandOrder();
  isScoutPickInProgress = false;
  isScoutResultDialogOpen = false;
};

let activeTurnIndicatorCleanup: (() => void) | null = null;
let activeScoutCleanup: (() => void) | null = null;
let activeActionCleanup: (() => void) | null = null;
let activeWatchCleanup: (() => void) | null = null;
let activeIntermissionCleanup: (() => void) | null = null;
let activeBackstageCleanup: (() => void) | null = null;
let activeSpotlightCleanup: (() => void) | null = null;
let activeCurtainCallCleanup: (() => void) | null = null;

const cleanupActiveTurnIndicator = (): void => {
  if (activeTurnIndicatorCleanup) {
    const cleanup = activeTurnIndicatorCleanup;
    activeTurnIndicatorCleanup = null;
    cleanup();
  }
};

const cleanupActiveScoutView = (): void => {
  if (activeScoutCleanup) {
    const cleanup = activeScoutCleanup;
    activeScoutCleanup = null;
    cleanup();
  }
  isScoutPickInProgress = false;
};

const cleanupActiveActionView = (): void => {
  if (activeActionCleanup) {
    const cleanup = activeActionCleanup;
    activeActionCleanup = null;
    cleanup();
  }
  isActionConfirmInProgress = false;
  lastActionGuardMessage = null;
  isActionResultDialogOpen = false;
};

const cleanupActiveWatchView = (): void => {
  if (activeWatchCleanup) {
    const cleanup = activeWatchCleanup;
    activeWatchCleanup = null;
    cleanup();
    revokeWatchSecretAccess();
    isWatchDecisionInProgress = false;
    isWatchResultDialogOpen = false;
  }
};

const cleanupActiveIntermissionView = (): void => {
  if (activeIntermissionCleanup) {
    const cleanup = activeIntermissionCleanup;
    activeIntermissionCleanup = null;
    cleanup();
  }
};

const cleanupActiveBackstageView = (): void => {
  if (activeBackstageCleanup) {
    const cleanup = activeBackstageCleanup;
    activeBackstageCleanup = null;
    cleanup();
  }
};

const cleanupActiveSpotlightView = (): void => {
  if (activeSpotlightCleanup) {
    const cleanup = activeSpotlightCleanup;
    activeSpotlightCleanup = null;
    cleanup();
    isSpotlightRevealInProgress = false;
    isSpotlightSetOpenInProgress = false;
    isSpotlightJokerBonusInProgress = false;
  }
  isSpotlightSecretPairInProgress = false;
  isSpotlightExitInProgress = false;
};

const cleanupActiveCurtainCallView = (): void => {
  if (activeCurtainCallCleanup) {
    const cleanup = activeCurtainCallCleanup;
    activeCurtainCallCleanup = null;
    cleanup();
  }
  isCurtainCallSaveDialogOpen = false;
  isCurtainCallSaveInProgress = false;
};

const withRouteCleanup = (
  render: (context: RouteContext) => HTMLElement,
): ((context: RouteContext) => HTMLElement) => {
  return (context) => {
    cleanupActiveTurnIndicator();
    cleanupActiveScoutView();
    cleanupActiveActionView();
    cleanupActiveWatchView();
    cleanupActiveIntermissionView();
    cleanupActiveBackstageView();
    cleanupActiveSpotlightView();
    cleanupActiveCurtainCallView();
    const view = render(context);
    const state = gameStore.getState();
    activeTurnIndicatorCleanup = attachTurnIndicatorToView(view, state);
    return view;
  };
};

const ROUTES: RouteDescriptor[] = [
  {
    path: '#/',
    title: 'HOME',
    heading: 'Curtain Call',
    subtitle: 'HOME 画面は準備中です。スタンバイからゲームを開始できます。',
    phase: 'home',
  },
  {
    path: '#/resume/gate',
    title: 'レジュームゲート',
    heading: '続きから',
    subtitle: 'セーブデータを確認してから再開します。',
    phase: 'home',
  },
  {
    path: '#/standby',
    title: 'スタンバイ',
    heading: 'スタンバイ',
    subtitle: 'プレイヤー設定と配布準備の画面です。',
    phase: 'standby',
  },
  {
    path: '#/phase/scout',
    title: 'スカウト',
    heading: 'スカウトフェーズ',
    subtitle: '相手の手札から 1 枚引くフェーズは今後追加されます。',
    phase: 'scout',
  },
  {
    path: '#/phase/scout/gate',
    title: 'スカウトゲート',
    heading: 'スカウトゲート',
    subtitle: 'ハンドオフを完了するまで秘匿情報は表示されません。',
    phase: 'scout',
    gate: createHandOffGateConfig({
      resolveMessage: (state) => createPhaseGateMessage(state, 'スカウトフェーズ'),
    }),
  },
  {
    path: '#/phase/action',
    title: 'アクション',
    heading: 'アクションフェーズ',
    subtitle: '役者札と黒子札の選択 UI は今後実装されます。',
    phase: 'action',
  },
  {
    path: '#/phase/action/gate',
    title: 'アクションゲート',
    heading: 'アクションゲート',
    subtitle: 'ステージ情報の表示前に通過するゲートです。',
    phase: 'action',
    gate: createHandOffGateConfig({
      resolveMessage: (state) => createPhaseGateMessage(state, 'アクションフェーズ'),
    }),
  },
  {
    path: '#/phase/watch',
    title: 'ウォッチ',
    heading: 'ウォッチフェーズ',
    subtitle: 'クラップ／ブーイングの宣言 UI は今後実装されます。',
    phase: 'watch',
  },
  {
    path: '#/phase/watch/gate',
    title: 'ウォッチゲート',
    heading: 'ウォッチゲート',
    subtitle: 'ウォッチフェーズ開始前のゲート画面です。',
    phase: 'watch',
    gate: createHandOffGateConfig({
      resolveMessage: (state) => createPhaseGateMessage(state, 'ウォッチフェーズ'),
      onPass: (nextRouter) => {
        grantWatchSecretAccess();
        nextRouter.go('#/phase/watch');
      },
    }),
  },
  {
    path: '#/phase/spotlight',
    title: 'スポットライト',
    heading: 'スポットライトフェーズ',
    subtitle: '黒子公開とセット公開のロジックは今後実装されます。',
    phase: 'spotlight',
  },
  {
    path: '#/phase/spotlight/gate',
    title: 'スポットライトゲート',
    heading: 'スポットライトゲート',
    subtitle: '公開処理前の確認ゲートです。',
    phase: 'spotlight',
    gate: createHandOffGateConfig({
      resolveMessage: (state) => {
        const secretPairRequest = pendingSpotlightSecretPair;
        if (secretPairRequest) {
          const playerName = getPlayerDisplayName(state, secretPairRequest.playerId);
          return SPOTLIGHT_SECRET_PAIR_GATE_MESSAGE(playerName);
        }

        const setOpenRequest = pendingSpotlightSetOpen;
        if (setOpenRequest) {
          const playerName = getPlayerDisplayName(state, setOpenRequest.playerId);
          return SPOTLIGHT_SET_OPEN_GATE_MESSAGE(playerName);
        }
        return createPhaseGateMessage(state, 'スポットライトフェーズ');
      },
      onPass: (nextRouter) => handleSpotlightGatePass(nextRouter),
    }),
  },
  {
    path: BACKSTAGE_PHASE_PATH,
    title: BACKSTAGE_GATE_TITLE,
    heading: BACKSTAGE_GATE_TITLE,
    subtitle: BACKSTAGE_GATE_SUBTITLE,
    phase: 'backstage',
  },
  {
    path: BACKSTAGE_GATE_PATH,
    title: `${BACKSTAGE_GATE_TITLE}ゲート`,
    heading: BACKSTAGE_GATE_TITLE,
    subtitle: BACKSTAGE_GATE_SUBTITLE,
    phase: 'backstage',
    gate: createHandOffGateConfig({
      confirmLabel: BACKSTAGE_GATE_CONFIRM_LABEL,
      resolveMessage: () => BACKSTAGE_GATE_MESSAGE,
      resolveSubtitle: (state) => createBackstageGateSubtitle(state),
      resolveActions: ({ router }) => [
        {
          label: INTERMISSION_BACKSTAGE_ACTION_LABEL,
          preventRapid: true,
          onSelect: () => {
            const latestState = gameStore.getState();
            if (!shouldEnterBackstagePhase(latestState)) {
              showIntermissionBackstageGuard(INTERMISSION_BACKSTAGE_REVEAL_GUARD_MESSAGE);
              return;
            }

            router.go(BACKSTAGE_PHASE_PATH);
          },
        },
        {
          label: INTERMISSION_BOARD_CHECK_LABEL,
          variant: 'ghost',
          preventRapid: true,
          onSelect: () => showBoardCheck(),
        },
        {
          label: INTERMISSION_SUMMARY_LABEL,
          variant: 'ghost',
          preventRapid: true,
          onSelect: () => openIntermissionSummaryDialog(),
        },
      ],
      onPass: (nextRouter) => handleBackstageGatePass(nextRouter),
    }),
  },
  {
    path: '#/phase/intermission',
    title: INTERMISSION_GATE_TITLE,
    heading: INTERMISSION_GATE_TITLE,
    subtitle: '手番交代中です。ハンドオフゲートを通過してください。',
    phase: 'intermission',
  },
  {
    path: '#/phase/intermission/gate',
    title: `${INTERMISSION_GATE_TITLE}ゲート`,
    heading: INTERMISSION_GATE_TITLE,
    subtitle: '次のプレイヤーに端末を渡しましょう。',
    phase: 'intermission',
    gate: createHandOffGateConfig({
      confirmLabel: INTERMISSION_GATE_CONFIRM_LABEL,
      resolveMessage: (state) =>
        createPhaseGateMessage(state, 'インターミッション', INTERMISSION_GATE_CONFIRM_LABEL),
      resolveSubtitle: (state) => createIntermissionGateSubtitle(state),
      resolveModalNotes: (state) => {
        const notes = createIntermissionBackstageNotes(state);
        return notes.length > 0 ? notes : undefined;
      },
      resolveActions: () => {
        return [
          {
            label: INTERMISSION_BOARD_CHECK_LABEL,
            variant: 'ghost',
            onSelect: () => showBoardCheck(),
          },
          {
            label: INTERMISSION_SUMMARY_LABEL,
            variant: 'ghost',
            onSelect: () => openIntermissionSummaryDialog(),
          },
        ];
      },
      onPass: (nextRouter) => handleIntermissionGatePass(nextRouter),
    }),
  },
  {
    path: '#/phase/curtaincall',
    title: 'カーテンコール',
    heading: 'カーテンコール',
    subtitle: '最終結果を確認できます。',
    phase: 'curtaincall',
  },
  {
    path: '#/phase/curtaincall/gate',
    title: 'カーテンコール開始',
    heading: 'カーテンコール開始',
    subtitle: '結果を見る準備ができたらOKを押してください。',
    phase: 'curtaincall',
    gate: createHandOffGateConfig({
      confirmLabel: CURTAINCALL_GATE_CONFIRM_LABEL,
      message: CURTAINCALL_GATE_MESSAGE,
      modalTitle: CURTAINCALL_GATE_MODAL_TITLE,
    }),
  },
];

const phaseMap = new Map<string, PhaseKey>(ROUTES.map((route) => [route.path, route.phase]));

const inferPhaseFromPath = (path: string): PhaseKey => phaseMap.get(path) ?? 'home';

const buildRouteDefinitions = (router: Router): RouteDefinition[] =>
  ROUTES.map((route) => {
    let definition: RouteDefinition;

    if (route.gate) {
      definition = {
        path: route.path,
        title: route.title,
        render: ({ router: contextRouter }) => {
          const state = gameStore.getState();
          const confirmLabel = route.gate?.confirmLabel ?? DEFAULT_GATE_CONFIRM_LABEL;
          const resolvedMessage =
            route.gate?.resolveMessage?.(state) ??
            route.gate?.message ??
            createTurnGateMessage(state, confirmLabel);
          const resolvedSubtitle = route.gate?.resolveSubtitle?.(state) ?? route.subtitle;
          const resolvedActions = route.gate?.resolveActions?.({ state, router: contextRouter }) ?? [];
          const resolvedContent =
            route.gate?.resolveContent?.({ state, router: contextRouter }) ?? route.gate?.content ?? null;
          const baseNotes = route.gate?.modalNotes ?? [];
          const dynamicNotes = route.gate?.resolveModalNotes?.(state) ?? [];
          const combinedNotes = [...baseNotes, ...dynamicNotes].filter(
            (note): note is string => typeof note === 'string' && note.length > 0,
          );
          const resolvedModalNotes = combinedNotes.length > 0 ? Array.from(new Set(combinedNotes)) : undefined;

          return createGateView({
            title: route.heading,
            subtitle: resolvedSubtitle,
            message: resolvedMessage,
            confirmLabel: route.gate?.confirmLabel,
            hints: route.gate?.hints,
            modalNotes: resolvedModalNotes,
            modalTitle: route.gate?.modalTitle ?? route.title,
            preventRapid: route.gate?.preventRapid,
            lockDuration: route.gate?.lockDuration,
            actions: resolvedActions.map((action) => ({
              label: action.label,
              variant: action.variant,
              preventRapid: action.preventRapid,
              lockDuration: action.lockDuration,
              onSelect: () => action.onSelect?.({ router: contextRouter }),
            })),
            content: resolvedContent ?? undefined,
            onGatePass: () => {
              if (route.gate?.onPass) {
                route.gate.onPass(contextRouter);
                return;
              }
              if (route.gate?.nextPath === null) {
                return;
              }
              const derived = route.path.endsWith('/gate') ? route.path.slice(0, -5) : route.path;
              const target = route.gate?.nextPath ?? derived;
              if (target && target !== route.path) {
                contextRouter.go(target);
              }
            },
          });
        },
      };
    } else if (route.path === '#/') {
      definition = {
        path: route.path,
        title: route.title,
        render: () => {
          const resumeMeta = getSavedGameMetadata();
          const resumeDetails = resumeMeta
            ? {
                summary: createResumeSummary(resumeMeta.activePlayer, resumeMeta.phase),
                savedAt: (() => {
                  const formatted = formatResumeTimestamp(resumeMeta.savedAt);
                  return formatted ? `前回保存：${formatted}` : undefined;
                })(),
              }
            : undefined;

          return createHomeView({
            title: route.heading,
            subtitle: route.subtitle,
            start: {
              onSelect: () => router.go(HOME_START_PATH),
            },
            resume: {
              onSelect: () => router.go(HOME_RESUME_GATE_PATH),
              hidden: !resumeMeta,
              details: resumeDetails,
            },
            history: {
              onSelect: openHistoryDialog,
              preventRapid: true,
            },
            settings: {
              onSelect: openSettingsDialog,
            },
            help: {
              onSelect: openRulebookHelp,
            },
          });
        },
      };
    } else if (route.path === '#/resume/gate') {
      definition = {
        path: route.path,
        title: route.title,
        render: ({ router: contextRouter }) => {
          const metadata = getSavedGameMetadata();
          if (!metadata) {
            return createResumeGateEmptyView(() => contextRouter.go('#/'));
          }

          return createResumeGateView({
            metadata,
            onResume: () => openResumeGateModal(contextRouter),
            onHome: () => contextRouter.go('#/'),
            onDiscard: () => openResumeDiscardDialog(contextRouter),
          });
        },
      };
    } else if (route.path === '#/standby') {
      definition = {
        path: route.path,
        title: route.title,
        render: ({ router: contextRouter }) => {
          const state = gameStore.getState();
          const players = PLAYER_IDS.map((id) => {
            const playerState = state.players[id];
            return {
              id,
              label: PLAYER_LABELS[id] ?? id,
              role: PLAYER_ROLES[id],
              name: playerState?.name ?? '',
              placeholder: '名前を入力',
            };
          });

          return createStandbyView({
            title: route.heading,
            subtitle: route.subtitle,
            players,
            firstPlayer: state.firstPlayer,
            nextPhaseLabel: PHASE_LABELS.scout,
            seedLockEnabled: Boolean(state.meta.seed),
            seedValue: state.meta.seed ?? null,
            seedLockDefaultValue: STANDBY_SEED_LOCK_VALUE,
            onPlayerNameChange: (playerId, name) => {
              gameStore.setState((current) => {
                const target = current.players[playerId];
                if (!target || target.name === name) {
                  return current;
                }
                const timestamp = Date.now();
                return {
                  ...current,
                  players: {
                    ...current.players,
                    [playerId]: {
                      ...target,
                      name,
                    },
                  },
                  updatedAt: timestamp,
                  revision: current.revision + 1,
                };
              });
            },
            onFirstPlayerChange: (playerId) => {
              gameStore.setState((current) => {
                if (current.firstPlayer === playerId && current.activePlayer === playerId) {
                  return current;
                }
                const timestamp = Date.now();
                return {
                  ...current,
                  firstPlayer: playerId,
                  activePlayer: playerId,
                  updatedAt: timestamp,
                  revision: current.revision + 1,
                };
              });
            },
            onSeedLockChange: (locked) => {
              gameStore.setState((current) => {
                const nextSeed = locked ? STANDBY_SEED_LOCK_VALUE : undefined;
                if (current.meta.seed === nextSeed) {
                  return current;
                }
                const timestamp = Date.now();
                return {
                  ...current,
                  meta: {
                    ...current.meta,
                    seed: nextSeed,
                  },
                  updatedAt: timestamp,
                  revision: current.revision + 1,
                };
              });
            },
            onStart: () => handleStandbyGatePass(contextRouter),
            onReturnHome: () => contextRouter.go('#/'),
          });
        },
      };
    } else if (route.path === '#/phase/scout') {
      definition = {
        path: route.path,
        title: route.title,
        render: () => {
          const state = gameStore.getState();
          let hasTriggeredAutoAdvance = false;

          const triggerAutoAdvance = (): void => {
            if (hasTriggeredAutoAdvance || isScoutPickInProgress || isScoutResultDialogOpen) {
              return;
            }
            hasTriggeredAutoAdvance = true;
            gameStore.setState((current) => {
              if (current.lastScoutPlayer === current.activePlayer) {
                return current;
              }
              const timestamp = Date.now();
              return {
                ...current,
                lastScoutPlayer: current.activePlayer,
                updatedAt: timestamp,
                revision: current.revision + 1,
              };
            });
            if (typeof window !== 'undefined') {
              window.curtainCall?.modal?.close();
            }
            navigateToActionPhase();
          };

          if (shouldAutoAdvanceFromScout(state)) {
            triggerAutoAdvance();
            const placeholder = document.createElement('section');
            placeholder.className = 'view scout-view';
            return placeholder;
          }

          const updateSelectedOpponentCard = (cardId: string | null): void => {
            gameStore.setState((current) => {
              const opponentId = getOpponentId(current.activePlayer);
              const opponent = current.players[opponentId];
              const hasCard = opponent?.hand.cards.some((card) => card.id === cardId) ?? false;
              const normalizedId = hasCard ? cardId : null;
              if (current.scout.selectedOpponentCardId === normalizedId) {
                return current;
              }
              const timestamp = Date.now();
              return {
                ...current,
                scout: {
                  ...current.scout,
                  selectedOpponentCardId: normalizedId,
                },
                updatedAt: timestamp,
                revision: current.revision + 1,
              };
            });
          };

          const view = createScoutView({
            title: route.heading,
            cards: mapOpponentHandCards(state),
            selectedCardId: state.scout.selectedOpponentCardId,
            recentTakenCards: mapRecentTakenCards(state),
            boardCheckLabel: SCOUT_BOARD_CHECK_LABEL,
            myHandLabel: SCOUT_MY_HAND_LABEL,
            helpLabel: SCOUT_HELP_BUTTON_LABEL,
            helpAriaLabel: SCOUT_HELP_ARIA_LABEL,
            onSelectCard: updateSelectedOpponentCard,
            onClearSelection: () => updateSelectedOpponentCard(null),
            onConfirmSelection: () => openScoutPickConfirmDialog(),
            onOpenBoardCheck: () => showBoardCheck(),
            onOpenMyHand: () => openMyHandDialog(),
            onOpenHelp: () => openRulebookHelp(),
          });

          const unsubscribe = gameStore.subscribe((nextState) => {
            if (shouldAutoAdvanceFromScout(nextState)) {
              triggerAutoAdvance();
              return;
            }
            view.updateOpponentHand(
              mapOpponentHandCards(nextState),
              nextState.scout.selectedOpponentCardId,
            );
            view.updateRecentTaken(mapRecentTakenCards(nextState));
          });

          activeScoutCleanup = () => {
            unsubscribe();
            clearScoutSecretState();
          };

          return view;
        },
      };
    } else if (route.path === '#/phase/action') {
      definition = {
        path: route.path,
        title: route.title,
        render: () => {
          const state = gameStore.getState();
          const view = createActionView({
            title: route.heading,
            handCards: mapActionHandCards(state),
            selectedCardId: state.action.selectedCardId,
            actorCardId: state.action.actorCardId,
            kurokoCardId: state.action.kurokoCardId,
            boardCheckLabel: ACTION_BOARD_CHECK_LABEL,
            confirmLabel: ACTION_CONFIRM_BUTTON_LABEL,
            confirmDisabled: !canConfirmActionPlacement(state),
            onSelectHandCard: (cardId) => {
              const current = gameStore.getState();
              if (current.action.actorCardId === cardId) {
                toggleActionActorCard(cardId);
                return;
              }
              if (current.action.kurokoCardId === cardId) {
                toggleActionKurokoCard(cardId);
                return;
              }
              if (current.action.actorCardId === null) {
                toggleActionActorCard(cardId);
                return;
              }
              toggleActionKurokoCard(cardId);
            },
            onOpenBoardCheck: () => showBoardCheck(),
            onConfirm: () => openActionConfirmDialog(),
          });

          notifyActionGuardStatus(state);

          const unsubscribe = gameStore.subscribe((nextState) => {
            view.updateHand(mapActionHandCards(nextState), mapActionHandSelection(nextState));
            view.setConfirmDisabled(!canConfirmActionPlacement(nextState));
            notifyActionGuardStatus(nextState);
          });

          activeActionCleanup = () => {
            unsubscribe();
          };

          return view;
        },
      };
    } else if (route.path === '#/phase/watch') {
      definition = {
        path: route.path,
        title: route.title,
        render: ({ router: contextRouter }) => {
          const state = gameStore.getState();
          const nextRoute = state.watch?.nextRoute;

          if (nextRoute && nextRoute !== route.path) {
            if (contextRouter) {
              contextRouter.go(nextRoute);
            } else {
              navigateFromWatchTo(nextRoute);
            }

            return createPlaceholderView({
              title: route.heading,
              subtitle: WATCH_REDIRECTING_SUBTITLE,
            });
          }

          if (!hasWatchSecretAccess()) {
            if (contextRouter) {
              contextRouter.go(ACTION_TO_WATCH_PATH);
            } else {
              navigateToWatchGate();
            }

            return createPlaceholderView({
              title: route.heading,
              subtitle: WATCH_GUARD_REDIRECTING_SUBTITLE,
            });
          }

          const view = createWatchView({
            title: route.heading,
            status: mapWatchStatus(state),
            stage: mapWatchStage(state),
            boardCheckLabel: WATCH_BOARD_CHECK_LABEL,
            myHandLabel: WATCH_MY_HAND_LABEL,
            helpLabel: WATCH_HELP_BUTTON_LABEL,
            helpAriaLabel: WATCH_HELP_ARIA_LABEL,
            clapLabel: WATCH_CLAP_BUTTON_LABEL,
            booLabel: WATCH_BOO_BUTTON_LABEL,
            onClap: () => requestWatchDeclaration('clap'),
            onBoo: () => requestWatchDeclaration('boo'),
            onOpenBoardCheck: () => showBoardCheck(),
            onOpenMyHand: () => openMyHandDialog(),
            onOpenHelp: () => openRulebookHelp(),
          });

          const unsubscribe = gameStore.subscribe((nextState) => {
            view.updateStatus(mapWatchStatus(nextState));
            view.updateStage(mapWatchStage(nextState));
          });

          activeWatchCleanup = () => {
            unsubscribe();
          };

          return view;
        },
      };
    } else if (route.path === '#/phase/spotlight') {
      definition = {
        path: route.path,
        title: route.title,
        render: ({ router: contextRouter }) => {
          const state = gameStore.getState();
          if (
            (pendingSpotlightSecretPair || pendingSpotlightSetOpen) &&
            !hasSpotlightSecretAccess()
          ) {
            const subtitle = pendingSpotlightSecretPair
              ? SPOTLIGHT_SECRET_GUARD_REDIRECTING_SUBTITLE
              : SPOTLIGHT_SET_OPEN_GUARD_REDIRECTING_SUBTITLE;
            if (contextRouter) {
              contextRouter.go(SPOTLIGHT_GATE_PATH);
            } else {
              navigateToSpotlightGate();
            }

            return createPlaceholderView({
              title: route.heading,
              subtitle,
            });
          }
          const view = createSpotlightView({
            title: route.heading,
            stage: mapSpotlightStage(state),
            boardCheckLabel: SPOTLIGHT_BOARD_CHECK_LABEL,
            helpLabel: SPOTLIGHT_HELP_BUTTON_LABEL,
            helpAriaLabel: SPOTLIGHT_HELP_ARIA_LABEL,
            revealLabel: SPOTLIGHT_REVEAL_BUTTON_LABEL,
            revealDisabled: !canRevealSpotlightKuroko(state),
            revealCaption: mapSpotlightRevealCaption(state) ?? undefined,
            onReveal: () => openSpotlightRevealConfirmDialog(),
            onOpenBoardCheck: () => showBoardCheck(),
            onOpenHelp: () => openRulebookHelp(),
          });

          const unsubscribe = gameStore.subscribe((nextState) => {
            view.updateStage(mapSpotlightStage(nextState));
            view.setRevealDisabled(!canRevealSpotlightKuroko(nextState));
            view.updateRevealCaption(mapSpotlightRevealCaption(nextState));
          });

          activeSpotlightCleanup = () => {
            unsubscribe();
            revokeSpotlightSecretAccess();
            isSpotlightSecretPairInProgress = false;
            isSpotlightExitInProgress = false;
          };

          return view;
        },
      };
    } else if (route.path === '#/phase/intermission') {
      definition = {
        path: route.path,
        title: route.title,
        render: ({ router: contextRouter }) => {
          const state = gameStore.getState();

          if (shouldEnterBackstagePhase(state)) {
            if (contextRouter) {
              contextRouter.go(BACKSTAGE_GATE_PATH);
            } else {
              navigateToBackstageGate();
            }

            return createPlaceholderView({
              title: route.heading,
              subtitle: INTERMISSION_BACKSTAGE_PENDING_MESSAGE,
            });
          }

          const view = createIntermissionView({
            title: route.heading,
            subtitle: createIntermissionGateSubtitle(state),
            message: createTurnGateMessage(state, INTERMISSION_GATE_CONFIRM_LABEL),
            tasks: createIntermissionTasks(state),
            summaryTitle: INTERMISSION_VIEW_SUMMARY_TITLE,
            summaryContent: createIntermissionSummaryView(state),
            notesTitle: INTERMISSION_VIEW_NOTES_TITLE,
            notes: createIntermissionBackstageNotes(state),
            boardCheckLabel: INTERMISSION_BOARD_CHECK_LABEL,
            summaryLabel: INTERMISSION_SUMMARY_LABEL,
            resumeLabel: INTERMISSION_VIEW_RESUME_LABEL,
            resumeTitle: INTERMISSION_VIEW_RESUME_TITLE,
            resumeCaption: INTERMISSION_VIEW_RESUME_CAPTION,
            resumeInfo: mapIntermissionResumeInfo(),
            gateLabel: INTERMISSION_VIEW_GATE_LABEL,
            onOpenBoardCheck: () => showBoardCheck(),
            onOpenSummary: () => openIntermissionSummaryDialog(),
            onOpenResume: () => contextRouter.go('#/resume/gate'),
            onOpenGate: () => contextRouter.go('#/phase/intermission/gate'),
          });

          view.setGateDisabled(shouldEnterBackstagePhase(state));

          const unsubscribe = gameStore.subscribe((nextState) => {
            if (shouldEnterBackstagePhase(nextState)) {
              view.setGateDisabled(true);
              navigateToBackstageGate();
              return;
            }

            view.updateSubtitle(createIntermissionGateSubtitle(nextState));
            view.updateMessage(
              createTurnGateMessage(nextState, INTERMISSION_GATE_CONFIRM_LABEL),
            );
            view.updateTasks(createIntermissionTasks(nextState));
            view.updateSummary(createIntermissionSummaryView(nextState));
            view.updateNotes(createIntermissionBackstageNotes(nextState));
            view.setResumeInfo(mapIntermissionResumeInfo());
          });

          activeIntermissionCleanup = () => {
            unsubscribe();
          };

          return view;
        },
      };
    } else if (route.path === BACKSTAGE_PHASE_PATH) {
      definition = {
        path: route.path,
        title: route.title,
        render: ({ router: contextRouter }) => {
          const state = gameStore.getState();

          if (!shouldEnterBackstagePhase(state)) {
            handleBackstageGatePass(contextRouter);
            return createPlaceholderView({
              title: route.heading,
              subtitle: BACKSTAGE_GATE_SUBTITLE,
            });
          }

          const view = createBackstageView({
            title: route.heading,
            subtitle: createBackstageGateSubtitle(state),
            content: mapBackstageViewContent(state),
            notes: createIntermissionBackstageNotes(state),
            confirmLabel: INTERMISSION_BACKSTAGE_DECIDE_LABEL,
            skipLabel: INTERMISSION_BACKSTAGE_SKIP_LABEL,
            revealLabel: INTERMISSION_BACKSTAGE_REVEAL_LABEL,
            boardCheckLabel: INTERMISSION_BOARD_CHECK_LABEL,
            summaryLabel: INTERMISSION_SUMMARY_LABEL,
            myHandLabel: INTERMISSION_MY_HAND_LABEL,
            onConfirmSelection: (itemIds) => startBackstageRevealFlow(itemIds),
            onSkip: () => completeBackstageSkip(),
            onOpenBoardCheck: () => showBoardCheck(),
            onOpenSummary: () => openIntermissionSummaryDialog(),
            onOpenMyHand: () => openMyHandDialog(),
          });

          const unsubscribe = gameStore.subscribe((nextState) => {
            if (!shouldEnterBackstagePhase(nextState)) {
              handleBackstageGatePass(contextRouter);
              return;
            }
            view.updateSubtitle(createBackstageGateSubtitle(nextState));
            view.updateContent(mapBackstageViewContent(nextState));
            view.updateNotes(createIntermissionBackstageNotes(nextState));
          });

          activeBackstageCleanup = () => {
            unsubscribe();
          };

          return view;
        },
      };
    } else if (route.path === '#/phase/curtaincall') {
      definition = {
        path: route.path,
        title: route.title,
        render: ({ router: contextRouter }) => {
          const state = gameStore.getState();
          const summary = state.curtainCall;

          if (!summary) {
            return createPlaceholderView({
              title: route.heading,
              subtitle: CURTAINCALL_SUMMARY_PREPARING_SUBTITLE,
            });
          }

          const view = createCurtainCallView({
            title: route.heading,
            result: mapCurtainCallResult(state),
            players: mapCurtainCallPlayers(state),
            boardCheckLabel: CURTAINCALL_BOARD_CHECK_LABEL,
            homeLabel: CURTAINCALL_HOME_BUTTON_LABEL,
            newGameLabel: CURTAINCALL_NEW_GAME_BUTTON_LABEL,
            saveLabel: CURTAINCALL_SAVE_BUTTON_LABEL,
            saveDisabled: Boolean(state.curtainCall?.savedHistoryEntryId),
            onOpenBoardCheck: () => showBoardCheck(),
            onGoHome: () => handleCurtainCallGoHome(contextRouter),
            onStartNewGame: () => handleCurtainCallStartNewGame(contextRouter),
            onSaveResult: () => handleCurtainCallSaveRequest(),
          });

          const unsubscribe = gameStore.subscribe((nextState) => {
            if (!nextState.curtainCall) {
              return;
            }
            view.updateResult(mapCurtainCallResult(nextState));
            view.updatePlayers(mapCurtainCallPlayers(nextState));
            view.setSaveDisabled(Boolean(nextState.curtainCall?.savedHistoryEntryId));
          });

          activeCurtainCallCleanup = () => {
            unsubscribe();
          };

          return view;
        },
      };
    } else {
      definition = {
        path: route.path,
        title: route.title,
        render: () =>
          createPlaceholderView({
            title: route.heading,
            subtitle: route.subtitle,
          }),
      };
    }

    return {
      ...definition,
      render: withRouteCleanup(definition.render),
    };
  });

const initializeApp = (): void => {
  const root = document.querySelector<HTMLElement>('#app');
  const modalRoot = document.querySelector<HTMLElement>('#modal-root');
  const toastRoot = document.querySelector<HTMLElement>('#toast-root');

  if (!root || !modalRoot || !toastRoot) {
    throw new Error('アプリケーションの初期化に必要な要素が見つかりません。');
  }

  const router = new Router(root, { fallback: '#/' });
  const modal = new ModalController(modalRoot);
  setGateModalController(modal);
  const toast = new ToastManager(toastRoot);

  let navigationBlockToastId: number | null = null;

  const notifyNavigationBlocked = (): void => {
    if (modal.opened) {
      if (navigationBlockToastId !== null) {
        toast.dismiss(navigationBlockToastId);
      }
      navigationBlockToastId = toast.show({
        message: NAVIGATION_BLOCK_MESSAGE,
        variant: 'warning',
      });
      return;
    }

    if (navigationBlockToastId !== null) {
      toast.dismiss(navigationBlockToastId);
      navigationBlockToastId = null;
    }

    modal.open({
      title: NAVIGATION_BLOCK_TITLE,
      body: NAVIGATION_BLOCK_MESSAGE,
      dismissible: false,
      actions: [
        {
          label: NAVIGATION_BLOCK_CONFIRM_LABEL,
          variant: 'primary',
          preventRapid: true,
        },
      ],
    });
  };

  router.setNavigationGuard(() => {
    const state = gameStore.getState();
    if (!NAVIGATION_BLOCKED_PHASES.has(state.phase)) {
      return true;
    }

    notifyNavigationBlocked();
    return false;
  });

  window.curtainCall = { router, modal, toast, animation: animationManager };

  buildRouteDefinitions(router).forEach((definition) => router.register(definition));

  const initialState: GameState = (() => {
    try {
      const payload = loadGame({
        allowUnsafe: true,
        currentPath: typeof window !== 'undefined' ? window.location.hash ?? null : null,
      });
      if (payload?.state) {
        return payload.state;
      }
    } catch (error) {
      console.warn('セーブデータの復元に失敗したため、新しいゲームを開始します。', error);
    }
    return createInitialState();
  })();

  gameStore.setState(initialState);

  router.subscribe((path) => {
    const current = gameStore.getState();

    const isSpotlightRoute = path === WATCH_TO_SPOTLIGHT_PATH;
    const isSpotlightGateRoute = path === SPOTLIGHT_GATE_PATH;

    if (!isSpotlightRoute && !isSpotlightGateRoute) {
      if (pendingSpotlightSecretPair || pendingSpotlightSetOpen || hasSpotlightSecretAccess()) {
        resetPendingSpotlightSecrets();
      }
    } else if (
      isSpotlightRoute &&
      current.route === SPOTLIGHT_GATE_PATH &&
      !hasSpotlightSecretAccess()
    ) {
      if (pendingSpotlightSecretPair || pendingSpotlightSetOpen) {
        resetPendingSpotlightSecrets();
      }
    }

    if (current.route === path) {
      return;
    }
    const phase = inferPhaseFromPath(path);
    const timestamp = Date.now();
    const patch: Partial<GameState> = {
      route: path,
      phase,
      revision: current.revision + 1,
      updatedAt: timestamp,
      resume: {
        at: timestamp,
        phase,
        player: current.activePlayer,
        route: path,
      },
    };

    if (phase === 'watch') {
      patch.remainingWatchIncludingCurrent = calculateRemainingWatchCounts(current, { phase });
    }

    gameStore.patch(patch);
  });

  gameStore.subscribe((state) => {
    saveGame(state);
  });

  router.start();
};

initializeApp();
