import { UIButton } from '../ui/button.js';
import { CardComponent } from '../ui/card.js';
import type { CardSuit } from '../ui/card.js';

export interface CurtainCallCardViewModel {
  id: string;
  rank: string;
  suit: CardSuit;
  annotation?: string;
  label?: string;
}

export interface CurtainCallCardListViewModel {
  label: string;
  cards: CurtainCallCardViewModel[];
  emptyMessage?: string;
}

export interface CurtainCallBreakdownRow {
  label: string;
  value: string;
}

export type CurtainCallFinalTrend = 'positive' | 'negative' | 'zero';

export interface CurtainCallFinalViewModel {
  label: string;
  value: string;
  trend: CurtainCallFinalTrend;
}

export interface CurtainCallBooProgressViewModel {
  label: string;
  value: string;
}

export interface CurtainCallPlayerSummaryViewModel {
  id: string;
  name: string;
  breakdown: CurtainCallBreakdownRow[];
  final: CurtainCallFinalViewModel;
  booProgress: CurtainCallBooProgressViewModel;
  kami: CurtainCallCardListViewModel;
  hand: CurtainCallCardListViewModel;
}

export interface CurtainCallResultViewModel {
  label: string;
  description?: string;
}

export interface CurtainCallViewOptions {
  title: string;
  result: CurtainCallResultViewModel;
  players: CurtainCallPlayerSummaryViewModel[];
  boardCheckLabel?: string;
  homeLabel?: string;
  newGameLabel?: string;
  saveLabel?: string;
  saveDisabled?: boolean;
  onOpenBoardCheck?: () => void;
  onGoHome?: () => void;
  onStartNewGame?: () => void;
  onSaveResult?: () => void;
}

export interface CurtainCallViewElement extends HTMLElement {
  updateResult: (result: CurtainCallResultViewModel) => void;
  updatePlayers: (players: CurtainCallPlayerSummaryViewModel[]) => void;
  setSaveDisabled: (disabled: boolean) => void;
}

const DEFAULT_BOARD_CHECK_LABEL = 'ボードチェック';
const DEFAULT_HOME_LABEL = 'HOME';
const DEFAULT_NEW_GAME_LABEL = '新しいゲーム';
const DEFAULT_SAVE_LABEL = '結果の保存';
const DEFAULT_EMPTY_MESSAGE = 'カードはありません。';

const renderCardList = (viewModel: CurtainCallCardListViewModel): HTMLElement => {
  const section = document.createElement('section');
  section.className = 'curtaincall-cards';

  const heading = document.createElement('h3');
  heading.className = 'curtaincall-cards__heading';
  heading.textContent = viewModel.label;
  section.append(heading);

  if (viewModel.cards.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'curtaincall-cards__empty';
    empty.textContent = viewModel.emptyMessage ?? DEFAULT_EMPTY_MESSAGE;
    section.append(empty);
    return section;
  }

  const list = document.createElement('div');
  list.className = 'curtaincall-cards__list';

  viewModel.cards.forEach((card) => {
    const cardComponent = new CardComponent({
      rank: card.rank,
      suit: card.suit,
      faceDown: false,
      annotation: card.annotation ?? card.label,
    });
    cardComponent.el.classList.add('curtaincall-cards__card');
    cardComponent.el.dataset.cardId = card.id;

    if (card.label) {
      cardComponent.el.setAttribute('aria-label', card.label);
      if (!card.annotation) {
        cardComponent.el.title = card.label;
      }
    }

    list.append(cardComponent.el);
  });

  section.append(list);
  return section;
};

const renderBreakdown = (rows: CurtainCallBreakdownRow[]): HTMLElement => {
  const list = document.createElement('dl');
  list.className = 'curtaincall-player__breakdown';

  rows.forEach((row) => {
    const item = document.createElement('div');
    item.className = 'curtaincall-player__row';

    const label = document.createElement('dt');
    label.className = 'curtaincall-player__label';
    label.textContent = row.label;

    const value = document.createElement('dd');
    value.className = 'curtaincall-player__value';
    value.textContent = row.value;

    item.append(label, value);
    list.append(item);
  });

  return list;
};

const renderFinal = (final: CurtainCallFinalViewModel): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'curtaincall-player__final';

  const label = document.createElement('span');
  label.className = 'curtaincall-player__final-label';
  label.textContent = final.label;

  const value = document.createElement('span');
  value.className = 'curtaincall-player__final-value';
  value.textContent = final.value;
  value.dataset.trend = final.trend;

  container.append(label, value);
  return container;
};

