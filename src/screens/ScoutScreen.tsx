import { useState } from 'react';
import { useGameDispatch, useGameState } from '@/game/context';
import Card from '@/components/Card';
import styles from './ScoutScreen.module.css';

export default function ScoutScreen() {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const opponentHand = state.players[1].hand;

  const handleCardClick = (index: number) => {
    if (selectedIndex !== null) return; // 引き直し不可
    setSelectedIndex(index);
  };

  const handleConfirm = () => {
    if (selectedIndex === null) return;
    dispatch({ type: 'SCOUT_CARD', cardIndex: selectedIndex });
  };

  return (
    <div className={styles.screen}>
      <h1 className={styles.heading}>スカウト</h1>
      <p className={styles.sub}>相手の手札から1枚選んでください（選び直し不可）</p>
      <div className={styles.grid}>
        {opponentHand.map((card, i) => (
          <Card
            key={i}
            card={{ ...card, isFaceUp: false }}
            isSelected={i === selectedIndex}
            onClick={selectedIndex === null ? () => handleCardClick(i) : undefined}
          />
        ))}
      </div>
      <button
        className={styles.confirmBtn}
        onClick={handleConfirm}
        disabled={selectedIndex === null}
      >
        スカウト確定
      </button>
    </div>
  );
}
