// components/icp/ICPCompatibility.tsx
/**
 * ICP 궁합 결과 표시 컴포넌트
 * 두 사람의 대인관계 스타일 궁합을 시각적으로 표시
 */
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import styles from './ICPCompatibility.module.css';

interface PersonStyle {
  primaryStyle: string;
  secondaryStyle?: string;
  korean: string;
}

interface CompatibilityResult {
  score: number;
  level: string;
  description: string;
  dynamics: {
    strengths: string[];
    challenges: string[];
    tips: string[];
  };
}

interface ICPCompatibilityProps {
  person1: PersonStyle;
  person2: PersonStyle;
  person1Name?: string;
  person2Name?: string;
  compatibility: CompatibilityResult;
}

export default function ICPCompatibility({
  person1,
  person2,
  person1Name = '나',
  person2Name = '상대방',
  compatibility,
}: ICPCompatibilityProps) {
  const scoreColor = compatibility.score >= 0.7 ? '#4ade80' :
                     compatibility.score >= 0.4 ? '#ffd166' : '#ff6b6b';

  return (
    <div className={styles.container}>
      {/* Header with both persons */}
      <div className={styles.header}>
        <div className={styles.person}>
          <span className={styles.personName}>{person1Name}</span>
          <span className={styles.personStyle}>{person1.primaryStyle}</span>
          <span className={styles.personKorean}>{person1.korean}</span>
        </div>

        <div className={styles.connector}>
          <svg viewBox="0 0 100 40" className={styles.connectorSvg}>
            <path
              d="M 10 20 Q 50 5 90 20"
              fill="none"
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
            <circle cx="50" cy="12" r="8" fill={scoreColor} />
          </svg>
        </div>

        <div className={styles.person}>
          <span className={styles.personName}>{person2Name}</span>
          <span className={styles.personStyle}>{person2.primaryStyle}</span>
          <span className={styles.personKorean}>{person2.korean}</span>
        </div>
      </div>

      {/* Score display */}
      <div className={styles.scoreSection}>
        <div className={styles.scoreCircle} style={{ '--score-color': scoreColor } as React.CSSProperties}>
          <motion.svg viewBox="0 0 100 100" className={styles.scoreSvg}>
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="8"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={scoreColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={2 * Math.PI * 45 * (1 - compatibility.score)}
              initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 45 * (1 - compatibility.score) }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              transform="rotate(-90 50 50)"
            />
          </motion.svg>
          <div className={styles.scoreText}>
            <span className={styles.scoreValue}>{Math.round(compatibility.score * 100)}</span>
            <span className={styles.scoreUnit}>%</span>
          </div>
        </div>
        <h3 className={styles.levelText} style={{ color: scoreColor }}>
          {compatibility.level}
        </h3>
        <p className={styles.description}>{compatibility.description}</p>
      </div>

      {/* Dynamics section */}
      <div className={styles.dynamics}>
        {/* Strengths */}
        <div className={styles.dynamicsCard}>
          <div className={styles.dynamicsHeader}>
            <span className={styles.dynamicsIcon}>✨</span>
            <h4>관계의 강점</h4>
          </div>
          <ul className={styles.dynamicsList}>
            {compatibility.dynamics.strengths.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>

        {/* Challenges */}
        <div className={styles.dynamicsCard}>
          <div className={styles.dynamicsHeader}>
            <span className={styles.dynamicsIcon}>⚡</span>
            <h4>주의할 점</h4>
          </div>
          <ul className={styles.dynamicsList}>
            {compatibility.dynamics.challenges.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>

        {/* Tips */}
        <div className={`${styles.dynamicsCard} ${styles.tipsCard}`}>
          <div className={styles.dynamicsHeader}>
            <span className={styles.dynamicsIcon}>💡</span>
            <h4>관계 성장 팁</h4>
          </div>
          <ul className={styles.dynamicsList}>
            {compatibility.dynamics.tips.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
