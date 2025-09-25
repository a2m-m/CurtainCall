import { UIButton } from '../ui/button.js';
import { CardComponent } from '../ui/card.js';
import type { CardSuit } from '../ui/card.js';

export interface WatchStageCardViewModel {
  rank: string;
  suit: CardSuit;
  faceDown?: boolean;
  annotation?: string;
  description?: string;
}

export interface WatchStageViewModel {
  actorLabel: string;
  actorCard?: WatchStageCardViewModel | null;
  actorEmptyMessage?: string;
  kurokoLabel: string;
  kurokoCard?: WatchStageCardViewModel | null;
  kurokoEmptyMessage?: string;
}

export interface WatchStatusViewModel {
  turnLabel: string;
  booLabel: string;
  remainingLabel: string;
  forced: boolean;
  forcedLabel?: string;
  clapDisabled: boolean;
  clapDisabledReason?: string;
}

export interface WatchViewOptions {
  title: string;
  status: WatchStatusViewModel;
  stage: WatchStageViewModel;
  boardCheckLabel?: string;
  myHandLabel?: string;
  helpLabel?: string;
  helpAriaLabel?: string;
  clapLabel?: string;
  booLabel?: string;
  onClap?: () => void;
  onBoo?: () => void;
  onOpenBoardCheck?: () => void;
  onOpenMyHand?: () => void;
  onOpenHelp?: () => void;
}

export interface WatchViewElement extends HTMLElement {
  updateStatus: (status: WatchStatusViewModel) => void;
  updateStage: (stage: WatchStageViewModel) => void;
}

const DEFAULT_EMPTY_MESSAGE = 'カードが配置されていません。';
const DEFAULT_FORCED_LABEL = 'ブーイング必須';
const DEFAULT_CLAP_LABEL = 'クラップ（同数）';
const DEFAULT_BOO_LABEL = 'ブーイング（異なる）';

interface WatchCardSlotElements {
  slot: HTMLDivElement;
  card: CardComponent;
  placeholder: HTMLDivElement;
  description: HTMLParagraphElement;
}

const createCardSlot = (
  label: string,
  options: { emptyMessage?: string },
): WatchCardSlotElements => {
  const slot = document.createElement('div');
  slot.className = 'watch-stage__slot';

  const heading = document.createElement('h2');
  heading.className = 'watch-stage__heading';
  heading.textContent = label;
  slot.append(heading);

  const wrapper = document.createElement('div');
  wrapper.className = 'watch-stage__card-wrapper';
  slot.append(wrapper);

  const card = new CardComponent({ rank: '?', suit: 'spades', faceDown: true });
  card.el.classList.add('watch-stage__card');
  wrapper.append(card.el);

  const placeholder = document.createElement('div');
  placeholder.className = 'watch-stage__placeholder';
  placeholder.textContent = options.emptyMessage ?? DEFAULT_EMPTY_MESSAGE;
  placeholder.hidden = true;
  wrapper.append(placeholder);

  const description = document.createElement('p');
  description.className = 'watch-stage__description';
  description.hidden = true;
  slot.append(description);

  return { slot, card, placeholder, description };
};

const updateCardSlot = (
  elements: WatchCardSlotElements,
  viewModel: WatchStageCardViewModel | null | undefined,
  emptyMessage?: string,
): void => {
  if (!viewModel) {
    elements.slot.classList.add('is-empty');
    elements.card.el.hidden = true;
    elements.card.el.setAttribute('aria-hidden', 'true');
    elements.placeholder.textContent = emptyMessage ?? DEFAULT_EMPTY_MESSAGE;
    elements.placeholder.hidden = false;
    elements.description.hidden = true;
    elements.description.textContent = '';
    return;
  }

  elements.slot.classList.remove('is-empty');
  elements.card.el.hidden = false;
  elements.card.el.removeAttribute('aria-hidden');
  elements.placeholder.hidden = true;

  elements.card.setCard(viewModel.rank, viewModel.suit);
  elements.card.setFaceDown(Boolean(viewModel.faceDown));

  if (viewModel.annotation) {
    elements.card.el.title = viewModel.annotation;
  } else {
    elements.card.el.removeAttribute('title');
  }

  if (viewModel.description) {
    elements.description.hidden = false;
    elements.description.textContent = viewModel.description;
  } else {
    elements.description.hidden = true;
    elements.description.textContent = '';
  }
};

