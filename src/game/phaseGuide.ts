import type { GameState, Card } from '@/types/game';

export type PhaseGuide = {
  phaseName: string;
  activePlayerName: string;
};

const PHASE_NAMES: Record<GameState['phase'], string> = {
  standby: 'スタンバイ',
  scout: 'スカウトフェーズ',
  'scout-result': 'スカウト結果',
  action: 'アクションフェーズ',
  watch: 'ウォッチフェーズ',
  spotlight: 'スポットライト',
  'spotlight-bonus': 'スポットライトボーナス',
  'spotlight-joker': 'スポットライト（ジョーカー）',
  'spotlight-open-result': 'セットオープン結果',
  backstage: 'バックステージ',
  'backstage-result': 'バックステージ結果',
  intermission: '幕間',
  'curtain-call': 'カーテンコール',
  result: '結果発表',
};

export function getPhaseGuide(state: GameState): PhaseGuide {
  const phaseName = PHASE_NAMES[state.phase];
  const [p0, p1] = state.players;

  let activePlayerName = '';

  switch (state.phase) {
    case 'scout':
    case 'scout-result':
    case 'action':
      activePlayerName = p0.name;
      break;
    case 'watch':
      activePlayerName = p1.name;
      break;
    case 'spotlight':
      activePlayerName = p0.name;
      break;
    case 'spotlight-bonus':
    case 'spotlight-joker':
    case 'spotlight-open-result':
      activePlayerName = state.booResult === 'correct' ? p1.name : p0.name;
      break;
    case 'backstage':
    case 'backstage-result':
      activePlayerName =
        state.players.find((p) => p.id === state.backstagePlayerId)?.name ?? '';
      break;
    default:
      activePlayerName = '';
  }

  return { phaseName, activePlayerName };
}

/**
 * 現在のフェーズで操作プレイヤーの手札を返す。
 * 手番外フェーズ（watch・intermission 等）では null を返す。
 */
export function getOperatingHand(state: GameState): Card[] | null {
  const [p0, p1] = state.players;

  switch (state.phase) {
    case 'scout':
    case 'scout-result':
    case 'action':
      return p0.hand;
    case 'spotlight':
      // watch フェーズ後も players[1] がデバイスを持つ
      return p1.hand;
    case 'spotlight-bonus':
    case 'spotlight-joker':
    case 'spotlight-open-result':
      return state.booResult === 'correct' ? p1.hand : p0.hand;
    case 'backstage':
    case 'backstage-result': {
      const backstagePlayer = state.players.find((p) => p.id === state.backstagePlayerId);
      return backstagePlayer?.hand ?? null;
    }
    default:
      return null;
  }
}
