import { UIComponent } from './component.js';
import { UIButton } from './button.js';

export interface HamburgerMenuOptions {
  label?: string;
  ariaLabel?: string;
  className?: string;
}

export class HamburgerMenu extends UIComponent<HTMLDivElement> {
  private readonly toggleButton: UIButton;

  private readonly panel: HTMLDivElement;

  private isOpen = false;

  private readonly handleDocumentPointerDown = (event: PointerEvent): void => {
    if (!this.isOpen) {
      return;
    }

    if (!(event.target instanceof Node)) {
      return;
    }

    if (!this.element.contains(event.target)) {
      this.close();
    }
  };

  private readonly handleDocumentKeyDown = (event: KeyboardEvent): void => {
    if (!this.isOpen) {
      return;
    }

    if (event.key === 'Escape') {
      this.close();
    }
  };

  constructor(options: HamburgerMenuOptions = {}) {
    const container = document.createElement('div');
    container.className = 'hamburger-menu';
    super(container);

    if (options.className) {
      container.classList.add(options.className);
    }

    this.toggleButton = new UIButton({
      label: options.label ?? 'メニュー',
      variant: 'ghost',
      preventRapid: false,
    });
    this.toggleButton.el.classList.add('hamburger-menu__toggle');

    const ariaLabel = options.ariaLabel ?? options.label ?? 'メニュー';
    this.toggleButton.el.setAttribute('aria-label', ariaLabel);
    this.toggleButton.el.setAttribute('aria-haspopup', 'true');
    this.toggleButton.el.setAttribute('aria-expanded', 'false');

    this.panel = document.createElement('div');
    this.panel.className = 'hamburger-menu__panel';

    this.toggleButton.onClick(() => {
      this.toggle();
    });

    this.panel.addEventListener('click', (event) => {
      if (!(event.target instanceof HTMLElement)) {
        return;
      }

      if (!this.panel.contains(event.target)) {
        return;
      }

      this.close();
    });

    container.append(this.toggleButton.el, this.panel);
  }

  addItem(element: HTMLElement): void {
    this.panel.append(element);
  }

  get itemCount(): number {
    return this.panel.childElementCount;
  }

  close(): void {
    if (!this.isOpen) {
      return;
    }

    this.isOpen = false;
    this.element.classList.remove('is-open');
    this.toggleButton.el.setAttribute('aria-expanded', 'false');

    if (typeof document !== 'undefined') {
      document.removeEventListener('pointerdown', this.handleDocumentPointerDown);
      document.removeEventListener('keydown', this.handleDocumentKeyDown);
    }
  }

  private open(): void {
    if (this.isOpen || this.itemCount === 0) {
      return;
    }

    this.isOpen = true;
    this.element.classList.add('is-open');
    this.toggleButton.el.setAttribute('aria-expanded', 'true');

    if (typeof document !== 'undefined') {
      document.addEventListener('pointerdown', this.handleDocumentPointerDown);
      document.addEventListener('keydown', this.handleDocumentKeyDown);
    }
  }

  private toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
}
