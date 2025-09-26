import { afterEach, beforeAll } from 'vitest';

beforeAll(() => {
  globalThis.requestAnimationFrame = (callback: FrameRequestCallback): number => {
    callback(performance.now());
    return 0;
  };

  globalThis.cancelAnimationFrame = (): void => {
    // テスト環境ではキャンセル処理は不要
  };
});

afterEach(() => {
  document.body.innerHTML = '';
});
