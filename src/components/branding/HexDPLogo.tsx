'use client'

/**
 * Hexagonal "dp" badge — replaces the old circular ornament on the home
 * hero and is also reused in the splash loading screen. The geometry is
 * drawn as an SVG so the gradient text + outer hex render identically on
 * every browser (CSS background-clip: text was unreliable on some
 * Android/WebView builds).
 *
 * Animated:
 *   - subtle gradient hue rotation (10s) so the badge feels alive
 *   - soft glow pulse when `pulse` is true (used by the splash screen)
 */

interface HexDPLogoProps {
  /** Pixel size of the bounding box. The SVG is square-ish (64×72). */
  size?: number
  /** Add a slow halo pulse around the badge — used by the splash. */
  pulse?: boolean
}

export default function HexDPLogo({ size = 64, pulse = false }: HexDPLogoProps) {
  const w = size
  const h = (size * 72) / 64
  // Small unique id so multiple badges on one page don't share defs.
  const gid = `hexdp-grad-${pulse ? 'splash' : 'home'}`
  return (
    <svg
      viewBox="0 0 64 72"
      width={w}
      height={h}
      role="img"
      aria-label="DestinyPal"
      style={pulse ? { animation: 'hexdp-pulse 2.4s ease-in-out infinite' } : undefined}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#63d2ff" />
          <stop offset="50%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      {/* Outer hex (gradient) */}
      <polygon points="32,0 64,18 64,54 32,72 0,54 0,18" fill={`url(#${gid})`} />
      {/* Inner dark plate */}
      <polygon points="32,4 60,20 60,52 32,68 4,52 4,20" fill="#0a0d1f" />
      {/* "dp" text in matching gradient */}
      <text
        x="32"
        y="46"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
        fontWeight={800}
        fontSize="22"
        letterSpacing="-0.02em"
        fill={`url(#${gid})`}
      >
        dp
      </text>
      {pulse && (
        <style>{`
          @keyframes hexdp-pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.92; transform: scale(0.98); }
          }
        `}</style>
      )}
    </svg>
  )
}
