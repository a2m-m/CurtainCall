import {
  CARD_COMPOSITION,
  BackstageItemState,
  BackstageItemStatus,
  CardSnapshot,
  GameState,
  PlayerId,
  PLAYER_IDS,
  REQUIRED_BOO_COUNT,
  SetRevealBonus,
  StageCardPlacement,
  StagePair,
  gameStore,
} from '../state.js';
import { BOARD_CHECK_MODAL_TITLE, DEFAULT_CLOSE_LABEL } from '../messages.js';
import { CardComponent } from './card.js';
import { UIComponent } from './component.js';
import type { ModalController } from './modal.js';

export type BoardCheckTabKey =
  | 'overview'
  | 'set'
  | 'backstage'
  | 'stage'
  | 'score'
  | 'luminaStage'
  | 'noxStage';

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

const SET_BONUS_LABEL: Record<SetRevealBonus, string> = {
  joker: 'JOKERボーナス',
  pair: '追加公開',
  secretPair: 'シークレットペア',
};

const BACKSTAGE_STATUS_LABEL: Record<BackstageItemStatus, string> = {
  backstage: 'バックステージ',
  stage: 'ステージ',
  hand: '手札',
};

const TAB_DEFINITIONS: TabDefinition[] = [
  {
    key: 'overview',
    label: '概要',
    render: (state) => renderOverviewTab(state),
  },
  {
    key: 'set',
    label: 'セット',
    render: (state) => renderSetTab(state),
  },
  {
    key: 'backstage',
    label: 'バックステージ',
    render: (state) => renderBackstageTab(state),
  },
  {
    key: 'stage',
    label: 'ステージ',
    render: (state) => renderStagesTab(state),
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

const renderOverviewTab = (state: GameState): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'board-check__content';

  const turnSection = createSection('ターン情報');
  turnSection.append(
    createDefinitionList(
      [
        {
          term: '現在のターン',
          description: `${state.turn.count}ターン目`,
        },
      ],
      'board-check__stats',
    ),
  );
  container.append(turnSection);

  const booSection = createSection('規定ブーイング残数');
  const booItems = PLAYER_IDS.map((id) => {
    const player = state.players[id];
    const usedBooCount = Math.max(0, player.booCount);
    const remainingBooCount = Math.max(REQUIRED_BOO_COUNT - usedBooCount, 0);
    return {
      term: player.name,
      description: `残り${remainingBooCount}回`,
    };
  });
  booSection.append(createDefinitionList(booItems, 'board-check__stats'));
  container.append(booSection);

  const takenSection = createSection('奪われたカード');
  PLAYER_IDS.forEach((id) => {
    const player = state.players[id];
    const playerBlock = document.createElement('div');
    playerBlock.className = 'board-check__subsection';

    const heading = document.createElement('h4');
    heading.className = 'board-check__subsection-title';
    heading.textContent = `${player.name}が奪われたカード`;
    playerBlock.append(heading);

    if (player.takenByOpponent.length === 0) {
      playerBlock.append(createEmptyMessage('奪われたカードはありません。'));
    } else {
      const list = document.createElement('ul');
      list.className = 'board-check__card-list';
      player.takenByOpponent.forEach((card) => {
        const item = document.createElement('li');
        item.className = 'board-check__card-item';

        const cardComponent = new CardComponent({
          rank: card.rank,
          suit: card.suit,
          faceDown: false,
          annotation: card.annotation,
        });
        const cardLabel = formatCardLabel(card);
        cardComponent.el.setAttribute('aria-label', cardLabel);

        const label = document.createElement('span');
        label.className = 'board-check__card-label';
        label.textContent = cardLabel;

        item.append(cardComponent.el, label);
        list.append(item);
      });
      playerBlock.append(list);
    }

    takenSection.append(playerBlock);
  });
  container.append(takenSection);

  return container;
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
  const hiddenSetCards = state.set.cards.filter((setCard) => setCard.card.face !== 'up');
  const closed = hiddenSetCards.length > 0 ? hiddenSetCards.length : remaining;

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

  const hiddenSection = createSection('伏せ札');
  if (closed === 0) {
    hiddenSection.append(createEmptyMessage('伏せ札はありません。'));
  } else {
    const list = document.createElement('ul');
    list.className = 'board-check__card-list board-check__card-list--grid';
    for (let index = 0; index < closed; index += 1) {
      const item = document.createElement('li');
      item.className = 'board-check__card-grid-item';
      const card = new CardComponent({
        rank: '?',
        suit: 'spades',
        faceDown: true,
      });
      item.append(card.el);
      list.append(item);
    }
    hiddenSection.append(list);
  }
  container.append(hiddenSection);

  return container;
};

const getPlayerName = (state: GameState, playerId: PlayerId | null | undefined): string | null => {
  if (!playerId) {
    return null;
  }
  const player = state.players[playerId];
  if (!player) {
    return playerId;
  }
  const trimmed = player.name?.trim();
  if (trimmed) {
    return trimmed;
  }
  return player.name || playerId;
};

const formatBackstageLocation = (state: GameState, item: BackstageItemState): string => {
  const baseLabel = BACKSTAGE_STATUS_LABEL[item.status] ?? '不明';
  if (item.status === 'backstage') {
    return baseLabel;
  }
  const holderName = getPlayerName(state, item.holder);
  if (!holderName) {
    return baseLabel;
  }
  if (item.status === 'stage') {
    return `${holderName}のステージ`;
  }
  if (item.status === 'hand') {
    return `${holderName}の手札`;
  }
  return baseLabel;
};

const renderBackstageTab = (state: GameState): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'board-check__content';

  const items = state.backstage?.items ?? [];
  const publicItems = items.filter((item) => item.isPublic);
  const hiddenItems = items.filter((item) => !item.isPublic);

  const summarySection = createSection('アイテム数');
  summarySection.append(
    createDefinitionList(
      [
        { term: '全アイテム', description: `${items.length}枚` },
        { term: '公開済み', description: `${publicItems.length}枚` },
        { term: '秘匿', description: `${hiddenItems.length}枚` },
      ],
      'board-check__stats',
    ),
  );
  container.append(summarySection);

  const publicSection = createSection('公開済みアイテム');
  if (publicItems.length === 0) {
    publicSection.append(createEmptyMessage('公開されたアイテムはありません。'));
  } else {
    const list = document.createElement('ul');
    list.className = 'board-check__card-list';
    publicItems
      .slice()
      .sort((a, b) => {
        const timeDiff = (a.revealedAt ?? Number.MAX_SAFE_INTEGER) - (b.revealedAt ?? Number.MAX_SAFE_INTEGER);
        if (timeDiff !== 0) {
          return timeDiff;
        }
        return a.position - b.position;
      })
      .forEach((item) => {
        const listItem = document.createElement('li');
        listItem.className = 'board-check__card-item';

        const cardComponent = new CardComponent({
          rank: item.card.rank,
          suit: item.card.suit,
          faceDown: !item.isPublic || item.card.face !== 'up',
          annotation: item.card.annotation,
        });
        const cardLabel = formatCardLabel(item.card);
        cardComponent.el.setAttribute('aria-label', cardLabel);

        const details: { term: string; description: string }[] = [
          { term: 'カード', description: cardLabel },
          { term: '現在の状態', description: formatBackstageLocation(state, item) },
        ];

        const revealedByName = getPlayerName(state, item.revealedBy);
        if (revealedByName) {
          details.push({ term: '公開者', description: revealedByName });
        }

        listItem.append(cardComponent.el, createDefinitionList(details, 'board-check__card-details'));
        list.append(listItem);
      });
    publicSection.append(list);
  }
  container.append(publicSection);

  const hiddenSection = createSection('秘匿アイテム');
  if (hiddenItems.length === 0) {
    hiddenSection.append(createEmptyMessage('秘匿されているアイテムはありません。'));
  } else {
    const message = document.createElement('p');
    message.className = 'board-check__empty';
    message.textContent = `秘匿アイテムが${hiddenItems.length}枚あります。詳細は非公開情報のため表示されません。`;
    hiddenSection.append(message);
  }
  container.append(hiddenSection);

  return container;
};

