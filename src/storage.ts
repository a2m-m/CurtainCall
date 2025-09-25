import { GameState, PhaseKey, PlayerId, TurnState } from './state.js';

const STORAGE_VERSION = 1;

const STORAGE_KEYS = {
  latest: 'cc:save:latest',
  slotPrefix: 'cc:save:slots:',
  history: 'cc:history:list',
} as const;

const RESUME_GATE_PATH = '#/resume/gate';

const STORAGE_TEST_KEY = '__cc:storage:test__';

const HISTORY_STORAGE_VERSION = 1;
const HISTORY_MAX_ENTRIES = 50;

export interface ResultHistoryEntry {
  id: string;
  summary: string;
  detail?: string;
  savedAt: number;
}

interface ResultHistoryPayloadV1 {
  version: number;
  entries: ResultHistoryEntry[];
}

export interface SaveMetadata {
  savedAt: number;
  phase: PhaseKey;
  activePlayer: PlayerId;
  turn: TurnState;
  route: string;
  revision: number;
}

export interface StoredGamePayload {
  version: number;
  state: GameState;
  meta: SaveMetadata;
}

export interface LoadOptions {
  /**
   * true の場合、`#/resume/gate` 以外のパスからでも復元を許可します。
   * テスト用途や内部処理向けの抜け道です。
   */
  allowUnsafe?: boolean;
  /** 現在のハッシュ。省略時は `window.location.hash` を参照します。 */
  currentPath?: string | null;
}

let cachedStorage: Storage | null | undefined;
let lastSavedSignature: string | null = null;

const getStorage = (): Storage | null => {
  if (cachedStorage !== undefined) {
    return cachedStorage;
  }
  if (typeof window === 'undefined' || !window.localStorage) {
    cachedStorage = null;
    return cachedStorage;
  }
  try {
    const { localStorage } = window;
    localStorage.setItem(STORAGE_TEST_KEY, 'ok');
    localStorage.removeItem(STORAGE_TEST_KEY);
    cachedStorage = localStorage;
  } catch (error) {
    console.warn('localStorage が利用できません。', error);
    cachedStorage = null;
  }
  return cachedStorage;
};

const normalizePath = (path: string): string => {
  if (!path) {
    return '#/';
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
};

const cloneValue = <T>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const isResultHistoryEntry = (value: unknown): value is ResultHistoryEntry => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Partial<ResultHistoryEntry>;
  if (typeof record.id !== 'string' || record.id.length === 0) {
    return false;
  }
  if (typeof record.summary !== 'string') {
    return false;
  }
  if (record.detail !== undefined && typeof record.detail !== 'string') {
    return false;
  }
  if (typeof record.savedAt !== 'number' || !Number.isFinite(record.savedAt)) {
    return false;
  }
  return true;
};

const parseResultHistoryEntries = (value: unknown): ResultHistoryEntry[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const entries: ResultHistoryEntry[] = [];
  value.forEach((entry) => {
    if (isResultHistoryEntry(entry)) {
      entries.push({
        id: entry.id,
        summary: entry.summary,
        detail: entry.detail,
        savedAt: entry.savedAt,
      });
    }
  });
  return entries;
};

const readResultHistoryEntries = (storage: Storage): ResultHistoryEntry[] => {
  const raw = storage.getItem(STORAGE_KEYS.history);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as ResultHistoryPayloadV1 | ResultHistoryEntry[] | null;
    if (!parsed) {
      return [];
    }
    if (Array.isArray(parsed)) {
      return parseResultHistoryEntries(parsed);
    }
    if (typeof parsed === 'object' && Array.isArray(parsed.entries)) {
      return parseResultHistoryEntries(parsed.entries);
    }
  } catch (error) {
    console.warn('結果履歴の解析に失敗しました。', error);
  }
  return [];
};

