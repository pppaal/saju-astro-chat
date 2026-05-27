'use client';

import React from 'react';
import type { PersonaAxisKey, PersonaAxisResult } from '@/lib/persona/types';

interface PersonaRadarChartProps {
  axes: Record<PersonaAxisKey, PersonaAxisResult>;
  size?: number;
  showLabels?: boolean;
}

const AXIS_CONFIG: Record<PersonaAxisKey, { angle: number; label: string; labelKo: string; leftPole: string; rightPole: string }> = {
  energy: {
    angle: 0,
    label: 'Energy',
    labelKo: '에너지',
    leftPole: 'Grounded',
    rightPole: 'Radiant',
  },
  cognition: {
    angle: 90,
    label: 'Cognition',
    labelKo: '인지',
    leftPole: 'Structured',
    rightPole: 'Visionary',
  },
  decision: {
    angle: 180,
    label: 'Decision',
    labelKo: '의사결정',
    leftPole: 'Empathic',
    rightPole: 'Logic',
  },
  rhythm: {
    angle: 270,
    label: 'Rhythm',
    labelKo: '리듬',
    leftPole: 'Anchor',
    rightPole: 'Flow',
  },
};

export function PersonaRadarChart({ axes, size = 400, showLabels = true }: PersonaRadarChartProps) {
  const radius = size / 2 - 60;
  const center = size / 2;

  // Convert scores to polygon points
  const axisKeys: PersonaAxisKey[] = ['energy', 'cognition', 'decision', 'rhythm'];
  const points = axisKeys.map((key) => {
    const config = AXIS_CONFIG[key];
    const score = axes[key].score / 100; // Normalize to 0-1
    const angleRad = (config.angle * Math.PI) / 180;
    const r = radius * score;
    const x = center + r * Math.cos(angleRad);
    const y = center + r * Math.sin(angleRad);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={size} height={size} className="persona-radar-chart">
      <defs>
        <radialGradient id="personaGradient" cx="50%" cy="50%">
          <stop offset="0%" stopColor="rgba(66, 153, 225, 0.15)" />
          <stop offset="100%" stopColor="rgba(66, 153, 225, 0.05)" />
        </radialGradient>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(66, 153, 225, 0.8)" />
          <stop offset="100%" stopColor="rgba(159, 122, 234, 0.8)" />
        </linearGradient>
      </defs>

      {/* Background circles */}
      {[0.25, 0.5, 0.75, 1.0].map((scale) => (
        <circle
          key={scale}
          cx={center}
          cy={center}
          r={radius * scale}
          fill="none"
          stroke="rgba(66, 153, 225, 0.1)"
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      {axisKeys.map((key) => {
        const config = AXIS_CONFIG[key];
        const angleRad = (config.angle * Math.PI) / 180;
        const x2 = center + radius * Math.cos(angleRad);
        const y2 = center + radius * Math.sin(angleRad);
        return (
          <line
            key={key}
            x1={center}
            y1={center}
            x2={x2}
            y2={y2}
            stroke="rgba(66, 153, 225, 0.3)"
            strokeWidth="2"
          />
        );
      })}

      {/* Score polygon */}
      <polygon
        points={points}
        fill="url(#personaGradient)"
        stroke="url(#lineGradient)"
        strokeWidth="3"
      />

      {/* Score points */}
      {axisKeys.map((key) => {
        const config = AXIS_CONFIG[key];
        const score = axes[key].score / 100;
        const angleRad = (config.angle * Math.PI) / 180;
        const r = radius * score;
        const x = center + r * Math.cos(angleRad);
        const y = center + r * Math.sin(angleRad);

        return (
          <circle
            key={key}
            cx={x}
            cy={y}
            r="6"
            fill="rgba(66, 153, 225, 0.9)"
            stroke="white"
            strokeWidth="2"
          />
        );
      })}

      {/* Axis labels */}
      {showLabels && axisKeys.map((key) => {
        const config = AXIS_CONFIG[key];
        const angleRad = (config.angle * Math.PI) / 180;
        const labelRadius = radius + 40;
        const x = center + labelRadius * Math.cos(angleRad);
        const y = center + labelRadius * Math.sin(angleRad);

        return (
          <g key={key}>
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(66, 153, 225, 0.9)"
              fontSize="13"
              fontWeight="600"
            >
              {config.label}
            </text>
            <text
              x={x}
              y={y + 16}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(66, 153, 225, 0.7)"
              fontSize="11"
            >
              {axes[key].pole === config.rightPole.toLowerCase() ? config.rightPole : config.leftPole}
            </text>
            <text
              x={x}
              y={y + 30}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(66, 153, 225, 0.6)"
              fontSize="10"
            >
              {axes[key].score}%
            </text>
          </g>
        );
      })}

      {/* Center point */}
      <circle cx={center} cy={center} r="5" fill="rgba(66, 153, 225, 0.5)" />
    </svg>
  );
}
