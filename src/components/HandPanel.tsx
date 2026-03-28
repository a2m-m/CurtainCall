import type { Card } from '@/types/game';
import { sortHand } from '@/lib/deck';
import CardComponent from '@/components/Card';
import styles from './HandPanel.module.css';

type Props = {
  hand: Card[];
  playerName: string;
  className?: string;
};

export default function HandPanel({ hand, playerName, className }: Props) {
  const sorted = sortHand(hand);

  return (
    <div className={`${styles.panel} ${className ?? ''}`}>
      <div className={styles.label}>{playerName} の手札（{hand.length}枚）</div>
      <div className={styles.grid}>
        {sorted.map((card, i) => (
          <CardComponent key={i} card={{ ...card, isFaceUp: true }} />
        ))}
      </div>
    </div>
  );
}