const writeResultHistoryEntries = (storage: Storage, entries: ResultHistoryEntry[]): void => {
  const normalized = entries
    .filter((entry) => isResultHistoryEntry(entry))
    .slice()
    .sort((a, b) => b.savedAt - a.savedAt)
    .slice(0, HISTORY_MAX_ENTRIES)
    .map((entry) => ({
      id: entry.id,
      summary: entry.summary,
      detail: entry.detail,
      savedAt: entry.savedAt,
    }));

  try {
    const payload: ResultHistoryPayloadV1 = {
      version: HISTORY_STORAGE_VERSION,
      entries: normalized,
    };
    storage.setItem(STORAGE_KEYS.history, JSON.stringify(payload));
  } catch (error) {
    console.warn('結果履歴の保存に失敗しました。', error);
  }
};

const createSaveMetadata = (state: GameState): SaveMetadata => ({
  savedAt: state.updatedAt,
  phase: state.phase,
  activePlayer: state.activePlayer,
  turn: { ...state.turn },
  route: state.route,
  revision: state.revision,
});

const readLatestPayload = (): StoredGamePayload | null => {
  const storage = getStorage();
  if (!storage) {
    return null;
  }
  const raw = storage.getItem(STORAGE_KEYS.latest);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as StoredGamePayload;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    if (parsed.version !== STORAGE_VERSION) {
      return null;
    }
    if (!parsed.state || !parsed.meta) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('セーブデータの解析に失敗しました。', error);
    return null;
  }
};

const enforceResumeGate = (options: LoadOptions): void => {
  if (options.allowUnsafe) {
    return;
  }
  const currentPath =
    options.currentPath ?? (typeof window !== 'undefined' ? window.location.hash : null);
  if (!currentPath) {
    return;
  }
  const normalized = normalizePath(currentPath);
  if (normalized !== RESUME_GATE_PATH) {
    throw new Error('レジュームゲート以外からの復元は許可されていません。');
  }
};

export const saveLatestGame = (state: GameState): void => {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  const signature = `${state.matchId}:${state.revision}:${state.updatedAt}`;
  if (lastSavedSignature === signature) {
    return;
  }
  const meta = createSaveMetadata(state);
  const resume =
    state.resume ??
    ({
      at: meta.savedAt,
      phase: state.phase,
      player: state.activePlayer,
      route: state.route,
    } as const);
  const payload: StoredGamePayload = {
    version: STORAGE_VERSION,
    state: cloneValue({
      ...state,
      resume,
    }),
    meta: { ...meta, turn: { ...meta.turn } },
  };
  try {
    storage.setItem(STORAGE_KEYS.latest, JSON.stringify(payload));
    lastSavedSignature = signature;
  } catch (error) {
    console.warn('セーブデータの保存に失敗しました。', error);
  }
};

export const loadLatestGame = (options: LoadOptions = {}): StoredGamePayload | null => {
  enforceResumeGate(options);
  const payload = readLatestPayload();
  if (!payload) {
    return null;
  }
  return {
    version: payload.version,
    state: cloneValue(payload.state),
    meta: { ...payload.meta, turn: { ...payload.meta.turn } },
  };
};

export const clearLatestGame = (): void => {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(STORAGE_KEYS.latest);
    lastSavedSignature = null;
  } catch (error) {
    console.warn('セーブデータの削除に失敗しました。', error);
  }
};

export const getLatestSaveMetadata = (): SaveMetadata | null => {
  const payload = readLatestPayload();
  if (!payload) {
    return null;
  }
  return { ...payload.meta, turn: { ...payload.meta.turn } };
};

export const getResultHistory = (): ResultHistoryEntry[] => {
  const storage = getStorage();
  if (!storage) {
    return [];
  }
  const entries = readResultHistoryEntries(storage);
  return entries
    .slice()
    .sort((a, b) => b.savedAt - a.savedAt)
    .map((entry) => cloneValue(entry));
};

export const deleteResultHistoryEntry = (id: string): boolean => {
  if (!id) {
    return false;
  }
  const storage = getStorage();
  if (!storage) {
    return false;
  }
  const entries = readResultHistoryEntries(storage);
  const nextEntries = entries.filter((entry) => entry.id !== id);
  if (nextEntries.length === entries.length) {
    return false;
  }
  writeResultHistoryEntries(storage, nextEntries);
  return true;
};

export const hasLatestSave = (): boolean => readLatestPayload() !== null;

export const getStorageKeys = () => ({ ...STORAGE_KEYS });
