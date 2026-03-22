import { useState } from 'react';
import { useGameDispatch, useGameState } from '@/game/context';
import Card from '@/components/Card';
import StageOverview from '@/components/StageOverview';
import { sortHand } from '@/lib/deck';
import styles from './ScoutScreen.module.css';

export default function ScoutScreen() {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const opponentHand = state.players[1].hand;
  const sortedOpponentHand = sortHand(opponentHand);

  const handleCardClick = (index: number) => {
    if (index === selectedIndex) {
      setSelectedIndex(null); // 再タップで解除
    } else {
      setSelectedIndex(index); // 別カードへの選び直し
    }
  };

  const handleConfirm = () => {
    if (selectedIndex === null) return;
    dispatch({ type: 'SCOUT_CARD', cardIndex: selectedIndex });
  };

  return (
    <div className={styles.screen}>
      <h1 className={styles.heading}>スカウト</h1>
      <p className={styles.sub}>相手の手札から1枚選んでください</p>
      <StageOverview />
      <div className={styles.grid}>
        {sortedOpponentHand.map((card) => {
          const i = opponentHand.indexOf(card);
          return (
            <Card
              key={i}
              card={{ ...card, isFaceUp: false }}
              isSelected={i === selectedIndex}
              onClick={() => handleCardClick(i)}
            />
          );
        })}
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
