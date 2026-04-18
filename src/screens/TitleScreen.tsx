import { useState } from 'react';
import { useGameDispatch } from '@/game/context';
import styles from './TitleScreen.module.css';

export default function TitleScreen() {
  const dispatch = useGameDispatch();
  const [playerAName, setPlayerAName] = useState('');
  const [playerBName, setPlayerBName] = useState('');
  const [errors, setErrors] = useState<{ a?: string; b?: string; general?: string }>({});

  const handleStart = () => {
    const newErrors: typeof errors = {};

    if (!playerAName.trim()) {
      newErrors.a = 'プレイヤーA名を入力してください';
    }
    if (!playerBName.trim()) {
      newErrors.b = 'プレイヤーB名を入力してください';
    }
    if (
      playerAName.trim() &&
      playerBName.trim() &&
      playerAName.trim() === playerBName.trim()
    ) {
      newErrors.general = 'プレイヤー名が重複しています';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    dispatch({ type: 'INIT_GAME', playerAName: playerAName.trim(), playerBName: playerBName.trim() });
  };

  return (
    <div className={styles.screen}>
      <div className={styles.ornament}>a card game in three acts</div>
      <h1 className={styles.heading}>Curtain<em>Call</em></h1>
      <div className={styles.headingJp}>カーテンコール</div>

      <div className={styles.form}>
        <div className={styles.field}>
          <div className={styles.fieldHeader}>
            <label htmlFor="playerA" className={styles.label}>Player A</label>
            <span className={styles.labelSub}>先攻</span>
          </div>
          <input
            id="playerA"
            type="text"
            aria-label="プレイヤーA"
            className={styles.input}
            value={playerAName}
            onChange={(e) => setPlayerAName(e.target.value)}
            placeholder="名前を入力"
          />
          {errors.a && <p className={styles.error}>{errors.a}</p>}
        </div>
        <div className={styles.field}>
          <div className={styles.fieldHeader}>
            <label htmlFor="playerB" className={styles.label}>Player B</label>
            <span className={styles.labelSub}>後攻</span>
          </div>
          <input
            id="playerB"
            type="text"
            aria-label="プレイヤーB"
            className={styles.input}
            value={playerBName}
            onChange={(e) => setPlayerBName(e.target.value)}
            placeholder="名前を入力"
          />
          {errors.b && <p className={styles.error}>{errors.b}</p>}
        </div>
      </div>

      {errors.general && <p className={styles.error}>{errors.general}</p>}

      <button className={styles.startBtn} aria-label="ゲームスタート" onClick={handleStart}>
        OVERTURE · 開演
      </button>
    </div>
  );
}
