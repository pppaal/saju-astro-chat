// src/components/destiny-map/fun-insights/tabs/ui/InsightCard.tsx
// Reusable card component for insight sections

import { memo, type ReactNode } from 'react';

// Color theme presets for gradient backgrounds
const COLOR_THEMES = {
  // Primary colors
  purple: 'from-slate-900/80 to-purple-900/20 border-purple-500/30',
  pink: 'from-slate-900/80 to-pink-900/20 border-pink-500/30',
  rose: 'from-rose-900/30 to-pink-900/30 border-rose-500/30',
  fuchsia: 'from-slate-900/80 to-fuchsia-900/20 border-fuchsia-500/30',
  violet: 'from-violet-900/40 to-purple-900/40 border-violet-500/30',
  indigo: 'from-indigo-900/40 to-purple-900/40 border-indigo-400/50',

  // Warm colors
  amber: 'from-slate-900/80 to-amber-900/20 border-amber-500/30',
  orange: 'from-slate-900/80 to-orange-900/20 border-orange-500/30',
  yellow: 'from-slate-900/80 to-yellow-900/20 border-yellow-500/30',
  red: 'from-slate-900/80 to-red-900/20 border-red-500/30',

  // Cool colors
  emerald: 'from-slate-900/80 to-emerald-900/20 border-emerald-500/30',
  green: 'from-slate-900/80 to-green-900/20 border-green-500/30',
  teal: 'from-teal-900/40 to-cyan-900/40 border-teal-500/30',
  cyan: 'from-slate-900/80 to-cyan-900/20 border-cyan-500/30',
  blue: 'from-slate-900/80 to-blue-900/20 border-blue-500/30',
  sky: 'from-slate-900/80 to-sky-900/20 border-sky-500/30',

  // Neutral
  slate: 'from-slate-900/80 to-slate-800/80 border-slate-700/50',
  gray: 'from-slate-900/80 to-gray-900/50 border-gray-600/30',
} as const;

export type ColorTheme = keyof typeof COLOR_THEMES;

export interface InsightCardProps {
  /** Icon to display (emoji or component) */
  icon?: string | ReactNode;
  /** Card title */
  title?: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Color theme for gradient background */
  theme?: ColorTheme;
  /** Custom gradient classes (overrides theme) */
  gradient?: string;
  /** Children content */
  children: ReactNode;
  /** Additional className */
  className?: string;
  /** Header right side content (e.g., score) */
  headerRight?: ReactNode;
  /** Hide the header completely */
  hideHeader?: boolean;
  /** Use thicker border (2px) */
  thickBorder?: boolean;
}

function InsightCardComponent({
  icon,
  title,
  subtitle,
  theme = 'purple',
  gradient,
  children,
  className = '',
  headerRight,
  hideHeader = false,
  thickBorder = false,
}: InsightCardProps) {
  const gradientClasses = gradient || COLOR_THEMES[theme];
  const borderWidth = thickBorder ? 'border-2' : 'border';

  return (
    <div className={`rounded-2xl bg-gradient-to-br ${gradientClasses} ${borderWidth} p-6 ${className}`}>
      {!hideHeader && (title || icon) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {icon && (
              typeof icon === 'string'
                ? <span className="text-2xl">{icon}</span>
                : icon
            )}
            <div>
              {title && (
                <h3 className="text-lg font-bold" style={{
                  color: getThemeTextColor(theme)
                }}>
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-gray-400 text-xs">{subtitle}</p>
              )}
            </div>
          </div>
          {headerRight}
        </div>
      )}
      {children}
    </div>
  );
}

// Helper to get appropriate text color for each theme
function getThemeTextColor(theme: ColorTheme): string {
  const colors: Record<ColorTheme, string> = {
    purple: '#d8b4fe', // purple-300
    pink: '#f9a8d4', // pink-300
    rose: '#fda4af', // rose-300
    fuchsia: '#f0abfc', // fuchsia-300
    violet: '#c4b5fd', // violet-300
    indigo: '#a5b4fc', // indigo-300
    amber: '#fcd34d', // amber-300
    orange: '#fdba74', // orange-300
    yellow: '#fde047', // yellow-300
    red: '#fca5a5', // red-300
    emerald: '#6ee7b7', // emerald-300
    green: '#86efac', // green-300
    teal: '#5eead4', // teal-300
    cyan: '#67e8f9', // cyan-300
    blue: '#93c5fd', // blue-300
    sky: '#7dd3fc', // sky-300
    slate: '#cbd5e1', // slate-300
    gray: '#d1d5db', // gray-300
  };
  return colors[theme];
}

export const InsightCard = memo(InsightCardComponent);
