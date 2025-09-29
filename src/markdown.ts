const normalizeMarkdown = (markdown: string): string => markdown.replace(/\r\n/g, '\n').replace(/^\uFEFF/, '');

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export interface MarkdownRenderOptions {
  rootClassName?: string;
  paragraphClassName?: string;
  unorderedListClassName?: string;
  orderedListClassName?: string;
}

export const renderMarkdownToHtml = (markdown: string, options: MarkdownRenderOptions = {}): string => {
  const normalized = normalizeMarkdown(markdown);
  const lines = normalized.split('\n');
  const htmlParts: string[] = [
    `<div class="${escapeHtml(options.rootClassName ?? 'markdown-modal__content')}">`,
  ];

  let openList: 'ul' | 'ol' | null = null;
  let paragraphLines: string[] = [];

  const paragraphClass = options.paragraphClassName ? ` class="${escapeHtml(options.paragraphClassName)}"` : '';
  const unorderedListClass = options.unorderedListClassName
    ? ` class="${escapeHtml(options.unorderedListClassName)}"`
    : '';
  const orderedListClass = options.orderedListClassName
    ? ` class="${escapeHtml(options.orderedListClassName)}"`
    : '';

  const flushParagraph = (): void => {
    if (paragraphLines.length === 0) {
      return;
    }
    const text = paragraphLines.join(' ');
    htmlParts.push(`<p${paragraphClass}>${escapeHtml(text)}</p>`);
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
        htmlParts.push(`<ul${unorderedListClass}>`);
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
        htmlParts.push(`<ol${orderedListClass}>`);
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

export type MarkdownResource = string | URL;

interface MaybeNodeProcess {
  versions?: { node?: unknown };
}

interface NodeBufferLike {
  toString: (encoding: string) => string;
}

interface NodeFsModule {
  readFile: (path: string | URL) => Promise<NodeBufferLike>;
}

interface NodePathModule {
  resolve: (...segments: string[]) => string;
}

interface NodeUrlModule {
  fileURLToPath: (url: string | URL) => string;
}

const importNodeModule = async <TModule>(specifier: string): Promise<TModule> => {
  const dynamicSpecifier: string = specifier;
  return (await import(dynamicSpecifier)) as TModule;
};

const readNodeFile = async (path: string | URL): Promise<string> => {
  const { readFile } = await importNodeModule<NodeFsModule>('fs/promises');
  const buffer = await readFile(path);
  return buffer.toString('utf-8');
};

export const fetchMarkdown = async (resource: MarkdownResource): Promise<string> => {
  const nodeProcess = (globalThis as { process?: MaybeNodeProcess }).process;
  const isNodeEnvironment = typeof nodeProcess?.versions?.node === 'string';

  if (typeof resource === 'string') {
    if (isNodeEnvironment) {
      const { resolve } = await importNodeModule<NodePathModule>('path');
      const filePath = resolve(resource);
      return readNodeFile(filePath);
    }

    const response = await fetch(resource, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Failed to fetch markdown: ${response.status}`);
    }
    return response.text();
  }

  if (resource.protocol === 'file:') {
    const { fileURLToPath } = await importNodeModule<NodeUrlModule>('url');
    const filePath = fileURLToPath(resource);
    return readNodeFile(filePath);
  }

  const response = await fetch(resource.toString(), { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Failed to fetch markdown: ${response.status}`);
  }
  return response.text();
};
