'use client'

import HexDPLogo from './HexDPLogo'

/**
 * Quiet, near-invisible loader for the counselor chat routes
 * (destiny / compatibility). Unlike {@link BrandSplash} — the cinematic
 * deep-space splash used elsewhere — this one is deliberately calm: a flat
 * warm-white surface matching both the premium-white home (`#fafaf9`) and
 * the counselor light theme (`--ds-light-bg`), with the same hex mark that
 * sits in the home hero, gently breathing.
 *
 * The point is continuity: when you tap "ask" on the home screen, the
 * background colour never changes and the same logo stays centred, so the
 * route transition reads as the page settling rather than a separate
 * loading screen flashing in between ("로딩 걸린지도 모르게").
 */
export default function CounselorLoading() {
  return (
    <main
      style={{
        position: 'fixed',
        inset: 0,
        minHeight: '100svh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Matches the counselor lightTheme surface so loading → chat is an
        // exact colour match, and the premium-white home (#fafaf9) is a
        // 1-point difference — imperceptible.
        background: '#faf9f7',
        zIndex: 50,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          // Same footprint as the home hero ornament (.homeOrnament, 72px)
          // so the mark doesn't jump when navigating in.
          width: 72,
          height: 81,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          filter: 'drop-shadow(0 8px 24px rgba(212, 181, 114, 0.25))',
          animation: 'counselor-loading-breathe 1.8s ease-in-out infinite',
        }}
      >
        <HexDPLogo size={72} />
      </div>

      <style>{`
        @keyframes counselor-loading-breathe {
          0%, 100% { opacity: 0.55; transform: scale(0.98); }
          50%      { opacity: 1;    transform: scale(1); }
        }
      `}</style>
    </main>
  )
}
