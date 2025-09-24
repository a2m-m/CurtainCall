import { showGate, GateOptions } from '../ui/gate.js';

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
