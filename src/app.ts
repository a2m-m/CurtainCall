import { Router, RouteDefinition } from './router.js';
import type { RouteContext } from './router.js';
import { createSeededRandom, dealInitialSetup, sortCardsByDescendingValue } from './cards.js';
import type { InitialDealResult } from './cards.js';
import {
  deleteResultHistoryEntry,
  getLatestSaveMetadata,
  getResultHistory,
  ResultHistoryEntry,
  saveLatestGame,
} from './storage.js';
import { createInitialState, createInitialWatchState, gameStore, PLAYER_IDS } from './state.js';
import type {
  CardSnapshot,
  GameState,
  PhaseKey,
  PlayerId,
  PlayerState,
  SetCardState,
  SetReveal,
  StageArea,
  StageCardPlacement,
  StagePair,
  StageJudgeResult,
  WatchDecision,
} from './state.js';
import { ModalController } from './ui/modal.js';
import { ToastManager } from './ui/toast.js';
import { CardComponent } from './ui/card.js';
import { showBoardCheck } from './ui/board-check.js';
import { createGateView } from './views/gate.js';
import { createHomeView } from './views/home.js';
import { createPlaceholderView } from './views/placeholder.js';
import {
  ActionHandCardViewModel,
  ActionHandSelectionState,
  createActionView,
} from './views/action.js';
import { createWatchView, WatchStageViewModel, WatchStatusViewModel } from './views/watch.js';
import { createSpotlightView, SpotlightStageViewModel } from './views/spotlight.js';
import { createScoutView } from './views/scout.js';
import type {
  ScoutOpponentHandCardViewModel,
  ScoutRecentTakenCardViewModel,
} from './views/scout.js';
import { createStandbyView } from './views/standby.js';

interface GateDescriptor {
  message?: string | HTMLElement;
  resolveMessage?: (state: GameState) => string | HTMLElement;
  confirmLabel?: string;
  hints?: string[];
  modalNotes?: string[];
  modalTitle?: string;
  preventRapid?: boolean;
  lockDuration?: number;
  nextPath?: string | null;
  onPass?: (router: Router) => void;
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
    };
  }
}

const HANDOFF_GATE_HINTS = Object.freeze([
  '端末を次のプレイヤーに渡したら「準備完了」を押してください。',
  'ゲートを通過した後に秘匿情報が画面へ描画されます。',
]);

const HANDOFF_GATE_MODAL_NOTES = Object.freeze(['ゲート通過前は秘匿情報を DOM に出力しません。']);

const createHandOffGateConfig = (overrides: Partial<GateDescriptor> = {}): GateDescriptor => ({
  hints: [...HANDOFF_GATE_HINTS],
  modalNotes: [...HANDOFF_GATE_MODAL_NOTES],
  ...overrides,
});

const STANDBY_DEAL_ERROR_MESSAGE = 'スタンバイの初期化に失敗しました。もう一度お試しください。';
const STANDBY_FIRST_PLAYER_ERROR_MESSAGE = '先手が未決定です。スタンバイに戻ります。';
const STANDBY_SEED_LOCK_VALUE = 'dev-fixed-0001';

const CARD_SUIT_LABEL: Record<CardSnapshot['suit'], string> = {
  spades: 'スペード',
  hearts: 'ハート',
  diamonds: 'ダイヤ',
  clubs: 'クラブ',
  joker: 'ジョーカー',
};

const SCOUT_PICK_CONFIRM_TITLE = 'カードを引く';
const SCOUT_PICK_CONFIRM_MESSAGE = 'このカードを引いて手札に加えます。元に戻せません。';
const SCOUT_PICK_CONFIRM_OK_LABEL = 'OK';
const SCOUT_PICK_CONFIRM_CANCEL_LABEL = 'キャンセル';

const SCOUT_TO_ACTION_PATH = '#/phase/action';
const SCOUT_BOARD_CHECK_LABEL = 'ボードチェック';
const MY_HAND_LABEL = '自分の手札';
const MY_HAND_MODAL_TITLE = '自分の手札';
const MY_HAND_SECTION_TITLE = '現在の手札';
const MY_HAND_EMPTY_MESSAGE = '手札はありません。';
const MY_HAND_RECENT_EMPTY_MESSAGE = 'なし';
const MY_HAND_RECENT_BADGE_LABEL = '直前に引いたカード';

