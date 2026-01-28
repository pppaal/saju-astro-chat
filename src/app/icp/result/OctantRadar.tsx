'use client';

import styles from './result.module.css';

interface OctantRadarProps {
  scores: Record<string, number>;
  isKo: boolean;
}

const octantLabels: Record<string, { emoji: string; en: string; ko: string }> = {
  PA: { emoji: '👑', en: 'Leader', ko: '리더형' },
  BC: { emoji: '🏆', en: 'Achiever', ko: '성취형' },
  DE: { emoji: '🧊', en: 'Analyst', ko: '분석형' },
  FG: { emoji: '🌙', en: 'Observer', ko: '관찰형' },
  HI: { emoji: '🕊️', en: 'Peacemaker', ko: '평화형' },
  JK: { emoji: '🤝', en: 'Supporter', ko: '협력형' },
  LM: { emoji: '💗', en: 'Connector', ko: '친화형' },
  NO: { emoji: '🌻', en: 'Mentor', ko: '멘토형' },
};

export default function OctantRadar({ scores, isKo }: OctantRadarProps) {
  const sortedOctants = Object.entries(scores)
    .sort(([, a], [, b]) => b - a);

  return (
    <div className={styles.octantRadar}>
      {sortedOctants.map(([code, score], index) => (
        <div
          key={code}
          className={`${styles.octantBar} ${index === 0 ? styles.octantBarPrimary : ''}`}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className={styles.octantInfo}>
            <span className={styles.octantCode}>{octantLabels[code]?.emoji}</span>
            <span className={styles.octantName}>
              {isKo ? octantLabels[code]?.ko : octantLabels[code]?.en}
            </span>
          </div>
          <div className={styles.octantTrack}>
            <div
              className={styles.octantFill}
              style={{ width: `${score * 100}%` }}
            />
          </div>
          <span className={styles.octantScore}>{Math.round(score * 100)}%</span>
        </div>
      ))}
    </div>
  );
}
