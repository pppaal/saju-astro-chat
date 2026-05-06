import HexDPLogo from '@/components/branding/HexDPLogo'

/**
 * Home splash — shown while the home route streams in (and is what
 * the PWA shows briefly when the app is launched fresh). Branded with
 * the same hex DP badge users see in their launcher.
 */
export default function Loading() {
  return (
    <main
      style={{
        minHeight: '100svh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.25rem',
        background:
          'radial-gradient(ellipse at top, #1a1538 0%, #0a0d1f 55%, #03060d 100%)',
        color: '#e9ecff',
        padding: '2rem',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
      }}
    >
      <HexDPLogo size={96} pulse />
      <div
        style={{
          fontSize: '1.05rem',
          fontWeight: 700,
          letterSpacing: '0.02em',
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
          width: 28,
          height: 2,
          borderRadius: 2,
          background: 'linear-gradient(90deg, transparent, #a78bfa, transparent)',
          animation: 'splash-glide 1.4s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes splash-glide {
          0%, 100% { transform: translateX(-12px); opacity: 0.4; }
          50%      { transform: translateX(12px);  opacity: 1;   }
        }
      `}</style>
    </main>
  )
}