const SCOUT_MY_HAND_LABEL = MY_HAND_LABEL;
const SCOUT_RECENT_TAKEN_HISTORY_LIMIT = 5;
const SCOUT_HELP_BUTTON_LABEL = '？';
const SCOUT_HELP_ARIA_LABEL = 'ヘルプ';

const ACTION_CONFIRM_BUTTON_LABEL = '配置を確定';
const ACTION_BOARD_CHECK_LABEL = 'ボードチェック';
const ACTION_CONFIRM_MODAL_TITLE = '配置を確定';
const ACTION_CONFIRM_MODAL_MESSAGE =
  '以下のカードをステージに配置します。確定すると元に戻せません。';
const ACTION_CONFIRM_MODAL_OK_LABEL = 'OK';
const ACTION_CONFIRM_MODAL_CANCEL_LABEL = 'キャンセル';
const ACTION_GUARD_SELECTION_MESSAGE = '役者と黒子をそれぞれ選択してください。';
const ACTION_GUARD_INSUFFICIENT_HAND_MESSAGE =
  '手札が2枚未満のため、ステージに配置を確定できません。';
const ACTION_RESULT_TITLE = 'アクション完了';
const ACTION_RESULT_OK_LABEL = 'ウォッチへ';
const ACTION_TO_WATCH_PATH = '#/phase/watch/gate';

const WATCH_BOARD_CHECK_LABEL = 'ボードチェック';
const WATCH_MY_HAND_LABEL = MY_HAND_LABEL;
const WATCH_HELP_BUTTON_LABEL = '？';
const WATCH_HELP_ARIA_LABEL = 'ヘルプ';
const WATCH_CLAP_BUTTON_LABEL = 'クラップ（同数）';
const WATCH_BOO_BUTTON_LABEL = 'ブーイング（異なる）';
const WATCH_ACTOR_LABEL = '役者（表）';
const WATCH_KUROKO_LABEL = '黒子（裏）';
const WATCH_REQUIRED_BOO_COUNT = 3;
const WATCH_REMAINING_PLACEHOLDER = '—';
const WATCH_WARNING_BADGE_LABEL = 'ブーイング不足注意';
const WATCH_CLAP_WARNING_MESSAGE = '残り機会的にブーイングが必要です';
const WATCH_STAGE_EMPTY_MESSAGE = 'ステージにカードが配置されていません。';
const WATCH_KUROKO_DEFAULT_DESCRIPTION = '黒子のカードはまだ公開されていません。';
const WATCH_TO_INTERMISSION_PATH = '#/phase/intermission/gate';
const WATCH_TO_SPOTLIGHT_PATH = '#/phase/spotlight/gate';
const SPOTLIGHT_TO_CURTAINCALL_PATH = '#/phase/curtaincall/gate';
const WATCH_DECISION_CONFIRM_TITLES = Object.freeze({
  clap: 'クラップの宣言',
  boo: 'ブーイングの宣言',
} as const);
const WATCH_DECISION_CONFIRM_MESSAGES = Object.freeze({
  clap: 'クラップを宣言します。確定すると元に戻せません。',
  boo: 'ブーイングを宣言します。確定すると元に戻せません。',
} as const);
const WATCH_DECISION_CONFIRM_OK_LABEL = 'OK';
const WATCH_DECISION_CONFIRM_CANCEL_LABEL = 'キャンセル';
const WATCH_RESULT_TITLES = Object.freeze({
  clap: 'クラップ！',
  boo: 'ブーイング！',
} as const);
const WATCH_RESULT_MESSAGES = Object.freeze({
  clap: 'クラップを宣言しました。インターミッションへ進みます。',
  boo: 'ブーイングを宣言しました。スポットライトへ進みます。',
} as const);
const WATCH_RESULT_OK_LABELS = Object.freeze({
  clap: 'インターミッションへ',
  boo: 'スポットライトへ',
} as const);
const WATCH_REDIRECTING_SUBTITLE = '宣言結果に応じた画面へ移動しています…';
const WATCH_GUARD_REDIRECTING_SUBTITLE =
  '秘匿情報を再表示するにはウォッチゲートを通過してください。';

