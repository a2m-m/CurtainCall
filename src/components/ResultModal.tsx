import Card from '@/components/Card';
import type { Card as CardType } from '@/types/game';
import styles from './ResultModal.module.css';

interface Props {
  title: string;
  message: string;
  messageVariant?: 'match' | 'no-match' | 'neutral';
  cards?: CardType[];
  extraContent?: React.ReactNode;
  onProceed: () => void;
  proceedLabel?: string;
}

export default function ResultModal({
  title,
  message,
  messageVariant = 'neutral',
  cards,
  extraContent,
  onProceed,
  proceedLabel = '次へ',
}: Props) {
  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <h2 className={styles.title}>{title}</h2>
        <p className={`${styles.message} ${styles[messageVariant]}`}>{message}</p>
        {cards && cards.length > 0 && (
          <div className={styles.cardRow}>
            {cards.map((card, i) => (
              <Card key={i} card={{ ...card, isFaceUp: true }} />
            ))}
          </div>
        )}
        {extraContent}
        <button className={styles.proceedBtn} onClick={onProceed}>
          {proceedLabel}
        </button>
      </div>
    </div>
  );
}
