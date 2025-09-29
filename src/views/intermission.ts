import { UIButton } from '../ui/button.js';

export interface IntermissionResumeInfo {
  available: boolean;
  summary: string;
  savedAtLabel?: string | null;
}

export interface IntermissionViewOptions {
  title: string;
  subtitle: string;
  message: string;
  tasks: string[];
  summaryTitle: string;
  summaryContent: HTMLElement;
  notesTitle: string;
  notes: string[];
  boardCheckLabel: string;
  helpLabel?: string;
  helpAriaLabel?: string;
  summaryLabel: string;
  resumeLabel: string;
  resumeTitle: string;
  resumeCaption: string;
  resumeInfo: IntermissionResumeInfo;
  gateLabel: string;
  onOpenBoardCheck?: () => void;
  onOpenSummary?: () => void;
  onOpenResume?: () => void;
  onOpenGate?: () => void;
  onOpenHelp?: () => void;
}

export interface IntermissionViewElement extends HTMLElement {
  updateSubtitle: (subtitle: string) => void;
  updateMessage: (message: string) => void;
  updateTasks: (tasks: string[]) => void;
  updateSummary: (content: HTMLElement) => void;
  updateNotes: (notes: string[]) => void;
  setResumeInfo: (info: IntermissionResumeInfo) => void;
  setGateDisabled: (disabled: boolean) => void;
}

const createTaskList = (tasks: string[]): HTMLOListElement => {
  const list = document.createElement('ol');
  list.className = 'intermission__tasks';

  tasks.forEach((task) => {
    const item = document.createElement('li');
    item.className = 'intermission__task';
    item.textContent = task;
    list.append(item);
  });

  return list;
};

const createNotesList = (notes: string[]): HTMLUListElement => {
  const list = document.createElement('ul');
  list.className = 'intermission__notes-list';

  notes.forEach((note) => {
    const item = document.createElement('li');
    item.className = 'intermission__note-item';
    item.textContent = note;
    list.append(item);
  });

  return list;
};

