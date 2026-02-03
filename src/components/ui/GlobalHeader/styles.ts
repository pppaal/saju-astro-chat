/**
 * Shared styles for GlobalHeader components
 */

export const styles = {
  buttonBase: `
    transition-all duration-200
    focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
  `,
  blueButton: `
    bg-blue-400/15 border border-blue-400/30 text-blue-200
    hover:bg-blue-400/25 hover:border-blue-400/50
    focus-visible:ring-blue-400
  `,
  redButton: `
    bg-red-500/15 border border-red-500/30 text-red-400
    hover:bg-red-500/25 hover:border-red-500/50
    focus-visible:ring-red-400
  `,
  header: 'fixed top-4 right-4 z-[9999] flex flex-col items-end gap-2',
} as const