export const createWatchView = (options: WatchViewOptions): WatchViewElement => {
  const section = document.createElement('section');
  section.className = 'view watch-view';

  const main = document.createElement('main');
  main.className = 'watch';
  section.append(main);

  const header = document.createElement('div');
  header.className = 'watch__header';
  main.append(header);

  const heading = document.createElement('h1');
  heading.className = 'watch__title';
  heading.textContent = options.title;
  header.append(heading);

  const headerActions = document.createElement('div');
  headerActions.className = 'watch__header-actions';

  if (options.onOpenBoardCheck) {
    const boardCheckButton = new UIButton({
      label: options.boardCheckLabel ?? 'ボードチェック',
      variant: 'ghost',
      preventRapid: false,
    });
    boardCheckButton.el.classList.add('watch__header-button');
    boardCheckButton.onClick(() => options.onOpenBoardCheck?.());
    headerActions.append(boardCheckButton.el);
  }

  if (options.onOpenMyHand) {
    const myHandButton = new UIButton({
      label: options.myHandLabel ?? '自分の手札',
      variant: 'ghost',
      preventRapid: false,
    });
    myHandButton.el.classList.add('watch__header-button');
    myHandButton.onClick(() => options.onOpenMyHand?.());
    headerActions.append(myHandButton.el);
  }

  if (options.onOpenHelp) {
    const helpButton = new UIButton({
      label: options.helpLabel ?? '？',
      variant: 'ghost',
      preventRapid: false,
    });
    helpButton.el.classList.add('watch__header-button', 'watch__header-button--help');
    const helpAriaLabel = options.helpAriaLabel ?? 'ヘルプ';
    helpButton.el.setAttribute('aria-label', helpAriaLabel);
    helpButton.el.title = helpAriaLabel;
    helpButton.onClick(() => options.onOpenHelp?.());
    headerActions.append(helpButton.el);
  }

  if (headerActions.childElementCount > 0) {
    header.append(headerActions);
  }

  const statusBar = document.createElement('div');
  statusBar.className = 'watch-status';
  main.append(statusBar);

  const turnItem = document.createElement('p');
  turnItem.className = 'watch-status__item';
  statusBar.append(turnItem);

  const booItem = document.createElement('p');
  booItem.className = 'watch-status__item';
  statusBar.append(booItem);

  const remainingItem = document.createElement('p');
  remainingItem.className = 'watch-status__item';
  statusBar.append(remainingItem);

  const forcedBadge = document.createElement('span');
  forcedBadge.className = 'watch-status__badge';
  forcedBadge.hidden = true;
  statusBar.append(forcedBadge);

  const stageSection = document.createElement('section');
  stageSection.className = 'watch-stage';
  main.append(stageSection);

  const stageGrid = document.createElement('div');
  stageGrid.className = 'watch-stage__slots';
  stageSection.append(stageGrid);

  const actorSlot = createCardSlot(options.stage.actorLabel, {
    emptyMessage: options.stage.actorEmptyMessage,
  });
  stageGrid.append(actorSlot.slot);

  const kurokoSlot = createCardSlot(options.stage.kurokoLabel, {
    emptyMessage: options.stage.kurokoEmptyMessage,
  });
  stageGrid.append(kurokoSlot.slot);

  const actions = document.createElement('div');
  actions.className = 'watch-actions';
  main.append(actions);

  const clapButton = new UIButton({
    label: options.clapLabel ?? DEFAULT_CLAP_LABEL,
    variant: 'ghost',
  });
  clapButton.el.classList.add('watch-actions__button', 'watch-actions__button--clap');
  clapButton.onClick(() => options.onClap?.());
  actions.append(clapButton.el);

  const booButton = new UIButton({
    label: options.booLabel ?? DEFAULT_BOO_LABEL,
    variant: 'primary',
  });
  booButton.el.classList.add('watch-actions__button', 'watch-actions__button--boo');
  booButton.onClick(() => options.onBoo?.());
  actions.append(booButton.el);

  const applyStatus = (status: WatchStatusViewModel) => {
    turnItem.textContent = status.turnLabel;
    booItem.textContent = status.booLabel;
    remainingItem.textContent = status.remainingLabel;

    const forcedLabel = status.forcedLabel ?? DEFAULT_FORCED_LABEL;
    forcedBadge.textContent = forcedLabel;
    forcedBadge.hidden = !status.forced;

    clapButton.setDisabled(Boolean(status.clapDisabled));
    if (status.clapDisabled && status.clapDisabledReason) {
      clapButton.el.title = status.clapDisabledReason;
    } else {
      clapButton.el.removeAttribute('title');
    }
  };

  const applyStage = (stage: WatchStageViewModel) => {
    updateCardSlot(actorSlot, stage.actorCard ?? null, stage.actorEmptyMessage);

    if (stage.kurokoCard) {
      updateCardSlot(kurokoSlot, stage.kurokoCard, stage.kurokoEmptyMessage);
      return;
    }

    updateCardSlot(kurokoSlot, null, stage.kurokoEmptyMessage);
  };

  applyStatus(options.status);
  applyStage(options.stage);

  const view = section as WatchViewElement;
  view.updateStatus = (status) => applyStatus(status);
  view.updateStage = (stage) => applyStage(stage);

  return view;
};
