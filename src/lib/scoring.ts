import type { Card, GameState } from '@/types/game';

export type ScoreBreakdown = {
  kamiTotal: number;
  handTotal: number;
  penalty: number;
  total: number;
};

/** カードのポイント値を返す（A=1, 2-10=face value, J=11, Q=12, K=13, Joker=0） */
function cardValue(card: Card): number {
  return card.isJoker ? 0 : card.rank;
}

/**
 * 指定プレイヤーのスコアを計算する。
 *
 * 計算式: 最終ポイント = カミ合計 - 手札合計 - ペナルティ
 * - カミ合計: playerAKami / playerBKami に累積されたカード値の合計
 * - 手札合計: プレイヤーの残り手札のカード値合計
 * - ペナルティ: curtainCallReason === 'set-last-1' の場合のみ適用
 *   各プレイヤーのブーイング宣言が 3 回未満なら不足数 × 15 マイナス
 */
export function calculateScore(state: GameState, playerId: 'A' | 'B'): ScoreBreakdown {
  const kamiCards = playerId === 'A' ? state.playerAKami : state.playerBKami;
  const kamiTotal = kamiCards.reduce((sum, c) => sum + cardValue(c), 0);

  const player = state.players.find((p) => p.id === playerId);
  const handTotal = player ? player.hand.reduce((sum, c) => sum + cardValue(c), 0) : 0;

  let penalty = 0;
  if (state.curtainCallReason === 'set-last-1') {
    const booCount = playerId === 'A' ? state.playerABooCnt : state.playerBBooCnt;
    if (booCount < 3) {
      penalty = (3 - booCount) * 15;
    }
  }

  return {
    kamiTotal,
    handTotal,
    penalty,
    total: kamiTotal - handTotal - penalty,
  };
}
