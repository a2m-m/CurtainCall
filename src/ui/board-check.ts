import {
  CARD_COMPOSITION,
  CardSnapshot,
  GameState,
  PlayerId,
  PLAYER_IDS,
  SetRevealBonus,
  StageCardPlacement,
  StageCardOrigin,
  StageJudgeResult,
  StagePairOrigin,
  gameStore,
} from '../state.js';
import { CardComponent } from './card.js';
import { UIComponent } from './component.js';
import type { ModalController } from './modal.js';

export type BoardCheckTabKey = 'set' | 'luminaStage' | 'noxStage' | 'score';

export interface BoardCheckOptions {
  initialTab?: BoardCheckTabKey;
}

interface TabDefinition {
  key: BoardCheckTabKey;
  label: string;
  render: (state: GameState) => HTMLElement;
}

const SUIT_LABEL: Record<CardSnapshot['suit'], string> = {
  spades: 'スペード',
  hearts: 'ハート',
  diamonds: 'ダイヤ',
  clubs: 'クラブ',
  joker: 'ジョーカー',
};

const STAGE_JUDGE_LABEL: Record<StageJudgeResult | 'pending', string> = {
  match: '一致',
  mismatch: '不一致',
  pending: '未判定',
};

const STAGE_CARD_SOURCE_LABEL: Record<StageCardOrigin, string> = {
  hand: '手札',
  set: 'セット',
  jokerBonus: 'JOKERボーナス',
};

const STAGE_PAIR_ORIGIN_LABEL: Record<StagePairOrigin, string> = {
  action: 'アクション',
  spotlight: 'スポットライト',
  joker: 'JOKERボーナス',
};

const SET_BONUS_LABEL: Record<SetRevealBonus, string> = {
  joker: 'JOKERボーナス',
  pair: '追加公開',
  secretPair: 'シークレットペア',
};

const TAB_DEFINITIONS: TabDefinition[] = [
  {
    key: 'set',
    label: 'セット',
    render: (state) => renderSetTab(state),
  },
  {
    key: 'luminaStage',
    label: 'ルミナステージ',
    render: (state) => renderStageTab(state, 'lumina'),
  },
  {
    key: 'noxStage',
    label: 'ノクスステージ',
    render: (state) => renderStageTab(state, 'nox'),
  },
  {
    key: 'score',
    label: 'スコア',
    render: (state) => renderScoreTab(state),
  },
];

const formatCardLabel = (card: CardSnapshot): string => {
  if (card.suit === 'joker') {
    return 'ジョーカー';
  }
  return `${SUIT_LABEL[card.suit]}の${card.rank}`;
};

const createDefinitionList = (
  items: { term: string; description: string }[],
  className?: string,
): HTMLDListElement => {
  const list = document.createElement('dl');
  list.className = ['board-check__definition', className].filter(Boolean).join(' ');
  items.forEach((item) => {
    const term = document.createElement('dt');
    term.textContent = item.term;
    const description = document.createElement('dd');
    description.textContent = item.description;
    list.append(term, description);
  });
  return list;
};

const createSection = (title: string): HTMLDivElement => {
  const section = document.createElement('div');
  section.className = 'board-check__section';
  const heading = document.createElement('h3');
  heading.className = 'board-check__section-title';
  heading.textContent = title;
  section.append(heading);
  return section;
};

const createEmptyMessage = (message: string): HTMLParagraphElement => {
  const paragraph = document.createElement('p');
  paragraph.className = 'board-check__empty';
  paragraph.textContent = message;
  return paragraph;
};