const createStageCardElement = (placement: StageCardPlacement | undefined): HTMLElement | null => {
  if (!placement || placement.card.face !== 'up') {
    return null;
  }

  const card = new CardComponent({
    rank: placement.card.rank,
    suit: placement.card.suit,
    faceDown: false,
    annotation: placement.card.annotation,
  });

  const cardLabel = formatCardLabel(placement.card);
  card.el.setAttribute('aria-label', cardLabel);

  return card.el;
};

const renderStageColumn = (
  state: GameState,
  playerId: PlayerId,
  label: string,
): HTMLElement => {
  const column = document.createElement('section');
  column.className = `board-check__stage-column board-check__stage-column--${playerId}`;

  const heading = document.createElement('h3');
  heading.className = 'board-check__stage-column-title';
  heading.textContent = label;
  column.append(heading);

  const stage = state.players[playerId]?.stage;
  const pairs = stage?.pairs.slice().sort((a, b) => a.createdAt - b.createdAt) ?? [];

  if (pairs.length === 0) {
    column.append(createEmptyMessage('公開されているカードはありません。'));
    return column;
  }

  const list = document.createElement('ul');
  list.className = 'board-check__stage-card-list';

  let hasVisibleCard = false;
  pairs.forEach((pair) => {
    const item = document.createElement('li');
    item.className = 'board-check__stage-card-group';

    [pair.actor, pair.kuroko].forEach((placement) => {
      const cardElement = createStageCardElement(placement);
      if (cardElement) {
        hasVisibleCard = true;
        item.append(cardElement);
      }
    });

    if (item.childElementCount > 0) {
      list.append(item);
    }
  });

  if (!hasVisibleCard) {
    column.append(createEmptyMessage('公開されているカードはありません。'));
    return column;
  }

  column.append(list);
  return column;
};

