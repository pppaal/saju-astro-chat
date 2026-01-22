import React from 'react';
import styles from '../../Compatibility.module.css';

interface ScoreBarProps {
  score: number;
  label?: string;
  t: (key: string, fallback: string) => string;
}

export const ScoreBar: React.FC<ScoreBarProps> = React.memo(({ score, label, t }) => {
  return (
    <div className={styles.scoreBar}>
      <div className={styles.scoreBarHeader}>
        <span>{label || t('compatibilityPage.score', 'Score')}</span>
        <span>{score}%</span>
      </div>
      <div className={styles.scoreBarTrack}>
        <div className={styles.scoreBarFill} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
});

ScoreBar.displayName = 'ScoreBar';
