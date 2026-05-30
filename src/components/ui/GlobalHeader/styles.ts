/**
 * Shared styles for GlobalHeader components
 */

export const styles = {
  buttonBase: `
    transition-all duration-200
    focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
  `,
  /* 옛 옛 옛 blueButton 변형 — 옛 blue/violet 톤 폐기 후 골드 토큰으로 정렬.
     이름은 호환을 위해 유지 (consumers 안 깨짐). */
  blueButton: `
    bg-[rgba(212,181,114,0.15)] text-[#e8cc8a]
    hover:bg-[rgba(212,181,114,0.25)]
    focus-visible:ring-[#d4b572]
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
