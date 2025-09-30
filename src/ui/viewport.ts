const CSS_VARIABLE_NAME = '--viewport-height';
const HEIGHT_DIFF_THRESHOLD = 0.5;

/**
 * ビューポートの実寸にあわせて CSS 変数 `--viewport-height` を更新する。
 * モバイル端末ではアドレスバーの表示/非表示で `100vh` が実画面とズレやすいため、
 * `window.visualViewport` や `window.innerHeight` を監視して高さを補正する。
 * requestAnimationFrame で更新をまとめることでリサイズ連打時の負荷を抑える。
 */
export const initializeViewportHeightObserver = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const root = document.documentElement;
  if (!root) {
    return;
  }

  let lastHeight = 0;
  let rafId = 0;

  const readViewportHeight = (): number => {
    const viewport = window.visualViewport;
    if (viewport) {
      return viewport.height;
    }
    return window.innerHeight;
  };

  const applyViewportHeight = (height: number) => {
    if (!Number.isFinite(height) || height <= 0) {
      return;
    }

    if (Math.abs(height - lastHeight) < HEIGHT_DIFF_THRESHOLD) {
      return;
    }

    lastHeight = height;
    root.style.setProperty(CSS_VARIABLE_NAME, `${height}px`);
  };

  const updateViewportHeight = () => {
    rafId = 0;
    applyViewportHeight(readViewportHeight());
  };

  const requestViewportUpdate = () => {
    if (rafId !== 0) {
      return;
    }

    rafId = window.requestAnimationFrame(updateViewportHeight);
  };

  updateViewportHeight();

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      requestViewportUpdate();
    }
  };

  window.addEventListener('resize', requestViewportUpdate, { passive: true });
  window.addEventListener('orientationchange', requestViewportUpdate, {
    passive: true,
  });
  document.addEventListener('visibilitychange', handleVisibilityChange, {
    passive: true,
  });

  const viewport = window.visualViewport;
  if (viewport) {
    viewport.addEventListener('resize', requestViewportUpdate, { passive: true });
    viewport.addEventListener('scroll', requestViewportUpdate, { passive: true });
  }
};

