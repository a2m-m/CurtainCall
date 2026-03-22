import { useGameState } from '@/game/context';
import Card from '@/components/Card';
import type { Card as CardType } from '@/types/game';
import styles from './StageOverview.module.css';

function PlayerStageMini({
  name,
  kamiCards,
  shimoCards,
}: {
  name: string;
  kamiCards: CardType[];
  shimoCards: CardType[];
}) {
  return (
    <div className={styles.player}>
      <span className={styles.playerName}>{name}</span>
      <div className={styles.row}>
        <span className={styles.rowLabel}>カミ</span>
        {kamiCards.length === 0 ? (
          <span className={styles.empty}>—</span>
        ) : (
          <div className={styles.cards}>
            {kamiCards.map((card, i) => (
              <Card key={i} card={{ ...card, isFaceUp: true }} />
            ))}
          </div>
        )}
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>シモ</span>
        {shimoCards.length === 0 ? (
          <span className={styles.empty}>—</span>
        ) : (
          <div className={styles.cards}>
            {/* シモ札はゲームルール上、裏向きで公開される */}
            {shimoCards.map((card, i) => (
              <Card key={i} card={{ ...card, isFaceUp: false }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StageOverview() {
  const { players, playerAKami, playerAShimo, playerBKami, playerBShimo } =
    useGameState();

  return (
    <div className={styles.container}>
      <p className={styles.title}>場のカード</p>
      <div className={styles.grid}>
        <PlayerStageMini
          name={players[0].name}
          kamiCards={playerAKami}
          shimoCards={playerAShimo}
        />
        <div className={styles.divider} />
        <PlayerStageMini
          name={players[1].name}
          kamiCards={playerBKami}
          shimoCards={playerBShimo}
        />
      </div>
    </div>
  );
}
