import { useState } from 'react';
import { useGameDispatch, useGameState } from '@/game/context';
import Card from '@/components/Card';
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
    return (
      <div className={styles.screen}>
        <h1 className={styles.heading}>バックステージ</h1>
        <StageOverview />
        <div className={styles.revealed}>
          <p className={styles.label}>開いた3枚</p>
          <div className={styles.cardRow}>
            {backstageRevealedCards.map((card, i) => (
              <Card key={i} card={{ ...card, isFaceUp: true }} />
            ))}
          </div>
        </div>

        {backstageResult === 'match' ? (
          <>
            <p className={styles.resultMatch}>ペア成立！</p>
            <button
              className={styles.proceedBtn}
              onClick={() => dispatch({ type: 'BACKSTAGE_PROCEED' })}
            >
              インターミッションへ
            </button>
          </>
        ) : lastBackstageDrawnCard !== null ? (
          <>
            <p className={styles.resultNoMatch}>不一致</p>
            <p className={styles.label}>手札に加えたカード</p>
            <div className={styles.cardRow}>
              <Card card={{ ...lastBackstageDrawnCard, isFaceUp: true }} />
            </div>
            <button
              className={styles.proceedBtn}
              onClick={() => dispatch({ type: 'BACKSTAGE_PROCEED' })}
            >
              インターミッションへ
            </button>
          </>
        ) : (
          <>
            <p className={styles.resultNoMatch}>不一致</p>
            <p className={styles.label}>バックステージから1枚選んで手札に加える</p>
            <div className={styles.cardGrid}>
              {backstage.map((card, index) => (
                <div key={index} className={styles.cardSlot}>
                  <Card
                    card={{ ...card, isFaceUp: false }}
                    onClick={() => dispatch({ type: 'BACKSTAGE_TAKE_HAND', cardIndex: index })}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
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
