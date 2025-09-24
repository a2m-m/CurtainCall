import { PlayerId } from '../state.js';
import { UIButton } from '../ui/button.js';

export interface StandbyPlayerConfig {
  id: PlayerId;
  label: string;
  role?: string;
  name: string;
  placeholder?: string;
}

export interface StandbyViewOptions {
  title: string;
  subtitle?: string;
  players: StandbyPlayerConfig[];
  firstPlayer?: PlayerId | null;
  nextPhaseLabel?: string;
  onPlayerNameChange?: (player: PlayerId, name: string) => void;
  onFirstPlayerChange?: (player: PlayerId) => void;
  onStart?: () => void;
  onReturnHome?: () => void;
}

const STANDBY_PROGRESS_DELAY = 1200;

type StandbyOverlayState = 'hidden' | 'progress' | 'completed';

export const createStandbyView = (options: StandbyViewOptions): HTMLElement => {
  const section = document.createElement('section');
  section.className = 'view standby-view';

  const main = document.createElement('main');
  main.className = 'standby';

  const titleId = `standby-title-${Math.random().toString(36).slice(2, 8)}`;

  const heading = document.createElement('h1');
  heading.className = 'standby__title';
  heading.id = titleId;
  heading.textContent = options.title;
  main.append(heading);

  if (options.subtitle) {
    const subtitle = document.createElement('p');
    subtitle.className = 'standby__subtitle';
    subtitle.textContent = options.subtitle;
    main.append(subtitle);
  }

  main.setAttribute('aria-labelledby', titleId);

  const content = document.createElement('div');
  content.className = 'standby__content';

  const playerFieldset = document.createElement('fieldset');
  playerFieldset.className = 'standby__fieldset standby__fieldset--players';

  const playerLegend = document.createElement('legend');
  playerLegend.className = 'standby__legend';
  playerLegend.textContent = 'プレイヤー';
  playerFieldset.append(playerLegend);

  const nameGroup = document.createElement('div');
  nameGroup.className = 'standby__players';

  const uniqueSuffix = Math.random().toString(36).slice(2, 8);

  const playerLabelMap = new Map<PlayerId, string>();

  options.players.forEach((player) => {
    playerLabelMap.set(player.id, player.label);
    const wrapper = document.createElement('div');
    wrapper.className = 'standby-player';

    const label = document.createElement('label');
    label.className = 'standby-player__label';
    const inputId = `standby-player-name-${player.id}-${uniqueSuffix}`;
    label.htmlFor = inputId;

    const labelName = document.createElement('span');
    labelName.className = 'standby-player__name';
    labelName.textContent = player.label;
    label.append(labelName);

    if (player.role) {
      const role = document.createElement('span');
      role.className = 'standby-player__role';
      role.textContent = player.role;
      label.append(role);
    }

    const input = document.createElement('input');
    input.className = 'standby-player__input';
    input.type = 'text';
    input.id = inputId;
    input.name = inputId;
    input.autocomplete = 'off';
    input.value = player.name;
    if (player.placeholder) {
      input.placeholder = player.placeholder;
    }

    input.addEventListener('input', () => {
      options.onPlayerNameChange?.(player.id, input.value);
    });

    wrapper.append(label, input);
    nameGroup.append(wrapper);
  });

  playerFieldset.append(nameGroup);
  content.append(playerFieldset);

  const firstPlayerFieldset = document.createElement('fieldset');
  firstPlayerFieldset.className = 'standby__fieldset standby__fieldset--first-player';

  const firstLegend = document.createElement('legend');
  firstLegend.className = 'standby__legend';
  firstLegend.textContent = '先手';
  firstPlayerFieldset.append(firstLegend);

  const status = document.createElement('p');
  status.className = 'standby__first-player-status';
  firstPlayerFieldset.append(status);

  const firstPlayerName = `standby-first-player-${uniqueSuffix}`;
  let currentFirstPlayer: PlayerId | null = options.firstPlayer ?? null;

  const updateStatus = () => {
    if (currentFirstPlayer && playerLabelMap.has(currentFirstPlayer)) {
      status.textContent = `先手：${playerLabelMap.get(currentFirstPlayer)}`;
    } else {
      status.textContent = '先手：未決定';
    }
  };

  const radioGroup = document.createElement('div');
  radioGroup.className = 'standby__first-player-options';

  const radioOptions: HTMLLabelElement[] = [];

  const updateRadioSelection = () => {
    radioOptions.forEach((option) => {
      const input = option.querySelector<HTMLInputElement>('input[type="radio"]');
      option.classList.toggle('is-selected', Boolean(input?.checked));
    });
  };

  options.players.forEach((player) => {
    const optionId = `standby-first-player-${player.id}-${uniqueSuffix}`;
    const label = document.createElement('label');
    label.className = 'standby-radio';

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = firstPlayerName;
    input.id = optionId;
    input.value = player.id;
    input.className = 'standby-radio__input';
    input.checked = currentFirstPlayer === player.id;

    input.addEventListener('change', () => {
      if (!input.checked) {
        return;
      }
      currentFirstPlayer = player.id;
      updateStatus();
      updateRadioSelection();
      updateStartButtonState();
      options.onFirstPlayerChange?.(player.id);
    });

    const caption = document.createElement('span');
    caption.className = 'standby-radio__caption';
    caption.textContent = `先手：${player.label}`;

    label.append(input, caption);
    radioGroup.append(label);
    radioOptions.push(label);
  });

  firstPlayerFieldset.append(radioGroup);
  content.append(firstPlayerFieldset);

  main.append(content);

  const actions = document.createElement('div');
  actions.className = 'standby__actions';

  const homeButton = new UIButton({ label: 'HOMEに戻る', variant: 'ghost' });
  if (options.onReturnHome) {
    homeButton.onClick(() => {
      options.onReturnHome?.();
    });
  }

  const startButton = new UIButton({
    label: 'はじめる',
    variant: 'primary',
    disabled: !currentFirstPlayer,
  });

  const updateStartButtonState = () => {
    startButton.setDisabled(!currentFirstPlayer);
  };

  const overlay = document.createElement('div');
  overlay.className = 'standby-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  const overlayPanel = document.createElement('div');
  overlayPanel.className = 'standby-overlay__panel';
  overlay.append(overlayPanel);

  const overlayTitle = document.createElement('h2');
  overlayTitle.className = 'standby-overlay__title';
  overlayPanel.append(overlayTitle);

  const overlayMessage = document.createElement('p');
  overlayMessage.className = 'standby-overlay__message';
  overlayPanel.append(overlayMessage);

  const overlayActions = document.createElement('div');
  overlayActions.className = 'standby-overlay__actions';
  overlayPanel.append(overlayActions);

  let overlayTimer: number | undefined;
  let overlayState: StandbyOverlayState = 'hidden';

  const clearOverlayTimer = () => {
    if (overlayTimer === undefined) {
      return;
    }
    if (typeof window !== 'undefined') {
      window.clearTimeout(overlayTimer);
    }
    overlayTimer = undefined;
  };

  const setOverlayState = (state: StandbyOverlayState) => {
    overlayState = state;
    const isActive = state !== 'hidden';
    overlay.classList.toggle('is-active', isActive);
    overlay.classList.toggle('standby-overlay--in-progress', state === 'progress');
    overlay.classList.toggle('standby-overlay--completed', state === 'completed');
    overlay.setAttribute('aria-hidden', isActive ? 'false' : 'true');

    if (!isActive) {
      overlayTitle.textContent = '';
      overlayMessage.textContent = '';
      overlayActions.replaceChildren();
      updateStartButtonState();
      return;
    }

    startButton.setDisabled(true);

    if (state === 'progress') {
      overlayTitle.textContent = 'スタンバイ中';
      overlayMessage.textContent = '';
      overlayActions.replaceChildren();
      return;
    }

    const firstPlayerLabel = currentFirstPlayer && playerLabelMap.has(currentFirstPlayer)
      ? playerLabelMap.get(currentFirstPlayer) ?? currentFirstPlayer
      : '未決定';
    const nextPhaseLabel = options.nextPhaseLabel ?? 'スカウト';

    overlayTitle.textContent = 'スタンバイ完了';
    overlayMessage.textContent = `先手：${firstPlayerLabel}｜フェーズ：${nextPhaseLabel} から始まります。相手に手札が見えない状態になったら［OK］を押してください。`;
    overlayActions.replaceChildren();

    const backButton = new UIButton({ label: '戻る', variant: 'ghost' });
    backButton.onClick(() => {
      clearOverlayTimer();
      setOverlayState('hidden');
    });

    const confirmButton = new UIButton({ label: 'OK', variant: 'primary' });
    confirmButton.onClick(() => {
      clearOverlayTimer();
      setOverlayState('hidden');
      options.onStart?.();
    });

    overlayActions.append(backButton.el, confirmButton.el);

    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        confirmButton.el.focus();
      });
    }
  };

  const showProgressOverlay = () => {
    clearOverlayTimer();
    setOverlayState('progress');

    if (typeof window === 'undefined') {
      setOverlayState('completed');
      return;
    }

    overlayTimer = window.setTimeout(() => {
      overlayTimer = undefined;
      setOverlayState('completed');
    }, STANDBY_PROGRESS_DELAY);
  };

  startButton.onClick(() => {
    if (!currentFirstPlayer) {
      startButton.setDisabled(true);
      return;
    }
    if (overlayState !== 'hidden') {
      return;
    }
    showProgressOverlay();
  });

  updateStatus();
  updateRadioSelection();
  updateStartButtonState();

  actions.append(homeButton.el, startButton.el);
  main.append(actions);

  section.append(main, overlay);
  return section;
};
