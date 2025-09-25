import { UIButton } from '../ui/button.js';
import { CardComponent } from '../ui/card.js';
import type { CardSuit } from '../ui/card.js';

export interface ActionHandCardViewModel {
  id: string;
  rank: string;
  suit: CardSuit;
  annotation?: string;
  disabled?: boolean;
  recentlyDrawn?: boolean;
}

export interface ActionHandSelectionState {
  selectedCardId: string | null;
  actorCardId: string | null;
  kurokoCardId: string | null;
}

export interface ActionViewOptions {
  title: string;
  handTitle?: string;
  handCards: ActionHandCardViewModel[];
  selectedCardId?: string | null;
  actorCardId?: string | null;
  kurokoCardId?: string | null;
  boardCheckLabel?: string;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  onSelectHandCard?: (cardId: string) => void;
  onOpenBoardCheck?: () => void;
  onConfirm?: () => void;
}

export interface ActionViewElement extends HTMLElement {
  updateHand: (
    cards: ActionHandCardViewModel[],
    selection?: Partial<ActionHandSelectionState>,
  ) => void;
  setSelection: (selection: Partial<ActionHandSelectionState>) => void;
  setConfirmDisabled: (disabled: boolean) => void;
}

const createInitialSelection = (options: ActionViewOptions): ActionHandSelectionState => ({
  selectedCardId: options.selectedCardId ?? null,
  actorCardId: options.actorCardId ?? null,
  kurokoCardId: options.kurokoCardId ?? null,
});

export const createActionView = (options: ActionViewOptions): ActionViewElement => {
  const section = document.createElement('section');
  section.className = 'view action-view';

  const main = document.createElement('main');
  main.className = 'action';
  section.append(main);

  const header = document.createElement('header');
  header.className = 'action__header';

  const heading = document.createElement('h1');
  heading.className = 'action__title';
  heading.textContent = options.title;
  header.append(heading);

  const actions = document.createElement('div');
  actions.className = 'action__actions';

  if (options.onOpenBoardCheck) {
    const boardCheckButton = new UIButton({
      label: options.boardCheckLabel ?? 'ボードチェック',
      variant: 'ghost',
      preventRapid: false,
    });
    boardCheckButton.onClick(() => {
      options.onOpenBoardCheck?.();
    });
    actions.append(boardCheckButton.el);
  }

  const confirmButton = new UIButton({
    label: options.confirmLabel ?? '配置を確定',
    disabled: Boolean(options.confirmDisabled),
  });
  confirmButton.onClick(() => {
    options.onConfirm?.();
  });

  actions.append(confirmButton.el);
  header.append(actions);

  main.append(header);

  const hand = document.createElement('div');
  hand.className = 'action-hand';

  const handHeader = document.createElement('div');
  handHeader.className = 'action-hand__header';

  const handTitle = document.createElement('h2');
  handTitle.className = 'action-hand__title';
  handTitle.textContent = options.handTitle ?? '手札';
  handHeader.append(handTitle);

  hand.append(handHeader);

  const handList = document.createElement('ul');
  handList.className = 'action-hand__list';
  handList.setAttribute('aria-label', handTitle.textContent);
  hand.append(handList);

  section.append(hand);

  let currentCards = options.handCards.slice();
  let currentSelection = createInitialSelection(options);

  const createBadge = (label: string, modifier: string): HTMLSpanElement => {
    const badge = document.createElement('span');
    badge.className = `action-hand__badge action-hand__badge--${modifier}`;
    badge.textContent = label;
    return badge;
  };

  const renderCards = (): void => {
    handList.replaceChildren();

    if (currentCards.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'action-hand__empty';
      empty.textContent = '手札はありません';
      handList.append(empty);
      return;
    }

    currentCards.forEach((card) => {
      const item = document.createElement('li');
      item.className = 'action-hand__item';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'action-hand__card';
      button.disabled = Boolean(card.disabled);

      const cardComponent = new CardComponent({
        rank: card.rank,
        suit: card.suit,
        annotation: card.annotation,
      });
      button.append(cardComponent.el);

      const isSelected = currentSelection.selectedCardId === card.id;
      const isActor = currentSelection.actorCardId === card.id;
      const isKuroko = currentSelection.kurokoCardId === card.id;
      const isRecent = Boolean(card.recentlyDrawn);

      if (isSelected) {
        item.classList.add('is-selected');
        button.setAttribute('aria-pressed', 'true');
      } else {
        button.setAttribute('aria-pressed', 'false');
      }

      if (isActor) {
        item.classList.add('is-actor');
        item.append(createBadge('役者', 'actor'));
      }

      if (isKuroko) {
        item.classList.add('is-kuroko');
        item.append(createBadge('黒子', 'kuroko'));
      }

      if (isRecent) {
        item.classList.add('is-recent');
        const recentLabel = document.createElement('span');
        recentLabel.className = 'action-hand__recent-label';
        recentLabel.textContent = '直前に引いたカード';
        item.append(recentLabel);
      }

      button.addEventListener('click', () => {
        if (card.disabled) {
          return;
        }

        if (options.onSelectHandCard) {
          options.onSelectHandCard(card.id);
          return;
        }

        currentSelection = {
          ...currentSelection,
          selectedCardId: currentSelection.selectedCardId === card.id ? null : card.id,
        };
        renderCards();
      });

      item.append(button);
      handList.append(item);
    });
  };

  const mergeSelection = (
    selection: Partial<ActionHandSelectionState>,
  ): ActionHandSelectionState => ({
    selectedCardId:
      selection.selectedCardId !== undefined
        ? selection.selectedCardId
        : currentSelection.selectedCardId,
    actorCardId:
      selection.actorCardId !== undefined ? selection.actorCardId : currentSelection.actorCardId,
    kurokoCardId:
      selection.kurokoCardId !== undefined ? selection.kurokoCardId : currentSelection.kurokoCardId,
  });

  renderCards();

  const view = section as ActionViewElement;

  view.updateHand = (
    cards: ActionHandCardViewModel[],
    selection?: Partial<ActionHandSelectionState>,
  ) => {
    currentCards = cards.slice();
    if (selection) {
      currentSelection = mergeSelection(selection);
    }
    renderCards();
  };

  view.setSelection = (selection: Partial<ActionHandSelectionState>) => {
    currentSelection = mergeSelection(selection);
    renderCards();
  };

  view.setConfirmDisabled = (disabled: boolean) => {
    confirmButton.setDisabled(disabled);
  };

  if (options.confirmDisabled !== undefined) {
    confirmButton.setDisabled(Boolean(options.confirmDisabled));
  }

  return view;
};
