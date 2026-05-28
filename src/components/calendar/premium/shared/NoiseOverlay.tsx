/**
 * 미세 노이즈 SVG overlay — hero 카드 깊이감용. 1-2% opacity grain texture.
 *
 *   <div className="relative ...">
 *     <NoiseOverlay opacity={0.025} />
 *     ...
 *   </div>
 */

interface Props {
  /** 0-1 (0.02-0.04 권장) */
  opacity?: number
  /** 모서리 둥글기 동기화 — rounded-2xl 대응 */
  className?: string
}

export default function NoiseOverlay({ opacity = 0.025, className = 'rounded-2xl' }: Props) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${className} mix-blend-overlay`}
      style={{
        opacity,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }}
    />
  )
}
