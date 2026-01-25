// src/components/destiny-map/fun-insights/tabs/ui/ScoreBar.tsx
// Reusable score display with progress bar

import { memo } from 'react';

// Gradient presets for progress bars
const BAR_GRADIENTS = {
  purple: 'from-purple-500 to-purple-400',
  pink: 'from-pink-500 to-rose-400',
  fuchsia: 'from-fuchsia-500 to-pink-400',
  violet: 'from-violet-500 to-purple-400',
  indigo: 'from-indigo-500 to-blue-400',
  amber: 'from-amber-500 to-yellow-400',
  orange: 'from-orange-500 to-amber-400',
  yellow: 'from-yellow-500 to-amber-400',
  red: 'from-red-500 to-rose-400',
  emerald: 'from-emerald-500 to-green-400',
  green: 'from-green-500 to-emerald-400',
  teal: 'from-teal-500 to-cyan-400',
  cyan: 'from-cyan-500 to-blue-400',
  blue: 'from-blue-500 to-indigo-400',
  // Dynamic based on score
  vitality: 'dynamic',
} as const;

const TEXT_COLORS = {
  purple: 'text-purple-300',
  pink: 'text-pink-300',
  fuchsia: 'text-fuchsia-300',
  violet: 'text-violet-300',
  indigo: 'text-indigo-300',
  amber: 'text-amber-300',
  orange: 'text-orange-300',
  yellow: 'text-yellow-300',
  red: 'text-red-300',
  emerald: 'text-emerald-300',
  green: 'text-green-300',
  teal: 'text-teal-300',
  cyan: 'text-cyan-300',
  blue: 'text-blue-300',
  vitality: 'text-emerald-400',
} as const;

const SCORE_COLORS = {
  purple: 'text-purple-400',
  pink: 'text-pink-400',
  fuchsia: 'text-fuchsia-400',
  violet: 'text-violet-400',
  indigo: 'text-indigo-400',
  amber: 'text-amber-400',
  orange: 'text-orange-400',
  yellow: 'text-yellow-400',
  red: 'text-red-400',
  emerald: 'text-emerald-400',
  green: 'text-green-400',
  teal: 'text-teal-400',
  cyan: 'text-cyan-400',
  blue: 'text-blue-400',
  vitality: 'text-emerald-400',
} as const;

export type BarTheme = keyof typeof BAR_GRADIENTS;

export interface ScoreBarProps {
  /** Score value (0-100) */
  score: number;
  /** Maximum score (default: 100) */
  maxScore?: number;
  /** Label text */
  label?: string;
  /** Icon/emoji before label */
  icon?: string;
  /** Color theme */
  theme?: BarTheme;
  /** Unit suffix (e.g., "점", "pts", "/10") */
  unit?: string;
  /** Description text below the bar */
  description?: string;
  /** Height of the bar (default: 3 = h-3) */
  height?: 2 | 3 | 4;
  /** Show score number */
  showScore?: boolean;
  /** Additional className for container */
  className?: string;
}

function ScoreBarComponent({
  score,
  maxScore = 100,
  label,
  icon,
  theme = 'purple',
  unit = '',
  description,
  height = 3,
  showScore = true,
  className = '',
}: ScoreBarProps) {
  const percentage = Math.min(100, Math.max(0, (score / maxScore) * 100));

  // Get dynamic vitality gradient based on score
  const getVitalityGradient = (value: number) => {
    if (value >= 80) return 'from-green-500 to-emerald-400';
    if (value >= 60) return 'from-yellow-500 to-amber-400';
    if (value >= 40) return 'from-orange-500 to-amber-500';
    return 'from-red-500 to-rose-400';
  };

  const gradientClass = theme === 'vitality'
    ? getVitalityGradient(percentage)
    : BAR_GRADIENTS[theme];

  const heightClass = height === 2 ? 'h-2' : height === 4 ? 'h-4' : 'h-3';
  const labelColorClass = TEXT_COLORS[theme];
  const scoreColorClass = SCORE_COLORS[theme];

  return (
    <div className={`${className}`}>
      {(label || showScore) && (
        <div className="flex items-center justify-between mb-2">
          {label && (
            <p className={`${labelColorClass} font-bold text-sm flex items-center gap-2`}>
              {icon && <span>{icon}</span>}
              {label}
            </p>
          )}
          {showScore && (
            <span className={`text-2xl font-bold ${scoreColorClass}`}>
              {score}
              {unit && <span className="text-lg opacity-70">{unit}</span>}
            </span>
          )}
        </div>
      )}

      <div className={`${heightClass} bg-gray-800/50 rounded-full overflow-hidden`}>
        <div
          className={`h-full rounded-full bg-gradient-to-r ${gradientClass} transition-all duration-700`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {description && (
        <p className="text-gray-300 text-sm leading-relaxed mt-2">
          {description}
        </p>
      )}
    </div>
  );
}

export const ScoreBar = memo(ScoreBarComponent);
