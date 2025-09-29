import { UIButton, ButtonVariant } from '../ui/button.js';
import { showGate, GateOptions } from '../ui/gate.js';
import { DEFAULT_GATE_MESSAGE } from '../messages.js';
import type { ModalContentKey } from '../modal-content.js';

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
  modalMarkdownKey?: ModalContentKey;
  modalMarkdownReplacements?: Record<string, string>;
  preventRapid?: boolean;
  lockDuration?: number;
  onGatePass?: () => void;
  actions?: GateViewAction[];
  content?: HTMLElement | null;
}

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

  const main = document.createElement('main');
  main.className = 'gate-view__panel';

  const headingId = `gate-view-title-${Math.random().toString(36).slice(2, 8)}`;

  const heading = document.createElement('h1');
  heading.className = 'gate-view__title';
  heading.id = headingId;
  heading.textContent = options.title;
  main.append(heading);

  if (options.subtitle) {
    const subtitle = createTextParagraph(options.subtitle);
    subtitle.className = 'gate-view__subtitle';
    main.append(subtitle);
  }

  const hints = renderHintList(options.hints);
  if (hints) {
    main.append(hints);
  }

  if (options.content) {
    main.append(options.content);
  }

  const actions = renderActions(options.actions);
  if (actions) {
    main.append(actions);
  }

  main.setAttribute('aria-labelledby', headingId);
  section.append(main);

  if (typeof window !== 'undefined') {
    queueMicrotask(() => {
      let markdownReplacements = options.modalMarkdownReplacements;
      let messageForModal: string | HTMLElement | undefined = options.message ?? DEFAULT_GATE_MESSAGE;

      if (options.modalMarkdownKey && typeof messageForModal === 'string') {
        const base = markdownReplacements ? { ...markdownReplacements } : {};
        if (base.message === undefined) {
          base.message = messageForModal;
        }
        markdownReplacements = base;
        messageForModal = undefined;
      }

      const gateOptions: GateOptions = {
        title: options.modalTitle ?? options.title,
        text: messageForModal,
        notes: options.modalNotes,
        markdownKey: options.modalMarkdownKey,
        markdownReplacements,
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
