import {
  BackstageItemState,
  BackstageState,
  CardSnapshot,
  GameState,
  PhaseKey,
  PlayerId,
  TurnState,
  createInitialBackstageState,
} from './state.js';

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
const BACKSTAGE_ITEM_ID_PREFIX = 'backstage-';

const createResultHistoryEntryId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const random = Math.random().toString(16).slice(2, 10);
  return `result-${Date.now()}-${random}`;
};

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

/**
 * ゲームデータの保存・読込・履歴管理を行うための抽象インターフェースです。
 * 既定では localStorage を利用した実装を利用しますが、テストや将来的な移行を
 * 考慮し、任意のアダプタへ差し替えられるようにしています。
 */
export interface StorageAdapter {
  saveGame(state: GameState): void;
  loadGame(options?: LoadOptions): StoredGamePayload | null;
  clearGame(): void;
  getSavedGameMetadata(): SaveMetadata | null;
  hasSavedGame(): boolean;
  listResultHistory(): ResultHistoryEntry[];
  deleteResult(id: string): boolean;
  saveResult(summary: string, detail?: string, savedAt?: number): ResultHistoryEntry | null;
}

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

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isPlayerId = (value: unknown): value is PlayerId => value === 'lumina' || value === 'nox';

const normalizeCardSnapshot = (value: unknown): CardSnapshot | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Partial<CardSnapshot>;
  if (
    typeof record.id !== 'string' ||
    typeof record.rank !== 'string' ||
    typeof record.suit !== 'string' ||
    !isFiniteNumber(record.value) ||
    (record.face !== 'up' && record.face !== 'down')
  ) {
    return null;
  }
  const snapshot: CardSnapshot = {
    id: record.id,
    rank: record.rank as CardSnapshot['rank'],
    suit: record.suit as CardSnapshot['suit'],
    value: record.value,
    face: record.face,
  };
  if (typeof record.annotation === 'string' && record.annotation.length > 0) {
    snapshot.annotation = record.annotation;
  }
  return snapshot;
};

const normalizeBackstageItems = (items: unknown): BackstageItemState[] => {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.reduce<BackstageItemState[]>((acc, entry, index) => {
    if (!entry || typeof entry !== 'object') {
      return acc;
    }
    const record = entry as Partial<BackstageItemState> & { card?: unknown };
    const card = normalizeCardSnapshot(record.card);
    if (!card) {
      return acc;
    }
    const position = isFiniteNumber(record.position) ? record.position : index;
    const id =
      typeof record.id === 'string' && record.id.length > 0
        ? record.id
        : `${BACKSTAGE_ITEM_ID_PREFIX}${String(position + 1).padStart(2, '0')}`;
    const status: BackstageItemState['status'] =
      record.status === 'stage' || record.status === 'hand' ? record.status : 'backstage';
    const holder = isPlayerId(record.holder) ? record.holder : null;
    const normalized: BackstageItemState = {
      id,
      card,
      position,
      status,
      holder,
      isPublic: record.isPublic === true,
    };
    if (isFiniteNumber(record.revealedAt)) {
      normalized.revealedAt = record.revealedAt;
    }
    if (isPlayerId(record.revealedBy)) {
      normalized.revealedBy = record.revealedBy;
    }
    if (typeof record.stagePairId === 'string' && record.stagePairId.length > 0) {
      normalized.stagePairId = record.stagePairId;
    }
    acc.push(normalized);
    return acc;
  }, []);
};

const normalizeBackstageState = (value: unknown): BackstageState => {
  const fallback = createInitialBackstageState();
  if (!value || typeof value !== 'object') {
    return fallback;
  }
  const record = value as Partial<BackstageState> & { items?: unknown };
  const items = normalizeBackstageItems(record.items);
  const pile =
    isFiniteNumber(record.pile) && record.pile >= 0
      ? Math.floor(record.pile)
      : items.filter((item) => item.status === 'backstage').length;
  const lastSpotlightPairFormed =
    record.lastSpotlightPairFormed === true
      ? true
      : record.lastSpotlightPairFormed === false
        ? false
        : fallback.lastSpotlightPairFormed;
  const canActPlayer = isPlayerId(record.canActPlayer) ? record.canActPlayer : fallback.canActPlayer;
  const actedThisIntermission =
    record.actedThisIntermission === true
      ? true
      : record.actedThisIntermission === false
        ? false
        : fallback.actedThisIntermission;
  const lastResult =
    record.lastResult === 'match' || record.lastResult === 'mismatch'
      ? record.lastResult
      : fallback.lastResult;
  const lastResultMessage =
    typeof record.lastResultMessage === 'string' ? record.lastResultMessage : fallback.lastResultMessage;
  const lastCompletionMessage =
    typeof record.lastCompletionMessage === 'string'
      ? record.lastCompletionMessage
      : fallback.lastCompletionMessage;
  return {
    items,
    pile,
    lastSpotlightPairFormed,
    canActPlayer,
    actedThisIntermission,
    lastResult,
    lastResultMessage,
    lastCompletionMessage,
  };
};

const normalizeGameStateForLoad = (state: GameState): GameState => ({
  ...state,
  backstage: normalizeBackstageState((state as Record<string, unknown>).backstage),
});

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

