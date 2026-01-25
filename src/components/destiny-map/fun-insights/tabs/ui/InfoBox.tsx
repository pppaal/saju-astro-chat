// src/components/destiny-map/fun-insights/tabs/ui/InfoBox.tsx
// Small info box component with icon, label, and content

import { memo, type ReactNode } from 'react';

// Color variants for info boxes
const BOX_VARIANTS = {
  purple: 'bg-purple-500/10 border-purple-500/20 text-purple-300',
  pink: 'bg-pink-500/10 border-pink-500/20 text-pink-300',
  rose: 'bg-rose-500/10 border-rose-500/20 text-rose-300',
  fuchsia: 'bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-300',
  violet: 'bg-violet-500/10 border-violet-500/20 text-violet-300',
  indigo: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300',
  amber: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
  orange: 'bg-orange-500/10 border-orange-500/20 text-orange-300',
  yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300',
  red: 'bg-red-500/10 border-red-500/20 text-red-300',
  emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
  green: 'bg-green-500/10 border-green-500/20 text-green-300',
  teal: 'bg-teal-500/10 border-teal-500/20 text-teal-300',
  cyan: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300',
  blue: 'bg-blue-500/10 border-blue-500/20 text-blue-300',
  sky: 'bg-sky-500/10 border-sky-500/20 text-sky-300',
  gray: 'bg-gray-500/10 border-gray-500/20 text-gray-300',
  // Gradient variants
  'gradient-purple': 'bg-gradient-to-r from-purple-500/10 to-violet-500/10 border-purple-500/20 text-purple-200',
  'gradient-pink': 'bg-gradient-to-r from-pink-500/10 to-rose-500/10 border-pink-500/20 text-pink-200',
  'gradient-amber': 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20 text-amber-200',
  'gradient-emerald': 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-200',
  'gradient-blue': 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20 text-blue-200',
} as const;

export type BoxVariant = keyof typeof BOX_VARIANTS;

export interface InfoBoxProps {
  /** Icon (emoji or component) */
  icon?: string | ReactNode;
  /** Label/title */
  label?: string;
  /** Content text or children */
  children: ReactNode;
  /** Color variant */
  variant?: BoxVariant;
  /** Custom className */
  className?: string;
  /** Minimum height (for grid alignment) */
  minHeight?: boolean;
}

function InfoBoxComponent({
  icon,
  label,
  children,
  variant = 'purple',
  className = '',
  minHeight = false,
}: InfoBoxProps) {
  const variantClass = BOX_VARIANTS[variant];
  const minHeightClass = minHeight ? 'min-h-[100px]' : '';

  return (
    <div className={`p-4 rounded-xl border ${variantClass} ${minHeightClass} ${className}`}>
      {label && (
        <p className="font-bold mb-2 text-sm flex items-center gap-2">
          {icon && (typeof icon === 'string' ? <span>{icon}</span> : icon)}
          {label}
        </p>
      )}
      {typeof children === 'string' ? (
        <p className="text-gray-300 text-sm leading-relaxed">{children}</p>
      ) : (
        children
      )}
    </div>
  );
}

export const InfoBox = memo(InfoBoxComponent);
