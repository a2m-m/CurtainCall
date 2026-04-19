import { useState } from 'react';
import { useGameDispatch, useGameState } from '@/game/context';
import { calculateScore } from '@/lib/scoring';
import PassDevice from '@/components/PassDevice';
import styles from './IntermissionScreen.module.css';

type Props = { onPassDeviceChange?: (visible: boolean) => void };

export default function IntermissionScreen({ onPassDeviceChange }: Props) {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const [showPassDevice, setShowPassDevice] = useState(false);

  const currentScout = state.players[0];
  const nextScout = state.players[1];
  const scoreA = calculateScore(state, 'A');
  const scoreB = calculateScore(state, 'B');

  if (showPassDevice) {
    return (
      <PassDevice
        playerName={nextScout.name}
        onComplete={() => {
          onPassDeviceChange?.(false);
          dispatch({ type: 'INTERMISSION' });
        }}
      />
    );
  }

  return (
    <div className={styles.screen}>
      <div className={styles.ornament}>— Entr&apos;acte —</div>
      <h1 className={styles.heading}>INTERMISSION</h1>
      <div className={styles.headingJp}>インターミッション</div>
      <div className={styles.headingSub}>休憩 · 役割交代</div>

      <p className={styles.swapLabel}>次のスカウト担当</p>
      <div className={styles.swapInfo}>
        <p className={styles.swapArrow}>{currentScout.name} → {nextScout.name}</p>
        <p className={styles.nextScout}>{nextScout.name}</p>
      </div>

      <p className={styles.roundInfo}>ラウンド {state.round} 終了</p>

      <div className={styles.scoreTable}>
        <div className={styles.scoreRow}>
          <span className={styles.scoreKey}>{currentScout.name} カミ合計</span>
          <span className={styles.scoreVal}>+{scoreA.kamiTotal}</span>
        </div>
        <div className={styles.scoreRow}>
          <span className={styles.scoreKey}>{nextScout.name} カミ合計</span>
          <span className={styles.scoreVal}>+{scoreB.kamiTotal}</span>
        </div>
        <div className={styles.scoreRow}>
          <span className={styles.scoreKey}>セット残り</span>
          <span className={styles.scoreVal}>{state.setRemainingCount} 枚</span>
        </div>
        <div className={styles.scoreRow}>
          <span className={styles.scoreKey}>BOO 回数</span>
          <span className={styles.scoreVal}>{state.playerABooCnt} · {state.playerBBooCnt} / 3</span>
        </div>
      </div>

      <button
        className={styles.proceedBtn}
        aria-label="次のラウンドへ"
        onClick={() => { setShowPassDevice(true); onPassDeviceChange?.(true); }}
      >
        NEXT ACT · 次幕へ
      </button>
    </div>
  );
}
