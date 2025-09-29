import { UIButton } from '../ui/button.js';
import { CardComponent, type CardSuit } from '../ui/card.js';

export interface BackstageRevealItemViewModel {
  id: string;
  order: number;
  rank: string;
  suit: CardSuit;
  annotation?: string | null;
}

export interface BackstageViewContent {
  hasAction: boolean;
  message: string;
  instruction?: string | null;
  items: BackstageRevealItemViewModel[];
}

export interface BackstageViewOptions {
  title: string;
  subtitle: string;
  content: BackstageViewContent;
  notes?: string[];
  confirmLabel: string;
  skipLabel: string;
  revealLabel: string;
  boardCheckLabel?: string;
  helpLabel?: string;
  helpAriaLabel?: string;
  summaryLabel?: string;
  myHandLabel?: string;
  onConfirmSelection?: (itemIds: string[]) => void;
  onSkip?: () => void;
  onOpenBoardCheck?: () => void;
  onOpenSummary?: () => void;
  onOpenMyHand?: () => void;
  onOpenHelp?: () => void;
}

export interface BackstageViewElement extends HTMLElement {
  updateSubtitle: (subtitle: string) => void;
  updateContent: (content: BackstageViewContent) => void;
  updateNotes: (notes: string[]) => void;
}

const CARD_ORDER_LABEL = (order: number): string => `カード ${String(order).padStart(2, '0')}`;

const createBackstageRevealListItem = (
  item: BackstageRevealItemViewModel,
  revealLabel: string,
  onSelect: (itemId: string) => void,
): HTMLLIElement => {
  const listItem = document.createElement('li');
  listItem.className = 'intermission-backstage__item';
  listItem.dataset.itemId = item.id;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'intermission-backstage__button';
  button.dataset.itemId = item.id;
  button.addEventListener('click', () => onSelect(item.id));
  button.setAttribute('aria-label', `${revealLabel}：${CARD_ORDER_LABEL(item.order)}`);

  const cardComponent = new CardComponent({
    rank: item.rank,
    suit: item.suit,
    faceDown: true,
    annotation: item.annotation ?? undefined,
  });
  cardComponent.el.classList.add('intermission-backstage__card');
  button.append(cardComponent.el);

  listItem.append(button);
  return listItem;
};

