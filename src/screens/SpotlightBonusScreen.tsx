import { useGameDispatch, useGameState } from '@/game/context';
import Card from '@/components/Card';
import styles from './SpotlightBonusScreen.module.css';

export default function SpotlightBonusScreen() {
  const state = useGameState();
  const dispatch = useGameDispatch();

  const isJokerPhase = state.phase === 'spotlight-joker';

  const faceDownCards = state.deck
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => !card.isFaceUp);

  return (
    <div className={styles.screen}>
      <h1 className={styles.heading}>セットを開く</h1>
      {isJokerPhase ? (
        <p className={styles.instruction}>ジョーカーが出ました！追加で1枚開いてください</p>
      ) : (
        <p className={styles.instruction}>裏向きのカードを1枚選んでください</p>
      )}

      <div className={styles.cardGrid}>
        {faceDownCards.map(({ card, index }) => (
          <Card
            key={index}
            card={card}
            onClick={() =>
              isJokerPhase
                ? dispatch({ type: 'SPOTLIGHT_OPEN_JOKER_EXTRA', setCardIndex: index })
                : dispatch({ type: 'SPOTLIGHT_OPEN_SET', setCardIndex: index })
            }
          />
        ))}
      </div>

      {!isJokerPhase && (
        <button
          className={styles.cancelBtn}
          onClick={() => dispatch({ type: 'SPOTLIGHT_SKIP_SET' })}
        >
          開かない
        </button>
      )}
    </div>
  );
}