export const createIntermissionView = (options: IntermissionViewOptions): IntermissionViewElement => {
  const section = document.createElement('section');
  section.className = 'view intermission-view';

  const main = document.createElement('main');
  main.className = 'intermission';
  section.append(main);

  const headingId = `intermission-title-${Math.random().toString(36).slice(2, 8)}`;

  const header = document.createElement('header');
  header.className = 'intermission__header';
  main.append(header);

  const heading = document.createElement('h1');
  heading.className = 'intermission__title';
  heading.id = headingId;
  heading.textContent = options.title;
  header.append(heading);

  const subtitle = document.createElement('p');
  subtitle.className = 'intermission__subtitle';
  subtitle.textContent = options.subtitle;
  header.append(subtitle);

  if (options.onOpenHelp) {
    const headerActions = document.createElement('div');
    headerActions.className = 'intermission__header-actions';

    const helpButton = new UIButton({
      label: options.helpLabel ?? 'ヘルプ',
      variant: 'ghost',
      preventRapid: true,
    });
    helpButton.el.classList.add('intermission__header-button');
    const ariaLabel = options.helpAriaLabel ?? options.helpLabel ?? 'ヘルプ';
    helpButton.el.setAttribute('aria-label', ariaLabel);
    helpButton.el.title = ariaLabel;
    helpButton.onClick(() => options.onOpenHelp?.());
    headerActions.append(helpButton.el);

    header.append(headerActions);
  }

  main.setAttribute('aria-labelledby', headingId);

  const body = document.createElement('section');
  body.className = 'intermission__body';
  main.append(body);

  const message = document.createElement('p');
  message.className = 'intermission__message';
  message.textContent = options.message;
  body.append(message);

  const taskContainer = document.createElement('div');
  taskContainer.className = 'intermission__tasks-wrapper';
  body.append(taskContainer);

  let taskList = createTaskList(options.tasks);
  taskContainer.append(taskList);

  const actions = document.createElement('div');
  actions.className = 'intermission__actions';
  body.append(actions);

  const boardCheckButton = new UIButton({
    label: options.boardCheckLabel,
    variant: 'ghost',
    preventRapid: true,
  });
  boardCheckButton.onClick(() => options.onOpenBoardCheck?.());
  boardCheckButton.el.classList.add('intermission__action-button');
  actions.append(boardCheckButton.el);

  const summaryButton = new UIButton({
    label: options.summaryLabel,
    variant: 'ghost',
    preventRapid: true,
  });
  summaryButton.onClick(() => options.onOpenSummary?.());
  summaryButton.el.classList.add('intermission__action-button');
  actions.append(summaryButton.el);

  const resumeButton = new UIButton({
    label: options.resumeLabel,
    variant: 'ghost',
    preventRapid: true,
    disabled: !options.resumeInfo.available,
  });
  resumeButton.onClick(() => options.onOpenResume?.());
  resumeButton.el.classList.add('intermission__action-button');
  actions.append(resumeButton.el);

  const gateButton = new UIButton({
    label: options.gateLabel,
    preventRapid: true,
  });
  gateButton.onClick(() => options.onOpenGate?.());
  gateButton.el.classList.add('intermission__action-button', 'intermission__action-button--primary');
  actions.append(gateButton.el);

  const resumeSection = document.createElement('section');
  resumeSection.className = 'intermission__resume';
  body.append(resumeSection);

  const resumeTitle = document.createElement('h2');
  resumeTitle.className = 'intermission__section-title';
  resumeTitle.textContent = options.resumeTitle;
  resumeSection.append(resumeTitle);

  const resumeCaption = document.createElement('p');
  resumeCaption.className = 'intermission__resume-caption';
  resumeCaption.textContent = options.resumeCaption;
  resumeSection.append(resumeCaption);

  const resumeSummary = document.createElement('p');
  resumeSummary.className = 'intermission__resume-summary';
  resumeSection.append(resumeSummary);

  const resumeSavedAt = document.createElement('p');
  resumeSavedAt.className = 'intermission__resume-saved-at';
  resumeSection.append(resumeSavedAt);

  const summarySection = document.createElement('section');
  summarySection.className = 'intermission__summary';
  body.append(summarySection);

  const summaryTitle = document.createElement('h2');
  summaryTitle.className = 'intermission__section-title';
  summaryTitle.textContent = options.summaryTitle;
  summarySection.append(summaryTitle);

  const summaryContainer = document.createElement('div');
  summaryContainer.className = 'intermission__summary-content';
  summarySection.append(summaryContainer);
  summaryContainer.append(options.summaryContent);

  const notesSection = document.createElement('section');
  notesSection.className = 'intermission__notes';
  body.append(notesSection);

  const notesTitle = document.createElement('h2');
  notesTitle.className = 'intermission__section-title';
  notesTitle.textContent = options.notesTitle;
  notesSection.append(notesTitle);

  let notesList = createNotesList(options.notes);
  notesSection.append(notesList);
  notesSection.hidden = options.notes.length === 0;

  const applyResumeInfo = (info: IntermissionResumeInfo) => {
    resumeSummary.textContent = info.summary;
    if (info.savedAtLabel) {
      resumeSavedAt.textContent = info.savedAtLabel;
      resumeSavedAt.hidden = false;
    } else {
      resumeSavedAt.textContent = '';
      resumeSavedAt.hidden = true;
    }
    resumeButton.setDisabled(!info.available);
  };

  applyResumeInfo(options.resumeInfo);

  return Object.assign(section, {
    updateSubtitle: (value: string) => {
      subtitle.textContent = value;
    },
    updateMessage: (value: string) => {
      message.textContent = value;
    },
    updateTasks: (tasks: string[]) => {
      const nextList = createTaskList(tasks);
      taskList.replaceWith(nextList);
      taskList = nextList;
    },
    updateSummary: (content: HTMLElement) => {
      summaryContainer.replaceChildren(content);
    },
    updateNotes: (notes: string[]) => {
      const nextList = createNotesList(notes);
      notesList.replaceWith(nextList);
      notesList = nextList;
      notesSection.hidden = notes.length === 0;
    },
    setResumeInfo: (info: IntermissionResumeInfo) => {
      applyResumeInfo(info);
    },
    setGateDisabled: (disabled: boolean) => {
      gateButton.setDisabled(disabled);
    },
  });
};
