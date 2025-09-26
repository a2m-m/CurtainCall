import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Router } from '../src/router.js';
import type { RouteContext } from '../src/router.js';

describe('Router', () => {
  const createRoot = (): HTMLElement => {
    const root = document.createElement('div');
    root.id = 'test-root';
    document.body.appendChild(root);
    return root;
  };

  beforeEach(() => {
    document.body.innerHTML = '';
    window.location.hash = '';
    document.title = 'Curtain Call';
  });

  it('startでフォールバックルートを描画し、フォーカス制御を適用する', async () => {
    const root = createRoot();
    const router = new Router(root, { fallback: '#/', baseTitle: 'Curtain Call' });

    router.register({
      path: '#/',
      title: 'HOME',
      render: () => {
        const view = document.createElement('main');
        view.setAttribute('data-focus-target', '');
        view.textContent = 'home';
        return view;
      },
    });

    router.start();
    await Promise.resolve();

    expect(router.getCurrentPath()).toBe('#/');
    expect(document.title).toBe('HOME｜Curtain Call');

    const focusTarget = root.querySelector('[data-focus-target]') as HTMLElement | null;
    expect(focusTarget).not.toBeNull();
    expect(focusTarget?.id).toBe('app-main');
    expect(focusTarget?.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(focusTarget);
  });

  it('goで登録済みルートへ遷移し、購読者へ通知する', async () => {
    const root = createRoot();
    const router = new Router(root, { fallback: '#/' });
    const renderHome = vi.fn(() => {
      const el = document.createElement('div');
      el.textContent = 'home';
      return el;
    });
    const renderFoo = vi.fn((context: RouteContext) => {
      const el = document.createElement('section');
      el.dataset.path = context.path;
      return el;
    });

    router.register({ path: '#/', render: renderHome });
    router.register({ path: '#/foo', title: 'FOO', render: renderFoo });

    const listener = vi.fn();
    router.subscribe(listener);

    router.start();
    await Promise.resolve();
    expect(renderHome.mock.calls.length).toBeGreaterThanOrEqual(1);

    await new Promise<void>((resolve) => {
      const unsubscribe = router.subscribe((path) => {
        if (path === '#/foo') {
          unsubscribe();
          resolve();
        }
      });
      router.go('#/foo');
      (router as unknown as { renderCurrent: () => void }).renderCurrent();
    });

    expect(router.getCurrentPath()).toBe('#/foo');
    expect(listener).toHaveBeenCalledWith('#/foo');
    expect(root.querySelector('section')?.dataset.path).toBe('#/foo');
    expect(document.title).toBe('FOO｜Curtain Call');
  });

  it('未知のルートに遷移した場合はフォールバックへ戻る', async () => {
    const root = createRoot();
    const router = new Router(root, { fallback: '#/' });
    const renderHome = vi.fn(() => {
      const el = document.createElement('main');
      el.textContent = 'home';
      return el;
    });

    router.register({ path: '#/', render: renderHome });

    router.start();
    await Promise.resolve();
    expect(renderHome.mock.calls.length).toBeGreaterThanOrEqual(1);

    router.go('#/missing');
    window.dispatchEvent(new Event('hashchange'));
    await Promise.resolve();
    window.dispatchEvent(new Event('hashchange'));
    await Promise.resolve();

    expect(router.getCurrentPath()).toBe('#/');
    expect(window.location.hash).toBe('#/');
    expect(renderHome.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
