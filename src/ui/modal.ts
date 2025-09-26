import { UIButton, ButtonVariant } from './button.js';
import { UIComponent } from './component.js';
import { animationManager } from './animation.js';

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
  className?: string;
}

class ModalView extends UIComponent<HTMLDivElement> {
  constructor() {
    super(document.createElement('div'));
    this.element.className = 'modal';
  }

  setClassName(className: string | undefined): void {
    this.element.className = ['modal', className].filter(Boolean).join(' ');
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
  private closeAnimationCleanup?: () => void;

  constructor(host: HTMLElement) {
    this.host = host;
  }

  open(options: ModalOptions): void {
    // 閉じアニメーションの途中で再び開いた場合に備え、進行中の処理を打ち切る。
    if (this.closeAnimationCleanup) {
      this.closeAnimationCleanup();
      this.closeAnimationCleanup = undefined;
    }
    if (this.isActive) {
      this.completeClose();
    }

    this.dismissible = options.dismissible ?? true;
    this.modalView.setClassName(options.className);
    this.modalView.setTitle(options.title);
    this.modalView.setBody(options.body);
    this.modalView.setActions(options.actions, () => this.close());

    this.host.classList.remove('is-closing');
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
    if (this.host.classList.contains('is-closing')) {
      return;
    }

    // 閉じアニメーション開始前にハンドラを解除し、二重登録を防ぐ。
    this.closeAnimationCleanup?.();
    this.closeAnimationCleanup = undefined;
    this.detachDismissEvents();

    if (animationManager.isEnabled()) {
      this.host.classList.add('is-closing');
      const finalize = () => {
        this.host.removeEventListener('animationend', finalize);
        this.host.removeEventListener('animationcancel', finalize);
        this.closeAnimationCleanup = undefined;
        this.completeClose();
      };
      this.host.addEventListener('animationend', finalize);
      this.host.addEventListener('animationcancel', finalize);
      this.closeAnimationCleanup = () => {
        this.host.removeEventListener('animationend', finalize);
        this.host.removeEventListener('animationcancel', finalize);
        this.host.classList.remove('is-closing');
        this.closeAnimationCleanup = undefined;
      };
      return;
    }

    this.completeClose();
  }

  get opened(): boolean {
    return this.isActive;
  }

  private completeClose(): void {
    // アニメーションの有無に関わらず最終的な片付けを行う共通処理。
    this.detachDismissEvents();
    this.host.classList.remove('is-active', 'is-closing');
    this.host.replaceChildren();
    this.isActive = false;
  }

  private detachDismissEvents(): void {
    if (this.overlayHandler) {
      this.host.removeEventListener('click', this.overlayHandler);
      this.overlayHandler = undefined;
    }
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = undefined;
    }
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
