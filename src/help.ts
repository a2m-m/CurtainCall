import {
  DEFAULT_CLOSE_LABEL,
  HELP_LOAD_ERROR_MESSAGE,
  HELP_LOADING_MESSAGE,
  HELP_MODAL_TITLES,
} from './messages.js';
import { fetchMarkdown, renderMarkdownToHtml } from './markdown.js';

type HelpTopic = keyof typeof HELP_MODAL_TITLES;

interface HelpTopicConfig {
  readonly url: URL;
}

const createHelpAssetUrl = (fileName: string): URL =>
  new URL(`./help/${fileName}`, import.meta.url);

const HELP_TOPIC_CONFIGS: Record<HelpTopic, HelpTopicConfig> = {
  home: { url: createHelpAssetUrl('home.md') },
  standby: { url: createHelpAssetUrl('standby.md') },
  scout: { url: createHelpAssetUrl('scout.md') },
  action: { url: createHelpAssetUrl('action.md') },
  watch: { url: createHelpAssetUrl('watch.md') },
  spotlight: { url: createHelpAssetUrl('spotlight.md') },
  backstage: { url: createHelpAssetUrl('backstage.md') },
  intermission: { url: createHelpAssetUrl('intermission.md') },
  curtaincall: { url: createHelpAssetUrl('curtaincall.md') },
};

const helpContentCache = new Map<HelpTopic, string>();

export const openHelpTopic = async (topic: HelpTopic): Promise<void> => {
  if (typeof window === 'undefined') {
    return;
  }

  const modal = window.curtainCall?.modal;
  if (!modal) {
    console.warn('ヘルプモーダルを表示するためのモーダルコントローラーが初期化されていません。');
    return;
  }

  const config = HELP_TOPIC_CONFIGS[topic];
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
    const markdown = await fetchMarkdown(config.url);
    const html = renderMarkdownToHtml(markdown, {
      rootClassName: 'help-modal__content',
      unorderedListClassName: 'help-modal__list',
      orderedListClassName: 'help-modal__list help-modal__list--ordered',
    });
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
