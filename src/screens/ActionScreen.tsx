import { useState } from 'react';
import { useGameDispatch, useGameState } from '@/game/context';
import Card from '@/components/Card';
import PassDevice from '@/components/PassDevice';
import styles from './ActionScreen.module.css';

type SelectionStep = 'selectingActor' | 'selectingKuroko' | 'confirmed';

export default function ActionScreen() {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const [step, setStep] = useState<SelectionStep>('selectingActor');
  const [kamiIndex, setKamiIndex] = useState<number | null>(null);
  const [shimoIndex, setShimoIndex] = useState<number | null>(null);
  const [showPassDevice, setShowPassDevice] = useState(false);

  const hand = state.players[0].hand;
  const actionPlayer = state.players[0];

  const handleCardClick = (index: number) => {
    if (step === 'selectingActor') {
      setKamiIndex(index);
      setStep('selectingKuroko');
    } else if (step === 'selectingKuroko') {
      if (index === kamiIndex) return; // 同一カード不可
      setShimoIndex(index);
      setStep('confirmed');
    }
  };

  const handleConfirm = () => {
    if (kamiIndex === null || shimoIndex === null) return;
    setShowPassDevice(true);
  };

  if (showPassDevice && kamiIndex !== null && shimoIndex !== null) {
    return (
      <PassDevice
        playerName={state.players[1].name}
        onComplete={() => dispatch({ type: 'ACTION_PLAY', kamiIndex, shimoIndex })}
      />
    );
  }

  const kamiCard = kamiIndex !== null ? hand[kamiIndex] : null;
  const shimoCard = shimoIndex !== null ? hand[shimoIndex] : null;

  const getInstruction = () => {
    if (step === 'selectingActor') return '役者札（カミ）を選んでください';
    if (step === 'selectingKuroko') return '黒子札（シモ）を選んでください';
    return '「ステージへ出す」で確定します';
  };

  const getCardOnClick = (index: number): (() => void) | undefined => {
    if (step === 'selectingActor') return () => handleCardClick(index);
    if (step === 'selectingKuroko' && index !== kamiIndex) return () => handleCardClick(index);
    return undefined;
  };

  return (
    <div className={styles.screen}>
      <h1 className={styles.heading}>アクション</h1>
      <p className={styles.sub}>{getInstruction()}</p>

      <div className={styles.preview}>
        <div className={styles.previewSlot}>
          <span className={styles.slotLabel}>役者（カミ）</span>
          {kamiCard ? (
            <Card card={{ ...kamiCard, isFaceUp: true }} isSelected />
          ) : (
            <div className={styles.emptySlot} />
          )}
        </div>
        <div className={styles.previewSlot}>
          <span className={styles.slotLabel}>黒子（シモ）</span>
          {shimoCard ? (
            <Card card={{ ...shimoCard, isFaceUp: false }} isSelectedShimo />
          ) : (
            <div className={styles.emptySlot} />
          )}
        </div>
      </div>

      <div className={styles.grid}>
        {hand.map((card, i) => (
          <Card
            key={i}
            card={{ ...card, isFaceUp: true }}
            isSelected={i === kamiIndex}
            isSelectedShimo={i === shimoIndex}
            onClick={getCardOnClick(i)}
          />
        ))}
      </div>

      <button
        className={styles.confirmBtn}
        onClick={handleConfirm}
        disabled={step !== 'confirmed'}
      >
        ステージへ出す
      </button>
    </div>
  );
}
