import { UIButton, ButtonVariant } from './button.js';
import { UIComponent } from './component.js';

export interface ModalAction {
  label: string;
  variant?: ButtonVariant;
  dismiss?: boolean;
  disabled?: boolean;
  preventRapid?: boolean;
  lockDuration?: number;
  onSelect?: () => void;
}

export interface ModalOptions {
  title?: string;
  body?: string | HTMLElement;
  actions?: ModalAction[];
  dismissible?: boolean;
}

class ModalView extends UIComponent<HTMLDivElement> {
  constructor() {
    super(document.createElement('div'));
    this.element.className = 'modal';
  }

  setTitle(title: string | undefined): void {
    const heading = this.ensureHeading();
    if (title) {
      heading.textContent = title;
      heading.hidden = false;
    } else {
      heading.hidden = true;
    }
  }

  setBody(content: string | HTMLElement | undefined): void {
    const body = this.ensureBody();
    body.replaceChildren();
    if (!content) {
      return;
    }
    if (typeof content === 'string') {
      const paragraph = document.createElement('p');
      paragraph.textContent = content;
      body.append(paragraph);
      return;
    }
    body.append(content);
  }

  setActions(actions: ModalAction[] | undefined, close: () => void): void {
    const footer = this.ensureFooter();
    footer.replaceChildren();
    if (!actions || actions.length === 0) {
      footer.hidden = true;
      return;
    }

    footer.hidden = false;
    actions.forEach((action) => {
      const button = new UIButton({
        label: action.label,
        variant: action.variant,
        disabled: action.disabled,
        preventRapid: action.preventRapid,
        lockDuration: action.lockDuration,
      });
      button.onClick(() => {
        action.onSelect?.();
        if (action.dismiss !== false) {
          close();
        }
      });
      footer.append(button.el);
    });
  }

  private ensureHeading(): HTMLHeadingElement {
    let heading = this.element.querySelector<HTMLHeadingElement>('h2');
    if (!heading) {
      heading = document.createElement('h2');
      heading.className = 'modal__title';
      this.element.prepend(heading);
    }
    return heading;
  }

  private ensureBody(): HTMLDivElement {
    let body = this.element.querySelector<HTMLDivElement>('.modal__body');
    if (!body) {
      body = document.createElement('div');
      body.className = 'modal__body';
      const heading = this.ensureHeading();
      heading.insertAdjacentElement('afterend', body);
    }
    return body;
  }

  private ensureFooter(): HTMLDivElement {
    let footer = this.element.querySelector<HTMLDivElement>('.modal__footer');
    if (!footer) {
      footer = document.createElement('div');
      footer.className = 'modal__footer';
      this.element.append(footer);
    }
    return footer;
  }
}

export class ModalController {
  private readonly host: HTMLElement;
  private readonly modalView = new ModalView();
  private isActive = false;
  private dismissible = true;
  private overlayHandler?: (event: MouseEvent) => void;
  private keydownHandler?: (event: KeyboardEvent) => void;

  constructor(host: HTMLElement) {
    this.host = host;
  }

  open(options: ModalOptions): void {
    this.dismissible = options.dismissible ?? true;
    this.modalView.setTitle(options.title);
    this.modalView.setBody(options.body);
    this.modalView.setActions(options.actions, () => this.close());

    this.host.classList.add('is-active');
    this.host.replaceChildren(this.modalView.el);
    this.isActive = true;

    if (this.dismissible) {
      this.attachDismissEvents();
    }
  }

  close(): void {
    if (!this.isActive) {
      return;
    }
    if (this.overlayHandler) {
      this.host.removeEventListener('click', this.overlayHandler);
      this.overlayHandler = undefined;
    }
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = undefined;
    }
    this.host.classList.remove('is-active');
    this.host.replaceChildren();
    this.isActive = false;
  }

  get opened(): boolean {
    return this.isActive;
  }

  private attachDismissEvents(): void {
    this.overlayHandler = (event: MouseEvent) => {
      if (event.target === this.host) {
        this.close();
      }
    };

    this.keydownHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.close();
      }
    };

    this.host.addEventListener('click', this.overlayHandler);
    window.addEventListener('keydown', this.keydownHandler);
  }
}
