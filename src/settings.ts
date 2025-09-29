import {
  DEFAULT_PLAYER_NAMES,
  PLAYER_IDS,
  type CardRank,
  type PlayerId,
  type PlayerState,
  Store,
} from './state.js';
import {
  DEFAULT_RANK_VALUE_RULE,
  registerRankValueRule,
  setActiveRankValueRule,
  type RankValueRuleId,
} from './rank.js';

export type PlayerNameSettings = Record<PlayerId, string>;
export type RankValueMap = Record<CardRank, number>;

export interface RankSettings {
  ruleId: RankValueRuleId;
  values: RankValueMap;
}

export interface SoundSettings {
  effects: boolean;
}

export interface AppSettings extends Record<string, unknown> {
  players: PlayerNameSettings;
  rank: RankSettings;
  sound: SoundSettings;
}

export const CUSTOM_RANK_VALUE_RULE_ID: RankValueRuleId = 'custom';

export const RANK_VALUE_KEYS: readonly CardRank[] = [
  'A',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
  'JOKER',
] as const;

export const PLAYER_NAME_MAX_LENGTH = 24;
export const RANK_VALUE_MIN = 0;
export const RANK_VALUE_MAX = 99;

const SETTINGS_STORAGE_KEY = 'cc:settings:config';
const SETTINGS_STORAGE_VERSION = 1;

const DEFAULT_RANK_VALUES: RankValueMap = {
  A: 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  JOKER: 0,
};

export const DEFAULT_SETTINGS: AppSettings = {
  players: {
    lumina: DEFAULT_PLAYER_NAMES.lumina,
    nox: DEFAULT_PLAYER_NAMES.nox,
  },
  rank: {
    ruleId: DEFAULT_RANK_VALUE_RULE,
    values: { ...DEFAULT_RANK_VALUES },
  },
  sound: {
    effects: true,
  },
};

interface StoredSettingsPayloadV1 {
  version: number;
  settings: unknown;
}

const settingsStore = new Store<AppSettings>(DEFAULT_SETTINGS);

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const normalizePlayerName = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }
  return trimmed.slice(0, PLAYER_NAME_MAX_LENGTH);
};

const normalizeRankRuleId = (value: unknown): RankValueRuleId => {
  if (typeof value === 'string') {
    if (value === CUSTOM_RANK_VALUE_RULE_ID) {
      return CUSTOM_RANK_VALUE_RULE_ID;
    }
    if (value === DEFAULT_RANK_VALUE_RULE) {
      return DEFAULT_RANK_VALUE_RULE;
    }
  }
  return DEFAULT_RANK_VALUE_RULE;
};

const normalizeRankValue = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return clamp(Math.round(value), RANK_VALUE_MIN, RANK_VALUE_MAX);
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return clamp(Math.round(parsed), RANK_VALUE_MIN, RANK_VALUE_MAX);
    }
  }
  return clamp(Math.round(fallback), RANK_VALUE_MIN, RANK_VALUE_MAX);
};

const normalizeRankValues = (value: unknown): RankValueMap => {
  const record = (value && typeof value === 'object' ? (value as Record<string, unknown>) : {}) as Record<
    CardRank,
    unknown
  >;
  const normalized: Partial<RankValueMap> = {};
  for (const rank of RANK_VALUE_KEYS) {
    normalized[rank] = normalizeRankValue(record[rank], DEFAULT_RANK_VALUES[rank]);
  }
  return normalized as RankValueMap;
};

const normalizeSoundEffects = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    if (value === 'true') {
      return true;
    }
    if (value === 'false') {
      return false;
    }
  }
  return true;
};

const normalizeSettings = (value: unknown): AppSettings => {
  const record = (value && typeof value === 'object' ? (value as Record<string, unknown>) : {}) as {
    players?: Record<string, unknown>;
    rank?: {
      ruleId?: unknown;
      values?: Record<string, unknown>;
    };
    sound?: {
      effects?: unknown;
    };
  };

  const players: PlayerNameSettings = {
    lumina: normalizePlayerName(record.players?.lumina, DEFAULT_PLAYER_NAMES.lumina),
    nox: normalizePlayerName(record.players?.nox, DEFAULT_PLAYER_NAMES.nox),
  };

  const rank: RankSettings = {
    ruleId: normalizeRankRuleId(record.rank?.ruleId),
    values: normalizeRankValues(record.rank?.values),
  };

  const sound: SoundSettings = {
    effects: normalizeSoundEffects(record.sound?.effects),
  };

  return { players, rank, sound };
};

const loadSettingsFromStorage = (): AppSettings | null => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as StoredSettingsPayloadV1;
    if (!parsed || parsed.version !== SETTINGS_STORAGE_VERSION) {
      return null;
    }
    return normalizeSettings(parsed.settings);
  } catch (error) {
    console.warn('設定の読み込みに失敗しました。既定値を使用します。', error);
    return null;
  }
};

const persistSettings = (settings: AppSettings): void => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    const payload: StoredSettingsPayloadV1 = {
      version: SETTINGS_STORAGE_VERSION,
      settings,
    };
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('設定の保存に失敗しました。', error);
  }
};

const ensureRankRuleRegistration = (settings: AppSettings): void => {
  if (settings.rank.ruleId === CUSTOM_RANK_VALUE_RULE_ID) {
    const values = { ...settings.rank.values };
    registerRankValueRule(CUSTOM_RANK_VALUE_RULE_ID, (rank) => {
      const value = values[rank];
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return DEFAULT_RANK_VALUES[rank];
      }
      return value;
    });
  }

  try {
    setActiveRankValueRule(settings.rank.ruleId);
  } catch (error) {
    console.warn('未登録のランク変換ルールが選択されました。既定値へ戻します。', error);
    setActiveRankValueRule(DEFAULT_RANK_VALUE_RULE);
  }
};

const stored = loadSettingsFromStorage();
if (stored) {
  settingsStore.setState(stored);
}

settingsStore.subscribe((settings) => {
  persistSettings(settings);
  ensureRankRuleRegistration(settings);
});

export const getSettings = (): AppSettings => settingsStore.getState();

export const subscribeSettings = settingsStore.subscribe.bind(settingsStore);

export const setSettings = (next: AppSettings | unknown): void => {
  settingsStore.setState(() => normalizeSettings(next));
};

export const updateSettings = (
  updater: (current: AppSettings) => AppSettings | Partial<AppSettings> | unknown,
): void => {
  settingsStore.setState((current) => normalizeSettings(updater(current)));
};

export const resetSettings = (): void => {
  settingsStore.setState(DEFAULT_SETTINGS);
};

export const applyPlayerNamesToState = (state: {
  players: Record<PlayerId, PlayerState | undefined>;
} & Record<string, unknown>, settings: AppSettings): typeof state => {
  let changed = false;
  const nextPlayers: Record<PlayerId, PlayerState> = { ...state.players } as Record<PlayerId, PlayerState>;

  for (const playerId of PLAYER_IDS) {
    const player = state.players[playerId];
    if (!player) {
      continue;
    }
    const nextName = settings.players[playerId] ?? DEFAULT_PLAYER_NAMES[playerId];
    if (player.name === nextName) {
      continue;
    }
    nextPlayers[playerId] = {
      ...player,
      name: nextName,
    };
    changed = true;
  }

  if (!changed) {
    return state;
  }

  return {
    ...state,
    players: nextPlayers,
  };
};
