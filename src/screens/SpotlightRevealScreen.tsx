import { useState } from 'react';
import { useGameDispatch, useGameState } from '@/game/context';
import Card from '@/components/Card';
import PassDevice from '@/components/PassDevice';
import styles from './SpotlightRevealScreen.module.css';

export default function SpotlightRevealScreen() {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const [actorReady, setActorReady] = useState(false);

  const { kami, shimo } = state.stage;
  const isRevealed = shimo?.isFaceUp ?? false;
  const isMatch =
    isRevealed && kami !== null && shimo !== null && kami.rank === shimo.rank;
  const isNoMatch =
    isRevealed && kami !== null && shimo !== null && kami.rank !== shimo.rank;

  return (
    <div className={styles.screen}>
      <h1 className={styles.heading}>スポットライト</h1>

      <div className={styles.stage}>
        <div className={styles.stageSlot}>
          <span className={styles.slotLabel}>役者（カミ）</span>
          {kami ? <Card card={kami} /> : <div className={styles.emptySlot} />}
        </div>
        <div className={styles.stageSlot}>
          <span className={styles.slotLabel}>黒子（シモ）</span>
          {shimo ? <Card card={shimo} /> : <div className={styles.emptySlot} />}
        </div>
      </div>

      {!isRevealed && (
        <button
          className={styles.revealBtn}
          onClick={() => dispatch({ type: 'SPOTLIGHT_REVEAL' })}
        >
          黒子札を開示
        </button>
      )}

      {isMatch && (
        <div className={styles.result}>
          <p className={styles.resultText}>ブーイング不正解！</p>
          {!actorReady ? (
            <PassDevice
              playerName={state.players[0].name}
              onComplete={() => setActorReady(true)}
            />
          ) : (
            <div className={styles.actions}>
              <button
                className={styles.openSetBtn}
                onClick={() => dispatch({ type: 'SPOTLIGHT_ENTER_BONUS' })}
              >
                セットを開く
              </button>
              <button
                className={styles.skipBtn}
                onClick={() => dispatch({ type: 'SPOTLIGHT_SKIP_SET' })}
              >
                スキップ
              </button>
            </div>
          )}
        </div>
      )}

      {isNoMatch && (
        <div className={styles.result}>
          <p className={styles.resultText}>ブーイング正解！</p>
          <p className={styles.moveText}>カードが{state.players[1].name}のステージへ移動します</p>
          <div className={styles.actions}>
            <button
              className={styles.openSetBtn}
              onClick={() => dispatch({ type: 'SPOTLIGHT_ENTER_BONUS' })}
            >
              セットを開く
            </button>
            <button
              className={styles.skipBtn}
              onClick={() => dispatch({ type: 'SPOTLIGHT_SKIP_SET' })}
            >
              スキップ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
