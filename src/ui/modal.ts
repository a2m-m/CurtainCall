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

const MODAL_LABEL_FALLBACK = 'ダイアログ';

class ModalView extends UIComponent<HTMLDivElement> {
  private readonly headingId: string;
  private readonly bodyId: string;

  constructor() {
    super(document.createElement('div'));
    this.element.className = 'modal';
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.tabIndex = -1;
    this.headingId = `modal-title-${Math.random().toString(36).slice(2, 10)}`;
    this.bodyId = `modal-body-${Math.random().toString(36).slice(2, 10)}`;
  }

  setClassName(className: string | undefined): void {
    this.element.className = ['modal', className].filter(Boolean).join(' ');
  }

  setTitle(title: string | undefined): void {
    const heading = this.ensureHeading();
    if (title) {
      heading.textContent = title;
      heading.hidden = false;
      this.element.setAttribute('aria-labelledby', this.headingId);
      this.element.removeAttribute('aria-label');
    } else {
      heading.hidden = true;
      this.element.removeAttribute('aria-labelledby');
      this.element.setAttribute('aria-label', MODAL_LABEL_FALLBACK);
    }
  }

  setBody(content: string | HTMLElement | undefined): void {
    const body = this.ensureBody();
    body.replaceChildren();
    if (!content) {
      this.element.removeAttribute('aria-describedby');
      if (!this.element.hasAttribute('aria-labelledby')) {
        this.element.setAttribute('aria-label', MODAL_LABEL_FALLBACK);
      }
      return;
    }
    if (typeof content === 'string') {
      const paragraph = document.createElement('p');
      paragraph.textContent = content;
      body.append(paragraph);
    } else {
      body.append(content);
    }
    this.element.setAttribute('aria-describedby', this.bodyId);
    if (this.element.hasAttribute('aria-labelledby')) {
      this.element.removeAttribute('aria-label');
    }
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
      heading.id = this.headingId;
      this.element.prepend(heading);
    }
    if (!heading.id) {
      heading.id = this.headingId;
    }
    return heading;
  }

  private ensureBody(): HTMLDivElement {
    let body = this.element.querySelector<HTMLDivElement>('.modal__body');
    if (!body) {
      body = document.createElement('div');
      body.className = 'modal__body';
      body.id = this.bodyId;
      const heading = this.ensureHeading();
      heading.insertAdjacentElement('afterend', body);
    }
    if (!body.id) {
      body.id = this.bodyId;
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
  private previouslyFocusedElement: HTMLElement | null = null;

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

    this.capturePreviouslyFocusedElement();
    this.dismissible = options.dismissible ?? true;
    this.modalView.setClassName(options.className);
    this.modalView.setTitle(options.title);
    this.modalView.setBody(options.body);
    this.modalView.setActions(options.actions, () => this.close());

    this.host.classList.remove('is-closing');
    this.host.classList.add('is-active');
    this.host.replaceChildren(this.modalView.el);
    this.isActive = true;

    this.focusInitialElement();
    this.attachDismissEvents();
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
    this.restoreFocus();
  }

  private detachDismissEvents(): void {
    if (this.overlayHandler) {
      this.host.removeEventListener('click', this.overlayHandler);
      this.overlayHandler = undefined;
    }
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler, true);
      this.keydownHandler = undefined;
    }
  }

  private attachDismissEvents(): void {
    if (this.dismissible && !this.overlayHandler) {
      this.overlayHandler = (event: MouseEvent) => {
        if (event.target === this.host) {
          this.close();
        }
      };
      this.host.addEventListener('click', this.overlayHandler);
    }

    if (!this.keydownHandler) {
      this.keydownHandler = (event: KeyboardEvent) => {
        if (!this.isActive) {
          return;
        }
        if (event.key === 'Escape' && this.dismissible) {
          event.preventDefault();
          this.close();
          return;
        }
        if (event.key === 'Tab') {
          this.retainFocusWithinModal(event);
        }
      };
      window.addEventListener('keydown', this.keydownHandler, true);
    }
  }

  private capturePreviouslyFocusedElement(): void {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      this.previouslyFocusedElement = activeElement;
    } else {
      this.previouslyFocusedElement = null;
    }
  }

  private restoreFocus(): void {
    if (this.previouslyFocusedElement) {
      this.previouslyFocusedElement.focus({ preventScroll: true });
    }
    this.previouslyFocusedElement = null;
  }

  private focusInitialElement(): void {
    const focusableElements = this.getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus({ preventScroll: true });
      return;
    }
    this.modalView.el.focus({ preventScroll: true });
  }

  private retainFocusWithinModal(event: KeyboardEvent): void {
    const focusableElements = this.getFocusableElements();
    if (focusableElements.length === 0) {
      event.preventDefault();
      this.modalView.el.focus({ preventScroll: true });
      return;
    }

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (!(activeElement instanceof HTMLElement) || !this.modalView.el.contains(activeElement)) {
      event.preventDefault();
      if (event.shiftKey) {
        last.focus({ preventScroll: true });
      } else {
        first.focus({ preventScroll: true });
      }
      return;
    }

    if (!event.shiftKey && activeElement === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    } else if (event.shiftKey && activeElement === first) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    }
  }

  private getFocusableElements(): HTMLElement[] {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ];
    const elements = Array.from(
      this.modalView.el.querySelectorAll<HTMLElement>(focusableSelectors.join(',')),
    );
    return elements.filter((element) => !element.hasAttribute('disabled') && element.tabIndex !== -1);
  }
}
