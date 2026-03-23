import { useGameDispatch, useGameState } from '@/game/context';
import Card from '@/components/Card';
import ResultModal from '@/components/ResultModal';
import styles from './SpotlightBonusScreen.module.css';

function getResultMessage(nextPhase: string): string {
  switch (nextPhase) {
    case 'spotlight-joker': return 'ジョーカー！追加で1枚開いてください';
    case 'curtain-call': return 'セット残り1枚 — カーテンコール！';
    case 'intermission': return 'ペア成立！';
    case 'backstage': return 'ペア不成立。バックステージへ';
    default: return '';
  }
}

function getResultVariant(nextPhase: string): 'match' | 'no-match' | 'neutral' {
  if (nextPhase === 'intermission') return 'match';
  if (nextPhase === 'backstage') return 'no-match';
  return 'neutral';
}

export default function SpotlightBonusScreen() {
  const state = useGameState();
  const dispatch = useGameDispatch();

  const isResultPhase = state.phase === 'spotlight-open-result';
  const isJokerPhase = state.phase === 'spotlight-joker';

  const faceDownCards = state.deck
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => !card.isFaceUp);

  return (
    <>
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

        {!isJokerPhase && !isResultPhase && (
          <button
            className={styles.cancelBtn}
            onClick={() => dispatch({ type: 'SPOTLIGHT_SKIP_SET' })}
          >
            開かない
          </button>
        )}
      </div>

      {isResultPhase && (
        <ResultModal
          title="セットオープン結果"
          message={getResultMessage(state.spotlightOpenResultNextPhase ?? '')}
          messageVariant={getResultVariant(state.spotlightOpenResultNextPhase ?? '')}
          cards={state.lastOpenedCard !== null ? [state.lastOpenedCard] : []}
          onProceed={() => dispatch({ type: 'SPOTLIGHT_OPEN_RESULT_PROCEED' })}
        />
      )}
    </>
  );
}
