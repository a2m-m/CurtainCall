import styles from './PhaseHeader.module.css';

type Props = {
  phaseName: string;
  activePlayerName: string;
  onInfoOpen: () => void;
};

export default function PhaseHeader({ phaseName, activePlayerName, onInfoOpen }: Props) {
  return (
    <div className={styles.phaseHeader}>
      <div>
        <h2 className={styles.phaseName}>{phaseName}</h2>
        <div className={styles.sub}>{activePlayerName}</div>
      </div>
      <button className={styles.infoBtn} onClick={onInfoOpen} aria-label="ゲーム情報を開く">
        📊
      </button>
    </div>
  );
}
