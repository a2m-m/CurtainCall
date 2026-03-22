import { useEffect, useRef, useState } from 'react';
import styles from './PassDevice.module.css';

const INTERVAL_MS = 20;
const HOLD_DURATION_MS = 2000;

type Props = {
  playerName: string;
  onComplete: () => void;
};

export default function PassDevice({ playerName, onComplete }: Props) {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef(0);

  const startHold = () => {
    if (intervalRef.current) return;
    progressRef.current = 0;
    intervalRef.current = setInterval(() => {
      progressRef.current = Math.min(
        progressRef.current + (INTERVAL_MS / HOLD_DURATION_MS) * 100,
        100,
      );
      setProgress(progressRef.current);
      if (progressRef.current >= 100) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        onComplete();
      }
    }, INTERVAL_MS);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const cancelHold = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    progressRef.current = 0;
    setProgress(0);
  };

  return (
    <div className={styles.screen}>
      <div className={styles.icon}>📱</div>
      <div className={styles.playerName}>{playerName}</div>
      <div className={styles.title}>さんに渡してください</div>
      <div className={styles.sub}>準備ができたら長押しで進んでください。</div>
      <div className={styles.holdWrap}>
        <button
          className={styles.holdBtn}
          onPointerDown={startHold}
          onPointerUp={cancelHold}
          onPointerLeave={cancelHold}
          onPointerCancel={cancelHold}
          aria-label="長押しで進む"
        >
          <div
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            className={styles.holdFill}
            style={{ width: `${progress}%` }}
          />
          <span className={styles.holdText}>長押しで進む</span>
        </button>
      </div>
    </div>
  );
}
