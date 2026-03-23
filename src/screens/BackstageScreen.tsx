import { useState } from 'react';
import { useGameDispatch, useGameState } from '@/game/context';
import Card from '@/components/Card';
import ResultModal from '@/components/ResultModal';
import StageOverview from '@/components/StageOverview';
import styles from './BackstageScreen.module.css';

export default function BackstageScreen() {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const [selected, setSelected] = useState<number[]>([]);

  const { phase, backstage, backstageRevealedCards, backstageResult, spotlightCard, lastBackstageDrawnCard } = state;

  function toggleSelect(index: number) {
    setSelected((prev) => {
      if (prev.includes(index)) return prev.filter((i) => i !== index);
      if (prev.length >= 3) return prev;
      return [...prev, index];
    });
  }

  function handleJudge() {
    if (selected.length !== 3) return;
    dispatch({ type: 'BACKSTAGE_OPEN', cardIndices: selected as [number, number, number] });
    setSelected([]);
  }

  // 判定結果表示（backstage-result フェーズ）
  if (phase === 'backstage-result') {
    const isProceedAvailable = backstageResult === 'match' || lastBackstageDrawnCard !== null;
    const allCards = [
      ...backstageRevealedCards.map((c) => ({ ...c, isFaceUp: true })),
      ...(lastBackstageDrawnCard ? [{ ...lastBackstageDrawnCard, isFaceUp: true }] : []),
    ];
    return (
      <>
        {/* 背景として backstage 選択画面を表示 */}
        <div className={styles.screen}>
          <h1 className={styles.heading}>バックステージ</h1>
          <StageOverview />
        </div>
        <ResultModal
          title="バックステージ結果"
          message={backstageResult === 'match' ? 'ペア成立！' : '不一致'}
          messageVariant={backstageResult === 'match' ? 'match' : 'no-match'}
          cards={allCards}
          extraContent={
            !isProceedAvailable ? (
              <div>
                <p className={styles.label}>バックステージから1枚選んで手札に加える</p>
                <div className={styles.cardRow}>
                  {backstage.map((card, index) => (
                    <Card
                      key={index}
                      card={{ ...card, isFaceUp: false }}
                      onClick={() => dispatch({ type: 'BACKSTAGE_TAKE_HAND', cardIndex: index })}
                    />
                  ))}
                </div>
              </div>
            ) : lastBackstageDrawnCard ? (
              <p className={styles.label}>手札に加えたカード</p>
            ) : undefined
          }
          onProceed={isProceedAvailable ? () => dispatch({ type: 'BACKSTAGE_PROCEED' }) : undefined}
          proceedLabel="インターミッションへ"
        />
      </>
    );
  }

  // 3枚選択フェーズ（backstage）
  if (spotlightCard === null) {
    // スキップ経由（比較対象なし）
    return (
      <div className={styles.screen}>
        <h1 className={styles.heading}>バックステージ</h1>
        <StageOverview />
        <p className={styles.instruction}>
          セットをオープンしなかったため、バックステージフェーズは発生しません。
        </p>
        <button
          className={styles.proceedBtn}
          onClick={() => dispatch({ type: 'BACKSTAGE_PROCEED' })}
        >
          インターミッションへ
        </button>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <h1 className={styles.heading}>バックステージ</h1>
      <StageOverview />
      <div className={styles.spotlightCardArea}>
        <p className={styles.label}>スポットライトカード</p>
        <Card card={{ ...spotlightCard, isFaceUp: true }} />
      </div>

      <p className={styles.instruction}>
        裏向きのカードを3枚選んでください（{selected.length}/3）
      </p>

      <div className={styles.cardGrid}>
        {backstage.map((card, index) => (
          <div key={index} className={styles.cardSlot}>
            <Card
              card={{ ...card, isFaceUp: false }}
              isSelected={selected.includes(index)}
              onClick={() => toggleSelect(index)}
            />
          </div>
        ))}
      </div>

      <button
        className={styles.judgeBtn}
        onClick={handleJudge}
        disabled={selected.length !== 3}
      >
        判定
      </button>
    </div>
  );
}
