import React from 'react';
import styles from '../../Compatibility.module.css';

interface OverallScoreCardProps {
  score: number;
  t: (key: string, fallback: string) => string;
}

export const OverallScoreCard: React.FC<OverallScoreCardProps> = React.memo(({ score, t }) => {
  return (
    <div className={styles.scoreSection}>
      <div className={styles.scoreCircle}>
        <div className={styles.scoreCircleBg} />
        <div className={styles.scoreCircleProgress} style={{ '--progress': `${score}%` } as React.CSSProperties} />
        <span className={styles.scoreValue}>{score}</span>
      </div>
      <span className={styles.scoreLabel}>
        {t('compatibilityPage.overallCompatibility', 'Overall Compatibility')}
      </span>
    </div>
  );
});

OverallScoreCard.displayName = 'OverallScoreCard';
