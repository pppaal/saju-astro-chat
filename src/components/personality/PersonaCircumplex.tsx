// components/personality/PersonaCircumplex.tsx
/**
 * Nova Persona 4축 원형 시각화 컴포넌트
 * 4개 축을 원형으로 표시하고 사용자의 성향을 레이더 형태로 시각화
 */
'use client';

import React from 'react';
import type { PersonaAxisKey, PersonaAxisResult } from '@/lib/persona/types';
import styles from './PersonaCircumplex.module.css';

interface PersonaCircumplexProps {
  axes: Record<PersonaAxisKey, PersonaAxisResult>;
  typeCode: string;
  locale?: string;
}

// 4축 설정: 상단(Energy), 우측(Cognition), 하단(Decision), 좌측(Rhythm)
const AXIS_CONFIG: Record<PersonaAxisKey, {
  angle: number;
  label: string;
  labelKo: string;
  leftPole: string;
  leftPoleKo: string;
  rightPole: string;
  rightPoleKo: string;
  color: string;
}> = {
  energy: {
    angle: 90,
    label: 'Energy',
    labelKo: '에너지',
    leftPole: 'Grounded',
    leftPoleKo: '내향',
    rightPole: 'Radiant',
    rightPoleKo: '발산',
    color: '#a8edea',
  },
  cognition: {
    angle: 0,
    label: 'Cognition',
    labelKo: '인지',
    leftPole: 'Structured',
    leftPoleKo: '구조',
    rightPole: 'Visionary',
    rightPoleKo: '비전',
    color: '#fed6e3',
  },
  decision: {
    angle: -90,
    label: 'Decision',
    labelKo: '결정',
    leftPole: 'Empathic',
    leftPoleKo: '공감',
    rightPole: 'Logic',
    rightPoleKo: '논리',
    color: '#ffd166',
  },
  rhythm: {
    angle: 180,
    label: 'Rhythm',
    labelKo: '리듬',
    leftPole: 'Anchor',
    leftPoleKo: '안정',
    rightPole: 'Flow',
    rightPoleKo: '유동',
    color: '#66d1ff',
  },
};

export default function PersonaCircumplex({
  axes,
  typeCode,
  locale = 'en',
}: PersonaCircumplexProps) {
  const isKo = locale === 'ko';
  const size = 320;
  const center = size / 2;
  const radius = size * 0.38;

  // Calculate position for each axis based on angle
  const getPosition = (angle: number, r: number = radius) => {
    const angleRad = (angle * Math.PI) / 180;
    return {
      x: center + r * Math.cos(angleRad),
      y: center - r * Math.sin(angleRad), // SVG y is inverted
    };
  };

  // Create polygon points from scores
  const axisKeys: PersonaAxisKey[] = ['energy', 'cognition', 'decision', 'rhythm'];
  const polygonPoints = axisKeys.map((key) => {
    const config = AXIS_CONFIG[key];
    // score를 0-1 범위로 변환하되 최소 0.15를 유지하여 시각적 가시성 확보
    const normalizedScore = Math.max(0.15, axes[key].score / 100);
    const pos = getPosition(config.angle, radius * normalizedScore);
    return `${pos.x},${pos.y}`;
  }).join(' ');

  // Generate accessible description
  const accessibleDescription = isKo
    ? `Nova Persona 성격 분석 차트. 타입 코드: ${typeCode}`
    : `Nova Persona personality chart. Type code: ${typeCode}`;

  return (
    <div className={styles.container} role="img" aria-label={accessibleDescription}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className={styles.svg}
        aria-hidden="true"
        focusable="false"
      >
        <title>Nova Persona Circumplex</title>
        <desc>{accessibleDescription}</desc>

        {/* Background circles */}
        <circle cx={center} cy={center} r={radius} className={styles.circleOuter} />
        <circle cx={center} cy={center} r={radius * 0.66} className={styles.circleMiddle} />
        <circle cx={center} cy={center} r={radius * 0.33} className={styles.circleInner} />

        {/* Axis lines */}
        {axisKeys.map((key) => {
          const config = AXIS_CONFIG[key];
          const endPos = getPosition(config.angle, radius + 10);
          return (
            <line
              key={key}
              x1={center}
              y1={center}
              x2={endPos.x}
              y2={endPos.y}
              className={styles.axis}
              style={{ stroke: config.color, opacity: 0.4 }}
            />
          );
        })}

        {/* Score polygon (radar shape) */}
        <polygon points={polygonPoints} className={styles.scorePolygon} />

        {/* Axis markers and labels */}
        {axisKeys.map((key) => {
          const config = AXIS_CONFIG[key];
          const score = axes[key].score;
          const normalizedScore = Math.max(0.15, score / 100);
          const markerPos = getPosition(config.angle, radius * normalizedScore);
          const labelPos = getPosition(config.angle, radius + 40);
          const polePos = getPosition(config.angle, radius + 58);

          // Determine which pole is dominant
          const isRightPole = score >= 50;
          const dominantPole = isRightPole
            ? (isKo ? config.rightPoleKo : config.rightPole)
            : (isKo ? config.leftPoleKo : config.leftPole);

          return (
            <g key={key}>
              {/* Score marker */}
              <circle
                cx={markerPos.x}
                cy={markerPos.y}
                r={8}
                className={styles.scoreMarker}
                style={{ fill: config.color }}
              />

              {/* Axis label */}
              <text
                x={labelPos.x}
                y={labelPos.y}
                className={styles.axisLabel}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {isKo ? config.labelKo : config.label}
              </text>

              {/* Dominant pole */}
              <text
                x={polePos.x}
                y={polePos.y}
                className={styles.poleLabel}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fill: config.color }}
              >
                {dominantPole}
              </text>

              {/* Score percentage */}
              <text
                x={markerPos.x}
                y={markerPos.y + 1}
                className={styles.scoreText}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {score}
              </text>
            </g>
          );
        })}

        {/* Center type code */}
        <circle cx={center} cy={center} r={28} className={styles.centerCircle} />
        <text
          x={center}
          y={center + 1}
          className={styles.typeCode}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {typeCode}
        </text>
      </svg>

      {/* Legend */}
      <div className={styles.legend}>
        {axisKeys.map((key) => {
          const config = AXIS_CONFIG[key];
          const score = axes[key].score;
          const isRightPole = score >= 50;

          return (
            <div key={key} className={styles.legendItem}>
              <span
                className={styles.legendDot}
                style={{ backgroundColor: config.color }}
              />
              <span className={styles.legendAxis}>
                {isKo ? config.labelKo : config.label}
              </span>
              <span className={styles.legendPole}>
                {isRightPole
                  ? (isKo ? config.rightPoleKo : config.rightPole)
                  : (isKo ? config.leftPoleKo : config.leftPole)}
              </span>
              <span className={styles.legendScore}>{score}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}