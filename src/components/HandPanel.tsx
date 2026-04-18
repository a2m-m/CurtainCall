import type { Card } from '@/types/game';
import { sortHand } from '@/lib/deck';
import CardComponent from '@/components/Card';
import styles from './HandPanel.module.css';

type Props = {
  hand: Card[];
  playerName: string;
  className?: string;
  dockMode?: boolean;
};

export default function HandPanel({ hand, playerName, className, dockMode }: Props) {
  const sorted = sortHand(hand);

  return (
    <div className={`${styles.panel} ${dockMode ? styles.dockPanel : ''} ${className ?? ''}`}>
      <div className={styles.label}>
        <div className={styles.labelName}>{playerName}</div>
        <div className={styles.labelCount}>{hand.length}<span className={styles.labelOf}> 枚</span></div>
      </div>
      <div className={`${styles.grid} ${dockMode ? styles.dockGrid : ''}`}>
        {sorted.map((card, i) => (
          <CardComponent key={i} card={{ ...card, isFaceUp: true }} />
        ))}
      </div>
    </div>
  );
}
