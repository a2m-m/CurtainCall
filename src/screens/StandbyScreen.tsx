import { useState } from 'react';
import { useGameDispatch, useGameState } from '@/game/context';
import PassDevice from '@/components/PassDevice';
import styles from './StandbyScreen.module.css';

export default function StandbyScreen() {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const [showPassDevice, setShowPassDevice] = useState(false);

  if (showPassDevice) {
    return (
      <PassDevice
        playerName={state.players[0].name}
        onComplete={() => dispatch({ type: 'START_SCOUT' })}
      />
    );
  }

  return (
    <div className={styles.screen}>
      <h1 className={styles.heading}>カード配布完了</h1>
      <div className={styles.summary}>
        <div className={styles.row}>
          <span className={styles.label}>{state.players[0].name} の手札</span>
          <span className={styles.count}>{state.players[0].hand.length} 枚</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>{state.players[1].name} の手札</span>
          <span className={styles.count}>{state.players[1].hand.length} 枚</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>バックステージ</span>
          <span className={styles.count}>{state.backstage.length} 枚</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>セット</span>
          <span className={styles.count}>{state.deck.length} 枚</span>
        </div>
      </div>
      <button className={styles.readyBtn} onClick={() => setShowPassDevice(true)}>
        準備完了
      </button>
    </div>
  );
}
