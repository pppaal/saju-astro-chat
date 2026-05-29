/**
 * Shared styles for GlobalHeader components
 */

export const styles = {
  buttonBase: `
    transition-all duration-200
    focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
  `,
  blueButton: `
    bg-blue-400/15 text-blue-200
    hover:bg-blue-400/25
    focus-visible:ring-blue-400
  `,
  redButton: `
    bg-red-500/15 text-red-400
    hover:bg-red-500/25
    focus-visible:ring-red-400
  `,
  header:
    'fixed top-4 inset-x-4 z-[var(--z-sticky-header)] flex items-center justify-between gap-2 pointer-events-none',
  headerSlotLeft: 'flex items-center gap-2 pointer-events-auto',
  headerSlotRight: 'flex flex-col items-end gap-2 pointer-events-auto',
} as const
