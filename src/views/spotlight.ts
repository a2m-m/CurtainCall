import { UIButton } from '../ui/button.js';
import { CardComponent } from '../ui/card.js';
import type { CardSuit } from '../ui/card.js';

export interface SpotlightStageCardViewModel {
  rank: string;
  suit: CardSuit;
  faceDown?: boolean;
  annotation?: string;
  description?: string;
}

export interface SpotlightStageViewModel {
  actorLabel: string;
  actorCard?: SpotlightStageCardViewModel | null;
  actorEmptyMessage?: string;
  kurokoLabel: string;
  kurokoCard?: SpotlightStageCardViewModel | null;
  kurokoEmptyMessage?: string;
}

export interface SpotlightViewOptions {
  title: string;
  stage: SpotlightStageViewModel;
  revealLabel?: string;
  revealDisabled?: boolean;
  revealCaption?: string;
  boardCheckLabel?: string;
  helpLabel?: string;
  helpAriaLabel?: string;
  onReveal?: () => void;
  onOpenBoardCheck?: () => void;
  onOpenHelp?: () => void;
}

export interface SpotlightViewElement extends HTMLElement {
  updateStage: (stage: SpotlightStageViewModel) => void;
  setRevealDisabled: (disabled: boolean) => void;
  updateRevealCaption: (caption?: string | null) => void;
}

const DEFAULT_EMPTY_MESSAGE = 'カードが配置されていません。';
const DEFAULT_REVEAL_LABEL = '黒子を公開する';

interface SpotlightCardSlotElements {
  slot: HTMLDivElement;
  heading: HTMLHeadingElement;
  card: CardComponent;
  placeholder: HTMLDivElement;
  description: HTMLParagraphElement;
}

const createCardSlot = (
  label: string,
  options: { emptyMessage?: string } = {},
): SpotlightCardSlotElements => {
  const slot = document.createElement('div');
  slot.className = 'spotlight-stage__slot';

  const heading = document.createElement('h2');
  heading.className = 'spotlight-stage__heading';
  heading.textContent = label;
  slot.append(heading);

  const wrapper = document.createElement('div');
  wrapper.className = 'spotlight-stage__card-wrapper';
  slot.append(wrapper);

  const card = new CardComponent({ rank: '?', suit: 'spades', faceDown: true });
  card.el.classList.add('spotlight-stage__card');
  wrapper.append(card.el);

  const placeholder = document.createElement('div');
  placeholder.className = 'spotlight-stage__placeholder';
  placeholder.textContent = options.emptyMessage ?? DEFAULT_EMPTY_MESSAGE;
  placeholder.hidden = true;
  wrapper.append(placeholder);

  const description = document.createElement('p');
  description.className = 'spotlight-stage__description';
  description.hidden = true;
  slot.append(description);

  return { slot, heading, card, placeholder, description };
};

const updateCardSlot = (
  elements: SpotlightCardSlotElements,
  viewModel: SpotlightStageCardViewModel | null | undefined,
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
    elements.card.el.removeAttribute('title');
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

export const createSpotlightView = (options: SpotlightViewOptions): SpotlightViewElement => {
  const section = document.createElement('section');
  section.className = 'view spotlight-view';

  const main = document.createElement('main');
  main.className = 'spotlight';
  section.append(main);

  const header = document.createElement('div');
  header.className = 'spotlight__header';
  main.append(header);

  const heading = document.createElement('h1');
  heading.className = 'spotlight__title';
  heading.id = 'spotlight-view-title';
  heading.textContent = options.title;
  header.append(heading);
  main.setAttribute('aria-labelledby', heading.id);

  const headerActions = document.createElement('div');
  headerActions.className = 'spotlight__header-actions';

  if (options.onOpenBoardCheck) {
    const boardCheckButton = new UIButton({
      label: options.boardCheckLabel ?? 'ボードチェック',
      variant: 'ghost',
      preventRapid: false,
    });
    boardCheckButton.el.classList.add('spotlight__header-button');
    boardCheckButton.onClick(() => options.onOpenBoardCheck?.());
    headerActions.append(boardCheckButton.el);
  }

  if (options.onOpenHelp) {
    const helpButton = new UIButton({
      label: options.helpLabel ?? 'ヘルプ',
      variant: 'ghost',
      preventRapid: false,
    });
    helpButton.el.classList.add('spotlight__header-button', 'spotlight__header-button--help');
    const ariaLabel = options.helpAriaLabel ?? 'ヘルプ';
    helpButton.el.setAttribute('aria-label', ariaLabel);
    helpButton.el.title = ariaLabel;
    helpButton.onClick(() => options.onOpenHelp?.());
    headerActions.append(helpButton.el);
  }

  if (headerActions.childElementCount > 0) {
    header.append(headerActions);
  }

  const stageSection = document.createElement('section');
  stageSection.className = 'spotlight-stage';
  main.append(stageSection);

  const stageGrid = document.createElement('div');
  stageGrid.className = 'spotlight-stage__slots';
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
  actions.className = 'spotlight-actions';
  main.append(actions);

  const revealButton = new UIButton({
    label: options.revealLabel ?? DEFAULT_REVEAL_LABEL,
    variant: 'primary',
    disabled: Boolean(options.revealDisabled),
  });
  revealButton.el.classList.add('spotlight-actions__button');
  revealButton.onClick(() => options.onReveal?.());
  actions.append(revealButton.el);

  const revealCaption = document.createElement('p');
  revealCaption.className = 'spotlight-actions__caption';
  if (options.revealCaption) {
    revealCaption.textContent = options.revealCaption;
  } else {
    revealCaption.hidden = true;
  }
  actions.append(revealCaption);

  const applyStage = (stage: SpotlightStageViewModel) => {
    actorSlot.heading.textContent = stage.actorLabel;
    updateCardSlot(actorSlot, stage.actorCard ?? null, stage.actorEmptyMessage);

    kurokoSlot.heading.textContent = stage.kurokoLabel;
    if (stage.kurokoCard) {
      updateCardSlot(kurokoSlot, stage.kurokoCard, stage.kurokoEmptyMessage);
    } else {
      updateCardSlot(kurokoSlot, null, stage.kurokoEmptyMessage);
    }
  };

  applyStage(options.stage);

  const view = section as SpotlightViewElement;
  view.updateStage = (stage) => applyStage(stage);
  view.setRevealDisabled = (disabled) => {
    revealButton.setDisabled(disabled);
  };
  view.updateRevealCaption = (caption) => {
    if (caption) {
      revealCaption.hidden = false;
      revealCaption.textContent = caption;
      return;
    }
    revealCaption.hidden = true;
    revealCaption.textContent = '';
  };

  return view;
};
