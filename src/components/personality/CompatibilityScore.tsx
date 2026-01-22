'use client';

import React from 'react';
import styles from './CompatibilityScore.module.css';

interface CompatibilityScoreProps {
  score: number;
  level: string;
  levelKo: string;
  description: string;
  descriptionKo: string;
  locale?: string;
  synergies?: string[];
  synergiesKo?: string[];
  tensions?: string[];
  tensionsKo?: string[];
  insights?: string[];
  insightsKo?: string[];
}

export function CompatibilityScore({
  score,
  level,
  levelKo,
  description,
  descriptionKo,
  locale = 'en',
  synergies = [],
  synergiesKo = [],
  tensions = [],
  tensionsKo = [],
  insights = [],
  insightsKo = [],
}: CompatibilityScoreProps) {
  const isKo = locale === 'ko';

  // Determine color based on score
  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#10b981'; // green
    if (score >= 65) return '#3b82f6'; // blue
    if (score >= 50) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  const color = getScoreColor(score);

  return (
    <div className={styles.container}>
      {/* Score Circle */}
      <div className={styles.scoreSection}>
        <svg width="200" height="200" viewBox="0 0 200 200">
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="rgba(0, 0, 0, 0.05)"
            strokeWidth="16"
          />

          {/* Score arc */}
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke={color}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 502.65} 502.65`}
            transform="rotate(-90 100 100)"
            style={{ transition: 'stroke-dasharray 1s ease-out' }}
          />

          {/* Inner circle */}
          <circle
            cx="100"
            cy="100"
            r="70"
            fill="url(#scoreGradient)"
          />

          {/* Score text */}
          <text
            x="100"
            y="95"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="48"
            fontWeight="bold"
            fill={color}
          >
            {score}
          </text>
          <text
            x="100"
            y="120"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="14"
            fill={color}
            opacity="0.8"
          >
            {isKo ? levelKo : level}
          </text>
        </svg>
      </div>

      {/* Description */}
      <div className={styles.description}>
        <p>{isKo ? descriptionKo : description}</p>
      </div>

      {/* Synergies */}
      {(synergies.length > 0 || insights.length > 0) && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            ✨ {isKo ? '시너지 포인트' : 'Synergy Points'}
          </h3>
          <ul className={styles.list}>
            {(isKo ? synergiesKo : synergies).map((item, idx) => (
              <li key={idx} className={styles.synergy}>{item}</li>
            ))}
            {(isKo ? insightsKo : insights).filter(i =>
              !i.toLowerCase().includes('may') &&
              !i.toLowerCase().includes('lack') &&
              !i.toLowerCase().includes('compete')
            ).map((item, idx) => (
              <li key={`insight-${idx}`} className={styles.synergy}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tensions */}
      {tensions.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            ⚠️ {isKo ? '주의 포인트' : 'Growth Areas'}
          </h3>
          <ul className={styles.list}>
            {(isKo ? tensionsKo : tensions).map((item, idx) => (
              <li key={idx} className={styles.tension}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Challenges from insights */}
      {insights.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            💡 {isKo ? '인사이트' : 'Key Insights'}
          </h3>
          <ul className={styles.list}>
            {(isKo ? insightsKo : insights).filter(i =>
              i.toLowerCase().includes('may') ||
              i.toLowerCase().includes('lack') ||
              i.toLowerCase().includes('compete') ||
              i.toLowerCase().includes('need')
            ).map((item, idx) => (
              <li key={idx} className={styles.insight}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
