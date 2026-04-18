import styles from './PhaseHeader.module.css';

type Props = {
  phaseName: string;
  activePlayerName: string;
  onInfoOpen: () => void;
  actLabel?: string;
  subLabel?: string;
  playerAName?: string;
  playerBName?: string;
};

export default function PhaseHeader({
  phaseName,
  activePlayerName,
  onInfoOpen,
  actLabel,
  subLabel,
  playerAName,
  playerBName,
}: Props) {
  const hasRoleBadges = playerAName && playerBName;

  return (
    <div className={styles.topbar}>
      {/* 左: ロゴ */}
      <div className={styles.logo}>
        <div className={styles.logoText}>
          Curtain<em>Call</em>
        </div>
        <div className={styles.logoSub}>カーテンコール</div>
      </div>

      {/* 中央: フェーズピル */}
      <div className={styles.phasePill}>
        {actLabel && <div className={styles.actLabel}>{actLabel}</div>}
        <div className={styles.phaseInfo}>
          <div className={styles.phaseName}>{phaseName}</div>
          <div className={styles.phaseSub}>{subLabel ?? activePlayerName}</div>
        </div>
      </div>

      {/* 右: PLAYBILLボタン + ロールバッジ */}
      <div className={styles.right}>
        <button
          className={styles.playbillBtn}
          onClick={onInfoOpen}
          aria-label="ゲーム情報を開く"
        >
          <span className={styles.playbillDot} />
          PLAYBILL
        </button>
        {hasRoleBadges && (
          <div className={styles.roleBadges}>
            <div
              className={`${styles.role} ${activePlayerName === playerAName ? styles.roleActive : ''}`}
            >
              {activePlayerName === playerAName && <span className={styles.roleDot} />}
              {playerAName}
            </div>
            <div
              className={`${styles.role} ${activePlayerName === playerBName ? styles.roleActive : ''}`}
            >
              {activePlayerName === playerBName && <span className={styles.roleDot} />}
              {playerBName}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
