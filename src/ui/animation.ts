/**
 * アニメーションの有効・無効を一元管理するための型とコントローラです。
 * ブラウザの「簡易モーション（prefers-reduced-motion）」設定も読み取り、
 * 手動指定との整合を取りながら `<html>` 要素にフラグ属性を反映します。
 */
export type AnimationPreference = 'auto' | 'on' | 'off';

export interface AnimationState {
  /** 現時点で演出が有効かどうか（`true` = アニメーション適用） */
  enabled: boolean;
  /** ユーザーが選択した優先度（自動／常に有効／常に無効） */
  preference: AnimationPreference;
}

export type AnimationChangeListener = (state: AnimationState) => void;

const DATA_ATTRIBUTE = 'data-cc-animations';
const PREFERENCE_ATTRIBUTE = 'data-cc-animations-preference';
const STORAGE_KEY = 'cc:settings:animations';

const isAnimationPreference = (value: unknown): value is AnimationPreference =>
  value === 'auto' || value === 'on' || value === 'off';

const readStoredPreference = (): AnimationPreference | null => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isAnimationPreference(stored)) {
      return stored;
    }
  } catch (error) {
    console.warn('アニメーション設定の読み込みに失敗しました。', error);
  }
  return null;
};

const persistPreference = (preference: AnimationPreference): void => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    if (preference === 'auto') {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, preference);
    }
  } catch (error) {
    console.warn('アニメーション設定の保存に失敗しました。', error);
  }
};

const createMediaQuery = (): MediaQueryList => {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-reduced-motion: reduce)');
  }
  return {
    matches: false,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  } as MediaQueryList;
};

class AnimationManager {
  private preference: AnimationPreference = 'auto';
  private readonly mediaQuery: MediaQueryList;
  private readonly listeners = new Set<AnimationChangeListener>();
  private enabled: boolean;

  constructor() {
    const storedPreference = readStoredPreference();
    if (storedPreference) {
      this.preference = storedPreference;
    }
    this.mediaQuery = createMediaQuery();
    this.enabled = this.computeEnabled();
    this.applyPreference();
    if (typeof this.mediaQuery.addEventListener === 'function') {
      this.mediaQuery.addEventListener('change', this.handleSystemPreferenceChange);
    } else {
      // 古いブラウザ向けのフォールバック。addListener は非推奨だが互換のために残す。
      this.mediaQuery.addListener(this.handleSystemPreferenceChange);
    }
  }

  getState(): AnimationState {
    return { enabled: this.enabled, preference: this.preference };
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setPreference(preference: AnimationPreference): void {
    if (this.preference === preference) {
      persistPreference(this.preference);
      return;
    }

    this.preference = preference;
    persistPreference(this.preference);
    const nextEnabled = this.computeEnabled();
    if (nextEnabled === this.enabled) {
      this.applyPreference();
      this.emit();
      return;
    }

    this.enabled = nextEnabled;
    this.applyPreference();
    this.emit();
  }

  useSystemPreference(): void {
    this.setPreference('auto');
  }

  enable(): void {
    this.setPreference('on');
  }

  disable(): void {
    this.setPreference('off');
  }

  subscribe(listener: AnimationChangeListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private computeEnabled(): boolean {
    if (this.preference === 'on') {
      return true;
    }
    if (this.preference === 'off') {
      return false;
    }
    return !this.mediaQuery.matches;
  }

  private applyPreference(): void {
    const root = document.documentElement;
    const flag = this.enabled ? 'on' : 'off';
    root.setAttribute(DATA_ATTRIBUTE, flag);
    root.setAttribute(PREFERENCE_ATTRIBUTE, this.preference);
  }

  private emit(): void {
    const snapshot = this.getState();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  private handleSystemPreferenceChange = (): void => {
    if (this.preference !== 'auto') {
      return;
    }
    const nextEnabled = this.computeEnabled();
    if (nextEnabled === this.enabled) {
      return;
    }
    this.enabled = nextEnabled;
    this.applyPreference();
    this.emit();
  };
}

export const animationManager = new AnimationManager();
