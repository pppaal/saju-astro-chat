'use client'

import React from 'react'
import { DignityBadge } from './atoms/DignityBadge'

interface PlanetInput {
  name: string
  longitude: number
}

/** 행성 간 aspect — /api/astrology aspects 응답 shape. */
interface AspectInput {
  p1: string
  p2: string
  type: string
  orb?: number
}

interface NatalChartProps {
  astro?: {
    planets?: PlanetInput[]
    ascendant?: { longitude?: number }
    /** 옵션 — 들어오면 행성 간 aspect 라인 그림. /api/astrology 의 aspects 또는 aspectsPlus. */
    aspects?: AspectInput[]
    aspectsPlus?: AspectInput[]
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

/** Aspect 종류 → 색·점선·두께. AspectLines atom 과 동일 convention. */
const ASPECT_STYLE: Record<
  string,
  { stroke: string; strokeWidth: number; strokeDasharray?: string; opacity?: number }
> = {
  conjunction: { stroke: '#cbd5e1', strokeWidth: 1.2 },
  sextile: { stroke: '#60a5fa', strokeWidth: 1 },
  square: { stroke: '#f87171', strokeWidth: 1.4, strokeDasharray: '3 3' },
  trine: { stroke: '#34d399', strokeWidth: 1.3 },
  opposition: { stroke: '#a78bfa', strokeWidth: 1.4 },
  quincunx: { stroke: '#fbbf24', strokeWidth: 0.8, strokeDasharray: '2 3', opacity: 0.7 },
}

const SIGN_NAMES = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
] as const

function signOf(longitude: number): string {
  const lon = ((longitude % 360) + 360) % 360
  return SIGN_NAMES[Math.floor(lon / 30)]
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

  // aspects — 응답이 aspects 또는 aspectsPlus 둘 다 가능.
  const aspectList: AspectInput[] = React.useMemo(
    () => astro?.aspects ?? astro?.aspectsPlus ?? [],
    [astro?.aspects, astro?.aspectsPlus]
  )

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

        {/* aspect 라인 — 행성 간 각도 시각화. 라인이 planet glyph 보다 아래
            그려져야 글리프가 가려지지 않음. */}
        {aspectList.length > 0 && (
          <g aria-hidden="true">
            {aspectList.map((asp, i) => {
              const p1 = visible.find((x) => x.name === asp.p1)
              const p2 = visible.find((x) => x.name === asp.p2)
              if (!p1 || !p2) return null
              const style = ASPECT_STYLE[asp.type]
              if (!style) return null
              // 라인 endpoint 는 planet radius 보다 약간 안쪽에 둬 glyph 와 안 겹침.
              const r = 44
              const pos1 = pt(r, screenDeg(p1.longitude, asc))
              const pos2 = pt(r, screenDeg(p2.longitude, asc))
              return (
                <line
                  key={`${asp.p1}-${asp.p2}-${asp.type}-${i}`}
                  x1={pos1.x}
                  y1={pos1.y}
                  x2={pos2.x}
                  y2={pos2.y}
                  stroke={style.stroke}
                  strokeWidth={style.strokeWidth}
                  strokeDasharray={style.strokeDasharray}
                  opacity={style.opacity ?? 0.7}
                />
              )
            })}
          </g>
        )}

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

      {/* legend: planet → sign degree + dignity 칩 (있으면) */}
      {visible.length > 0 && (
        <div
          className="mt-1 grid w-full grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]"
          style={{ color: 'var(--ds-dark-text-muted)' }}
        >
          {visible.map((p) => {
            const lon = ((p.longitude % 360) + 360) % 360
            const sign = Math.floor(lon / 30)
            const deg = Math.floor(lon % 30)
            const signName = SIGN_NAMES[sign]
            return (
              <span key={p.name} className="flex items-center gap-1">
                <span style={{ color: 'var(--ds-gold-on-dark-soft)' }}>
                  {PLANET_GLYPHS[p.name]}
                </span>
                <span>
                  {isKo ? SIGN_KO[sign] : ZODIAC_GLYPHS[sign]} {deg}°
                </span>
                {/* 행성 위신 — Domicile/Exalt/Detriment/Fall 일 때만 칩 표시 (Peregrine 은 hide) */}
                <DignityBadge planet={p.name} sign={signName} lang={lang} size="xs" />
              </span>
            )
          })}
        </div>
      )}

      {/* 교육 legend — 비전공자에 차트 내 표시 의미. 라인 / 칩 / 글리프 한 줄씩. */}
      {visible.length > 0 && (
        <div
          className="mt-3 w-full space-y-1.5 rounded-lg p-2.5 text-[10px] leading-snug"
          style={{
            background: 'rgba(212, 181, 114, 0.04)',
            border: '1px solid rgba(212, 181, 114, 0.18)',
            color: 'var(--ds-dark-text-muted)',
          }}
        >
          <div
            className="font-medium uppercase tracking-wider"
            style={{ color: 'var(--ds-gold-on-dark)', fontSize: '9px' }}
          >
            {isKo ? 'ℹ️ 차트 안의 표시' : 'ℹ️ Chart Symbols'}
          </div>
          {aspectList.length > 0 && (
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="flex items-center gap-1">
                  <span
                    style={{
                      display: 'inline-block',
                      width: 14,
                      height: 1.5,
                      background: '#f87171',
                    }}
                  />
                  {isKo ? '긴장 (직각·대립)' : 'tension (square · opposition)'}
                </span>
                <span className="flex items-center gap-1">
                  <span
                    style={{
                      display: 'inline-block',
                      width: 14,
                      height: 1.5,
                      background: '#34d399',
                    }}
                  />
                  {isKo ? '조화 (삼각)' : 'harmony (trine)'}
                </span>
                <span className="flex items-center gap-1">
                  <span
                    style={{
                      display: 'inline-block',
                      width: 14,
                      height: 1.5,
                      background: '#60a5fa',
                    }}
                  />
                  {isKo ? '도움 (육각)' : 'support (sextile)'}
                </span>
                <span className="flex items-center gap-1">
                  <span
                    style={{
                      display: 'inline-block',
                      width: 14,
                      height: 1.5,
                      background: '#cbd5e1',
                    }}
                  />
                  {isKo ? '만남 (합)' : 'union (conjunction)'}
                </span>
              </div>
            </div>
          )}
          <div>
            {isKo
              ? '행성 옆 칩 = 위신 — 본거지(강함) · 고양(매우 강함) · 약화·落(부담)'
              : 'chip next to planet = dignity — Domicile (strong) · Exaltation (very strong) · Detriment · Fall (challenged)'}
          </div>
          <div>
            {isKo
              ? '바깥 원의 ♈♉... = 12 별자리 · 안쪽 작은 숫자 = 12 하우스 (인생 영역)'
              : 'outer ring ♈♉... = 12 zodiac signs · inner numbers = 12 houses (life areas)'}
          </div>
        </div>
      )}
    </div>
  )
}

export default NatalChart
