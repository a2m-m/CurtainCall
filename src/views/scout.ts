import { UIButton } from '../ui/button.js';
import { CardComponent } from '../ui/card.js';
import type { CardSuit } from '../ui/card.js';

export interface ScoutOpponentHandCardViewModel {
  id: string;
}

export interface ScoutRecentTakenCardViewModel {
  id: string;
  rank: string;
  suit: CardSuit;
  annotation?: string;
}

export interface ScoutViewOptions {
  title: string;
  opponentLabel?: string;
  cards: ScoutOpponentHandCardViewModel[];
  selectedIndex?: number | null;
  recentTakenCards?: ScoutRecentTakenCardViewModel[];
  recentTakenTitle?: string;
  recentTakenEmptyLabel?: string;
  onSelectCard?: (index: number | null) => void;
  onConfirmSelection?: () => void;
  onClearSelection?: () => void;
  confirmLabel?: string;
  clearLabel?: string;
}

export interface ScoutViewElement extends HTMLElement {
  updateOpponentHand: (
    cards: ScoutOpponentHandCardViewModel[],
    selectedIndex: number | null,
  ) => void;
  updateRecentTaken: (cards: ScoutRecentTakenCardViewModel[]) => void;
}

const CARD_PLACEHOLDER_RANK = '?';
const CARD_PLACEHOLDER_SUIT: CardSuit = 'spades';

export const createScoutView = (options: ScoutViewOptions): ScoutViewElement => {
  const section = document.createElement('section');
  section.className = 'view scout-view';

  const main = document.createElement('main');
  main.className = 'scout';
  section.append(main);

  const heading = document.createElement('h1');
  heading.className = 'scout__title';
  heading.textContent = options.title;
  main.append(heading);

  const opponentTitle = options.opponentLabel
    ? `${options.opponentLabel}の手札`
    : '相手の手札';

  const handSection = document.createElement('section');
  handSection.className = 'scout-hand';

  const handHeader = document.createElement('div');
  handHeader.className = 'scout-hand__header';

  const handTitle = document.createElement('h2');
  handTitle.className = 'scout-hand__title';
  handTitle.textContent = opponentTitle;
  handHeader.append(handTitle);

  const handCount = document.createElement('span');
  handCount.className = 'scout-hand__count';
  handHeader.append(handCount);

  handSection.append(handHeader);

  const handGrid = document.createElement('ul');
  handGrid.className = 'scout-hand__grid';
  handGrid.setAttribute('aria-label', opponentTitle);
  handSection.append(handGrid);

  main.append(handSection);

  const recentSection = document.createElement('section');
  recentSection.className = 'scout-recent';

  const recentTitleText =
    options.recentTakenTitle ?? '最近あなたから取られたカード';
  const recentTitle = document.createElement('h2');
  recentTitle.className = 'scout-recent__title';
  recentTitle.textContent = recentTitleText;
  recentSection.append(recentTitle);

  const recentList = document.createElement('ul');
  recentList.className = 'scout-recent__list';
  recentList.setAttribute('aria-label', recentTitleText);
  recentSection.append(recentList);

  main.append(recentSection);

  let currentCards = options.cards.slice();
  let currentSelectedIndex = options.selectedIndex ?? null;
  let currentRecentTaken = options.recentTakenCards
    ? options.recentTakenCards.slice()
    : [];

  const actions = document.createElement('div');
  actions.className = 'scout-actions';

  const clearButton = new UIButton({
    label: options.clearLabel ?? '選択をクリア',
    variant: 'ghost',
    disabled: currentSelectedIndex === null,
    preventRapid: false,
  });
  clearButton.el.classList.add('scout-actions__button', 'scout-actions__button--secondary');
  clearButton.onClick(() => {
    if (options.onClearSelection) {
      options.onClearSelection();
    } else {
      options.onSelectCard?.(null);
    }
  });

  const confirmButton = new UIButton({
    label: options.confirmLabel ?? 'これを引く',
    variant: 'primary',
    disabled: currentSelectedIndex === null || currentCards.length === 0,
  });
  confirmButton.el.classList.add('scout-actions__button', 'scout-actions__button--primary');
  confirmButton.onClick(() => {
    options.onConfirmSelection?.();
  });

  actions.append(clearButton.el, confirmButton.el);
  main.append(actions);

  const updateCount = (count: number) => {
    handCount.textContent = `${count}枚`;
  };

  const handleSelect = (index: number) => {
    if (index < 0 || index >= currentCards.length) {
      return;
    }
    const next = currentSelectedIndex === index ? null : index;
    options.onSelectCard?.(next);
  };

  const renderCards = (
    cards: ScoutOpponentHandCardViewModel[],
    selectedIndex: number | null,
  ) => {
    handGrid.replaceChildren();

    if (cards.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'scout-hand__empty';
      empty.textContent = 'カードはありません';
      handGrid.append(empty);
      return;
    }

    cards.forEach((_card, index) => {
      const item = document.createElement('li');
      item.className = 'scout-hand__item';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'scout-hand__card-button';
      button.dataset.index = index.toString();
      button.setAttribute('aria-pressed', selectedIndex === index ? 'true' : 'false');
      button.setAttribute('aria-label', `${opponentTitle} ${index + 1}枚目`);

      const cardComponent = new CardComponent({
        rank: CARD_PLACEHOLDER_RANK,
        suit: CARD_PLACEHOLDER_SUIT,
        faceDown: true,
      });
      cardComponent.el.classList.add('scout-hand__card');

      if (selectedIndex === index) {
        button.classList.add('is-selected');
      }

      button.addEventListener('click', () => {
        handleSelect(index);
      });

      button.append(cardComponent.el);
      item.append(button);
      handGrid.append(item);
    });
  };

  const renderRecentTaken = (
    cards: ScoutRecentTakenCardViewModel[],
  ): void => {
    recentList.replaceChildren();

    if (cards.length === 0) {
      const emptyItem = document.createElement('li');
      emptyItem.className = 'scout-recent__empty';
      emptyItem.textContent = options.recentTakenEmptyLabel ?? 'なし';
      recentList.append(emptyItem);
      return;
    }

    cards.forEach((card) => {
      const item = document.createElement('li');
      item.className = 'scout-recent__item';

      const cardComponent = new CardComponent({
        rank: card.rank,
        suit: card.suit,
        faceDown: false,
        annotation: card.annotation,
      });
      cardComponent.el.classList.add('scout-recent__card');

      item.append(cardComponent.el);
      recentList.append(item);
    });
  };

  const view = section as ScoutViewElement;

  view.updateOpponentHand = (cards, selectedIndex) => {
    currentCards = cards.slice();
    currentSelectedIndex = selectedIndex ?? null;
    updateCount(currentCards.length);
    renderCards(currentCards, currentSelectedIndex);
    confirmButton.setDisabled(
      currentSelectedIndex === null || currentCards.length === 0,
    );
    clearButton.setDisabled(currentSelectedIndex === null);
  };

  view.updateRecentTaken = (cards) => {
    currentRecentTaken = cards.slice();
    renderRecentTaken(currentRecentTaken);
  };

  view.updateOpponentHand(currentCards, currentSelectedIndex);
  view.updateRecentTaken(currentRecentTaken);

  return view;
};
