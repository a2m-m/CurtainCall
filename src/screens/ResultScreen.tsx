import { useGameDispatch, useGameState } from '@/game/context';
import { calculateScore } from '@/lib/scoring';
import type { CurtainCallReason } from '@/types/game';
import styles from './ResultScreen.module.css';

const CURTAIN_CALL_REASON_LABEL: Record<CurtainCallReason, string> = {
  joker: 'ジョーカーが登場しました',
  'set-last-1': 'セットの裏向きカードが残り1枚になりました',
  'hand-shortage': '手札不足により継続不能となりました',
};

export default function ResultScreen() {
  const state = useGameState();
  const dispatch = useGameDispatch();

  const playerA = state.players.find((p) => p.id === 'A');
  const playerB = state.players.find((p) => p.id === 'B');

  const scoreA = calculateScore(state, 'A');
  const scoreB = calculateScore(state, 'B');

  const winner =
    scoreA.total > scoreB.total ? 'A' : scoreB.total > scoreA.total ? 'B' : 'draw';

  return (
    <div className={styles.screen}>
      <h1 className={styles.heading}>カーテンコール</h1>

      {state.curtainCallReason && (
        <p className={styles.reason}>{CURTAIN_CALL_REASON_LABEL[state.curtainCallReason]}</p>
      )}

      <div className={styles.result}>
        {winner === 'draw' ? (
          <p className={styles.draw}>引き分け</p>
        ) : (
          <p className={styles.winnerText}>
            {winner === 'A' ? playerA?.name : playerB?.name} の勝利！
          </p>
        )}
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}></th>
            <th className={`${styles.th} ${winner === 'A' ? styles.winnerCol : ''}`}>
              {playerA?.name ?? 'A'}
            </th>
            <th className={`${styles.th} ${winner === 'B' ? styles.winnerCol : ''}`}>
              {playerB?.name ?? 'B'}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={styles.label}>カミ合計</td>
            <td className={styles.td}>{scoreA.kamiTotal}</td>
            <td className={styles.td}>{scoreB.kamiTotal}</td>
          </tr>
          <tr>
            <td className={styles.label}>手札合計</td>
            <td className={styles.td}>-{scoreA.handTotal}</td>
            <td className={styles.td}>-{scoreB.handTotal}</td>
          </tr>
          <tr>
            <td className={styles.label}>ペナルティ</td>
            <td className={styles.td}>-{scoreA.penalty}</td>
            <td className={styles.td}>-{scoreB.penalty}</td>
          </tr>
          <tr>
            <td className={styles.label}>最終ポイント</td>
            <td className={`${styles.total} ${winner === 'A' ? styles.winTotal : ''}`}>
              {scoreA.total}
            </td>
            <td className={`${styles.total} ${winner === 'B' ? styles.winTotal : ''}`}>
              {scoreB.total}
            </td>
          </tr>
        </tbody>
      </table>

      <button
        className={styles.resetBtn}
        onClick={() => dispatch({ type: 'RESET_GAME' })}
      >
        もう一度
      </button>
    </div>
  );
}
