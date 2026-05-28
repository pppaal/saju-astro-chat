'use client'

import React from 'react'

interface PlanetInput {
  name: string
  longitude: number
}

interface NatalChartProps {
  astro?: {
    planets?: PlanetInput[]
    ascendant?: { longitude?: number }
  }
  lang?: 'ko' | 'en'
}

const ZODIAC_GLYPHS = [
  '♈',
  '♉',
  '♊',
  '♋',
  '♌',
  '♍',
  '♎',
  '♏',
  '♐',
  '♑',
  '♒',
  '♓',
] as const
const SIGN_KO = [
  '양',
  '황소',
  '쌍둥이',
  '게',
  '사자',
  '처녀',
  '천칭',
  '전갈',
  '궁수',
  '염소',
  '물병',
  '물고기',
] as const

const PLANET_GLYPHS: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
  Node: '☊',
  'True Node': '☊',
  'North Node': '☊',
}
const PLANET_ORDER = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
  'Node',
  'True Node',
  'North Node',
]

const SIZE = 240
const CX = SIZE / 2
const CY = SIZE / 2
// horizontal padding so the left-side ASC label is never clipped
const PAD = 22

// ASC fixed at the left (9 o'clock); ecliptic longitude increases counter-clockwise.
const screenDeg = (lon: number, asc: number) => 180 + (lon - asc)
const pt = (r: number, deg: number) => {
  const rad = (deg * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CY - r * Math.sin(rad) }
}

export function NatalChart({ astro, lang = 'ko' }: NatalChartProps) {
  const isKo = lang === 'ko'
  const planets = Array.isArray(astro?.planets) ? astro!.planets! : []
  const asc = astro?.ascendant?.longitude ?? 0
  const ascSign = Math.floor((((asc % 360) + 360) % 360) / 30)

  const visible = PLANET_ORDER.map((name) => planets.find((p) => p.name === name))
    .filter((p): p is PlanetInput => Boolean(p) && Number.isFinite(p!.longitude))
    // de-dupe Node/True Node if both present
    .filter(
      (p, i, arr) => arr.findIndex((q) => PLANET_GLYPHS[q.name] === PLANET_GLYPHS[p.name]) === i
    )

  const ringOuter = 104
  const ringInner = 80
  const glyphR = 92

  // stagger planet radius by draw order to reduce label collisions
  const sortedByLon = [...visible].sort((a, b) => a.longitude - b.longitude)
  const radiusOf = (name: string) => 50 + (sortedByLon.findIndex((p) => p.name === name) % 2) * 13

  return (
    <div
      className="relative flex flex-col items-center rounded-xl p-3"
      style={{
        background: 'var(--ds-dark-surface)',
        border: '1px solid var(--ds-gold-line)',
      }}
    >
      <svg viewBox={`${-PAD} 0 ${SIZE + PAD * 2} ${SIZE}`} className="h-auto w-full">
        <g className="chart-spin-in">
          {/* indigo (rgba(99,102,241)) → gold (212,181,114). navy+gold 통일. */}
          <circle
            cx={CX}
            cy={CY}
            r={ringOuter}
            fill="none"
            stroke="rgba(212,181,114,0.42)"
            strokeWidth="1.5"
          />
          <circle
            cx={CX}
            cy={CY}
            r={ringInner}
            fill="none"
            stroke="rgba(212,181,114,0.22)"
            strokeWidth="1"
          />

          {/* 12 sign sectors + glyphs + whole-sign house numbers */}
          {ZODIAC_GLYPHS.map((glyph, s) => {
            const boundary = screenDeg(s * 30, asc)
            const bp1 = pt(ringInner, boundary)
            const bp2 = pt(ringOuter, boundary)
            const mid = screenDeg(s * 30 + 15, asc)
            const gp = pt(glyphR, mid)
            const houseNum = ((s - ascSign + 12) % 12) + 1
            const hp = pt(ringInner - 9, mid)
            return (
              <g key={s}>
                <line
                  x1={bp1.x}
                  y1={bp1.y}
                  x2={bp2.x}
                  y2={bp2.y}
                  stroke="rgba(212,181,114,0.22)"
                  strokeWidth="1"
                />
                <text
                  x={gp.x}
                  y={gp.y}
                  fill="#e8cc8a"
                  fontSize="13"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {glyph}
                </text>
                <text
                  x={hp.x}
                  y={hp.y}
                  fill="rgba(245,247,251,0.4)"
                  fontSize="8"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {houseNum}
                </text>
              </g>
            )
          })}

          {/* ASC marker (left) — gold solid, 다른 element 와 통일 (옛 amber 별색) */}
          <line
            x1={CX}
            y1={CY}
            x2={pt(ringOuter, 180).x}
            y2={pt(ringOuter, 180).y}
            stroke="rgba(212,181,114,0.7)"
            strokeWidth="1.5"
          />
          <text
            x={pt(ringOuter + 12, 180).x}
            y={pt(ringOuter + 12, 180).y}
            fill="#d4b572"
            fontSize="10"
            fontWeight="700"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            ASC
          </text>
        </g>

        {/* planets at true longitude */}
        <g className="chart-twinkle-in">
          {visible.length > 0 ? (
            visible.map((p) => {
              const deg = screenDeg(p.longitude, asc)
              const pos = pt(radiusOf(p.name), deg)
              return (
                <text
                  key={p.name}
                  x={pos.x}
                  y={pos.y}
                  fill="#e8cc8a"
                  fontSize="15"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="drop-shadow"
                >
                  {PLANET_GLYPHS[p.name] || '·'}
                </text>
              )
            })
          ) : (
            <text x={CX} y={CY} fill="rgba(245,247,251,0.62)" fontSize="11" textAnchor="middle">
              {isKo ? '점성 데이터 없음' : 'No astro data'}
            </text>
          )}
          <circle cx={CX} cy={CY} r="2.5" fill="#d4b572" />
        </g>
      </svg>

      {/* legend: planet → sign degree */}
      {visible.length > 0 && (
        <div
          className="mt-1 grid w-full grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]"
          style={{ color: 'var(--ds-dark-text-muted)' }}
        >
          {visible.map((p) => {
            const lon = ((p.longitude % 360) + 360) % 360
            const sign = Math.floor(lon / 30)
            const deg = Math.floor(lon % 30)
            return (
              <span key={p.name} className="flex items-center gap-1">
                <span style={{ color: 'var(--ds-gold-on-dark-soft)' }}>
                  {PLANET_GLYPHS[p.name]}
                </span>
                <span>
                  {isKo ? SIGN_KO[sign] : ZODIAC_GLYPHS[sign]} {deg}°
                </span>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default NatalChart
