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

  const summaryItems = [
    { count: state.players[0].hand.length, label: `${state.players[0].name} の手札`, sublabel: '手札' },
    { count: state.players[1].hand.length, label: `${state.players[1].name} の手札`, sublabel: '手札' },
    { count: state.deck.length, label: 'セット', sublabel: 'メイン' },
    { count: state.backstage.length, label: 'バックステージ', sublabel: 'アイテム' },
  ];

  return (
    <div className={styles.screen}>
      <div className={styles.ornament}>Act I</div>
      <h1 className={styles.heading}>Setting the Stage</h1>
      <h2 className={styles.headingJp}>カード配布完了</h2>

      <div className={styles.summary}>
        {summaryItems.map((item) => (
          <div key={item.label} className={styles.summaryItem}>
            <div className={styles.count}>{item.count} 枚</div>
            <div className={styles.label}>{item.label}</div>
          </div>
        ))}
      </div>

      <button
        className={styles.readyBtn}
        aria-label="準備完了"
        onClick={() => setShowPassDevice(true)}
      >
        OPEN THE CURTAIN · 開幕
      </button>
    </div>
  );
}
