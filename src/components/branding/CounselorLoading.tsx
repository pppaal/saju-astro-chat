'use client'

/**
 * Continuity loader shared by the home page and the counselor chat routes
 * (destiny / compatibility). Unlike {@link BrandSplash} — the cinematic
 * deep-space splash used elsewhere — this one is deliberately invisible: a
 * flat warm-white surface matching both the premium-white home (`#fafaf9`)
 * and the counselor light theme (`--ds-light-bg`), with NO spinner.
 *
 * The point is continuity in BOTH directions. Home and counselor look
 * nearly identical, so when you cross between them the background colour
 * never changes and there's no separate "loading screen" — the only motion
 * is the shared View Transition morphing the input box (and the top bar)
 * from home into the chat. The transition reads as the destination settling
 * in, not a loader flashing between pages ("로딩페이지 없이 자연스럽게").
 *
 * `showChatChrome` draws placeholders at the destination's header / bottom
 * input positions (same viewTransitionName) so the home input morphs to the
 * chat input and the header slides in instead of popping.
 */
export default function CounselorLoading({ showChatChrome = false }: { showChatChrome?: boolean }) {
  return (
    <main
      style={{
        position: 'fixed',
        inset: 0,
        minHeight: '100svh',
        // Matches the counselor lightTheme surface so loading → chat is an
        // exact colour match, and the premium-white home (#fafaf9) is a
        // 1-point difference — imperceptible.
        background: '#faf9f7',
        zIndex: 50,
      }}
    >
      {/* 채팅 크롬 플레이스홀더 — 메인 입력창 → 상담사 입력창 View Transition 이
          끊기지 않게, 목적지(상담사)와 같은 위치·이름의 상단 헤더 / 하단 입력창
          자리를 미리 그려둔다. 입력창은 중앙(홈)에서 하단으로 이어지고, 헤더는
          제자리에 머물러 "툭 나타나는" 흰 헤더를 없앤다. showChatChrome 가 true
          인 상담사 로더에서만 그린다. */}
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
    </main>
  )
}
