import type { GameState, PlayerId } from './state.js';

/**
 * 指定したプレイヤーの相手側IDを返す。
 * @param player 判定対象のプレイヤーID
 * @returns 相手側のプレイヤーID
 */
export const getOpponentId = (player: PlayerId): PlayerId =>
  player === 'lumina' ? 'nox' : 'lumina';

/**
 * インターミッション再開時の次手番プレイヤーを判定する。
 * ブーイング成功などでアクティブプレイヤーが入れ替わっていても、
 * 直前のスカウトを担当したプレイヤーの相手を次のアクティブとして返す。
 * @param state 現在のゲーム状態
 * @returns 次にアクティブになるプレイヤーID
 */
export const resolveNextIntermissionActivePlayer = (state: GameState): PlayerId => {
  const lastScoutPlayer = state.lastScoutPlayer;
  if (lastScoutPlayer === 'lumina' || lastScoutPlayer === 'nox') {
    return getOpponentId(lastScoutPlayer);
  }
  return getOpponentId(state.activePlayer);
};