const SPOTLIGHT_BOARD_CHECK_LABEL = 'ボードチェック';
const SPOTLIGHT_HELP_BUTTON_LABEL = '？';
const SPOTLIGHT_HELP_ARIA_LABEL = 'ヘルプ';
const SPOTLIGHT_STAGE_EMPTY_MESSAGE = WATCH_STAGE_EMPTY_MESSAGE;
const SPOTLIGHT_KUROKO_HIDDEN_DESCRIPTION = WATCH_KUROKO_DEFAULT_DESCRIPTION;
const SPOTLIGHT_REVEAL_BUTTON_LABEL = '黒子を公開する';
const SPOTLIGHT_REVEAL_CAPTION = '黒子を公開すると判定が確定します。元に戻せません。';
const SPOTLIGHT_REVEAL_COMPLETED_CAPTION = '黒子は既に公開済みです。';
const SPOTLIGHT_REVEAL_UNAVAILABLE_CAPTION = '公開できる黒子がありません。';
const SPOTLIGHT_REVEAL_CONFIRM_TITLE = '黒子を公開';
const SPOTLIGHT_REVEAL_CONFIRM_MESSAGE = '黒子のカードを公開します。公開後は取り消せません。';
const SPOTLIGHT_REVEAL_CONFIRM_OK_LABEL = 'OK';
const SPOTLIGHT_REVEAL_CONFIRM_CANCEL_LABEL = 'キャンセル';
const SPOTLIGHT_RESULT_TITLE = '判定結果';
const SPOTLIGHT_RESULT_MATCH_PREFIX = '一致！';
const SPOTLIGHT_RESULT_MISMATCH_PREFIX = '不一致！';
const SPOTLIGHT_RESULT_MATCH_MESSAGE = (playerName: string): string =>
  `${playerName}がセットをオープンできます。`;
const SPOTLIGHT_RESULT_MISMATCH_MESSAGE = (playerName: string): string =>
  `${playerName}がセットをオープンできます。`;
const SPOTLIGHT_RESULT_SKIP_LABEL = '今回はスキップ';
const SPOTLIGHT_SET_OPEN_BUTTON_LABEL = 'セットをオープンする';
const SPOTLIGHT_SET_PICKER_TITLE = 'セットをオープン';
const SPOTLIGHT_SET_PICKER_MESSAGE = 'セットから公開するカードを選択してください。';
const SPOTLIGHT_SET_PICKER_EMPTY_MESSAGE = '公開できるセットのカードは残っていません。';
const SPOTLIGHT_SET_PICKER_CANCEL_LABEL = 'キャンセル';
const SPOTLIGHT_SET_CARD_LABEL_PREFIX = 'カード';
const SPOTLIGHT_SET_CONFIRM_TITLE = 'セットをオープン';
const SPOTLIGHT_SET_CONFIRM_MESSAGE = '公開後は取り消せません。';
const SPOTLIGHT_SET_CONFIRM_OK_LABEL = '公開する';
const SPOTLIGHT_SET_CONFIRM_CANCEL_LABEL = '戻る';
const SPOTLIGHT_SET_RESULT_MESSAGE = (playerName: string, cardLabel: string): string =>
  `${playerName}が${cardLabel}をオープンしました。`;
const SPOTLIGHT_SET_OPEN_GUARD_MESSAGE = 'セットを公開できる状態ではありません。';
const SPOTLIGHT_JOKER_BONUS_TITLE = 'JOKERボーナス';
const SPOTLIGHT_JOKER_BONUS_MESSAGE = (playerName: string): string =>
  `${playerName}のターンです。JOKER！追加でもう1枚オープンして、自動でペアを作ります。`;
const SPOTLIGHT_JOKER_BONUS_MULTI_PROMPT = '追加で公開するカードを選択してください。';
const SPOTLIGHT_JOKER_BONUS_SINGLE_MESSAGE =
  '残りのカードは1枚です。このカードを公開して自動でペアを作ります。';
