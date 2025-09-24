import { UIComponent } from './component.js';
import { InteractionLock, clampInteractionLockDuration } from './interaction-lock.js';

export type ButtonVariant = 'primary' | 'ghost' | 'danger';

export interface ButtonOptions {
  label: string;
  type?: 'button' | 'submit' | 'reset';
  variant?: ButtonVariant;
  disabled?: boolean;
  preventRapid?: boolean;
  lockDuration?: number;
  onClick?: (event: MouseEvent) => void;
}

export interface ButtonClickOptions {
  preventRapid?: boolean;
  lockDuration?: number;
}

export class UIButton extends UIComponent<HTMLButtonElement> {
  private variant: ButtonVariant;
  private preventRapid: boolean;
  private lockDuration: number;
  private readonly clickLock: InteractionLock;
  private readonly listeners: { handler: (event: MouseEvent) => void; usesLock: boolean }[] = [];
  private readonly boundHandleClick: (event: MouseEvent) => void;

  constructor(options: ButtonOptions) {
    const element = document.createElement('button');
    element.type = options.type ?? 'button';
    element.classList.add('button');
    super(element);
    this.variant = options.variant ?? 'primary';
    this.preventRapid = options.preventRapid ?? true;
    this.lockDuration = clampInteractionLockDuration(options.lockDuration);
    this.clickLock = new InteractionLock({
      duration: this.lockDuration,
      onLock: () => this.applyBusyState(true),
      onUnlock: () => this.applyBusyState(false),
    });
    this.boundHandleClick = (event) => this.handleDomClick(event);
    this.element.addEventListener('click', this.boundHandleClick);
    this.applyVariant(this.variant);
    this.setLabel(options.label);
    this.setDisabled(Boolean(options.disabled));

    if (options.onClick) {
      this.onClick(options.onClick);
    }
  }

  setLabel(label: string): void {
    this.element.textContent = label;
  }

  setDisabled(disabled: boolean): void {
    this.element.disabled = disabled;
    if (disabled) {
      this.clickLock.unlock();
      this.applyBusyState(false);
    }
  }

  setVariant(variant: ButtonVariant): void {
    if (variant === this.variant) {
      return;
    }
    this.element.classList.remove(`button--${this.variant}`);
    this.variant = variant;
    this.applyVariant(variant);
  }

  onClick(handler: (event: MouseEvent) => void, options?: ButtonClickOptions): this {
    if (options?.lockDuration !== undefined) {
      const normalized = clampInteractionLockDuration(options.lockDuration);
      this.lockDuration = normalized;
      this.clickLock.duration = normalized;
    }

    const usesLock = options?.preventRapid ?? this.preventRapid;
    this.listeners.push({ handler, usesLock });
    return this;
  }

  lock(duration?: number): void {
    this.clickLock.lock(duration ?? this.lockDuration);
  }

  unlock(): void {
    this.clickLock.unlock();
  }

  get locked(): boolean {
    return this.clickLock.isLocked;
  }

  private applyVariant(variant: ButtonVariant): void {
    if (variant !== 'primary') {
      this.element.classList.add(`button--${variant}`);
    }
  }

  private applyBusyState(isBusy: boolean): void {
    this.element.classList.toggle('is-busy', isBusy);
    if (isBusy) {
      this.element.setAttribute('aria-busy', 'true');
    } else {
      this.element.removeAttribute('aria-busy');
    }
  }

  private handleDomClick(event: MouseEvent): void {
    if (this.listeners.length === 0) {
      return;
    }

    if (this.clickLock.isLocked) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if (this.listeners.some((listener) => listener.usesLock)) {
      this.clickLock.lock(this.lockDuration);
    }

    this.listeners.forEach((listener) => {
      listener.handler.call(this.element, event);
    });
  }
}