export const createBackstageView = (options: BackstageViewOptions): BackstageViewElement => {
  const section = document.createElement('section');
  section.className = 'view backstage-view';

  const main = document.createElement('main');
  main.className = 'backstage';
  section.append(main);

  const header = document.createElement('header');
  header.className = 'backstage__header';
  main.append(header);

  const heading = document.createElement('h1');
  heading.className = 'backstage__title';
  heading.id = 'backstage-view-title';
  heading.textContent = options.title;
  header.append(heading);
  main.setAttribute('aria-labelledby', heading.id);

  const subtitle = document.createElement('p');
  subtitle.className = 'backstage__subtitle';
  subtitle.textContent = options.subtitle;
  header.append(subtitle);

  const headerActions = document.createElement('div');
  headerActions.className = 'backstage__header-actions';

  if (options.onOpenBoardCheck) {
    const boardCheckButton = new UIButton({
      label: options.boardCheckLabel ?? 'ボードチェック',
      variant: 'ghost',
      preventRapid: true,
    });
    boardCheckButton.el.classList.add('backstage__header-button');
    boardCheckButton.onClick(() => options.onOpenBoardCheck?.());
    headerActions.append(boardCheckButton.el);
  }

  if (options.onOpenMyHand) {
    const myHandButton = new UIButton({
      label: options.myHandLabel ?? '自分の手札',
      variant: 'ghost',
      preventRapid: true,
    });
    myHandButton.el.classList.add('backstage__header-button');
    myHandButton.onClick(() => options.onOpenMyHand?.());
    headerActions.append(myHandButton.el);
  }

  if (options.onOpenSummary) {
    const summaryButton = new UIButton({
      label: options.summaryLabel ?? '前ラウンド要約',
      variant: 'ghost',
      preventRapid: true,
    });
    summaryButton.el.classList.add('backstage__header-button');
    summaryButton.onClick(() => options.onOpenSummary?.());
    headerActions.append(summaryButton.el);
  }

  if (options.onOpenHelp) {
    const helpButton = new UIButton({
      label: options.helpLabel ?? 'ヘルプ',
      variant: 'ghost',
      preventRapid: true,
    });
    helpButton.el.classList.add('backstage__header-button', 'backstage__header-button--help');
    const helpAriaLabel = options.helpAriaLabel ?? options.helpLabel ?? 'ヘルプ';
    helpButton.el.setAttribute('aria-label', helpAriaLabel);
    helpButton.el.title = helpAriaLabel;
    helpButton.onClick(() => options.onOpenHelp?.());
    headerActions.append(helpButton.el);
  }

  if (headerActions.childElementCount > 0) {
    header.append(headerActions);
  }

  const body = document.createElement('section');
  body.className = 'backstage__body';
  main.append(body);

  const contentContainer = document.createElement('section');
  contentContainer.className = 'intermission-backstage';
  body.append(contentContainer);

  const contentTitle = document.createElement('h2');
  contentTitle.className = 'intermission-backstage__title';
  contentTitle.textContent = options.title;
  contentContainer.append(contentTitle);

  const message = document.createElement('p');
  message.className = 'intermission-backstage__message';
  contentContainer.append(message);

  const instruction = document.createElement('p');
  instruction.className = 'intermission-backstage__instruction';
  contentContainer.append(instruction);

  const list = document.createElement('ul');
  list.className = 'intermission-backstage__list';
  contentContainer.append(list);

  const actions = document.createElement('div');
  actions.className = 'intermission-backstage__actions';
  contentContainer.append(actions);

  const confirmButton = new UIButton({
    label: options.confirmLabel,
    preventRapid: true,
    disabled: true,
  });
  actions.append(confirmButton.el);

  const skipButton = new UIButton({
    label: options.skipLabel,
    variant: 'ghost',
    preventRapid: true,
  });
  skipButton.onClick(() => options.onSkip?.());
  actions.append(skipButton.el);

  const notesContainer = document.createElement('div');
  notesContainer.className = 'backstage__notes';
  body.append(notesContainer);

  let selectedItemIds = new Set<string>();
  let hasAction = options.content.hasAction;
  const buttonMap = new Map<string, HTMLButtonElement>();

  const applySelection = (nextSelection: Set<string>) => {
    selectedItemIds = nextSelection;
    buttonMap.forEach((button, id) => {
      button.classList.toggle('intermission-backstage__button--selected', selectedItemIds.has(id));
    });
    confirmButton.setDisabled(selectedItemIds.size === 0 || !hasAction);
  };

  const toggleSelection = (itemId: string) => {
    const next = new Set(selectedItemIds);
    if (next.has(itemId)) {
      next.delete(itemId);
      applySelection(next);
      return;
    }

    if (next.size >= 3) {
      return;
    }

    next.add(itemId);
    applySelection(next);
  };

  const rebuildList = (items: BackstageRevealItemViewModel[]): void => {
    buttonMap.clear();
    list.replaceChildren();

    items.forEach((item) => {
      const listItem = createBackstageRevealListItem(item, options.revealLabel, toggleSelection);
      list.append(listItem);
      const button = listItem.querySelector<HTMLButtonElement>('button');
      if (button) {
        buttonMap.set(item.id, button);
      }
    });

    const nextSelection = new Set<string>();
    selectedItemIds.forEach((itemId) => {
      if (items.some((item) => item.id === itemId)) {
        nextSelection.add(itemId);
      }
    });
    applySelection(nextSelection);
  };

  const clearSelection = () => {
    applySelection(new Set());
  };

  const handleConfirm = () => {
    if (selectedItemIds.size === 0) {
      return;
    }
    options.onConfirmSelection?.(Array.from(selectedItemIds));
    clearSelection();
  };

  confirmButton.onClick(handleConfirm);

  const applyContent = (content: BackstageViewContent): void => {
    hasAction = content.hasAction;
    message.textContent = content.message;

    if (content.hasAction && content.instruction) {
      instruction.hidden = false;
      instruction.textContent = content.instruction ?? '';
    } else {
      instruction.hidden = true;
      instruction.textContent = '';
    }

    rebuildList(content.hasAction ? content.items : []);

    if (content.hasAction) {
      list.hidden = false;
      confirmButton.el.hidden = false;
      confirmButton.el.removeAttribute('aria-hidden');
      confirmButton.setDisabled(selectedItemIds.size === 0 || !hasAction);
    } else {
      list.hidden = true;
      confirmButton.el.hidden = true;
      confirmButton.el.setAttribute('aria-hidden', 'true');
      clearSelection();
    }
  };

  const applyNotes = (notes: string[]): void => {
    notesContainer.replaceChildren();
    if (notes.length === 0) {
      notesContainer.hidden = true;
      return;
    }
    notesContainer.hidden = false;
    notes.forEach((noteText) => {
      const note = document.createElement('p');
      note.className = 'intermission-backstage__note';
      note.textContent = noteText;
      notesContainer.append(note);
    });
  };

  applyContent(options.content);
  applyNotes(options.notes ?? []);

  return Object.assign(section, {
    updateSubtitle(nextSubtitle: string) {
      subtitle.textContent = nextSubtitle;
    },
    updateContent(nextContent: BackstageViewContent) {
      applyContent(nextContent);
    },
    updateNotes(nextNotes: string[]) {
      applyNotes(nextNotes);
    },
  });
};