const SPOTLIGHT_JOKER_BONUS_SINGLE_ACTION_LABEL = '公開する';
const SPOTLIGHT_JOKER_BONUS_EMPTY_MESSAGE =
  '追加で公開できるカードがありません。カーテンコールへ進みます。';
const SPOTLIGHT_JOKER_BONUS_EMPTY_ACTION_LABEL = 'カーテンコールへ';
const SPOTLIGHT_JOKER_BONUS_RESULT_MESSAGE = (playerName: string, cardLabel: string): string =>
  `JOKERボーナス：${playerName}が${cardLabel}とジョーカーでペアを作りました。`;
const SPOTLIGHT_JOKER_BONUS_EMPTY_RESULT_MESSAGE = (playerName: string): string =>
  `JOKERボーナス：${playerName}は追加で公開できるカードがなく、自動ペアは成立しません。`;

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

let lastActionGuardMessage: string | null = null;

const formatCardLabel = (card: CardSnapshot): string => {
  if (card.suit === 'joker') {
    return CARD_SUIT_LABEL[card.suit];
  }
  return `${CARD_SUIT_LABEL[card.suit]}の${card.rank}`;
};

const formatSetCardPositionLabel = (setCard: SetCardState): string =>
  `${SPOTLIGHT_SET_CARD_LABEL_PREFIX} #${String(setCard.position + 1).padStart(2, '0')}`;

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

const HOME_SETTINGS_TITLE = '設定';
const HOME_SETTINGS_MESSAGE = '設定メニューは現在準備中です。';

const PLAYER_LABELS: Record<PlayerId, string> = {
  lumina: 'ルミナ',
  nox: 'ノクス',
};

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

const DEFAULT_GATE_CONFIRM_LABEL = '準備完了';

const getOpponentId = (player: PlayerId): PlayerId => (player === 'lumina' ? 'nox' : 'lumina');

const getTurnPlayerNames = (state: GameState): { activeName: string; opponentName: string } => {
  const activeName = getPlayerDisplayName(state, state.activePlayer);
  const opponentName = getPlayerDisplayName(state, getOpponentId(state.activePlayer));
  return { activeName, opponentName };
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
  intermission: 'インターミッション',
  curtaincall: 'カーテンコール',
};

const HISTORY_DIALOG_TITLE = 'リザルト履歴';
const HISTORY_DIALOG_DESCRIPTION =
  '保存済みのリザルトを確認できます。コピーや削除が可能です（最大50件まで保持されます）。';