const renderSetTab = (state: GameState): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'board-check__content';

  const total = state.meta?.composition?.set ?? CARD_COMPOSITION.set;
  const opened = state.set.opened.length;
  const remaining = Math.max(total - opened, 0);
  const closed = state.set.cards.length > 0 ? state.set.cards.length : remaining;

  const summary = createSection('セットの状況');
  summary.append(
    createDefinitionList(
      [
        { term: '合計', description: `${total}枚` },
        { term: '公開済み', description: `${opened}枚` },
        { term: '残り', description: `${remaining}枚` },
        { term: '伏せ札', description: `${closed}枚` },
      ],
      'board-check__stats',
    ),
  );
  container.append(summary);

  const openedSection = createSection('公開済みカード');
  if (state.set.opened.length === 0) {
    openedSection.append(createEmptyMessage('公開されたカードはありません。'));
  } else {
    const list = document.createElement('ul');
    list.className = 'board-check__card-list';
    state.set.opened
      .slice()
      .sort((a, b) => a.openedAt - b.openedAt)
      .forEach((reveal) => {
        const item = document.createElement('li');
        item.className = 'board-check__card-item';
        const card = new CardComponent({
          rank: reveal.card.rank,
          suit: reveal.card.suit,
          faceDown: reveal.card.face !== 'up',
          annotation: reveal.card.annotation,
        });
        item.append(card.el);

        const details = createDefinitionList(
          [
            { term: 'カード', description: formatCardLabel(reveal.card) },
            {
              term: '公開者',
              description: state.players[reveal.openedBy]?.name ?? reveal.openedBy,
            },
            ...(reveal.assignedTo
              ? [
                  {
                    term: '現在の所有',
                    description: state.players[reveal.assignedTo]?.name ?? reveal.assignedTo,
                  },
                ]
              : []),
            ...(reveal.bonus
              ? [
                  {
                    term: 'ボーナス',
                    description: SET_BONUS_LABEL[reveal.bonus],
                  },
                ]
              : []),
          ],
          'board-check__card-details',
        );
        item.append(details);
        list.append(item);
      });
    openedSection.append(list);
  }

  container.append(openedSection);

  return container;
};

const describeCardFace = (placement: StageCardPlacement | undefined): string => {
  if (!placement) {
    return '未配置';
  }
  return placement.card.face === 'up' ? formatCardLabel(placement.card) : '伏せ札';
};

const renderStageCardRow = (label: string, placement: StageCardPlacement | undefined): HTMLElement => {
  const row = document.createElement('div');
  row.className = 'board-check__stage-card';

  const title = document.createElement('span');
  title.className = 'board-check__stage-card-label';
  title.textContent = label;
  row.append(title);

  const content = document.createElement('div');
  content.className = 'board-check__stage-card-content';

  if (!placement) {
    content.append(createEmptyMessage('未配置です。'));
    row.append(content);
    return row;
  }

  const card = new CardComponent({
    rank: placement.card.rank,
    suit: placement.card.suit,
    faceDown: placement.card.face !== 'up',
    annotation: placement.card.annotation,
  });
  content.append(card.el);

  const details = createDefinitionList(
    [
      { term: '状態', description: describeCardFace(placement) },
      { term: '出所', description: STAGE_CARD_SOURCE_LABEL[placement.from] },
    ],
    'board-check__stage-card-details',
  );
  content.append(details);

  row.append(content);
  return row;
};

const renderStageTab = (state: GameState, playerId: PlayerId): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'board-check__content';

  const player = state.players[playerId];
  const stage = player.stage;

  if (!stage || stage.pairs.length === 0) {
    container.append(createEmptyMessage('公開されているステージ情報はありません。'));
    return container;
  }

  const pairs = stage.pairs.slice().sort((a, b) => a.createdAt - b.createdAt);

  pairs.forEach((pair, index) => {
    const section = document.createElement('section');
    section.className = 'board-check__stage-pair';

    const heading = document.createElement('h3');
    heading.className = 'board-check__stage-pair-title';
    heading.textContent = `ペア ${index + 1}`;
    section.append(heading);

    const meta = createDefinitionList(
      [
        {
          term: '所有者',
          description: state.players[pair.owner]?.name ?? pair.owner,
        },
        { term: '出所', description: STAGE_PAIR_ORIGIN_LABEL[pair.origin] },
        {
          term: '判定',
          description: STAGE_JUDGE_LABEL[pair.judge ?? 'pending'],
        },
      ],
      'board-check__stage-meta',
    );
    section.append(meta);

    section.append(renderStageCardRow('役者', pair.actor));
    section.append(renderStageCardRow('黒子', pair.kuroko));

    container.append(section);
  });

  return container;
};

