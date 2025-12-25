// components/icp/ICPCircumplex.tsx
/**
 * ICP (Interpersonal Circumplex) 시각화 컴포넌트
 * 8개 옥탄트를 원형으로 표시하고 사용자의 스타일을 강조
 */
'use client';

import React from 'react';
import styles from './ICPCircumplex.module.css';

interface ICPCircumplexProps {
  primaryStyle: string;
  secondaryStyle?: string;
  octantScores: Record<string, number>;
  dominanceScore?: number;
  affiliationScore?: number;
}

const OCTANT_POSITIONS: Record<string, { angle: number; label: string; korean: string }> = {
  PA: { angle: 90, label: 'Dominant', korean: '지배적' },
  BC: { angle: 45, label: 'Competitive', korean: '경쟁적' },
  DE: { angle: 0, label: 'Cold', korean: '냉담' },
  FG: { angle: -45, label: 'Introverted', korean: '내향적' },
  HI: { angle: -90, label: 'Submissive', korean: '복종적' },
  JK: { angle: -135, label: 'Agreeable', korean: '동조적' },
  LM: { angle: 180, label: 'Warm', korean: '따뜻함' },
  NO: { angle: 135, label: 'Nurturant', korean: '양육적' },
};

export default function ICPCircumplex({
  primaryStyle,
  secondaryStyle,
  octantScores,
  dominanceScore = 0,
  affiliationScore = 0,
}: ICPCircumplexProps) {
  const size = 300;
  const center = size / 2;
  const radius = size * 0.4;

  // Calculate position for each octant
  const getOctantPosition = (code: string, r: number = radius) => {
    const angleRad = (OCTANT_POSITIONS[code]?.angle || 0) * (Math.PI / 180);
    return {
      x: center + r * Math.cos(angleRad),
      y: center - r * Math.sin(angleRad), // SVG y is inverted
    };
  };

  // Create polygon points from scores
  const polygonPoints = Object.entries(octantScores)
    .map(([code, score]) => {
      const pos = getOctantPosition(code, radius * Math.max(0.2, score));
      return `${pos.x},${pos.y}`;
    })
    .join(' ');

  return (
    <div className={styles.container}>
      <svg viewBox={`0 0 ${size} ${size}`} className={styles.svg}>
        {/* Background circles */}
        <circle cx={center} cy={center} r={radius} className={styles.circleOuter} />
        <circle cx={center} cy={center} r={radius * 0.66} className={styles.circleMiddle} />
        <circle cx={center} cy={center} r={radius * 0.33} className={styles.circleInner} />

        {/* Axes */}
        <line x1={center - radius - 10} y1={center} x2={center + radius + 10} y2={center} className={styles.axis} />
        <line x1={center} y1={center - radius - 10} x2={center} y2={center + radius + 10} className={styles.axis} />

        {/* Axis labels */}
        <text x={center + radius + 15} y={center + 4} className={styles.axisLabel}>친밀</text>
        <text x={center - radius - 35} y={center + 4} className={styles.axisLabel}>적대</text>
        <text x={center} y={center - radius - 15} className={styles.axisLabel} textAnchor="middle">지배</text>
        <text x={center} y={center + radius + 25} className={styles.axisLabel} textAnchor="middle">복종</text>

        {/* Score polygon */}
        <polygon points={polygonPoints} className={styles.scorePolygon} />

        {/* Octant markers */}
        {Object.entries(OCTANT_POSITIONS).map(([code, { korean }]) => {
          const pos = getOctantPosition(code);
          const isPrimary = code === primaryStyle;
          const isSecondary = code === secondaryStyle;
          return (
            <g key={code}>
              {/* Octant circle */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isPrimary ? 18 : isSecondary ? 14 : 10}
                className={`${styles.octantCircle} ${isPrimary ? styles.primary : ''} ${isSecondary ? styles.secondary : ''}`}
              />
              {/* Octant code */}
              <text x={pos.x} y={pos.y + 4} className={styles.octantCode} textAnchor="middle">
                {code}
              </text>
              {/* Korean label (outside) */}
              <text
                x={getOctantPosition(code, radius + 35).x}
                y={getOctantPosition(code, radius + 35).y + 4}
                className={styles.octantLabel}
                textAnchor="middle"
              >
                {korean}
              </text>
            </g>
          );
        })}

        {/* Center dot showing dominance/affiliation position */}
        <circle
          cx={center + affiliationScore * radius * 0.8}
          cy={center - dominanceScore * radius * 0.8}
          r={8}
          className={styles.centerDot}
        />
      </svg>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.primary}`}></span>
          <span>주요 스타일: {primaryStyle} ({OCTANT_POSITIONS[primaryStyle]?.korean})</span>
        </div>
        {secondaryStyle && (
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.secondary}`}></span>
            <span>부가 스타일: {secondaryStyle} ({OCTANT_POSITIONS[secondaryStyle]?.korean})</span>
          </div>
        )}
      </div>
    </div>
  );
}
