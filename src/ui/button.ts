import { UIComponent } from './component.js';

export type ButtonVariant = 'primary' | 'ghost' | 'danger';

export interface ButtonOptions {
  label: string;
  type?: 'button' | 'submit' | 'reset';
  variant?: ButtonVariant;
  disabled?: boolean;
  onClick?: (event: MouseEvent) => void;
}

export class UIButton extends UIComponent<HTMLButtonElement> {
  private variant: ButtonVariant;

  constructor(options: ButtonOptions) {
    const element = document.createElement('button');
    element.type = options.type ?? 'button';
    element.classList.add('button');
    super(element);
    this.variant = options.variant ?? 'primary';
    this.applyVariant(this.variant);
    this.setLabel(options.label);
    this.setDisabled(Boolean(options.disabled));

    if (options.onClick) {
      this.element.addEventListener('click', options.onClick);
    }
  }

  setLabel(label: string): void {
    this.element.textContent = label;
  }

  setDisabled(disabled: boolean): void {
    this.element.disabled = disabled;
  }

  setVariant(variant: ButtonVariant): void {
    if (variant === this.variant) {
      return;
    }
    this.element.classList.remove(`button--${this.variant}`);
    this.variant = variant;
    this.applyVariant(variant);
  }

  onClick(handler: (event: MouseEvent) => void): this {
    this.element.addEventListener('click', handler);
    return this;
  }

  private applyVariant(variant: ButtonVariant): void {
    if (variant !== 'primary') {
      this.element.classList.add(`button--${variant}`);
    }
  }
}
