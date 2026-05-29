'use client'

/**
 * Hexagonal "dp" badge — used as the home hero ornament and the splash
 * mark. SVG-only so the gradient renders identically on every browser
 * (CSS background-clip: text was unreliable on some Android/WebView
 * builds).
 *
 * Variants:
 *   default  — flat gradient hex with a "dp" mark
 *   pulse    — adds a soft scale pulse (subtle splash idle)
 *   epic     — full cinematic mark: rotating ring, orbital sparkles,
 *              halo glow, hue-cycling gradient. Used on the splash.
 */

interface HexDPLogoProps {
  /** Pixel size of the bounding box. The SVG is square-ish (64×72). */
  size?: number
  /** Add a slow halo pulse around the badge. */
  pulse?: boolean
  /** Cinematic mode — rotating ring, orbiting sparkles, hue cycle. */
  epic?: boolean
}

export default function HexDPLogo({ size = 64, pulse = false, epic = false }: HexDPLogoProps) {
  const w = size
  const h = (size * 72) / 64
  // Epic mode renders rings + sparkles outside the hex, so we extend
  // the viewBox in that mode and grow the SVG box proportionally.
  // Non-epic stays tight to the hex (preserves existing layouts).
  const viewBox = epic ? '-20 -20 104 112' : '0 0 64 72'
  const renderW = epic ? w + (size * 40) / 64 : w
  const renderH = epic ? h + (size * 40) / 64 : h
  const tag = epic ? 'epic' : pulse ? 'splash' : 'home'
  const gid = `hexdp-grad-${tag}`
  const haloId = `hexdp-halo-${tag}`
  return (
    <svg
      viewBox={viewBox}
      width={renderW}
      height={renderH}
      role="img"
      aria-label="DestinyPal"
      style={pulse || epic ? { animation: 'hexdp-pulse 2.4s ease-in-out infinite' } : undefined}
    >
      <defs>
        {/* 골드 그라데이션 — design tokens 정렬. 옛 cyan/violet (#63d2ff,
            #a78bfa, #8b5cf6, #7c3aed) 폐기. */}
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e8cc8a" />
          <stop offset="50%" stopColor="#d4b572" />
          <stop offset="100%" stopColor="#a07a3c" />
        </linearGradient>
        <radialGradient id={haloId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e8cc8a" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#a07a3c" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#0a0d1f" stopOpacity="0" />
        </radialGradient>
      </defs>

      {epic && (
        <>
          {/* Outer halo glow */}
          <circle cx="32" cy="36" r="56" fill={`url(#${haloId})`}>
            <animate
              attributeName="r"
              values="50;58;50"
              dur="3.2s"
              repeatCount="indefinite"
            />
          </circle>
          {/* Rotating dashed gradient ring */}
          <g style={{ transformOrigin: '32px 36px', animation: 'hexdp-spin 9s linear infinite' }}>
            <circle
              cx="32"
              cy="36"
              r="44"
              fill="none"
              stroke={`url(#${gid})`}
              strokeWidth="1.2"
              strokeDasharray="2 6"
              opacity="0.85"
            />
          </g>
          {/* Counter-rotating thin ring — gold */}
          <g style={{ transformOrigin: '32px 36px', animation: 'hexdp-spin-rev 14s linear infinite' }}>
            <circle
              cx="32"
              cy="36"
              r="50"
              fill="none"
              stroke="#d4b572"
              strokeWidth="0.5"
              strokeDasharray="1 3"
              opacity="0.6"
            />
          </g>
          {/* Orbital sparkles — 골드 톤 */}
          <g style={{ transformOrigin: '32px 36px', animation: 'hexdp-spin 6s linear infinite' }}>
            <circle cx="32" cy="-14" r="1.8" fill="#fff8e1" />
            <circle cx="78" cy="36" r="1.4" fill="#d4b572" />
            <circle cx="32" cy="86" r="1.2" fill="#e8cc8a" />
            <circle cx="-14" cy="36" r="1.6" fill="#fff8e1" />
          </g>
        </>
      )}

      {/* Outer hex (gradient) — slightly inset so the dp wordmark
          gets a more even bezel and the hex frame reads quieter. */}
      <polygon points="32,5 59,21 59,51 32,67 5,51 5,21" fill={`url(#${gid})`} />
      {/* Inner dark plate */}
      <polygon points="32,9 56,23 56,49 32,63 8,49 8,23" fill="#0a0d1f" />
      {/* "dp" text in matching gradient — geometric center of the hex
          is (32, 36); a slight upward nudge compensates for the "p"
          descender so the wordmark looks optically centered. */}
      <text
        x="32"
        y="33"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
        fontWeight={800}
        fontSize="26"
        letterSpacing="-0.03em"
        fill={`url(#${gid})`}
      >
        dp
      </text>

      {(pulse || epic) && (
        <style>{`
          @keyframes hexdp-pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50%      { opacity: 0.94; transform: scale(0.98); }
          }
          @keyframes hexdp-spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          @keyframes hexdp-spin-rev {
            from { transform: rotate(0deg); }
            to   { transform: rotate(-360deg); }
          }
        `}</style>
      )}
    </svg>
  )
}
