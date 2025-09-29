export interface RenderMarkdownOptions {
  /**
   * コンテンツ全体を囲む要素のクラス名。
   */
  wrapperClassName?: string;
  /**
   * 箇条書きリストに付与するクラス名。
   */
  listClassName?: string;
  /**
   * 番号付きリストに付与するクラス名。
   */
  orderedListClassName?: string;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeAttribute = (value: string): string => value.replace(/"/g, '&quot;');

export const renderMarkdownToHtml = (markdown: string, options: RenderMarkdownOptions = {}): string => {
  const normalized = markdown.replace(/\r\n/g, '\n').replace(/^\uFEFF/, '');
  const lines = normalized.split('\n');
  const wrapperClass = options.wrapperClassName ?? 'markdown__content';
  const listClass = options.listClassName ?? 'markdown__list';
  const orderedListClass = options.orderedListClassName ?? `${listClass} ${listClass}--ordered`;
  const htmlParts: string[] = [`<div class="${escapeAttribute(wrapperClass)}">`];

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
        htmlParts.push(`<ul class="${escapeAttribute(listClass)}">`);
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
        htmlParts.push(`<ol class="${escapeAttribute(orderedListClass)}">`);
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

export const fetchMarkdown = async (url: URL): Promise<string> => {
  const response = await fetch(url.toString(), { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Failed to fetch markdown: ${response.status}`);
  }
  return response.text();
};
