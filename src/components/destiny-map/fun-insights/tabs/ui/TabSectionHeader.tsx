// src/components/destiny-map/fun-insights/tabs/ui/TabSectionHeader.tsx
// Section header within tab content

import { memo, type ReactNode } from 'react';

const HEADER_COLORS = {
  purple: 'text-purple-300',
  pink: 'text-pink-300',
  rose: 'text-rose-300',
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
  gray: 'text-gray-300',
} as const;

export type HeaderColor = keyof typeof HEADER_COLORS;

export interface TabSectionHeaderProps {
  /** Icon (emoji) */
  icon?: string;
  /** Title text */
  title: string;
  /** Optional badge/tag text */
  badge?: string;
  /** Color theme */
  color?: HeaderColor;
  /** Additional className */
  className?: string;
  /** Right side content */
  right?: ReactNode;
}

function TabSectionHeaderComponent({
  icon,
  title,
  badge,
  color = 'purple',
  className = '',
  right,
}: TabSectionHeaderProps) {
  const colorClass = HEADER_COLORS[color];

  return (
    <div className={`flex items-center justify-between mb-3 ${className}`}>
      <p className={`${colorClass} font-bold text-sm flex items-center gap-2`}>
        {icon && <span>{icon}</span>}
        {title}
        {badge && (
          <span className={`text-xs px-2 py-0.5 rounded-full bg-${color}-500/20 ${colorClass}`}>
            {badge}
          </span>
        )}
      </p>
      {right}
    </div>
  );
}

export const TabSectionHeader = memo(TabSectionHeaderComponent);
