import { MODAL_MARKDOWN_ERROR_MESSAGE, MODAL_MARKDOWN_LOADING_MESSAGE } from './messages.js';
import { fetchMarkdown, renderMarkdownToHtml } from './markdown.js';

const moduleUrl = import.meta.url;
const modulePath = new URL(moduleUrl).pathname;
const modalAssetBaseUrl = modulePath.includes('/dist/')
  ? new URL('./modal/', moduleUrl)
  : new URL('../modal/', moduleUrl);

const createModalAssetUrl = (fileName: string): URL => new URL(fileName, modalAssetBaseUrl);

const MODAL_CONTENT_CONFIGS = {
  handoffDefault: { url: createModalAssetUrl('handoff-default.md') },
  resumeGate: { url: createModalAssetUrl('resume-gate.md') },
  resumeGateError: { url: createModalAssetUrl('resume-gate-error.md') },
  resumeGateDiscardConfirm: { url: createModalAssetUrl('resume-gate-discard-confirm.md') },
  resumeGateDiscardFinal: { url: createModalAssetUrl('resume-gate-discard-final.md') },
  backstageGate: { url: createModalAssetUrl('backstage-gate.md') },
  curtaincallGate: { url: createModalAssetUrl('curtaincall-gate.md') },
  navigationBlock: { url: createModalAssetUrl('navigation-block.md') },
} as const;

export type ModalContentKey = keyof typeof MODAL_CONTENT_CONFIGS;

type MarkdownCache = Map<ModalContentKey, string>;

const modalMarkdownCache: MarkdownCache = new Map();

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const applyReplacements = (
  markdown: string,
  replacements: Record<string, string> | undefined,
): string => {
  if (!replacements) {
    return markdown;
  }

  return Object.entries(replacements).reduce((accumulator, [key, value]) => {
    const pattern = new RegExp(`{{\\s*${escapeRegExp(key)}\\s*}}`, 'g');
    return accumulator.replace(pattern, value);
  }, markdown);
};

const getModalMarkdown = async (key: ModalContentKey): Promise<string> => {
  const cached = modalMarkdownCache.get(key);
  if (cached) {
    return cached;
  }

  const config = MODAL_CONTENT_CONFIGS[key];
  const markdown = await fetchMarkdown(config.url);
  modalMarkdownCache.set(key, markdown);
  return markdown;
};

export interface ModalContentOptions {
  replacements?: Record<string, string>;
}

export const createModalContentElement = (
  key: ModalContentKey,
  options: ModalContentOptions = {},
): HTMLElement => {
  const config = MODAL_CONTENT_CONFIGS[key];
  const container = document.createElement('div');
  container.className = 'modal-markdown';

  const canFetch =
    typeof window !== 'undefined' &&
    typeof fetch === 'function' &&
    config.url.protocol !== 'file:';

  if (!canFetch) {
    const fallbackContent = document.createElement('div');
    fallbackContent.className = 'modal-markdown__content';
    const paragraph = document.createElement('p');
    const message = options.replacements?.message;
    paragraph.textContent = message ?? MODAL_MARKDOWN_ERROR_MESSAGE;
    fallbackContent.append(paragraph);
    container.append(fallbackContent);
    return container;
  }

  const status = document.createElement('p');
  status.className = 'modal-markdown__status';
  status.textContent = MODAL_MARKDOWN_LOADING_MESSAGE;
  container.append(status);

  void getModalMarkdown(key)
    .then((markdown) => {
      const replaced = applyReplacements(markdown, options.replacements);
      const html = renderMarkdownToHtml(replaced, {
        wrapperClassName: 'modal-markdown__content',
        listClassName: 'modal-markdown__list',
        orderedListClassName: 'modal-markdown__list modal-markdown__list--ordered',
      });
      container.innerHTML = html;
    })
    .catch((error) => {
      console.error(error);
      container.replaceChildren();
      const message = document.createElement('p');
      message.className = 'modal-markdown__error';
      message.textContent = MODAL_MARKDOWN_ERROR_MESSAGE;
      container.append(message);
    });

  return container;
};
