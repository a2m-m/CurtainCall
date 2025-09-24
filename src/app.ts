import { Router, RouteDefinition } from './router.js';
import type { RouteContext } from './router.js';
import { createSeededRandom, dealInitialSetup } from './cards.js';
import type { InitialDealResult } from './cards.js';
import {
  deleteResultHistoryEntry,
  getLatestSaveMetadata,
  getResultHistory,
  ResultHistoryEntry,
  saveLatestGame,
} from './storage.js';
import { createInitialState, gameStore, PLAYER_IDS } from './state.js';
import type { CardSnapshot, GameState, PhaseKey, PlayerId, PlayerState } from './state.js';
import { ModalController } from './ui/modal.js';
import { ToastManager } from './ui/toast.js';
import { createGateView } from './views/gate.js';
import { createHomeView } from './views/home.js';
import { createPlaceholderView } from './views/placeholder.js';
import { createScoutView } from './views/scout.js';
import type {
  ScoutOpponentHandCardViewModel,
  ScoutRecentTakenCardViewModel,
} from './views/scout.js';
import { createStandbyView } from './views/standby.js';

interface GateDescriptor {
  message?: string | HTMLElement;
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

const HANDOFF_GATE_MODAL_NOTES = Object.freeze([
  'ゲート通過前は秘匿情報を DOM に出力しません。',
]);

const createHandOffGateConfig = (overrides: Partial<GateDescriptor> = {}): GateDescriptor => ({
  hints: [...HANDOFF_GATE_HINTS],
  modalNotes: [...HANDOFF_GATE_MODAL_NOTES],
  ...overrides,
});

const STANDBY_DEAL_ERROR_MESSAGE = 'スタンバイの初期化に失敗しました。もう一度お試しください。';
const STANDBY_FIRST_PLAYER_ERROR_MESSAGE = '先手が未決定です。スタンバイに戻ります。';
const STANDBY_SEED_LOCK_VALUE = 'dev-fixed-0001';

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
  PLAYER_IDS.reduce<Record<PlayerId, PlayerState>>((acc, id) => {
    const basePlayer = template.players[id];
    const previousPlayer = previous.players[id];
    acc[id] = {
      ...basePlayer,
      name: previousPlayer?.name ?? basePlayer.name,
      hand: {
        ...basePlayer.hand,
        cards: deal.hands[id].map((card) => cloneCardSnapshot(card)),
      },
    };
    return acc;
  }, {} as Record<PlayerId, PlayerState>);

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

const getOpponentId = (player: PlayerId): PlayerId => (player === 'lumina' ? 'nox' : 'lumina');

const mapOpponentHandCards = (state: GameState): ScoutOpponentHandCardViewModel[] => {
  const opponentId = getOpponentId(state.activePlayer);
  const opponent = state.players[opponentId];
  if (!opponent) {
    return [];
  }
  return opponent.hand.cards.map((card) => ({ id: card.id }));
};

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

let activeScoutCleanup: (() => void) | null = null;

const cleanupActiveScoutView = (): void => {
  if (activeScoutCleanup) {
    const cleanup = activeScoutCleanup;
    activeScoutCleanup = null;
    cleanup();
  }
};

const withRouteCleanup = (
  render: (context: RouteContext) => HTMLElement,
): ((context: RouteContext) => HTMLElement) => {
  return (context) => {
    cleanupActiveScoutView();
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
      message: 'セーブデータの復元フローは今後のタスクで実装されます。画面の共有準備のみ行ってください。',
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
      message: 'スカウトフェーズに入ります。端末を次のプレイヤーへ渡し、準備が整ったら進んでください。',
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
      message: 'アクションフェーズを開始する前に端末の受け渡しを完了してください。',
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
      message: 'ウォッチフェーズに移行します。端末を相手に渡してから「準備完了」を押してください。',
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
      message: 'スポットライトフェーズの公開処理を行う前に端末の受け渡しを行ってください。',
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
      message: 'インターミッションを開始します。端末を次の担当者に渡してから進んでください。',
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
      message: '結果の確認に入ります。全員の準備が整ったら「準備完了」を押してください。',
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
        render: () =>
          createGateView({
            title: route.heading,
            subtitle: route.subtitle,
            message: route.gate?.message,
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
              const derived = route.path.endsWith('/gate')
                ? route.path.slice(0, -5)
                : route.path;
              const target = route.gate?.nextPath ?? derived;
              if (target && target !== route.path) {
                router.go(target);
              }
            },
          }),
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
              disabled: !resumeMeta,
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

          const view = createScoutView({
            title: route.heading,
            cards: mapOpponentHandCards(state),
            selectedIndex: state.scout.selectedOpponentCardIndex,
            recentTakenCards: mapRecentTakenCards(state),
            onSelectCard: (index) => {
              gameStore.setState((current) => {
                const opponentId = getOpponentId(current.activePlayer);
                const opponent = current.players[opponentId];
                const handSize = opponent?.hand.cards.length ?? 0;
                const normalizedIndex =
                  index === null ||
                  handSize === 0 ||
                  index < 0 ||
                  index >= handSize
                    ? null
                    : index;
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
            },
          });

          const unsubscribe = gameStore.subscribe((nextState) => {
            view.updateOpponentHand(
              mapOpponentHandCards(nextState),
              nextState.scout.selectedOpponentCardIndex,
            );
            view.updateRecentTaken(mapRecentTakenCards(nextState));
          });

          activeScoutCleanup = () => {
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
    gameStore.patch({
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
    });
  });

  gameStore.subscribe((state) => {
    saveLatestGame(state);
  });

  router.start();
};

initializeApp();
