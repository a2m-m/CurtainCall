import { UIButton, ButtonVariant } from '../ui/button.js';

export interface HomeButtonOptions {
  label?: string;
  variant?: ButtonVariant;
  disabled?: boolean;
  hidden?: boolean;
  preventRapid?: boolean;
  lockDuration?: number;
  onSelect?: () => void;
}

export interface HomeResumeDetails {
  summary?: string;
  savedAt?: string;
}

export interface HomeResumeButtonOptions extends HomeButtonOptions {
  details?: HomeResumeDetails;
}

export interface HomeViewOptions {
  title: string;
  subtitle?: string;
  start?: HomeButtonOptions;
  resume?: HomeResumeButtonOptions;
  history?: HomeButtonOptions;
  settings?: HomeButtonOptions;
  help?: HomeButtonOptions;
}

interface HomeActionElements {
  container: HTMLDivElement;
  button: UIButton;
}

const createAction = (
  options: HomeButtonOptions | undefined,
  extraClass: string,
  fallbackLabel: string,
  fallbackVariant: ButtonVariant,
): HomeActionElements | null => {
  if (options?.hidden) {
    return null;
  }

  const container = document.createElement('div');
  container.className = `home__action ${extraClass}`;

  const button = new UIButton({
    label: options?.label ?? fallbackLabel,
    variant: options?.variant ?? fallbackVariant,
    disabled: options?.disabled,
    preventRapid: options?.preventRapid,
    lockDuration: options?.lockDuration,
  });

  button.el.classList.add('home__button');

  if (options?.onSelect) {
    button.onClick(() => {
      options.onSelect?.();
    });
  }

  container.append(button.el);

  return { container, button };
};

const createResumeAction = (
  options: HomeResumeButtonOptions | undefined,
): HomeActionElements | null => {
  const resume = createAction(options, 'home__action--resume', 'つづきから', 'ghost');

  if (!resume) {
    return null;
  }

  const details = options?.details;
  const labelText = resume.button.el.textContent ?? '';
  const ariaDetailParts: string[] = [];

  if (details) {
    const list = document.createElement('div');
    list.className = 'home__resume-details';

    if (details.summary) {
      const summary = document.createElement('p');
      summary.className = 'home__resume-summary';
      summary.textContent = details.summary;
      list.append(summary);
      ariaDetailParts.push(details.summary);
    }

    if (details.savedAt) {
      const savedAt = document.createElement('p');
      savedAt.className = 'home__resume-saved';
      savedAt.textContent = details.savedAt;
      list.append(savedAt);
      ariaDetailParts.push(details.savedAt);
    }

    if (list.childElementCount > 0) {
      const descriptionId = `home-resume-details-${Math.random().toString(36).slice(2, 8)}`;
      list.id = descriptionId;
      resume.button.el.setAttribute('aria-describedby', descriptionId);
      resume.container.classList.add('home__action--with-details');
      resume.container.append(list);
    }
  }

  if (ariaDetailParts.length > 0) {
    const joinedDetails = ariaDetailParts.join('／');
    const ariaLabel = labelText ? `${labelText}（${joinedDetails}）` : joinedDetails;
    resume.button.el.setAttribute('aria-label', ariaLabel);
  }

  return resume;
};

export const createHomeView = (options: HomeViewOptions): HTMLElement => {
  const section = document.createElement('section');
  section.className = 'view home-view';

  const main = document.createElement('main');
  main.className = 'home';

  const heading = document.createElement('h1');
  heading.className = 'home__title';
  heading.id = 'home-view-title';
  heading.textContent = options.title;

  main.setAttribute('aria-labelledby', heading.id);
  main.append(heading);

  if (options.subtitle) {
    const subtitle = document.createElement('p');
    subtitle.className = 'home__subtitle';
    subtitle.textContent = options.subtitle;
    main.append(subtitle);
  }

  const actions = document.createElement('div');
  actions.className = 'home__actions';

  const start = createAction(options.start, 'home__action--start', 'ゲーム開始', 'primary');
  if (start) {
    actions.append(start.container);
  }

  const resume = createResumeAction(options.resume);
  if (resume) {
    actions.append(resume.container);
  }

  const history = createAction(options.history, 'home__action--history', '履歴', 'ghost');
  if (history) {
    actions.append(history.container);
  }

  const settings = createAction(options.settings, 'home__action--settings', '設定', 'ghost');
  if (settings) {
    actions.append(settings.container);
  }

  const help = createAction(options.help, 'home__action--help', 'ヘルプ', 'ghost');
  if (help) {
    actions.append(help.container);
  }

  main.append(actions);
  section.append(main);

  return section;
};
