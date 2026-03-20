import type { Card as CardType } from '@/types/game';
import Card from './Card';
import styles from './Stage.module.css';

// ─── PlayerStage ─────────────────────────────────────────────

type PlayerStageProps = {
  playerName: string;
  kamiCard: CardType | null;
  shimoCard: CardType | null;
  isActive?: boolean;
  /** ステージにカードが置かれた際のスライドインアニメーションを再生する */
  animateSlide?: boolean;
};

export function PlayerStage({ playerName, kamiCard, shimoCard, isActive, animateSlide }: PlayerStageProps) {
  const wrapClass = [styles.playerStage, isActive ? styles.active : ''].filter(Boolean).join(' ');

  return (
    <div className={wrapClass} aria-label={`${playerName}のステージ`}>
      <div className={styles.playerName}>{playerName}</div>
      <div className={styles.stageSlots}>
        <div className={styles.cardSlot}>
          <span className={styles.slotLabel}>シモ</span>
          {shimoCard ? (
            <Card card={shimoCard} animateSlide={animateSlide} />
          ) : (
            <div className={styles.cardPlaceholder} aria-label="空のシモスロット" />
          )}
        </div>
        <div className={styles.cardSlot}>
          <span className={styles.slotLabel}>カミ</span>
          {kamiCard ? (
            <Card card={kamiCard} animateSlide={animateSlide} />
          ) : (
            <div className={styles.cardPlaceholder} aria-label="空のカミスロット" />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MainStage ────────────────────────────────────────────────

const MAIN_STAGE_SIZE = 13;

type MainStageProps = {
  cards: CardType[];
  /** カード配布アニメーションを再生する（Standby フェーズ等） */
  animateDeal?: boolean;
};

export function MainStage({ cards, animateDeal }: MainStageProps) {
  const placeholderCount = Math.max(0, MAIN_STAGE_SIZE - cards.length);

  return (
    <div className={styles.mainStage} aria-label="メインステージ">
      {cards.map((card, i) => (
        <Card key={i} card={card} animateDeal={animateDeal} dealDelay={animateDeal ? i * 0.05 : undefined} />
      ))}
      {Array.from({ length: placeholderCount }).map((_, i) => (
        <div key={`ph-${i}`} className={styles.cardPlaceholder} />
      ))}
    </div>
  );
}

// ─── BackstageArea ────────────────────────────────────────────

const BACKSTAGE_SIZE = 10;

type BackstageAreaProps = {
  cards: CardType[];
  /** カード配布アニメーションを再生する（Standby フェーズ等） */
  animateDeal?: boolean;
};

export function BackstageArea({ cards, animateDeal }: BackstageAreaProps) {
  const placeholderCount = Math.max(0, BACKSTAGE_SIZE - cards.length);

  return (
    <div className={styles.backstageArea} aria-label="バックステージ">
      {cards.map((card, i) => (
        <Card key={i} card={card} animateDeal={animateDeal} dealDelay={animateDeal ? i * 0.05 : undefined} />
      ))}
      {Array.from({ length: placeholderCount }).map((_, i) => (
        <div key={`ph-${i}`} className={styles.cardPlaceholder} />
      ))}
    </div>
  );
}
