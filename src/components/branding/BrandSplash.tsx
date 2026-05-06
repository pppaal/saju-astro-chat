'use client'

import HexDPLogo from './HexDPLogo'

interface BrandSplashProps {
  /** Optional caption under the wordmark — defaults to "Loading…". */
  message?: string
  /** Pixel size of the hex badge. */
  size?: number
}

/**
 * Branded splash used by every route-level `loading.tsx`. Cinematic
 * stage with deep-space gradient, drifting nebula glow, the epic hex
 * mark with halo + rotating rings, the DestinyPal wordmark, and a
 * glide bar underneath. Renders fixed-position so it covers the
 * viewport regardless of parent layout.
 */
export default function BrandSplash({ message, size = 120 }: BrandSplashProps) {
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
        background:
          'radial-gradient(ellipse at 50% 35%, #2b1d5c 0%, #14123a 40%, #06081a 75%, #02030a 100%)',
        color: '#e9ecff',
        padding: '2rem',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
        zIndex: 50,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 30% 40%, rgba(99, 210, 255, 0.18), transparent 45%), radial-gradient(circle at 70% 60%, rgba(167, 139, 250, 0.22), transparent 50%)',
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
          background: 'linear-gradient(135deg, #63d2ff 0%, #a78bfa 50%, #8b5cf6 100%)',
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
            fontSize: '0.9rem',
            color: 'rgba(220, 215, 255, 0.78)',
            letterSpacing: '0.02em',
          }}
        >
          {message}
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
          background: 'linear-gradient(90deg, transparent, #a78bfa, transparent)',
          animation: 'splash-glide 1.4s ease-in-out infinite',
        }}
      />

      <style>{`
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
