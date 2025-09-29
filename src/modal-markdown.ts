import {
  MARKDOWN_MODAL_LOAD_ERROR_MESSAGE,
  MARKDOWN_MODAL_LOADING_MESSAGE,
} from './messages.js';
import { fetchMarkdown, renderMarkdownToHtml } from './markdown.js';

export interface MarkdownContentOptions {
  readonly fileName: string;
  readonly fallbackText?: string;
  readonly containerClassName?: string;
  readonly contentClassName?: string;
  readonly statusClassName?: string;
  readonly errorClassName?: string;
  readonly fallbackClassName?: string;
  readonly unorderedListClassName?: string;
  readonly orderedListClassName?: string;
  readonly loadingMessage?: string;
  readonly errorMessage?: string;
}

const DEFAULT_CONTAINER_CLASS = 'markdown-modal';
const DEFAULT_CONTENT_CLASS = 'markdown-modal__content';
const DEFAULT_STATUS_CLASS = 'markdown-modal__status';
const DEFAULT_ERROR_CLASS = 'markdown-modal__error';
const DEFAULT_FALLBACK_CLASS = 'markdown-modal__fallback';
const DEFAULT_UNORDERED_LIST_CLASS = 'markdown-modal__list';
const DEFAULT_ORDERED_LIST_CLASS = 'markdown-modal__list markdown-modal__list--ordered';

const createModalAssetUrl = (fileName: string): URL =>
  new URL(`./help/modals/${fileName}`, import.meta.url);

const modalMarkdownCache = new Map<string, string>();

const createParagraph = (text: string, className: string): HTMLParagraphElement => {
  const paragraph = document.createElement('p');
  paragraph.className = className;
  paragraph.textContent = text;
  return paragraph;
};

const applyMarkdownContent = (container: HTMLElement, html: string): void => {
  container.innerHTML = html;
};

const applyErrorContent = (container: HTMLElement, options: MarkdownContentOptions): void => {
  container.replaceChildren();
  const error = createParagraph(
    options.errorMessage ?? MARKDOWN_MODAL_LOAD_ERROR_MESSAGE,
    options.errorClassName ?? DEFAULT_ERROR_CLASS,
  );
  container.append(error);
  if (options.fallbackText) {
    const fallback = createParagraph(
      options.fallbackText,
      options.fallbackClassName ?? DEFAULT_FALLBACK_CLASS,
    );
    container.append(fallback);
  }
};

const loadMarkdownInto = async (
  container: HTMLElement,
  options: MarkdownContentOptions,
): Promise<void> => {
  const cacheKey = options.fileName;
  const cached = modalMarkdownCache.get(cacheKey);
  if (cached) {
    applyMarkdownContent(container, cached);
    return;
  }

  try {
    const url = createModalAssetUrl(options.fileName);
    const markdown = await fetchMarkdown(url);
    const html = renderMarkdownToHtml(markdown, {
      rootClassName: options.contentClassName ?? DEFAULT_CONTENT_CLASS,
      unorderedListClassName: options.unorderedListClassName ?? DEFAULT_UNORDERED_LIST_CLASS,
      orderedListClassName: options.orderedListClassName ?? DEFAULT_ORDERED_LIST_CLASS,
    });
    modalMarkdownCache.set(cacheKey, html);
    applyMarkdownContent(container, html);
  } catch (error) {
    console.error(error);
    applyErrorContent(container, options);
  }
};

export const createModalMarkdownBody = (options: MarkdownContentOptions): HTMLElement => {
  const container = document.createElement('div');
  container.className = options.containerClassName ?? DEFAULT_CONTAINER_CLASS;

  const status = createParagraph(
    options.loadingMessage ?? MARKDOWN_MODAL_LOADING_MESSAGE,
    options.statusClassName ?? DEFAULT_STATUS_CLASS,
  );
  container.append(status);

  void loadMarkdownInto(container, options);

  return container;
};
