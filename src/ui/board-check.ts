import {
  CARD_COMPOSITION,
  BackstageItemState,
  BackstageItemStatus,
  CardSnapshot,
  GameState,
  PlayerId,
  PLAYER_IDS,
  DEFAULT_PLAYER_NAMES,
  REQUIRED_BOO_COUNT,
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
  | 'setBackstage'
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
    key: 'setBackstage',
    label: 'セット／バック',
    render: (state) => renderSetBackstageTab(state),
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

const getPlayerName = (state: GameState, playerId: PlayerId | null | undefined): string | null => {
  if (!playerId) {
    return null;
  }
  const fallback = DEFAULT_PLAYER_NAMES[playerId] ?? playerId;
  const player = state.players[playerId];
  if (!player) {
    return fallback;
  }
  const trimmed = player.name?.trim();
  if (trimmed) {
    return trimmed;
  }
  return fallback;
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

const createCardGallery = (cardElements: HTMLElement[]): HTMLUListElement => {
  const list = document.createElement('ul');
  list.className = 'board-check__card-list board-check__card-list--grid';
  cardElements.forEach((cardElement) => {
    const item = document.createElement('li');
    item.className = 'board-check__card-grid-item';
    item.append(cardElement);
    list.append(item);
  });
  return list;
};

const appendCardGallery = (
  section: HTMLDivElement,
  cardElements: HTMLElement[],
  emptyMessage: string,
): void => {
  if (cardElements.length === 0) {
    section.append(createEmptyMessage(emptyMessage));
    return;
  }

  section.append(createCardGallery(cardElements));
};

const renderSetSection = (state: GameState): HTMLDivElement => {
  const section = createSection('セット');
  const total = state.meta?.composition?.set ?? CARD_COMPOSITION.set;
  const opened = state.set.opened.length;
  const remaining = Math.max(total - opened, 0);
  const hiddenSetCards = state.set.cards.filter((setCard) => setCard.card.face !== 'up');
  const closed = hiddenSetCards.length > 0 ? hiddenSetCards.length : remaining;

  const cardElements: HTMLElement[] = [];
  state.set.opened
    .filter((reveal) => !reveal.assignedTo)
    .slice()
    .sort((a, b) => a.openedAt - b.openedAt)
    .forEach((reveal) => {
      const cardComponent = new CardComponent({
        rank: reveal.card.rank,
        suit: reveal.card.suit,
        faceDown: reveal.card.face !== 'up',
        annotation: reveal.card.annotation,
      });
      if (reveal.card.face === 'up') {
        cardComponent.el.setAttribute('aria-label', formatCardLabel(reveal.card));
      }
      cardElements.push(cardComponent.el);
    });

  for (let index = 0; index < closed; index += 1) {
    const hiddenCard = new CardComponent({
      rank: '?',
      suit: 'spades',
      faceDown: true,
    });
    cardElements.push(hiddenCard.el);
  }

  appendCardGallery(section, cardElements, '表示できるカードはありません。');
  return section;
};

const renderBackstageSection = (state: GameState): HTMLDivElement => {
  const section = createSection('バックステージ');
  const items = state.backstage?.items ?? [];
  if (items.length === 0) {
    section.append(createEmptyMessage('表示できるカードはありません。'));
    return section;
  }

  const remainingItems = items.filter((item) => item.stagePairId == null);

  const publicItems = remainingItems
    .filter((item) => item.isPublic)
    .sort((a, b) => {
      const timeDiff = (a.revealedAt ?? Number.MAX_SAFE_INTEGER) - (b.revealedAt ?? Number.MAX_SAFE_INTEGER);
      if (timeDiff !== 0) {
        return timeDiff;
      }
      return a.position - b.position;
    });

  const hiddenCount = remainingItems.length - publicItems.length;

  const cardElements: HTMLElement[] = [];
  publicItems.forEach((item) => {
    const cardComponent = new CardComponent({
      rank: item.card.rank,
      suit: item.card.suit,
      faceDown: !item.isPublic,
      annotation: item.card.annotation,
    });
    const cardLabel = formatCardLabel(item.card);
    const locationLabel = formatBackstageLocation(state, item);
    cardComponent.el.setAttribute('aria-label', `${cardLabel}（${locationLabel}）`);
    cardElements.push(cardComponent.el);
  });

  for (let index = 0; index < hiddenCount; index += 1) {
    const hiddenCard = new CardComponent({
      rank: '?',
      suit: 'spades',
      faceDown: true,
    });
    hiddenCard.el.setAttribute('aria-label', '秘匿アイテム');
    cardElements.push(hiddenCard.el);
  }

  appendCardGallery(section, cardElements, '表示できるカードはありません。');
  return section;
};

const renderSetBackstageTab = (state: GameState): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'board-check__content';
  container.append(renderSetSection(state), renderBackstageSection(state));
  return container;
};

const createStageCardElement = (placement: StageCardPlacement | undefined): HTMLElement | null => {
  if (!placement) {
    return null;
  }

  const isFaceDown = placement.card.face !== 'up';
  const card = new CardComponent({
    rank: placement.card.rank,
    suit: placement.card.suit,
    faceDown: isFaceDown,
    annotation: placement.card.annotation,
  });

  if (!isFaceDown) {
    const cardLabel = formatCardLabel(placement.card);
    card.el.setAttribute('aria-label', cardLabel);
  }

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

  let hasAnyCard = false;
  pairs.forEach((pair) => {
    const item = document.createElement('li');
    item.className = 'board-check__stage-card-group';

    [pair.actor, pair.kuroko].forEach((placement) => {
      const cardElement = createStageCardElement(placement);
      if (cardElement) {
        hasAnyCard = true;
        item.append(cardElement);
      }
    });

    if (item.childElementCount > 0) {
      list.append(item);
    }
  });

  if (!hasAnyCard) {
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

  const luminaStageName = getPlayerName(state, 'lumina') ?? DEFAULT_PLAYER_NAMES.lumina;
  const noxStageName = getPlayerName(state, 'nox') ?? DEFAULT_PLAYER_NAMES.nox;
  const luminaStageLabel = `${luminaStageName}のステージ`;
  const noxStageLabel = `${noxStageName}のステージ`;

  layout.append(
    renderStageColumn(state, 'lumina', luminaStageLabel),
    renderStageColumn(state, 'nox', noxStageLabel),
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

  private readonly panels = new Map<BoardCheckTabKey, HTMLDivElement>();

  private readonly tabOrder: BoardCheckTabKey[];

  private readonly tabIdPrefix: string;

  constructor(state: GameState, initialTab: BoardCheckTabKey) {
    super(document.createElement('div'));
    this.tabOrder = TAB_DEFINITIONS.map((definition) => definition.key);
    this.tabIdPrefix = `board-check-${Math.random().toString(36).slice(2, 10)}`;
    this.element.className = 'board-check';
    this.render(state, initialTab);
  }

  private render(state: GameState, initialTab: BoardCheckTabKey): void {
    const tabs = document.createElement('div');
    tabs.className = 'board-check__tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.addEventListener('keydown', this.handleTabKeyDown);

    const panelWrapper = document.createElement('div');
    panelWrapper.className = 'board-check__panels';

    TAB_DEFINITIONS.forEach((definition) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'board-check__tab';
      button.textContent = definition.label;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', 'false');
      button.dataset.tabKey = definition.key;
      button.tabIndex = -1;
      const buttonId = `${this.tabIdPrefix}-tab-${definition.key}`;
      const panelId = `${this.tabIdPrefix}-panel-${definition.key}`;
      button.id = buttonId;
      button.setAttribute('aria-controls', panelId);
      button.addEventListener('click', () => this.setActiveTab(definition.key));

      this.tabButtons.set(definition.key, button);
      tabs.append(button);

      const panel = document.createElement('div');
      panel.className = 'board-check__panel';
      panel.setAttribute('role', 'tabpanel');
      panel.hidden = true;
      panel.id = panelId;
      panel.setAttribute('aria-labelledby', buttonId);
      panel.tabIndex = 0;
      panel.append(definition.render(state));

      this.panels.set(definition.key, panel);
      panelWrapper.append(panel);
    });

    this.element.append(tabs, panelWrapper);
    this.setActiveTab(initialTab);
  }

  private setActiveTab(key: BoardCheckTabKey, options: { focus?: boolean } = {}): void {
    const fallback = TAB_DEFINITIONS[0]?.key ?? 'overview';
    const target = this.tabButtons.has(key) ? key : fallback;

    this.tabButtons.forEach((button, tabKey) => {
      const isActive = tabKey === target;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
      button.tabIndex = isActive ? 0 : -1;
    });

    this.panels.forEach((panel, tabKey) => {
      const shouldHide = tabKey !== target;
      panel.hidden = shouldHide;
      panel.setAttribute('aria-hidden', shouldHide ? 'true' : 'false');
    });

    if (options.focus) {
      const activeButton = this.tabButtons.get(target);
      activeButton?.focus({ preventScroll: true });
    }
  }

  private handleTabKeyDown = (event: KeyboardEvent): void => {
    if (!(event.target instanceof HTMLButtonElement)) {
      return;
    }

    const currentKey = event.target.dataset.tabKey as BoardCheckTabKey | undefined;
    if (!currentKey) {
      return;
    }

    const currentIndex = this.tabOrder.indexOf(currentKey);
    if (currentIndex === -1 || this.tabOrder.length === 0) {
      return;
    }

    let nextKey: BoardCheckTabKey | null = null;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown': {
        nextKey = this.tabOrder[(currentIndex + 1) % this.tabOrder.length];
        break;
      }
      case 'ArrowLeft':
      case 'ArrowUp': {
        nextKey = this.tabOrder[(currentIndex - 1 + this.tabOrder.length) % this.tabOrder.length];
        break;
      }
      case 'Home': {
        nextKey = this.tabOrder[0];
        break;
      }
      case 'End': {
        nextKey = this.tabOrder[this.tabOrder.length - 1];
        break;
      }
      default:
        return;
    }

    if (!nextKey || nextKey === currentKey) {
      return;
    }

    event.preventDefault();
    this.setActiveTab(nextKey, { focus: true });
  };
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
  const fallback = TAB_DEFINITIONS[0]?.key ?? 'overview';
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
