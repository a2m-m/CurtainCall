import type { GameState } from '@/types/game';

export type PhaseGuide = {
  phaseName: string;
  activePlayerName: string;
};

const PHASE_NAMES: Record<GameState['phase'], string> = {
  standby: 'スタンバイ',
  scout: 'スカウトフェーズ',
  'scout-result': 'スカウト結果',
  action: 'アクションフェーズ',
  'action-result': 'アクション結果',
  watch: 'ウォッチフェーズ',
  spotlight: 'スポットライト',
  'spotlight-bonus': 'スポットライトボーナス',
  'spotlight-joker': 'スポットライト（ジョーカー）',
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
    case 'action-result':
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
