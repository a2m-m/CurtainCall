import { useGameDispatch, useGameState } from '@/game/context';
import Card from '@/components/Card';
import styles from './SpotlightBonusScreen.module.css';

export default function SpotlightOpenResultScreen() {
  const state = useGameState();
  const dispatch = useGameDispatch();

  const { lastOpenedCard, spotlightOpenResultNextPhase } = state;

  function getResultMessage(): string {
    switch (spotlightOpenResultNextPhase) {
      case 'spotlight-joker':
        return 'ジョーカー！追加で1枚開いてください';
      case 'curtain-call':
        return 'セット残り1枚 — カーテンコール！';
      case 'intermission':
        return 'ペア成立！';
      case 'backstage':
        return 'ペア不成立。バックステージへ';
      default:
        return '';
    }
  }

  return (
    <div className={styles.screen}>
      <h1 className={styles.heading}>セットオープン結果</h1>
      <p className={styles.instruction}>{getResultMessage()}</p>
      {lastOpenedCard && <Card card={lastOpenedCard} />}
      <button
        className={styles.cancelBtn}
        onClick={() => dispatch({ type: 'SPOTLIGHT_OPEN_RESULT_PROCEED' })}
      >
        次へ
      </button>
    </div>
  );
}
