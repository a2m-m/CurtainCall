import { useGameDispatch, useGameState } from '@/game/context';
import Card from '@/components/Card';
import styles from './ActionResultScreen.module.css';

export default function ActionResultScreen() {
  const state = useGameState();
  const dispatch = useGameDispatch();

  const { kami, shimo } = state.stage;
  const actor = state.players[0];
  const watcher = state.players[1];

  return (
    <div className={styles.screen}>
      <h1 className={styles.heading}>ステージ確認</h1>
      <p className={styles.sub}>
        {actor.name} がステージへ出しました。{watcher.name} は確認してください。
      </p>

      <div className={styles.stage}>
        <div className={styles.slot}>
          <span className={styles.label}>役者（カミ）</span>
          {kami ? <Card card={kami} /> : <div className={styles.empty} />}
        </div>
        <div className={styles.slot}>
          <span className={styles.label}>黒子（シモ）</span>
          {shimo ? <Card card={shimo} /> : <div className={styles.empty} />}
        </div>
      </div>

      <button
        className={styles.proceedBtn}
        onClick={() => dispatch({ type: 'ACTION_RESULT_PROCEED' })}
      >
        ウォッチへ
      </button>
    </div>
  );
}
