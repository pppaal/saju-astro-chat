'use client'

import React from 'react'
import {
  ZODIAC_GLYPHS,
  SIGN_KO,
  PLANET_GLYPHS,
  PLANET_ORDER,
  NATAL_CHART_PAD as PAD,
  screenDeg,
} from '@/components/report/natalChartConstants'

/**
 * 궁합용 시너스트리 바이휠(bi-wheel). 한 황도 위에 두 사람의 행성을
 * 색으로 구분해 겹쳐 그린다. 휠은 A의 ASC를 9시 방향에 고정하고,
 *   A 행성 = 안쪽 고리(rose), B 행성 = 바깥 고리(sky)
 * 로 배치해 같은 별자리 칸에서 누구 행성이 모였는지 한눈에 보이게 한다.
 */

interface PlanetInput {
  name: string
  longitude: number
}
interface AstroInput {
  planets?: PlanetInput[]
  ascendant?: { longitude?: number }
}
interface CompatNatalOverlayProps {
  astroA?: AstroInput
  astroB?: AstroInput
  nameA?: string
  nameB?: string
  lang?: 'ko' | 'en'
}

const SIZE = 260
const CX = SIZE / 2
const CY = SIZE / 2

const pt = (r: number, deg: number) => {
  const rad = (deg * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CY - r * Math.sin(rad) }
}

function visiblePlanets(astro?: AstroInput): PlanetInput[] {
  const planets = Array.isArray(astro?.planets) ? astro!.planets! : []
  return PLANET_ORDER.map((name) => planets.find((p) => p.name === name))
    .filter((p): p is PlanetInput => Boolean(p) && Number.isFinite(p!.longitude))
    .filter(
      (p, i, arr) => arr.findIndex((q) => PLANET_GLYPHS[q.name] === PLANET_GLYPHS[p.name]) === i
    )
}

const ringOuter = 112
const ringInner = 86
const glyphR = 99

export function CompatNatalOverlay({
  astroA,
  astroB,
  nameA = 'A',
  nameB = 'B',
  lang = 'ko',
}: CompatNatalOverlayProps) {
  const isKo = lang === 'ko'
  const asc = astroA?.ascendant?.longitude ?? 0
  const ascSign = Math.floor((((asc % 360) + 360) % 360) / 30)
  const ascB = astroB?.ascendant?.longitude

  const pA = visiblePlanets(astroA)
  const pB = visiblePlanets(astroB)

  if (pA.length === 0 && pB.length === 0) {
    return (
      <div
        className="rounded-xl p-6 text-center text-sm"
        style={{
          background: 'transparent',
          border: '1px solid var(--ds-light-border)',
          color: 'var(--ds-light-text-muted)',
        }}
      >
        {isKo ? '점성 데이터 없음' : 'No astro data'}
      </div>
    )
  }

  // A inner ring, B outer ring; stagger within each set to reduce collisions.
  const sortA = [...pA].sort((a, b) => a.longitude - b.longitude)
  const sortB = [...pB].sort((a, b) => a.longitude - b.longitude)
  const radiusA = (name: string) => 46 + (sortA.findIndex((p) => p.name === name) % 2) * 12
  const radiusB = (name: string) => 66 + (sortB.findIndex((p) => p.name === name) % 2) * 12

  const renderSet = (list: PlanetInput[], radiusOf: (n: string) => number, color: string) =>
    list.map((p) => {
      const pos = pt(radiusOf(p.name), screenDeg(p.longitude, asc))
      return (
        <text
          key={`${color}-${p.name}`}
          x={pos.x}
          y={pos.y}
          fill={color}
          fontSize="15"
          textAnchor="middle"
          dominantBaseline="middle"
          className="drop-shadow"
        >
          {PLANET_GLYPHS[p.name] || '·'}
        </text>
      )
    })

  const legend = (list: PlanetInput[], color: string, name: string) => (
    <div className="space-y-0.5">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold" style={{ color }}>
        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        {name}
      </div>
      <div
        className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]"
        style={{ color: 'var(--ds-light-text-muted)' }}
      >
        {list.map((p) => {
          const lon = ((p.longitude % 360) + 360) % 360
          const sign = Math.floor(lon / 30)
          const deg = Math.floor(lon % 30)
          return (
            <span key={p.name} className="flex items-center gap-1">
              <span style={{ color }}>{PLANET_GLYPHS[p.name]}</span>
              <span>
                {isKo ? SIGN_KO[sign] : ZODIAC_GLYPHS[sign]} {deg}°
              </span>
            </span>
          )
        })}
      </div>
    </div>
  )

  const rose = '#fb7185'
  const sky = '#38bdf8'

  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: 'transparent',
        border: '1px solid var(--ds-gold-line)',
      }}
    >
      <svg
        viewBox={`${-PAD} 0 ${SIZE + PAD * 2} ${SIZE}`}
        className="mx-auto h-auto w-full max-w-[320px]"
      >
        <g className="chart-spin-in">
          {/* 옛 검정 톤 (rgba(28,25,23,...)) → gold 라인. NatalChart 와 통일. */}
          <circle
            cx={CX}
            cy={CY}
            r={ringOuter}
            fill="none"
            stroke="rgba(80,68,40,0.32)"
            strokeWidth="1.5"
          />
          <circle
            cx={CX}
            cy={CY}
            r={ringInner}
            fill="none"
            stroke="rgba(80,68,40,0.18)"
            strokeWidth="1"
          />

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
                  stroke="rgba(80,68,40,0.18)"
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

          {/* A ASC (left) — gold marker. NatalChart 와 통일. */}
          <line
            x1={CX}
            y1={CY}
            x2={pt(ringOuter, 180).x}
            y2={pt(ringOuter, 180).y}
            stroke="rgba(80,68,40,0.5)"
            strokeWidth="1.5"
          />
          <text
            x={pt(ringOuter + 12, 180).x}
            y={pt(ringOuter + 12, 180).y}
            fill="#d4b572"
            fontSize="9"
            fontWeight="700"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            ASC
          </text>

          {/* B ASC tick (sky) at its position relative to A's wheel */}
          {Number.isFinite(ascB) && (
            <line
              x1={pt(ringInner, screenDeg(ascB as number, asc)).x}
              y1={pt(ringInner, screenDeg(ascB as number, asc)).y}
              x2={pt(ringOuter, screenDeg(ascB as number, asc)).x}
              y2={pt(ringOuter, screenDeg(ascB as number, asc)).y}
              stroke={sky}
              strokeWidth="1.5"
              strokeDasharray="3 2"
            />
          )}
        </g>

        <g className="chart-twinkle-in">
          {renderSet(pA, radiusA, rose)}
          {renderSet(pB, radiusB, sky)}
          <circle cx={CX} cy={CY} r="2.5" fill="#d4b572" />
        </g>
      </svg>

      <div className="mt-2 grid grid-cols-2 gap-3">
        {legend(pA, rose, nameA)}
        {legend(pB, sky, nameB)}
      </div>
    </div>
  )
}

export default CompatNatalOverlay
