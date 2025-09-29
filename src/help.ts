import {
  DEFAULT_CLOSE_LABEL,
  HELP_LOAD_ERROR_MESSAGE,
  HELP_LOADING_MESSAGE,
  HELP_MODAL_TITLES,
} from './messages.js';

type HelpTopic = keyof typeof HELP_MODAL_TITLES;

type HelpTopicConfig = {
  readonly path: string;
};

const HELP_TOPIC_PATHS: Record<HelpTopic, HelpTopicConfig> = {
  home: { path: './help/home.md' },
  standby: { path: './help/standby.md' },
  scout: { path: './help/scout.md' },
  action: { path: './help/action.md' },
  watch: { path: './help/watch.md' },
  spotlight: { path: './help/spotlight.md' },
  backstage: { path: './help/backstage.md' },
  intermission: { path: './help/intermission.md' },
  curtaincall: { path: './help/curtaincall.md' },
};

const helpContentCache = new Map<HelpTopic, string>();

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderMarkdownToHtml = (markdown: string): string => {
  const normalized = markdown.replace(/\r\n/g, '\n').replace(/^\uFEFF/, '');
  const lines = normalized.split('\n');
  const htmlParts: string[] = ['<div class="help-modal__content">'];

  let openList: 'ul' | 'ol' | null = null;
  let paragraphLines: string[] = [];

  const flushParagraph = (): void => {
    if (paragraphLines.length === 0) {
      return;
    }
    const text = paragraphLines.join(' ');
    htmlParts.push(`<p>${escapeHtml(text)}</p>`);
    paragraphLines = [];
  };

  const closeList = (): void => {
    if (!openList) {
      return;
    }
    htmlParts.push(`</${openList}>`);
    openList = null;
  };

  lines.forEach((rawLine) => {
    const trimmed = rawLine.trim();

    if (trimmed === '') {
      flushParagraph();
      closeList();
      return;
    }

    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (headingMatch) {
      flushParagraph();
      closeList();
      const level = Math.min(headingMatch[1].length, 6);
      const headingText = escapeHtml(headingMatch[2].trim());
      htmlParts.push(`<h${level}>${headingText}</h${level}>`);
      return;
    }

    const unorderedMatch = /^[-*+]\s+(.*)$/.exec(trimmed);
    if (unorderedMatch) {
      flushParagraph();
      if (openList !== 'ul') {
        closeList();
        htmlParts.push('<ul class="help-modal__list">');
        openList = 'ul';
      }
      htmlParts.push(`<li>${escapeHtml(unorderedMatch[1])}</li>`);
      return;
    }

    const orderedMatch = /^\d+\.\s+(.*)$/.exec(trimmed);
    if (orderedMatch) {
      flushParagraph();
      if (openList !== 'ol') {
        closeList();
        htmlParts.push('<ol class="help-modal__list help-modal__list--ordered">');
        openList = 'ol';
      }
      htmlParts.push(`<li>${escapeHtml(orderedMatch[1])}</li>`);
      return;
    }

    if (openList) {
      closeList();
    }

    paragraphLines.push(trimmed);
  });

  flushParagraph();
  closeList();
  htmlParts.push('</div>');

  return htmlParts.join('');
};

const fetchMarkdown = async (path: string): Promise<string> => {
  const response = await fetch(path, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Failed to fetch help markdown: ${response.status}`);
  }
  return response.text();
};

export const openHelpTopic = async (topic: HelpTopic): Promise<void> => {
  if (typeof window === 'undefined') {
    return;
  }

  const modal = window.curtainCall?.modal;
  if (!modal) {
    console.warn('ヘルプモーダルを表示するためのモーダルコントローラーが初期化されていません。');
    return;
  }

  const config = HELP_TOPIC_PATHS[topic];
  const title = HELP_MODAL_TITLES[topic] ?? 'ヘルプ';

  const body = document.createElement('div');
  body.className = 'help-modal';

  const loading = document.createElement('p');
  loading.className = 'help-modal__status';
  loading.textContent = HELP_LOADING_MESSAGE;
  body.append(loading);

  modal.open({
    title,
    body,
    actions: [
      {
        label: DEFAULT_CLOSE_LABEL,
        variant: 'primary',
        preventRapid: true,
      },
    ],
  });

  const cached = helpContentCache.get(topic);
  if (cached) {
    body.innerHTML = cached;
    return;
  }

  try {
    const markdown = await fetchMarkdown(config.path);
    const html = renderMarkdownToHtml(markdown);
    helpContentCache.set(topic, html);
    body.innerHTML = html;
  } catch (error) {
    console.error(error);
    body.replaceChildren();
    const message = document.createElement('p');
    message.className = 'help-modal__error';
    message.textContent = HELP_LOAD_ERROR_MESSAGE;
    body.append(message);
  }
};
