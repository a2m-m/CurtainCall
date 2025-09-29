import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const SETTINGS_STORAGE_KEY = 'cc:settings:config';

const createMockStorage = () => {
  const store = new Map<string, string>();
  const api: Storage = {
    get length(): number {
      return store.size;
    },
    clear: (): void => {
      store.clear();
    },
    getItem: (key: string): string | null => store.get(key) ?? null,
    key: (index: number): string | null => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string): void => {
      store.delete(key);
    },
    setItem: (key: string, value: string): void => {
      store.set(key, value);
    },
  };
  return { store, api };
};

const importSettingsModule = async () => import('../src/settings.js');

let mockStorage: ReturnType<typeof createMockStorage>;

describe('settings.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    mockStorage = createMockStorage();
    (globalThis as unknown as { window?: Window }).window = {
      localStorage: mockStorage.api,
    } as Window;
  });

  afterEach(() => {
    delete (globalThis as { window?: Window }).window;
  });

  it('既定設定を返す', async () => {
    const { getSettings, DEFAULT_SETTINGS } = await importSettingsModule();
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('setSettingsでプレイヤー名を更新し、空欄は既定値になる', async () => {
    const { getSettings, setSettings, DEFAULT_SETTINGS } = await importSettingsModule();

    setSettings({
      ...DEFAULT_SETTINGS,
      players: {
        lumina: '  ルミナ  ',
        nox: '',
      },
    });

    const next = getSettings();
    expect(next.players.lumina).toBe('ルミナ');
    expect(next.players.nox).toBe(DEFAULT_SETTINGS.players.nox);
  });

  it('カスタムランク設定を保存するとルールが切り替わり、値が正規化される', async () => {
    const { getSettings, setSettings, DEFAULT_SETTINGS, CUSTOM_RANK_VALUE_RULE_ID } =
      await importSettingsModule();
    const { getActiveRankValueRule } = await import('../src/rank.js');

    setSettings({
      ...DEFAULT_SETTINGS,
      rank: {
        ruleId: CUSTOM_RANK_VALUE_RULE_ID,
        values: {
          ...DEFAULT_SETTINGS.rank.values,
          A: 150,
          JOKER: -10,
        },
      },
    });

    const next = getSettings();
    expect(next.rank.ruleId).toBe(CUSTOM_RANK_VALUE_RULE_ID);
    expect(next.rank.values.A).toBe(99);
    expect(next.rank.values.JOKER).toBe(0);
    expect(getActiveRankValueRule()).toBe(CUSTOM_RANK_VALUE_RULE_ID);
  });

  it('保存時にlocalStorageへ書き込む', async () => {
    const { setSettings, DEFAULT_SETTINGS } = await importSettingsModule();

    setSettings({
      ...DEFAULT_SETTINGS,
      players: {
        lumina: 'Alice',
        nox: 'Bob',
      },
    });

    const stored = mockStorage.store.get(SETTINGS_STORAGE_KEY);
    expect(stored).toBeTypeOf('string');
    const parsed = stored ? JSON.parse(stored) : null;
    expect(parsed).toMatchObject({ version: 1 });
    expect(parsed?.settings?.players?.lumina).toBe('Alice');
  });
});
