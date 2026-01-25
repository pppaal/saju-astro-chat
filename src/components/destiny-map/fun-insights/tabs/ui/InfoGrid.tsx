// src/components/destiny-map/fun-insights/tabs/ui/InfoGrid.tsx
// Grid layout for info boxes

import { memo, type ReactNode } from 'react';

export interface InfoGridProps {
  /** Number of columns (1, 2, or 3) */
  cols?: 1 | 2 | 3;
  /** Gap size */
  gap?: 2 | 3 | 4;
  /** Children (typically InfoBox components) */
  children: ReactNode;
  /** Additional className */
  className?: string;
}

function InfoGridComponent({
  cols = 2,
  gap = 3,
  children,
  className = '',
}: InfoGridProps) {
  const colsClass = cols === 1
    ? 'grid-cols-1'
    : cols === 3
    ? 'grid-cols-1 md:grid-cols-3'
    : 'grid-cols-1 md:grid-cols-2';

  const gapClass = gap === 2 ? 'gap-2' : gap === 4 ? 'gap-4' : 'gap-3';

  return (
    <div className={`grid ${colsClass} ${gapClass} ${className}`}>
      {children}
    </div>
  );
}

export const InfoGrid = memo(InfoGridComponent);
