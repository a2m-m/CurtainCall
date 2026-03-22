import { useGameDispatch, useGameState } from '@/game/context';
import Card from '@/components/Card';
import styles from './ScoutResultScreen.module.css';

export default function ScoutResultScreen() {
  const state = useGameState();
  const dispatch = useGameDispatch();

  const actor = state.players[0];
  const scoutedCard = state.lastScoutedCard;

  return (
    <div className={styles.screen}>
      <h1 className={styles.heading}>スカウト完了</h1>
      {scoutedCard !== null && (
        <div className={styles.cardArea}>
          <Card card={{ ...scoutedCard, isFaceUp: true }} />
        </div>
      )}
      <p className={styles.info}>
        {actor.name} の手札が <strong>{actor.hand.length}枚</strong> になりました
      </p>
      <button
        className={styles.proceedBtn}
        onClick={() => dispatch({ type: 'SCOUT_RESULT_PROCEED' })}
      >
        アクションへ
      </button>
    </div>
  );
}
