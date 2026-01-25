// src/components/destiny-map/fun-insights/tabs/ui/FusionTag.tsx
// Fusion level indicator tag (used in matrix analyses)

import { memo } from 'react';

// Fusion levels and their styles
const FUSION_LEVELS = {
  extreme: 'bg-indigo-500/30 text-indigo-300 border-indigo-500/30',
  amplify: 'bg-blue-500/30 text-blue-300 border-blue-500/30',
  balance: 'bg-gray-500/30 text-gray-300 border-gray-500/30',
  conflict: 'bg-orange-500/30 text-orange-300 border-orange-500/30',
  clash: 'bg-red-500/30 text-red-300 border-red-500/30',
} as const;

// Score-based styles
const SCORE_LEVELS = {
  high: 'bg-green-500/30 text-green-300',
  medium: 'bg-yellow-500/30 text-yellow-300',
  low: 'bg-red-500/30 text-red-300',
} as const;

export type FusionLevel = keyof typeof FUSION_LEVELS;

export interface FusionTagProps {
  /** Fusion level name */
  level?: FusionLevel | string;
  /** Numeric score (0-10) */
  score?: number;
  /** Show score in tag */
  showScore?: boolean;
  /** Additional className */
  className?: string;
}

function FusionTagComponent({
  level,
  score,
  showScore = false,
  className = '',
}: FusionTagProps) {
  // Determine style based on level or score
  let styleClass: string;

  if (level && level in FUSION_LEVELS) {
    styleClass = FUSION_LEVELS[level as FusionLevel];
  } else if (score !== undefined) {
    if (score >= 7) {
      styleClass = SCORE_LEVELS.high;
    } else if (score >= 4) {
      styleClass = SCORE_LEVELS.medium;
    } else {
      styleClass = SCORE_LEVELS.low;
    }
  } else {
    styleClass = FUSION_LEVELS.balance;
  }

  const displayText = level || '';
  const scoreText = showScore && score !== undefined ? ` · ${score}/10` : '';

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${styleClass} ${className}`}>
      {displayText}{scoreText}
    </span>
  );
}

export const FusionTag = memo(FusionTagComponent);
