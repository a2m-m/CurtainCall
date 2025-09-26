export interface RouteContext {
  path: string;
  router: Router;
}

export interface RouteDefinition {
  path: string;
  title?: string;
  render: (context: RouteContext) => HTMLElement;
}

export interface RouterOptions {
  fallback: string;
  baseTitle?: string;
}

export interface RouterNavigationGuardContext {
  from: string;
  to: string;
}

export type RouterNavigationGuard = (context: RouterNavigationGuardContext) => boolean;

export type RouterListener = (path: string) => void;

export class Router {
  private readonly root: HTMLElement;
  private readonly fallback: string;
  private readonly baseTitle: string;
  private readonly routes = new Map<string, RouteDefinition>();
  private readonly listeners = new Set<RouterListener>();
  private navigationGuard?: RouterNavigationGuard;
  private skipGuardOnce = false;
  private started = false;
  private currentPath: string;

  constructor(root: HTMLElement, options: RouterOptions) {
    this.root = root;
    this.fallback = this.normalize(options.fallback);
    this.baseTitle = options.baseTitle ?? 'Curtain Call';
    this.currentPath = this.fallback;
  }

  register(definition: RouteDefinition): void {
    const path = this.normalize(definition.path);
    this.routes.set(path, { ...definition, path });
  }

  start(): void {
    if (this.started) {
      return;
    }
    window.addEventListener('hashchange', this.handleChange);
    this.renderCurrent();
    this.started = true;
  }

  go(path: string): void {
    const normalized = this.normalize(path);
    const currentHash = window.location.hash || this.fallback;

    if (normalized === this.currentPath && currentHash === normalized) {
      this.renderCurrent();
      return;
    }

    if (currentHash === normalized) {
      this.renderCurrent();
      return;
    }

    this.skipGuardOnce = true;
    window.location.hash = normalized;
  }

  subscribe(listener: RouterListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getCurrentPath(): string {
    return this.currentPath;
  }

  setNavigationGuard(guard: RouterNavigationGuard | undefined): void {
    this.navigationGuard = guard;
  }

  private handleChange = (): void => {
    this.renderCurrent();
  };

  private renderCurrent(): void {
    const rawHash = window.location.hash;
    const nextPath = this.normalize(rawHash || this.fallback);

    if (!this.shouldAllowNavigation(nextPath)) {
      if (nextPath !== this.currentPath) {
        this.skipGuardOnce = true;
        window.location.hash = this.currentPath;
      }
      return;
    }
    const definition = this.routes.get(nextPath);

    if (!definition) {
      if (nextPath !== this.fallback) {
        this.go(this.fallback);
      }
      return;
    }

    this.currentPath = definition.path;
    const view = definition.render({ path: definition.path, router: this });
    this.root.replaceChildren(view);
    this.updateTitle(definition.title);
    this.focusRenderedView(view);
    this.listeners.forEach((listener) => listener(definition.path));
  }

  private normalize(path: string): string {
    if (!path) {
      return this.fallback;
    }
    if (path === '#') {
      return '#/';
    }
    if (path.startsWith('#')) {
      if (path.length === 1) {
        return '#/';
      }
      return path;
    }
    if (path.startsWith('/')) {
      return `#${path}`;
    }
    return `#/${path}`;
  }

  private updateTitle(title?: string): void {
    document.title = title ? `${title}｜${this.baseTitle}` : this.baseTitle;
  }

  private focusRenderedView(view: HTMLElement): void {
    window.requestAnimationFrame(() => {
      const focusTarget =
        view.querySelector<HTMLElement>('[data-focus-target]') ??
        view.querySelector<HTMLElement>('main') ??
        view;

      if (!focusTarget) {
        return;
      }

      if (!focusTarget.hasAttribute('tabindex')) {
        focusTarget.setAttribute('tabindex', '-1');
      }

      if (focusTarget.id !== 'app-main') {
        focusTarget.id = 'app-main';
      }

      focusTarget.focus({ preventScroll: true });
    });
  }

  private shouldAllowNavigation(nextPath: string): boolean {
    if (this.skipGuardOnce) {
      this.skipGuardOnce = false;
      return true;
    }

    if (!this.navigationGuard) {
      return true;
    }

    if (nextPath === this.currentPath) {
      return true;
    }

    return this.navigationGuard({ from: this.currentPath, to: nextPath });
  }
}
