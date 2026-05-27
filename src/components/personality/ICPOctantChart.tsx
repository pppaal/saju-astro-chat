'use client';

import React from 'react';
import type { ICPOctantCode } from '@/lib/icp/types';

interface ICPOctantChartProps {
  octantScores: Record<ICPOctantCode, number>;
  primaryStyle: ICPOctantCode;
  dominanceNormalized: number;
  affiliationNormalized: number;
  size?: number;
}

const OCTANT_POSITIONS: Record<ICPOctantCode, { angle: number; label: string; labelKo: string }> = {
  PA: { angle: 45, label: 'Dominant-Assured', labelKo: '지배적-확신' },
  NO: { angle: 90, label: 'Nurturant', labelKo: '양육적' },
  LM: { angle: 135, label: 'Warm-Friendly', labelKo: '따뜻-친화' },
  JK: { angle: 180, label: 'Cooperative', labelKo: '협력적' },
  HI: { angle: 225, label: 'Submissive', labelKo: '복종적' },
  FG: { angle: 270, label: 'Introverted', labelKo: '내향적' },
  DE: { angle: 315, label: 'Cold-Distant', labelKo: '냉담-거리' },
  BC: { angle: 0, label: 'Competitive', labelKo: '경쟁적' },
};

export function ICPOctantChart({
  octantScores,
  primaryStyle,
  dominanceNormalized,
  affiliationNormalized,
  size = 400,
}: ICPOctantChartProps) {
  const radius = size / 2 - 40;
  const center = size / 2;

  // Convert octant scores to polygon points
  const octantCodes: ICPOctantCode[] = ['BC', 'PA', 'NO', 'LM', 'JK', 'HI', 'FG', 'DE'];
  const points = octantCodes.map((code) => {
    const position = OCTANT_POSITIONS[code];
    const score = octantScores[code];
    const angleRad = (position.angle * Math.PI) / 180;
    const r = radius * score;
    const x = center + r * Math.cos(angleRad);
    const y = center - r * Math.sin(angleRad);
    return `${x},${y}`;
  }).join(' ');

  // Calculate position marker for actual scores
  const posAngle = Math.atan2(dominanceNormalized, affiliationNormalized);
  const posRadius = Math.sqrt(
    dominanceNormalized * dominanceNormalized + affiliationNormalized * affiliationNormalized
  ) * radius;
  const posX = center + posRadius * Math.cos(posAngle);
  const posY = center - posRadius * Math.sin(posAngle);

  return (
    <svg width={size} height={size} className="icp-octant-chart">
      <defs>
        <radialGradient id="chartGradient" cx="50%" cy="50%">
          <stop offset="0%" stopColor="rgba(157, 78, 221, 0.1)" />
          <stop offset="100%" stopColor="rgba(157, 78, 221, 0.05)" />
        </radialGradient>
      </defs>

      {/* Background circles */}
      {[0.25, 0.5, 0.75, 1.0].map((scale) => (
        <circle
          key={scale}
          cx={center}
          cy={center}
          r={radius * scale}
          fill="none"
          stroke="rgba(157, 78, 221, 0.1)"
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      <line
        x1={center - radius}
        y1={center}
        x2={center + radius}
        y2={center}
        stroke="rgba(157, 78, 221, 0.2)"
        strokeWidth="2"
      />
      <line
        x1={center}
        y1={center - radius}
        x2={center}
        y2={center + radius}
        stroke="rgba(157, 78, 221, 0.2)"
        strokeWidth="2"
      />

      {/* Octant lines */}
      {octantCodes.map((code) => {
        const position = OCTANT_POSITIONS[code];
        const angleRad = (position.angle * Math.PI) / 180;
        const x2 = center + radius * Math.cos(angleRad);
        const y2 = center - radius * Math.sin(angleRad);
        return (
          <line
            key={code}
            x1={center}
            y1={center}
            x2={x2}
            y2={y2}
            stroke="rgba(157, 78, 221, 0.15)"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
        );
      })}

      {/* Score polygon */}
      <polygon
        points={points}
        fill="url(#chartGradient)"
        stroke="rgba(157, 78, 221, 0.6)"
        strokeWidth="2"
      />

      {/* Octant labels */}
      {octantCodes.map((code) => {
        const position = OCTANT_POSITIONS[code];
        const angleRad = (position.angle * Math.PI) / 180;
        const labelRadius = radius + 25;
        const x = center + labelRadius * Math.cos(angleRad);
        const y = center - labelRadius * Math.sin(angleRad);
        const isPrimary = code === primaryStyle;

        return (
          <g key={code}>
            <circle
              cx={x}
              cy={y}
              r={isPrimary ? 16 : 12}
              fill={isPrimary ? 'rgba(157, 78, 221, 0.9)' : 'rgba(157, 78, 221, 0.3)'}
            />
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize={isPrimary ? '12' : '10'}
              fontWeight={isPrimary ? 'bold' : 'normal'}
            >
              {code}
            </text>
          </g>
        );
      })}

      {/* Position marker */}
      <circle
        cx={posX}
        cy={posY}
        r="8"
        fill="rgba(255, 107, 107, 0.9)"
        stroke="white"
        strokeWidth="2"
      />

      {/* Center point */}
      <circle cx={center} cy={center} r="4" fill="rgba(157, 78, 221, 0.5)" />

      {/* Axis labels */}
      <text
        x={center + radius + 15}
        y={center}
        textAnchor="start"
        dominantBaseline="middle"
        fill="rgba(157, 78, 221, 0.8)"
        fontSize="11"
        fontWeight="600"
      >
        Warm
      </text>
      <text
        x={center - radius - 15}
        y={center}
        textAnchor="end"
        dominantBaseline="middle"
        fill="rgba(157, 78, 221, 0.8)"
        fontSize="11"
        fontWeight="600"
      >
        Cold
      </text>
      <text
        x={center}
        y={center - radius - 15}
        textAnchor="middle"
        dominantBaseline="auto"
        fill="rgba(157, 78, 221, 0.8)"
        fontSize="11"
        fontWeight="600"
      >
        Dominant
      </text>
      <text
        x={center}
        y={center + radius + 15}
        textAnchor="middle"
        dominantBaseline="hanging"
        fill="rgba(157, 78, 221, 0.8)"
        fontSize="11"
        fontWeight="600"
      >
        Submissive
      </text>
    </svg>
  );
}
