import HexDPLogo from '@/components/branding/HexDPLogo'

/**
 * Home splash — shown while the home route streams in (and is what
 * the PWA shows briefly when the app is launched fresh). Cinematic
 * stage: deep-space radial bg, drifting nebula glow, the epic hex
 * mark with its rotating ring + orbital sparkles + halo, gradient
 * wordmark, and a glide bar underneath.
 */
export default function Loading() {
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
        gap: '1.5rem',
        background:
          'radial-gradient(ellipse at 50% 35%, #2b1d5c 0%, #14123a 40%, #06081a 75%, #02030a 100%)',
        color: '#e9ecff',
        padding: '2rem',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Drifting nebula glow behind the badge */}
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
        <HexDPLogo size={128} epic />
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          fontSize: '1.25rem',
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