const HISTORY_EMPTY_MESSAGE = '保存されたリザルト履歴はまだありません。';
const HISTORY_COPY_SUCCESS = '履歴をコピーしました。';
const HISTORY_COPY_FAILURE = '履歴をコピーできませんでした。';
const HISTORY_DELETE_SUCCESS = '履歴を削除しました。';
const HISTORY_DELETE_FAILURE = '履歴の削除に失敗しました。';

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
        label: '閉じる',
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
        message: 'ヘルプを開けませんでした。ブラウザのポップアップ設定をご確認ください。',
        variant: 'warning',
      });
    } else {
      console.warn('ヘルプ画面を開けませんでした。ポップアップブロックを解除してください。');
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

  const handCount = document.createElement('p');
  handCount.className = 'myhand__count';
  handCount.textContent = `${player.hand.cards.length}枚`;
  handSection.append(handCount);

  if (player.hand.cards.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'myhand__empty';
    empty.textContent = MY_HAND_EMPTY_MESSAGE;
    handSection.append(empty);
  } else {
    const handList = document.createElement('ul');
    handList.className = 'myhand__hand-list';
    handList.setAttribute('aria-label', `${playerName}の${MY_HAND_SECTION_TITLE}`);

    player.hand.cards.forEach((card) => {
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
        label: '閉じる',
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

  let entries = getResultHistory();

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
        timestamp.textContent = '日時不明';
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
      copyButton.textContent = 'コピー';
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
      deleteButton.textContent = '削除';
      deleteButton.addEventListener('click', () => {
        const removed = deleteResultHistoryEntry(entry.id);
        if (!removed) {
          toast?.show({ message: HISTORY_DELETE_FAILURE, variant: 'warning' });
          return;
        }
        entries = getResultHistory();
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
        label: '閉じる',
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

const SCOUT_PICK_RESULT_TITLE = 'カードを取得しました';
const SCOUT_PICK_RESULT_OK_LABEL = 'OK';

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
  message.textContent = `${formatCardLabel(card)}を引きました！`;
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
  previewCaption.textContent = '引いたカードは以下の通りです。';
  preview.append(previewCaption);

  container.append(preview);

  const actionNotice = document.createElement('p');
  actionNotice.className = 'scout-complete__caption';
  actionNotice.textContent = `${playerName}は${opponentName}に画面が見えないことを確認し、「${SCOUT_PICK_RESULT_OK_LABEL}」を押してアクションフェーズへ進みましょう。`;
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
    const selectedIndex = current.scout.selectedOpponentCardIndex;
    if (selectedIndex === null) {
      return current;
    }

    const activePlayerId = current.activePlayer;
    const opponentId = getOpponentId(activePlayerId);
    const activePlayer = current.players[activePlayerId];
    const opponent = current.players[opponentId];

    if (!activePlayer || !opponent) {
      return current;
    }

    if (selectedIndex < 0 || selectedIndex >= opponent.hand.cards.length) {
      return current;
    }

    const sourceCard = opponent.hand.cards[selectedIndex];
    if (!sourceCard) {
      return current;
    }

    const timestamp = Date.now();
    const transferredCard = cloneCardSnapshot(sourceCard);
    const recentCard = cloneCardSnapshot(sourceCard);
    const takenHistoryCard = cloneCardSnapshot(sourceCard);

    const nextOpponentCards = opponent.hand.cards.filter((_card, index) => index !== selectedIndex);
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
        selectedOpponentCardIndex: null,
      },
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
  if (state.scout.selectedOpponentCardIndex === null) {
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

const mapOpponentHandCards = (state: GameState): ScoutOpponentHandCardViewModel[] => {
  const opponentId = getOpponentId(state.activePlayer);
  const opponent = state.players[opponentId];
  if (!opponent) {
    return [];
  }
  return opponent.hand.cards.map((card) => ({ id: card.id }));
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
  return player.hand.cards.map((card) => ({
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

const findLatestCompleteStagePair = (stage: StageArea | undefined): StagePair | null => {
  if (!stage) {
    return null;
  }

  for (let index = stage.pairs.length - 1; index >= 0; index -= 1) {
    const pair = stage.pairs[index];
    if (pair?.actor && pair.kuroko) {
      return pair;
    }
  }

  return null;
};

const findLatestWatchStagePair = (state: GameState): StagePair | null => {
  const opponentId = getOpponentId(state.activePlayer);
  const opponent = state.players[opponentId];
  const opponentPair = findLatestCompleteStagePair(opponent?.stage);

  if (opponentPair) {
    return opponentPair;
  }

  const activePlayer = state.players[state.activePlayer];
  return findLatestCompleteStagePair(activePlayer?.stage);
};

const mapWatchStage = (state: GameState): WatchStageViewModel => {
  const latestPair = findLatestWatchStagePair(state);
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
  const activePair = findLatestCompleteStagePair(activePlayer?.stage);

  if (activePair) {
    return activePair;
  }

  const opponentId = getOpponentId(state.activePlayer);
  const opponent = state.players[opponentId];
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

    return {
      ...current,
      set: {
        cards: current.set.cards.map((entry) =>
          entry.id === targetSetCard.id ? { ...entry, card } : entry,
        ),
        opened: [...current.set.opened, nextReveal],
      },
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
  openPlayerName: string,
  canOpenSet: boolean,
): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const modal = window.curtainCall?.modal;
  if (!modal) {
    return;
  }

  const body = createSpotlightRevealResultContent(result, presenterName, booerName, openPlayerName);
  const actions = canOpenSet
    ? [
        {
          label: SPOTLIGHT_RESULT_SKIP_LABEL,
          variant: 'ghost' as const,
        },
        {
          label: SPOTLIGHT_SET_OPEN_BUTTON_LABEL,
          variant: 'primary' as const,
          preventRapid: true,
          dismiss: false,
          onSelect: () => {
            modal.close();
            openSpotlightSetPickerDialog(openPlayerName);
          },
        },
      ]
    : [
        {
          label: SPOTLIGHT_RESULT_SKIP_LABEL,
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

const openSpotlightSetPickerDialog = (playerName: string): void => {
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

  const availableCards = getAvailableSpotlightSetCards(state)
    .slice()
    .sort((a, b) => a.position - b.position);

  const container = document.createElement('div');
  container.className = 'spotlight-set-picker';

  const message = document.createElement('p');
  message.className = 'spotlight-set-picker__message';
  message.textContent = `${playerName}のターンです。${SPOTLIGHT_SET_PICKER_MESSAGE}`;
  container.append(message);

  if (availableCards.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'spotlight-set-picker__empty';
    empty.textContent = SPOTLIGHT_SET_PICKER_EMPTY_MESSAGE;
    container.append(empty);
  } else {
    const list = document.createElement('ul');
    list.className = 'spotlight-set-picker__list';

    availableCards.forEach((setCard) => {
      const item = document.createElement('li');
      item.className = 'spotlight-set-picker__item';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'spotlight-set-picker__button';
      button.setAttribute('aria-label', `${formatSetCardPositionLabel(setCard)}を公開する`);

      const cardComponent = new CardComponent({
        rank: setCard.card.rank,
        suit: setCard.card.suit,
        faceDown: setCard.card.face !== 'up',
        annotation: setCard.card.annotation,
      });
      button.append(cardComponent.el);

      const label = document.createElement('span');
      label.className = 'spotlight-set-picker__label';
      label.textContent = formatSetCardPositionLabel(setCard);
      button.append(label);

      button.addEventListener('click', () => {
        modal.close();
        openSpotlightSetConfirmDialog(setCard.id);
      });

      item.append(button);
      list.append(item);
    });

    container.append(list);
  }

  modal.open({
    title: SPOTLIGHT_SET_PICKER_TITLE,
    body: container,
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
  const positionLabel = formatSetCardPositionLabel(setCard);

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
    const availableCards = getAvailableSpotlightSetCards(state)
      .slice()
      .sort((a, b) => a.position - b.position);

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
  const availableCards = getAvailableSpotlightSetCards(state)
    .slice()
    .sort((a, b) => a.position - b.position);

  const container = document.createElement('div');
  container.className = 'spotlight-set-picker';

  const message = document.createElement('p');
  message.className = 'spotlight-set-picker__message';
  message.textContent = SPOTLIGHT_JOKER_BONUS_MESSAGE(playerName);
  container.append(message);

  if (availableCards.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'spotlight-set-picker__empty';
    empty.textContent = SPOTLIGHT_JOKER_BONUS_EMPTY_MESSAGE;
    container.append(empty);

    modal.open({
      title: SPOTLIGHT_JOKER_BONUS_TITLE,
      body: container,
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
    const note = document.createElement('p');
    note.className = 'spotlight-set-picker__empty';
    note.textContent = SPOTLIGHT_JOKER_BONUS_SINGLE_MESSAGE;
    container.append(note);

    modal.open({
      title: SPOTLIGHT_JOKER_BONUS_TITLE,
      body: container,
      dismissible: false,
      actions: [
        {
          label: SPOTLIGHT_JOKER_BONUS_SINGLE_ACTION_LABEL,
          variant: 'primary',
          preventRapid: true,
          dismiss: false,
          onSelect: () => {
            modal.close();
            openSpotlightSetConfirmDialog(availableCards[0].id);
          },
        },
      ],
    });
    return;
  }

  const prompt = document.createElement('p');
  prompt.className = 'spotlight-set-picker__empty';
  prompt.textContent = SPOTLIGHT_JOKER_BONUS_MULTI_PROMPT;
  container.append(prompt);

  const list = document.createElement('ul');
  list.className = 'spotlight-set-picker__list';

  availableCards.forEach((setCard) => {
    const item = document.createElement('li');
    item.className = 'spotlight-set-picker__item';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'spotlight-set-picker__button';
    button.setAttribute('aria-label', `${formatSetCardPositionLabel(setCard)}を公開する`);

    const cardComponent = new CardComponent({
      rank: setCard.card.rank,
      suit: setCard.card.suit,
      faceDown: setCard.card.face !== 'up',
      annotation: setCard.card.annotation,
    });
    button.append(cardComponent.el);

    const label = document.createElement('span');
    label.className = 'spotlight-set-picker__label';
    label.textContent = formatSetCardPositionLabel(setCard);
    button.append(label);

    button.addEventListener('click', () => {
      modal.close();
      openSpotlightSetConfirmDialog(setCard.id);
    });

    item.append(button);
    list.append(item);
  });

  container.append(list);

  modal.open({
    title: SPOTLIGHT_JOKER_BONUS_TITLE,
    body: container,
    dismissible: false,
    actions: [],
  });
};

const completeSpotlightJokerBonus = (
  jokerReveal: SetReveal,
  bonusReveal: SetReveal | null,
): void => {
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

  const latest = gameStore.getState();
  saveLatestGame(latest);

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
    saveLatestGame(latest);
  }

  const message = SPOTLIGHT_SET_RESULT_MESSAGE(playerName, formatCardLabel(reveal.card));

  if (typeof window === 'undefined') {
    console.info(message);
    return;
  }

  window.curtainCall?.modal?.close();

  const toast = window.curtainCall?.toast;
  if (toast) {
    toast.show({ message, variant: 'info' });
  } else {
    console.info(message);
  }

  if (pendingJokerBefore) {
    completeSpotlightJokerBonus(pendingJokerBefore, reveal);
    return;
  }

  if (reveal.bonus === 'joker') {
    openSpotlightJokerBonusDialog(reveal, playerName);
  }
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
  const needed = Math.max(0, WATCH_REQUIRED_BOO_COUNT - booCount);
  const warning = remaining !== null && needed >= remaining;

  const turnLabel = `ターン：#${state.turn.count}`;
  const booLabel = `あなたのブーイング：${booCount} / ${WATCH_REQUIRED_BOO_COUNT}`;
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
    const nextActivePlayerId = getOpponentId(current.activePlayer);
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
      activePlayer: nextActivePlayerId,
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

const showWatchResultDialog = (
  { decision, nextRoute }: CompleteWatchDecisionResult,
  playerName: string,
  opponentName: string,
): void => {
  const summary = `${playerName}｜${WATCH_RESULT_TITLES[decision]} ${WATCH_RESULT_MESSAGES[decision]}`;

  const finalize = (): void => {
    isWatchResultDialogOpen = false;
    const latest = gameStore.getState();
    saveLatestGame(latest);
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
  saveLatestGame(latest);

  const openPlayerName = result.judge === 'match' ? presenterName : booerName;
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
  showSpotlightRevealResultDialog(result, presenterName, booerName, openPlayerName, canOpenSet);
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
    saveLatestGame(latestState);
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
    const hasSelection = current.scout.selectedOpponentCardIndex !== null;
    const hasRecent = current.recentScoutedCard !== null;

    if (!hasSelection && !hasRecent) {
      return current;
    }

    const timestamp = Date.now();

    return {
      ...current,
      scout: {
        ...current.scout,
        selectedOpponentCardIndex: null,
      },
      recentScoutedCard: null,
      updatedAt: timestamp,
      revision: current.revision + 1,
    };
  });

  isScoutPickInProgress = false;
  isScoutResultDialogOpen = false;
};

let activeScoutCleanup: (() => void) | null = null;
let activeActionCleanup: (() => void) | null = null;
let activeWatchCleanup: (() => void) | null = null;
let activeSpotlightCleanup: (() => void) | null = null;

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

const cleanupActiveSpotlightView = (): void => {
  if (activeSpotlightCleanup) {
    const cleanup = activeSpotlightCleanup;
    activeSpotlightCleanup = null;
    cleanup();
    isSpotlightRevealInProgress = false;
    isSpotlightSetOpenInProgress = false;
  }
};

const withRouteCleanup = (
  render: (context: RouteContext) => HTMLElement,
): ((context: RouteContext) => HTMLElement) => {
  return (context) => {
    cleanupActiveScoutView();
    cleanupActiveActionView();
    cleanupActiveWatchView();
    cleanupActiveSpotlightView();
    return render(context);
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
    subtitle: 'セーブデータの確認と復元フローは今後実装されます。',
    phase: 'home',
    gate: {
      confirmLabel: '準備OK',
      message:
        'セーブデータの復元フローは今後のタスクで実装されます。画面の共有準備のみ行ってください。',
      modalNotes: ['現在はプレースホルダーのゲート画面です。'],
      nextPath: null,
    },
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
      resolveMessage: (state) => createPhaseGateMessage(state, 'スポットライトフェーズ'),
    }),
  },
  {
    path: '#/phase/intermission',
    title: 'インターミッション',
    heading: 'インターミッション',
    subtitle: '手番交代のためのインターミッション画面は今後実装されます。',
    phase: 'intermission',
  },
  {
    path: '#/phase/intermission/gate',
    title: 'インターミッションゲート',
    heading: 'インターミッションゲート',
    subtitle: '次のプレイヤーに交代するためのゲートです。',
    phase: 'intermission',
    gate: createHandOffGateConfig({
      resolveMessage: (state) => createPhaseGateMessage(state, 'インターミッション'),
    }),
  },
  {
    path: '#/phase/curtaincall',
    title: 'カーテンコール',
    heading: 'カーテンコール',
    subtitle: '最終集計と結果表示は今後実装予定です。',
    phase: 'curtaincall',
  },
  {
    path: '#/phase/curtaincall/gate',
    title: 'カーテンコールゲート',
    heading: 'カーテンコールゲート',
    subtitle: '結果表示前の確認ゲートです。',
    phase: 'curtaincall',
    gate: createHandOffGateConfig({
      resolveMessage: (state) => createPhaseGateMessage(state, 'カーテンコール'),
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
        render: () => {
          const state = gameStore.getState();
          const confirmLabel = route.gate?.confirmLabel ?? DEFAULT_GATE_CONFIRM_LABEL;
          const resolvedMessage =
            route.gate?.resolveMessage?.(state) ??
            route.gate?.message ??
            createTurnGateMessage(state, confirmLabel);

          return createGateView({
            title: route.heading,
            subtitle: route.subtitle,
            message: resolvedMessage,
            confirmLabel: route.gate?.confirmLabel,
            hints: route.gate?.hints,
            modalNotes: route.gate?.modalNotes,
            modalTitle: route.gate?.modalTitle ?? route.title,
            preventRapid: route.gate?.preventRapid,
            lockDuration: route.gate?.lockDuration,
            onGatePass: () => {
              if (route.gate?.onPass) {
                route.gate.onPass(router);
                return;
              }
              if (route.gate?.nextPath === null) {
                return;
              }
              const derived = route.path.endsWith('/gate') ? route.path.slice(0, -5) : route.path;
              const target = route.gate?.nextPath ?? derived;
              if (target && target !== route.path) {
                router.go(target);
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
          const resumeMeta = getLatestSaveMetadata();
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

          const updateSelectedOpponentCard = (index: number | null): void => {
            gameStore.setState((current) => {
              const opponentId = getOpponentId(current.activePlayer);
              const opponent = current.players[opponentId];
              const handSize = opponent?.hand.cards.length ?? 0;
              const normalizedIndex =
                index === null || handSize === 0 || index < 0 || index >= handSize ? null : index;
              if (current.scout.selectedOpponentCardIndex === normalizedIndex) {
                return current;
              }
              const timestamp = Date.now();
              return {
                ...current,
                scout: {
                  ...current.scout,
                  selectedOpponentCardIndex: normalizedIndex,
                },
                updatedAt: timestamp,
                revision: current.revision + 1,
              };
            });
          };

          const view = createScoutView({
            title: route.heading,
            cards: mapOpponentHandCards(state),
            selectedIndex: state.scout.selectedOpponentCardIndex,
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
              nextState.scout.selectedOpponentCardIndex,
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
        render: () => {
          const state = gameStore.getState();
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
  const toast = new ToastManager(toastRoot);

  window.curtainCall = { router, modal, toast };

  buildRouteDefinitions(router).forEach((definition) => router.register(definition));

  gameStore.setState(createInitialState());

  router.subscribe((path) => {
    const current = gameStore.getState();
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
    saveLatestGame(state);
  });

  router.start();
};

initializeApp();
