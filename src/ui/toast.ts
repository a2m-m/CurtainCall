import { UIComponent } from './component.js';

export type ToastVariant = 'info' | 'success' | 'warning' | 'danger';

export interface ToastOptions {
  message: string;
  duration?: number;
  variant?: ToastVariant;
}

class ToastView extends UIComponent<HTMLDivElement> {
  constructor(message: string, variant?: ToastVariant) {
    super(document.createElement('div'));
    this.element.className = 'toast';
    if (variant) {
      this.element.classList.add(`toast--${variant}`);
    }

    const text = document.createElement('span');
    text.textContent = message;
    this.element.append(text);
  }
}

export class ToastManager {
  private readonly host: HTMLElement;
  private idCounter = 0;
  private timers = new Map<number, number>();

  constructor(host: HTMLElement) {
    this.host = host;
  }

  show(options: ToastOptions): number {
    const id = ++this.idCounter;
    const view = new ToastView(options.message, options.variant);
    view.el.dataset.toastId = String(id);
    this.host.append(view.el);

    const timer = window.setTimeout(() => this.dismiss(id), options.duration ?? 4000);
    this.timers.set(id, timer);
    return id;
  }

  dismiss(id: number): void {
    const toast = this.host.querySelector<HTMLElement>(`.toast[data-toast-id="${id}"]`);
    if (toast) {
      toast.remove();
    }
    const timer = this.timers.get(id);
    if (typeof timer === 'number') {
      window.clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  clear(): void {
    this.timers.forEach((timer) => window.clearTimeout(timer));
    this.timers.clear();
    this.host.replaceChildren();
  }
}
