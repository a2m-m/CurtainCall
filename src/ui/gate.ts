import { ModalController } from './modal.js';
import { DEFAULT_GATE_CONFIRM_LABEL, DEFAULT_GATE_TITLE } from '../messages.js';
import { createModalContentElement, type ModalContentKey } from '../modal-content.js';

export interface GateOptions {
  /**
   * ゲート内で表示するメインメッセージ。
   */
  text?: string | HTMLElement;
  /**
   * モーダル見出し。省略時はフェーズ名などに依存しない共通タイトルを利用します。
   */
  title?: string;
  /**
   * 補足説明。箇条書きで表示されます。
   */
  notes?: string[];
  /**
   * Markdown で記述された説明コンテンツのキー。
   */
  markdownKey?: ModalContentKey;
  /**
   * Markdown 内の {{key}} プレースホルダーを置換するための値。
   */
  markdownReplacements?: Record<string, string>;
  /**
   * 決定ボタンのラベル。
   */
  confirmLabel?: string;
  /**
   * ゲート通過時に実行するコールバック。
   */
  onOk?: () => void;
  /**
   * 連打防止フラグ。既定では true。
   */
  preventRapid?: boolean;
  /**
   * preventRapid が true の場合のロック時間（ミリ秒）。
   */
  lockDuration?: number;
}

interface ActiveGate {
  modal: ModalController;
  handleHashChange: () => void;
}

const DEFAULT_LOCK_DURATION = 320;

let activeGate: ActiveGate | null = null;
let modalController: ModalController | null = null;

export const setGateModalController = (modal: ModalController | null): void => {
  modalController = modal;
};

const ensureModalController = (): ModalController => {
  if (modalController) {
    return modalController;
  }

  if (typeof window === 'undefined') {
    throw new Error('ゲートモーダルはブラウザ環境でのみ利用できます。');
  }

  const modal = window.curtainCall?.modal ?? null;

  if (!modal) {
    throw new Error('ゲートモーダルを表示するためのコントローラーが初期化されていません。');
  }

  modalController = modal;

  return modal;
};

const createMessageElement = (text: string | HTMLElement): HTMLElement => {
  const wrapper = document.createElement('div');
  wrapper.className = 'gate-modal__message';
  if (typeof text === 'string') {
    wrapper.textContent = text;
  } else {
    wrapper.append(text);
  }
  return wrapper;
};

const createMarkdownElement = (
  key: ModalContentKey | undefined,
  replacements: Record<string, string> | undefined,
): HTMLElement | null => {
  if (!key) {
    return null;
  }
  return createModalContentElement(key, { replacements });
};

const createNotesElement = (notes: string[] | undefined): HTMLElement | null => {
  if (!notes || notes.length === 0) {
    return null;
  }
  const list = document.createElement('ul');
  list.className = 'gate-modal__notes';
  notes.forEach((note) => {
    const item = document.createElement('li');
    item.textContent = note;
    list.append(item);
  });
  return list;
};

const composeGateBody = (options: GateOptions): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'gate-modal';
  if (options.text) {
    container.append(createMessageElement(options.text));
  }
  const markdown = createMarkdownElement(options.markdownKey, options.markdownReplacements);
  if (markdown) {
    container.append(markdown);
  }
  const notes = createNotesElement(options.notes);
  if (notes) {
    container.append(notes);
  }
  return container;
};

const cleanupActiveGate = (): void => {
  if (!activeGate) {
    return;
  }
  window.removeEventListener('hashchange', activeGate.handleHashChange);
  const { modal } = activeGate;
  activeGate = null;
  if (modal.opened) {
    modal.close();
  }
};

export const closeGate = (): void => {
  cleanupActiveGate();
};

export const showGate = (options: GateOptions): void => {
  const modal = ensureModalController();
  cleanupActiveGate();

  const body = composeGateBody(options);

  const handleSelect = () => {
    const callback = options.onOk;
    cleanupActiveGate();
    callback?.();
  };

  modal.open({
    title: options.title ?? DEFAULT_GATE_TITLE,
    body,
    actions: [
      {
        label: options.confirmLabel ?? DEFAULT_GATE_CONFIRM_LABEL,
        preventRapid: options.preventRapid ?? true,
        lockDuration: options.lockDuration ?? DEFAULT_LOCK_DURATION,
        dismiss: false,
        onSelect: handleSelect,
      },
    ],
    dismissible: false,
  });

  const handleHashChange = () => {
    cleanupActiveGate();
  };

  activeGate = {
    modal,
    handleHashChange,
  };

  window.addEventListener('hashchange', handleHashChange);
};

export default showGate;