const renderBooProgress = (booProgress: CurtainCallBooProgressViewModel): HTMLElement => {
  const paragraph = document.createElement('p');
  paragraph.className = 'curtaincall-player__boo';

  const label = document.createElement('span');
  label.className = 'curtaincall-player__boo-label';
  label.textContent = `${booProgress.label}：`;

  const value = document.createElement('span');
  value.className = 'curtaincall-player__boo-value';
  value.textContent = booProgress.value;

  paragraph.append(label, value);
  return paragraph;
};

const renderPlayerCard = (viewModel: CurtainCallPlayerSummaryViewModel): HTMLElement => {
  const card = document.createElement('article');
  card.className = 'curtaincall-player';
  card.dataset.playerId = viewModel.id;

  const name = document.createElement('h2');
  name.className = 'curtaincall-player__name';
  name.textContent = viewModel.name;
  card.append(name);

  card.append(renderBreakdown(viewModel.breakdown));
  card.append(renderFinal(viewModel.final));
  card.append(renderBooProgress(viewModel.booProgress));
  card.append(renderCardList(viewModel.kami));
  card.append(renderCardList(viewModel.hand));

  return card;
};

export const createCurtainCallView = (options: CurtainCallViewOptions): CurtainCallViewElement => {
  const section = document.createElement('section') as CurtainCallViewElement;
  section.className = 'view curtaincall-view';

  const main = document.createElement('main');
  main.className = 'curtaincall';
  section.append(main);

  const header = document.createElement('div');
  header.className = 'curtaincall__header';
  main.append(header);

  const heading = document.createElement('h1');
  heading.className = 'curtaincall__title';
  heading.id = 'curtaincall-view-title';
  heading.textContent = options.title;
  header.append(heading);
  main.setAttribute('aria-labelledby', heading.id);

  if (options.onOpenBoardCheck) {
    const boardCheckButton = new UIButton({
      label: options.boardCheckLabel ?? DEFAULT_BOARD_CHECK_LABEL,
      variant: 'ghost',
      preventRapid: false,
    });
    boardCheckButton.el.classList.add('curtaincall__boardcheck-button');
    boardCheckButton.onClick(() => options.onOpenBoardCheck?.());
    header.append(boardCheckButton.el);
  }

  const result = document.createElement('div');
  result.className = 'curtaincall__result';
  main.append(result);

  const resultLabel = document.createElement('p');
  resultLabel.className = 'curtaincall__result-label';
  resultLabel.textContent = options.result.label;
  result.append(resultLabel);

  const resultDescription = document.createElement('p');
  resultDescription.className = 'curtaincall__result-description';
  if (options.result.description) {
    resultDescription.textContent = options.result.description;
  } else {
    resultDescription.hidden = true;
  }
  result.append(resultDescription);

  const summary = document.createElement('div');
  summary.className = 'curtaincall-summary';
  main.append(summary);

  const renderPlayers = (players: CurtainCallPlayerSummaryViewModel[]): void => {
    const items = players.map((player) => renderPlayerCard(player));
    summary.replaceChildren(...items);
  };

  renderPlayers(options.players);

  const actions = document.createElement('div');
  actions.className = 'curtaincall__actions';
  main.append(actions);

  const homeButton = new UIButton({
    label: options.homeLabel ?? DEFAULT_HOME_LABEL,
    variant: 'ghost',
  });
  homeButton.el.classList.add('curtaincall__action-button');
  homeButton.onClick(() => options.onGoHome?.());
  actions.append(homeButton.el);

  const newGameButton = new UIButton({
    label: options.newGameLabel ?? DEFAULT_NEW_GAME_LABEL,
    variant: 'primary',
  });
  newGameButton.el.classList.add('curtaincall__action-button', 'curtaincall__action-button--primary');
  newGameButton.onClick(() => options.onStartNewGame?.());
  actions.append(newGameButton.el);

  const saveButton = new UIButton({
    label: options.saveLabel ?? DEFAULT_SAVE_LABEL,
    variant: 'ghost',
  });
  saveButton.el.classList.add('curtaincall__action-button');
  saveButton.setDisabled(Boolean(options.saveDisabled));
  saveButton.onClick(() => options.onSaveResult?.());
  actions.append(saveButton.el);

  section.updateResult = (resultViewModel) => {
    resultLabel.textContent = resultViewModel.label;
    if (resultViewModel.description) {
      resultDescription.textContent = resultViewModel.description;
      resultDescription.hidden = false;
    } else {
      resultDescription.textContent = '';
      resultDescription.hidden = true;
    }
  };

  section.updatePlayers = (players) => {
    renderPlayers(players);
  };

  section.setSaveDisabled = (disabled) => {
    saveButton.setDisabled(disabled);
  };

  return section;
};
