import type { Card as CardType } from '@/types/game';
import styles from './Card.module.css';

const SUIT_SYMBOL: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const RED_SUITS = new Set(['hearts', 'diamonds']);

const RANK_LABEL: Record<number, string> = {
  1: 'A',
  11: 'J',
  12: 'Q',
  13: 'K',
};

function rankLabel(rank: number): string {
  return RANK_LABEL[rank] ?? String(rank);
}

type Props = {
  card: CardType;
  isSelected?: boolean;
  isSelectedShimo?: boolean;
  onClick?: () => void;
};

export default function Card({ card, isSelected, isSelectedShimo, onClick }: Props) {
  const classNames = [styles.card];

  if (isSelected) classNames.push(styles.selected);
  else if (isSelectedShimo) classNames.push(styles.selectedShimo);

  if (onClick) classNames.push(styles.clickable);

  if (card.isJoker) {
    classNames.push(styles.joker);
    return (
      <div className={classNames.join(' ')} onClick={onClick} role={onClick ? 'button' : undefined}>
        <span className={styles.jokerLabel}>JOKER</span>
      </div>
    );
  }

  if (!card.isFaceUp) {
    classNames.push(styles.back);
    return (
      <div className={classNames.join(' ')} onClick={onClick} role={onClick ? 'button' : undefined} />
    );
  }

  const isRed = RED_SUITS.has(card.suit);
  classNames.push(styles.face);
  if (isRed) classNames.push(styles.red);

  return (
    <div className={classNames.join(' ')} onClick={onClick} role={onClick ? 'button' : undefined}>
      <span className={styles.suit}>{SUIT_SYMBOL[card.suit]}</span>
      <span className={styles.rank}>{rankLabel(card.rank)}</span>
    </div>
  );
}
