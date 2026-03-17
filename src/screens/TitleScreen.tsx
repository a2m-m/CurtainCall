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
      <h1 className={styles.heading}>CurtainCall</h1>
      <div className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="playerA" className={styles.label}>
            プレイヤーA
          </label>
          <input
            id="playerA"
            type="text"
            className={styles.input}
            value={playerAName}
            onChange={(e) => setPlayerAName(e.target.value)}
            placeholder="名前を入力"
          />
          {errors.a && <p className={styles.error}>{errors.a}</p>}
        </div>
        <div className={styles.field}>
          <label htmlFor="playerB" className={styles.label}>
            プレイヤーB
          </label>
          <input
            id="playerB"
            type="text"
            className={styles.input}
            value={playerBName}
            onChange={(e) => setPlayerBName(e.target.value)}
            placeholder="名前を入力"
          />
          {errors.b && <p className={styles.error}>{errors.b}</p>}
        </div>
        {errors.general && <p className={styles.error}>{errors.general}</p>}
        <button className={styles.startBtn} onClick={handleStart}>
          ゲームスタート
        </button>
      </div>
    </div>
  );
}