const renderScoreTab = (state: GameState): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'board-check__content';

  const table = document.createElement('table');
  table.className = 'board-check__score-table';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['プレイヤー', 'カミ札', '手札', 'ペナルティ', '最終'].forEach((label) => {
    const cell = document.createElement('th');
    cell.scope = 'col';
    cell.textContent = label;
    headerRow.append(cell);
  });
  thead.append(headerRow);
  table.append(thead);

  const tbody = document.createElement('tbody');
  PLAYER_IDS.forEach((id) => {
    const player = state.players[id];
    const row = document.createElement('tr');

    const name = document.createElement('th');
    name.scope = 'row';
    name.textContent = player.name;
    row.append(name);

    const { sumKami, sumHand, penalty, final } = player.score;
    [sumKami, sumHand, penalty, final].forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = `${value}`;
      row.append(cell);
    });

    tbody.append(row);
  });

  table.append(tbody);
  container.append(table);
  return container;
};

class BoardCheckView extends UIComponent<HTMLDivElement> {
  private readonly tabButtons = new Map<BoardCheckTabKey, HTMLButtonElement>();

  private readonly panels = new Map<BoardCheckTabKey, HTMLElement>();

  constructor(state: GameState, initialTab: BoardCheckTabKey) {
    super(document.createElement('div'));
    this.element.className = 'board-check';
    this.render(state, initialTab);
  }

  private render(state: GameState, initialTab: BoardCheckTabKey): void {
    const tabs = document.createElement('div');
    tabs.className = 'board-check__tabs';
    tabs.setAttribute('role', 'tablist');

    const panelWrapper = document.createElement('div');
    panelWrapper.className = 'board-check__panels';

    TAB_DEFINITIONS.forEach((definition) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'board-check__tab';
      button.textContent = definition.label;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', 'false');
      button.addEventListener('click', () => this.setActiveTab(definition.key));

      this.tabButtons.set(definition.key, button);
      tabs.append(button);

      const panel = document.createElement('div');
      panel.className = 'board-check__panel';
      panel.setAttribute('role', 'tabpanel');
      panel.hidden = true;
      panel.append(definition.render(state));

      this.panels.set(definition.key, panel);
      panelWrapper.append(panel);
    });

    this.element.append(tabs, panelWrapper);
    this.setActiveTab(initialTab);
  }

  private setActiveTab(key: BoardCheckTabKey): void {
    const fallback = TAB_DEFINITIONS[0]?.key ?? 'set';
    const target = this.tabButtons.has(key) ? key : fallback;

    this.tabButtons.forEach((button, tabKey) => {
      const isActive = tabKey === target;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    this.panels.forEach((panel, tabKey) => {
      panel.hidden = tabKey !== target;
    });
  }
}

const ensureModalController = (): ModalController => {
  if (typeof window === 'undefined') {
    throw new Error('ボードチェックはブラウザ環境でのみ利用できます。');
  }
  const modal = window.curtainCall?.modal;
  if (!modal) {
    throw new Error('ボードチェックモーダルを表示するためのコントローラーが初期化されていません。');
  }
  return modal;
};

const resolveInitialTab = (tab: BoardCheckTabKey | undefined): BoardCheckTabKey => {
  if (!tab) {
    return 'set';
  }
  return TAB_DEFINITIONS.some((definition) => definition.key === tab) ? tab : 'set';
};

export const showBoardCheck = (options: BoardCheckOptions = {}): void => {
  const modal = ensureModalController();
  const state = gameStore.getState();
  const initialTab = resolveInitialTab(options.initialTab);
  const view = new BoardCheckView(state, initialTab);

  modal.open({
    title: 'ボードチェック',
    body: view.el,
    actions: [
      {
        label: '閉じる',
        variant: 'ghost',
      },
    ],
  });
};

