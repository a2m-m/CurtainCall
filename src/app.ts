import { Router, RouteDefinition } from './router.js';
import { saveLatestGame } from './storage.js';
import { createInitialState, gameStore, PhaseKey } from './state.js';
import { ModalController } from './ui/modal.js';
import { ToastManager } from './ui/toast.js';
import { createGateView } from './views/gate.js';
import { createHomeView } from './views/home.js';
import { createPlaceholderView } from './views/placeholder.js';

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
    path: '#/standby/gate',
    title: 'スタンバイゲート',
    heading: 'スタンバイ完了',
    subtitle: '手番移行を安全に行うためのゲート画面です。',
    phase: 'standby',
    gate: createHandOffGateConfig({
      nextPath: '#/phase/scout',
      message: 'スタンバイが完了しました。端末を相手プレイヤーに渡してから「準備完了」を押してください。',
    }),
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
    if (route.gate) {
      return {
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
    }

    if (route.path === '#/') {
      return {
        path: route.path,
        title: route.title,
        render: () =>
          createHomeView({
            title: route.heading,
            subtitle: route.subtitle,
          }),
      };
    }

    return {
      path: route.path,
      title: route.title,
      render: () =>
        createPlaceholderView({
          title: route.heading,
          subtitle: route.subtitle,
        }),
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
