import type { CurtainCallReason, GameState } from '@/types/game';

/**
 * 現在の GameState からカーテンコール条件を検出する。
 *
 * 条件①: ジョーカーがセットからオープンされた
 * 条件②: セットの裏向きカードが残り1枚以下
 * 条件③: 手札不足（次のスカウト担当が続行不可）
 *
 * 条件に該当しない場合は null を返す。
 */
export function checkCurtainCall(state: GameState): CurtainCallReason | null {
  // 条件①: ジョーカーがセットからオープンされた
  if (state.deck.some((c) => c.isJoker && c.isFaceUp)) return 'joker';

  // 条件②: セットの裏向きカードが残り1枚以下（ゲーム開始後のみ判定）
  if (state.setRemainingCount <= 1 && state.deck.length > 0) return 'set-last-1';

  // 条件③: 手札不足（次のスカウト担当の手札が続行不可）
  // players 配列はラウンドごとに入れ替わるため、次のスカウトは常に現在の players[1]
  const nextScoutHand = state.players[1].hand;
  const otherHand = state.players[0].hand;
  if (nextScoutHand.length === 0 || (nextScoutHand.length === 1 && otherHand.length === 0)) {
    return 'hand-shortage';
  }

  return null;
}
