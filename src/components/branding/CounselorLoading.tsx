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
export default function CounselorLoading({ showChatChrome = false }: { showChatChrome?: boolean }) {
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
      {/* 채팅 크롬 플레이스홀더 — 메인 입력창 → 상담사 입력창 View Transition 이
          로딩 화면을 거치며 끊기지 않게, 목적지(상담사)와 같은 위치·이름의 상단
          헤더 / 하단 입력창 자리를 미리 그려둔다. 입력창은 중앙(홈)에서 하단으로
          이어지고, 헤더는 제자리에 머물러 "툭 나타나는" 흰 헤더를 없앤다.
          showChatChrome 가 true 인 상담사 로더에서만 — 홈 로더는 가운데 마크만. */}
      {showChatChrome && (
        <>
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 48,
              background: '#ffffff',
              borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
              viewTransitionName: 'app-topbar',
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 8,
              right: 8,
              bottom: 10,
              height: 46,
              background: '#ffffff',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              borderRadius: 14,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              viewTransitionName: 'destiny-input',
            }}
          />
        </>
      )}

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
