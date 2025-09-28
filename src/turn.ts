import type { GameState, PlayerId } from './state.js';

/**
 * 指定したプレイヤーの相手側IDを返す。
 * @param player 判定対象のプレイヤーID
 * @returns 相手側のプレイヤーID
 */
export const getOpponentId = (player: PlayerId): PlayerId =>
  player === 'lumina' ? 'nox' : 'lumina';

const isPlayerId = (value: unknown): value is PlayerId => value === 'lumina' || value === 'nox';

/**
 * 現在のターンで提示側となっているプレイヤーIDを解決する。
 * `turn.presenter` が設定されていればそれを優先し、無効な場合は
 * 直近のスカウト担当者、さらにそれも無ければ現在のアクティブプレイヤーを返す。
 * @param state ゲーム状態
 * @returns 現在の提示側プレイヤーID
 */
export const resolveTurnPresenter = (state: GameState): PlayerId => {
  const presenter = state.turn?.presenter;
  if (isPlayerId(presenter)) {
    return presenter;
  }

  const lastScoutPlayer = state.lastScoutPlayer;
  if (isPlayerId(lastScoutPlayer)) {
    return lastScoutPlayer;
  }

  return state.activePlayer;
};

/**
 * 現在のターンでウォッチ側となっているプレイヤーIDを解決する。
 * @param state ゲーム状態
 * @returns 現在のウォッチ側プレイヤーID
 */
export const resolveTurnWatcher = (state: GameState): PlayerId => {
  const watcher = state.turn?.watcher;
  if (isPlayerId(watcher)) {
    return watcher;
  }

  return getOpponentId(resolveTurnPresenter(state));
};

/**
 * インターミッション再開時の次手番プレイヤーを判定する。
 * ブーイング成功などでアクティブプレイヤーが入れ替わっていても、
 * 直前のスカウトを担当したプレイヤーの相手を次のアクティブとして返す。
 * @param state 現在のゲーム状態
 * @returns 次にアクティブになるプレイヤーID
 */
export const resolveNextIntermissionActivePlayer = (state: GameState): PlayerId => {
  const lastScoutPlayer = state.lastScoutPlayer;
  if (isPlayerId(lastScoutPlayer)) {
    return getOpponentId(lastScoutPlayer);
  }
  return getOpponentId(resolveTurnPresenter(state));
};
