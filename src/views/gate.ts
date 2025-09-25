import { UIButton, ButtonVariant } from '../ui/button.js';
import { showGate, GateOptions } from '../ui/gate.js';

export interface GateViewAction {
  label: string;
  variant?: ButtonVariant;
  preventRapid?: boolean;
  lockDuration?: number;
  onSelect?: () => void;
}

export interface GateViewOptions {
  title: string;
  subtitle?: string;
  message?: string | HTMLElement;
  confirmLabel?: string;
  hints?: string[];
  modalNotes?: string[];
  modalTitle?: string;
  preventRapid?: boolean;
  lockDuration?: number;
  onGatePass?: () => void;
  actions?: GateViewAction[];
}

const DEFAULT_GATE_MESSAGE =
  '端末を次のプレイヤーに渡したら「準備完了」を押して、秘匿情報の閲覧を開始してください。';

const createTextParagraph = (content: string): HTMLParagraphElement => {
  const paragraph = document.createElement('p');
  paragraph.textContent = content;
  return paragraph;
};

const renderHintList = (hints: string[] | undefined): HTMLUListElement | null => {
  if (!hints || hints.length === 0) {
    return null;
  }
  const list = document.createElement('ul');
  list.className = 'gate-view__hints';
  hints.forEach((hint) => {
    const item = document.createElement('li');
    item.textContent = hint;
    list.append(item);
  });
  return list;
};

const renderActions = (actions: GateViewAction[] | undefined): HTMLDivElement | null => {
  if (!actions || actions.length === 0) {
    return null;
  }

  const container = document.createElement('div');
  container.className = 'gate-view__actions';

  actions.forEach((action) => {
    const button = new UIButton({
      label: action.label,
      variant: action.variant ?? 'ghost',
      preventRapid: action.preventRapid,
      lockDuration: action.lockDuration,
    });

    if (action.onSelect) {
      button.onClick(() => action.onSelect?.());
    }

    container.append(button.el);
  });

  return container;
};

export const createGateView = (options: GateViewOptions): HTMLElement => {
  const section = document.createElement('section');
  section.className = 'view gate-view';

  const wrapper = document.createElement('div');
  wrapper.className = 'gate-view__panel';

  const heading = document.createElement('h1');
  heading.className = 'gate-view__title';
  heading.textContent = options.title;
  wrapper.append(heading);

  if (options.subtitle) {
    const subtitle = createTextParagraph(options.subtitle);
    subtitle.className = 'gate-view__subtitle';
    wrapper.append(subtitle);
  }

  const hints = renderHintList(options.hints);
  if (hints) {
    wrapper.append(hints);
  }

  const actions = renderActions(options.actions);
  if (actions) {
    wrapper.append(actions);
  }

  section.append(wrapper);

  if (typeof window !== 'undefined') {
    queueMicrotask(() => {
      const gateOptions: GateOptions = {
        title: options.modalTitle ?? options.title,
        text: options.message ?? DEFAULT_GATE_MESSAGE,
        notes: options.modalNotes,
        confirmLabel: options.confirmLabel,
        preventRapid: options.preventRapid,
        lockDuration: options.lockDuration,
        onOk: options.onGatePass,
      };
      showGate(gateOptions);
    });
  }

  return section;
};
