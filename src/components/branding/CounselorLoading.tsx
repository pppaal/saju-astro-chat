'use client'

import HexDPLogo from './HexDPLogo'

/**
 * Continuity loader shared by the home page and the counselor chat routes
 * (destiny / compatibility). Unlike {@link BrandSplash} — the cinematic
 * deep-space splash used elsewhere — this one is deliberately calm: a flat
 * warm-white surface matching both the premium-white home (`#fafaf9`) and
 * the counselor light theme (`--ds-light-bg`), with the same hex mark that
 * sits in the home hero, slowly rotating in the centre.
 *
 * The point is continuity in BOTH directions. Home and counselor look
 * nearly identical, so when you cross between them the background colour
 * never changes and the same DP mark just spins in place until the
 * destination page is ready — then it's gone. The route transition reads
 * as the page settling rather than a separate loading screen flashing in
 * between ("로딩 걸린지도 모르게").
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
          // Slow spin + subtle breathe so the mark reads as "working" while
          // the destination loads, then unmounts when the page is ready.
          animation: 'counselor-loading-spin 1.6s linear infinite',
        }}
      >
        <HexDPLogo size={72} />
      </div>

      <style>{`
        @keyframes counselor-loading-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
}
