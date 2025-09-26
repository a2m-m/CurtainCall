import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WATCH_GUARD_REDIRECTING_SUBTITLE } from '../src/messages.js';
import { UIButton } from '../src/ui/button.js';

const waitForRender = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

describe('共有ガード', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.location.hash = '#/';
  });

  afterEach(() => {
    if ('curtainCall' in window) {
      // 後続テストへの影響を避けるため、グローバル参照をリセットする
      delete (window as Window & { curtainCall?: unknown }).curtainCall;
    }
    document.body.innerHTML = '';
  });

  it('ウォッチゲート通過前は秘匿情報の代わりにガード用プレースホルダを描画し、ゲートへ誘導する', async () => {
    document.body.innerHTML = `
      <div id="app"></div>
      <div id="modal-root"></div>
      <div id="toast-root"></div>
    `;

    const transitions: string[] = [];

    await import('../src/app.js');

    const router = window.curtainCall?.router;
    expect(router).toBeDefined();

    router?.subscribe((path) => {
      transitions.push(path);
      if (path === '#/phase/watch') {
        const subtitle = document.querySelector<HTMLParagraphElement>('.placeholder__subtitle');
        expect(subtitle?.textContent).toBe(WATCH_GUARD_REDIRECTING_SUBTITLE);
      }
    });

    router?.go('#/phase/watch');

    await waitForRender();
    await waitForRender();

    expect(transitions).toContain('#/phase/watch');
    expect(transitions).toContain('#/phase/watch/gate');
    expect(transitions[transitions.length - 1]).toBe('#/phase/watch/gate');
    expect(window.location.hash).toBe('#/phase/watch/gate');
    expect(document.querySelector('.watch')).toBeNull();
    expect(document.querySelector('.gate-view')).not.toBeNull();
  });

  it('preventRapid が既定のボタンは一定時間クリックをロックする', () => {
    vi.useFakeTimers();

    try {
      const button = new UIButton({ label: 'テストボタン' });
      document.body.append(button.el);

      const handler = vi.fn();
      button.onClick(handler);

      button.el.click();
      button.el.click();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(button.locked).toBe(true);

      vi.advanceTimersByTime(320);

      expect(button.locked).toBe(false);

      button.el.click();
      expect(handler).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
