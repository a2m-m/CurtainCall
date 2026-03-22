import { useState } from 'react';
import { useGameDispatch, useGameState } from '@/game/context';
import PassDevice from '@/components/PassDevice';
import styles from './IntermissionScreen.module.css';

export default function IntermissionScreen() {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const [showPassDevice, setShowPassDevice] = useState(false);

  const currentScout = state.players[0];
  const nextScout = state.players[1];

  if (showPassDevice) {
    return (
      <PassDevice
        playerName={nextScout.name}
        onComplete={() => dispatch({ type: 'INTERMISSION' })}
      />
    );
  }

  return (
    <div className={styles.screen}>
      <h1 className={styles.heading}>インターミッション</h1>
      <p className={styles.roundInfo}>ラウンド {state.round} 終了</p>

      <div className={styles.swapInfo}>
        <p className={styles.swapLabel}>次のスカウト担当</p>
        <p className={styles.swapArrow}>{currentScout.name} → {nextScout.name}</p>
        <p className={styles.nextScout}>{nextScout.name}</p>
      </div>

      <button
        className={styles.proceedBtn}
        onClick={() => setShowPassDevice(true)}
      >
        次のラウンドへ
      </button>
    </div>
  );
}
