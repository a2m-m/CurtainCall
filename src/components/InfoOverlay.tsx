import type { GameState, Card } from '@/types/game';
import { calculateScore } from '@/lib/scoring';
import styles from './InfoOverlay.module.css';

const BOO_MAX = 3;

function rankLabel(card: Card): string {
  if (card.isJoker) return 'JK';
  const labels: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
  return labels[card.rank] ?? String(card.rank);
}

function suitLabel(card: Card): string {
  const suits: Record<string, string> = {
    spades: '♠',
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
  };
  return suits[card.suit] ?? card.suit;
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
};

export default function InfoOverlay({ isOpen, onClose, gameState }: Props) {
  const { players, playerABooCnt, playerBBooCnt, setRemainingCount, publicInfos, playerAKami, playerBKami, playerAShimo, playerBShimo, stage } = gameState;
  const playerA = players.find((p) => p.id === 'A')!;
  const playerB = players.find((p) => p.id === 'B')!;

  const booCounts = [playerABooCnt, playerBBooCnt];
  const kamiCards = [playerAKami, playerBKami];
  const shimoCards = [playerAShimo, playerBShimo];
  const scoreA = calculateScore(gameState, 'A');
  const scoreB = calculateScore(gameState, 'B');
  const scores = [scoreA, scoreB];

  return (
    <div
      className={`${styles.backdrop} ${isOpen ? styles.open : ''}`}
      aria-hidden={!isOpen}
    >
      <div
        className={styles.backdropArea}
        onClick={onClose}
        aria-label="オーバーレイを閉じる"
      />
      <div className={styles.panel} role="dialog" aria-label="ゲーム情報">
        <div className={styles.header}>
          <h3>📊 ゲーム情報</h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>

        {/* スコア速報 */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>スコア（暫定）</h4>
          <div className={styles.scoreCompare}>
            {[playerA, playerB].map((player, i) => (
              <div key={player.id} className={styles.scoreCol}>
                <div className={styles.sName}>{player.name}</div>
                <div className={styles.sTotal}>{scores[i].kamiTotal - scores[i].handTotal}</div>
                <div className={styles.sRow}>
                  <span>カミ合計</span>
                  <span>{scores[i].kamiTotal} 点</span>
                </div>
                <div className={styles.sRow}>
                  <span>手札合計</span>
                  <span>{scores[i].handTotal} 点</span>
                </div>
                <div className={styles.kamiList}>
                  {kamiCards[i].length === 0 ? (
                    <span className={styles.kamiEmpty}>なし</span>
                  ) : (
                    kamiCards[i].map((card, j) => (
                      <span key={j} className={styles.kamiChip}>
                        {suitLabel(card)}{rankLabel(card)}
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}
            <div className={styles.scoreDivider} />
          </div>
        </div>

        {/* ブーイング回数 */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>ブーイング回数（規定：各{BOO_MAX}回）</h4>
          {[playerA, playerB].map((player, i) => (
            <div key={player.id} className={styles.booPlayer}>
              <div className={styles.booPlayerName}>{player.name}</div>
              <div className={styles.booBar}>
                {Array.from({ length: BOO_MAX }, (_, j) => (
                  <div
                    key={j}
                    className={`${styles.booDot} ${j < booCounts[i] ? styles.booDotFilled : ''}`}
                    aria-hidden="true"
                  />
                ))}
                <span className={styles.booCount}>
                  {booCounts[i]} / {BOO_MAX}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* セット残枚数 */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>セット</h4>
          <div className={styles.setRemaining}>
            <span className={styles.setRemainingLabel}>裏向き残り</span>
            <span className={styles.setCount}>{setRemainingCount} 枚</span>
          </div>
        </div>

        {/* 現在のステージ */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>現在のステージ</h4>
          {stage.kami === null && stage.shimo === null ? (
            <span className={styles.kamiEmpty}>なし</span>
          ) : (
            <div className={styles.stageRow}>
              <div className={styles.stageCard}>
                <span className={styles.stageLabel}>カミ</span>
                <span className={styles.stageValue}>
                  {stage.kami ? `${suitLabel(stage.kami)}${rankLabel(stage.kami)}` : '—'}
                </span>
              </div>
              <div className={styles.stageCard}>
                <span className={styles.stageLabel}>シモ</span>
                <span className={styles.stageValue}>
                  {stage.shimo
                    ? stage.shimo.isFaceUp
                      ? `${suitLabel(stage.shimo)}${rankLabel(stage.shimo)}`
                      : '裏'
                    : '—'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 蓄積ペア */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>蓄積ペア</h4>
          <div className={styles.pairCompare}>
            {[playerA, playerB].map((player, i) => (
              <div key={player.id} className={styles.pairCol}>
                <div className={styles.sName}>{player.name}</div>
                {kamiCards[i].length === 0 ? (
                  <span className={styles.kamiEmpty}>なし</span>
                ) : (
                  kamiCards[i].map((kami, j) => {
                    const shimo = shimoCards[i][j];
                    return (
                      <div key={j} className={styles.pairRow}>
                        <span className={styles.pairKami}>
                          {suitLabel(kami)}{rankLabel(kami)}
                        </span>
                        <span className={styles.pairSlash}>/</span>
                        <span className={styles.pairShimo}>
                          {shimo
                            ? shimo.isFaceUp
                              ? `${suitLabel(shimo)}${rankLabel(shimo)}`
                              : '裏'
                            : '—'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            ))}
          </div>
        </div>

        {/* バックステージ公開情報 */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>バックステージ（公開情報）</h4>
          <div className={styles.knownCardsList}>
            {publicInfos.length === 0 ? (
              <div className={styles.knownCardRow}>
                <span style={{ color: 'var(--muted, #7a8aaa)' }}>公開情報なし</span>
              </div>
            ) : (
              publicInfos.map((info, i) => (
                <div key={i} className={styles.knownCardRow}>
                  <span>
                    {suitLabel(info.card)}
                    {rankLabel(info.card)}
                  </span>
                  <span className={styles.knownCardLoc}>
                    {players.find((p) => p.id === info.playerId)?.name ?? info.playerId}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
