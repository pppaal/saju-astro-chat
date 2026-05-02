'use client'

/**
 * Couple Elements Donut — two persons' 5행 distributions overlaid as
 * concentric rings. Inner ring = person 1, outer ring = person 2.
 * Pure SVG, no external deps. Surfaces 5행 보완 visually so users
 * SEE that "한쪽이 부족한 결을 상대가 채워준다."
 */

import { memo } from 'react'

interface ElementCounts {
  wood?: number
  fire?: number
  earth?: number
  metal?: number
  water?: number
}

interface CoupleElementsDonutProps {
  p1: ElementCounts
  p2: ElementCounts
  p1Name: string
  p2Name: string
  size?: number
}

const ELEMENTS = [
  { key: 'wood' as const, ko: '목', color: '#22c55e' },
  { key: 'fire' as const, ko: '화', color: '#ef4444' },
  { key: 'earth' as const, ko: '토', color: '#eab308' },
  { key: 'metal' as const, ko: '금', color: '#cbd5e1' },
  { key: 'water' as const, ko: '수', color: '#3b82f6' },
]

interface RingSegment {
  el: (typeof ELEMENTS)[number]
  value: number
  dasharray: string
  dashoffset: number
}

function buildSegments(
  counts: ElementCounts,
  radius: number
): { segments: RingSegment[]; total: number } {
  const vals = ELEMENTS.map((e) => Math.max(0, counts[e.key] || 0))
  const total = vals.reduce((a, b) => a + b, 0) || 1
  const circ = 2 * Math.PI * radius
  let offset = 0
  const segments: RingSegment[] = ELEMENTS.map((el, i) => {
    const value = vals[i]
    const length = (value / total) * circ
    const seg: RingSegment = {
      el,
      value,
      dasharray: `${length} ${circ - length}`,
      dashoffset: -offset,
    }
    offset += length
    return seg
  })
  return { segments, total }
}

export const CoupleElementsDonut = memo(function CoupleElementsDonut({
  p1,
  p2,
  p1Name,
  p2Name,
  size = 220,
}: CoupleElementsDonutProps) {
  const cx = size / 2
  const cy = size / 2
  const outerR = size / 2 - 18 // p2 ring
  const innerR = size / 2 - 42 // p1 ring
  const stroke = 14

  const p1Build = buildSegments(p1, innerR)
  const p2Build = buildSegments(p2, outerR)

  // Identify complementary elements (one weak + other strong)
  const complementary: string[] = []
  for (const el of ELEMENTS) {
    const v1 = p1[el.key] || 0
    const v2 = p2[el.key] || 0
    if (v1 <= 1 && v2 >= 3) complementary.push(`${el.ko}는 ${p2Name}이 채워줘요`)
    else if (v2 <= 1 && v1 >= 3) complementary.push(`${el.ko}는 ${p1Name}이 채워줘요`)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Outer ring background (p2) */}
          <circle
            cx={cx}
            cy={cy}
            r={outerR}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={stroke}
          />
          {/* Inner ring background (p1) */}
          <circle
            cx={cx}
            cy={cy}
            r={innerR}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={stroke}
          />

          {/* P2 outer ring segments */}
          <g transform={`rotate(-90 ${cx} ${cy})`}>
            {p2Build.segments.map((s) =>
              s.value > 0 ? (
                <circle
                  key={`p2-${s.el.key}`}
                  cx={cx}
                  cy={cy}
                  r={outerR}
                  fill="none"
                  stroke={s.el.color}
                  strokeWidth={stroke}
                  strokeDasharray={s.dasharray}
                  strokeDashoffset={s.dashoffset}
                  strokeLinecap="butt"
                  style={{
                    filter: `drop-shadow(0 0 6px ${s.el.color}40)`,
                    transition: 'stroke-dasharray 0.6s ease',
                  }}
                />
              ) : null
            )}
          </g>

          {/* P1 inner ring segments */}
          <g transform={`rotate(-90 ${cx} ${cy})`}>
            {p1Build.segments.map((s) =>
              s.value > 0 ? (
                <circle
                  key={`p1-${s.el.key}`}
                  cx={cx}
                  cy={cy}
                  r={innerR}
                  fill="none"
                  stroke={s.el.color}
                  strokeWidth={stroke}
                  strokeDasharray={s.dasharray}
                  strokeDashoffset={s.dashoffset}
                  strokeLinecap="butt"
                  style={{
                    filter: `drop-shadow(0 0 6px ${s.el.color}40)`,
                    transition: 'stroke-dasharray 0.6s ease',
                  }}
                />
              ) : null
            )}
          </g>

          {/* Center label */}
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            className="fill-white"
            style={{ fontSize: 11, fontWeight: 500, letterSpacing: 1 }}
          >
            5행 분포
          </text>
          <text
            x={cx}
            y={cy + 10}
            textAnchor="middle"
            style={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }}
          >
            안쪽 {p1Name} · 바깥 {p2Name}
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-2 text-[11px]">
        {ELEMENTS.map((el) => {
          const v1 = p1[el.key] || 0
          const v2 = p2[el.key] || 0
          const total = v1 + v2
          return (
            <span
              key={el.key}
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1"
              style={{
                borderColor: total > 0 ? el.color + '60' : 'rgba(255,255,255,0.1)',
                background: total > 0 ? el.color + '15' : 'rgba(255,255,255,0.03)',
                color: total > 0 ? '#fff' : 'rgba(255,255,255,0.4)',
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: el.color }}
                aria-hidden
              />
              {el.ko} {v1}·{v2}
            </span>
          )
        })}
      </div>

      {/* Complementary insight */}
      {complementary.length > 0 && (
        <p className="max-w-md text-center text-[12.5px] leading-relaxed text-slate-300">
          {complementary.slice(0, 2).join(' · ')}
        </p>
      )}
    </div>
  )
})