const renderStagesTab = (state: GameState): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'board-check__content';

  const layout = document.createElement('div');
  layout.className = 'board-check__stage-layout';

  layout.append(
    renderStageColumn(state, 'lumina', 'ルミナステージ'),
    renderStageColumn(state, 'nox', 'ノクスステージ'),
  );

  container.append(layout);
  return container;
};

const sumVisibleStageKamiValues = (pairs: readonly StagePair[] | undefined): number => {
  if (!pairs || pairs.length === 0) {
    return 0;
  }

  return pairs.reduce((total, pair) => {
    const actorCard = pair.actor?.card;
    if (!actorCard || actorCard.face !== 'up') {
      return total;
    }
    return total + actorCard.value;
  }, 0);
};

const formatScoreValue = (value: number | null): string => {
  if (value === null) {
    return '—';
  }
  return value.toLocaleString('ja-JP');
};

const resolvePlayerScoreSnapshot = (
  state: GameState,
  playerId: PlayerId,
): { sumKami: number | null; sumHand: number | null; penalty: number | null; final: number | null } => {
  const curtainSummary = state.curtainCall?.players?.[playerId];
  if (curtainSummary) {
    return {
      sumKami: curtainSummary.sumKami,
      sumHand: curtainSummary.sumHand,
      penalty: curtainSummary.penalty,
      final: curtainSummary.final,
    };
  }

  const pairs = state.players[playerId]?.stage?.pairs;
  const sumKami = sumVisibleStageKamiValues(pairs);

  return {
    sumKami,
    sumHand: null,
    penalty: null,
    final: null,
  };
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

    const snapshot = resolvePlayerScoreSnapshot(state, id);
    [snapshot.sumKami, snapshot.sumHand, snapshot.penalty, snapshot.final].forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = formatScoreValue(value);
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
  const fallback = TAB_DEFINITIONS[0]?.key ?? 'set';
  if (!tab) {
    return fallback;
  }
  if (tab === 'luminaStage' || tab === 'noxStage') {
    return 'stage';
  }
  return TAB_DEFINITIONS.some((definition) => definition.key === tab) ? tab : fallback;
};

export const showBoardCheck = (options: BoardCheckOptions = {}): void => {
  const modal = ensureModalController();
  const state = gameStore.getState();
  const initialTab = resolveInitialTab(options.initialTab);
  const view = new BoardCheckView(state, initialTab);

  modal.open({
    title: BOARD_CHECK_MODAL_TITLE,
    body: view.el,
    actions: [
      {
        label: DEFAULT_CLOSE_LABEL,
        variant: 'ghost',
      },
    ],
    className: 'modal--board-check',
  });
};