const localSaveGame = (state: GameState): void => {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  const normalizedState = normalizeGameStateForLoad(state);
  const signature = `${normalizedState.matchId}:${normalizedState.revision}:${normalizedState.updatedAt}`;
  if (lastSavedSignature === signature) {
    return;
  }
  const meta = createSaveMetadata(normalizedState);
  const resume =
    normalizedState.resume ??
    ({
      at: meta.savedAt,
      phase: normalizedState.phase,
      player: normalizedState.activePlayer,
      route: normalizedState.route,
    } as const);
  const payload: StoredGamePayload = {
    version: STORAGE_VERSION,
    state: cloneValue({
      ...normalizedState,
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

const localLoadGame = (options: LoadOptions = {}): StoredGamePayload | null => {
  enforceResumeGate(options);
  const payload = readLatestPayload();
  if (!payload) {
    return null;
  }
  const clonedState = cloneValue(payload.state);
  const normalizedState = normalizeGameStateForLoad(clonedState);
  return {
    version: payload.version,
    state: normalizedState,
    meta: { ...payload.meta, turn: { ...payload.meta.turn } },
  };
};

const localClearGame = (): void => {
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

const localGetSavedGameMetadata = (): SaveMetadata | null => {
  const payload = readLatestPayload();
  if (!payload) {
    return null;
  }
  return { ...payload.meta, turn: { ...payload.meta.turn } };
};

const localListResultHistory = (): ResultHistoryEntry[] => {
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

const localDeleteResult = (id: string): boolean => {
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

const localHasSavedGame = (): boolean => readLatestPayload() !== null;

export const getStorageKeys = () => ({ ...STORAGE_KEYS });

const localSaveResult = (
  summary: string,
  detail?: string,
  savedAt?: number,
): ResultHistoryEntry | null => {
  const normalizedSummary = summary?.trim();
  if (!normalizedSummary) {
    return null;
  }

  const storage = getStorage();
  if (!storage) {
    return null;
  }

  const timestamp = Number.isFinite(savedAt) ? (savedAt as number) : Date.now();
  const normalizedDetail = detail?.trim();

  const entry: ResultHistoryEntry = {
    id: createResultHistoryEntryId(),
    summary: normalizedSummary,
    detail: normalizedDetail && normalizedDetail.length > 0 ? normalizedDetail : undefined,
    savedAt: timestamp,
  };

  const entries = readResultHistoryEntries(storage);
  entries.push(entry);
  writeResultHistoryEntries(storage, entries);

  return { ...entry };
};

const localStorageAdapter: StorageAdapter = {
  saveGame: (state) => {
    localSaveGame(state);
  },
  loadGame: (options) => localLoadGame(options ?? {}),
  clearGame: () => {
    localClearGame();
  },
  getSavedGameMetadata: () => localGetSavedGameMetadata(),
  hasSavedGame: () => localHasSavedGame(),
  listResultHistory: () => localListResultHistory(),
  deleteResult: (id) => localDeleteResult(id),
  saveResult: (summary, detail, savedAt) => localSaveResult(summary, detail, savedAt),
};

let activeStorageAdapter: StorageAdapter = localStorageAdapter;

/**
 * ストレージアダプタを差し替えるためのヘルパーです。null や undefined を渡すと
 * 既定（localStorage ベース）のアダプタに戻ります。
 */
export const setStorageAdapter = (adapter: StorageAdapter | null | undefined): void => {
  if (!adapter) {
    lastSavedSignature = null;
    activeStorageAdapter = localStorageAdapter;
    return;
  }
  activeStorageAdapter = adapter;
};

/**
 * 現在利用しているストレージアダプタを取得します。テストコードなどで確認用途に
 * 使用する想定のため、公開メソッドとして提供しています。
 */
export const getStorageAdapter = (): StorageAdapter => activeStorageAdapter;

export const saveGame = (state: GameState): void => {
  activeStorageAdapter.saveGame(state);
};

export const loadGame = (options: LoadOptions = {}): StoredGamePayload | null =>
  activeStorageAdapter.loadGame(options ?? {}) ?? null;

export const clearGame = (): void => {
  activeStorageAdapter.clearGame();
};

export const getSavedGameMetadata = (): SaveMetadata | null =>
  activeStorageAdapter.getSavedGameMetadata();

export const hasSavedGame = (): boolean => activeStorageAdapter.hasSavedGame();

export const listResultHistory = (): ResultHistoryEntry[] =>
  activeStorageAdapter.listResultHistory();

export const deleteResult = (id: string): boolean => activeStorageAdapter.deleteResult(id);

export const saveResult = (
  summary: string,
  detail?: string,
  savedAt?: number,
): ResultHistoryEntry | null => activeStorageAdapter.saveResult(summary, detail, savedAt);

/**
 * 旧タスク互換のためのエイリアス。新規実装では saveGame を利用すること。
 */
export const saveLatestGame = saveGame;
/**
 * 旧タスク互換のためのエイリアス。新規実装では loadGame を利用すること。
 */
export const loadLatestGame = loadGame;
/**
 * 旧タスク互換のためのエイリアス。新規実装では clearGame を利用すること。
 */
export const clearLatestGame = clearGame;
/**
 * 旧タスク互換のためのエイリアス。新規実装では getSavedGameMetadata を利用すること。
 */
export const getLatestSaveMetadata = getSavedGameMetadata;
/**
 * 旧タスク互換のためのエイリアス。新規実装では listResultHistory を利用すること。
 */
export const getResultHistory = listResultHistory;
/**
 * 旧タスク互換のためのエイリアス。新規実装では deleteResult を利用すること。
 */
export const deleteResultHistoryEntry = deleteResult;
/**
 * 旧タスク互換のためのエイリアス。新規実装では hasSavedGame を利用すること。
 */
export const hasLatestSave = hasSavedGame;
/**
 * 旧タスク互換のためのエイリアス。新規実装では saveResult を利用すること。
 */
export const addResultHistoryEntry = saveResult;
