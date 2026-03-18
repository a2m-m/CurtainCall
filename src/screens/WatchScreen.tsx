import { useGameDispatch, useGameState } from '@/game/context';
import Card from '@/components/Card';
import styles from './WatchScreen.module.css';

export default function WatchScreen() {
  const state = useGameState();
  const dispatch = useGameDispatch();

  const { kami, shimo } = state.stage;
  const watcherName = state.players[1].name;

  return (
    <div className={styles.screen}>
      <h1 className={styles.heading}>ウォッチ</h1>
      <p className={styles.sub}>{watcherName} がジャッジします</p>

      <div className={styles.stage}>
        <div className={styles.stageSlot}>
          <span className={styles.slotLabel}>役者（カミ）</span>
          {kami ? <Card card={{ ...kami, isFaceUp: true }} /> : <div className={styles.emptySlot} />}
        </div>
        <div className={styles.stageSlot}>
          <span className={styles.slotLabel}>黒子（シモ）</span>
          {shimo ? <Card card={{ ...shimo, isFaceUp: false }} /> : <div className={styles.emptySlot} />}
        </div>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.clapBtn}
          onClick={() => dispatch({ type: 'WATCH_CLAP' })}
        >
          クラップ
        </button>
        <button
          className={styles.booBtn}
          onClick={() => dispatch({ type: 'WATCH_BOO' })}
        >
          ブーイング
        </button>
      </div>
    </div>
  );
}
