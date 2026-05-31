'use client'

import HexDPLogo from './HexDPLogo'

interface BrandSplashProps {
  /** Optional caption under the wordmark — defaults to "Loading…". */
  message?: string
  /** Optional secondary line under the message. */
  submessage?: string
  /** Pixel size of the hex badge. */
  size?: number
  /**
   * 배경 톤 — 'light' 면 다음 페이지가 흰색인 라우트(상담사 채팅 등)에 맞춰
   * 흰 배경 + 어두운 텍스트로. 기본 'dark'(우주 그라데이션). 로딩→실제 페이지
   * 전환 시 배경색이 튀지 않게 다음 페이지 톤과 맞춘다.
   */
  variant?: 'dark' | 'light'
}

/**
 * Branded splash used by every route-level `loading.tsx`. Cinematic
 * stage with deep-space gradient, drifting nebula glow, the epic hex
 * mark with halo + rotating rings, the DestinyPal wordmark, and a
 * glide bar underneath. Renders fixed-position so it covers the
 * viewport regardless of parent layout.
 */
export default function BrandSplash({
  message,
  submessage,
  size = 120,
  variant = 'dark',
}: BrandSplashProps) {
  const isLight = variant === 'light'
  return (
    <main
      style={{
        position: 'fixed',
        inset: 0,
        minHeight: '100svh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.4rem',
        background: isLight
          ? '#fafaf9'
          : 'radial-gradient(ellipse at 50% 35%, #2b1d5c 0%, #14123a 40%, #06081a 75%, #02030a 100%)',
        color: isLight ? '#1c1917' : '#e9ecff',
        padding: '2rem',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
        zIndex: 50,
        // 이전 페이지 위로 천천히 페이드인 — 전/후 페이지 색감이 다를 때
        // (예: 다크 → 화이트) 로딩창이 갑자기 색이 튀지 않고 부드럽게 덮어
        // 들어와 색 전환이 자연스럽게 보인다(사용자 요청). 운명·궁합 채팅은
        // 별도의 CounselorLoading(연속 라이트) 을 써서 이 컴포넌트와 무관.
        animation: 'splash-fade-in 0.5s ease-out',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 30% 40%, rgba(232, 204, 138, 0.18), transparent 45%), radial-gradient(circle at 70% 60%, rgba(212, 181, 114, 0.22), transparent 50%)',
          animation: 'splash-nebula 14s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <HexDPLogo size={size} epic />
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          fontSize: '1.2rem',
          fontWeight: 700,
          letterSpacing: '0.05em',
          background: 'linear-gradient(135deg, #e8cc8a 0%, #d4b572 50%, #a07a3c 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        DestinyPal
      </div>

      {message && (
        <p
          style={{
            position: 'relative',
            zIndex: 1,
            margin: 0,
            fontSize: '0.95rem',
            color: isLight ? 'rgba(28, 25, 23, 0.72)' : 'rgba(232, 226, 255, 0.92)',
            letterSpacing: '0.02em',
            textAlign: 'center',
            maxWidth: '24rem',
          }}
        >
          {message}
        </p>
      )}

      {submessage && (
        <p
          style={{
            position: 'relative',
            zIndex: 1,
            margin: 0,
            marginTop: '-0.4rem',
            fontSize: '0.8rem',
            color: 'rgba(200, 195, 235, 0.65)',
            letterSpacing: '0.01em',
            textAlign: 'center',
            maxWidth: '22rem',
          }}
        >
          {submessage}
        </p>
      )}

      <div
        aria-hidden="true"
        style={{
          position: 'relative',
          zIndex: 1,
          width: 36,
          height: 2,
          borderRadius: 2,
          background: 'linear-gradient(90deg, transparent, #d4b572, transparent)',
          animation: 'splash-glide 1.4s ease-in-out infinite',
        }}
      />

      <style>{`
        @keyframes splash-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes splash-glide {
          0%, 100% { transform: translateX(-14px); opacity: 0.4; }
          50%      { transform: translateX(14px);  opacity: 1;   }
        }
        @keyframes splash-nebula {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.85; }
          50%      { transform: translate(2%, -3%) scale(1.05); opacity: 1; }
        }
      `}</style>
    </main>
  )
}
