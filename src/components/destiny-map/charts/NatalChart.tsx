'use client'

import React from 'react'
import { motion } from 'framer-motion'

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

const ZODIAC_SIGNS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'] as const

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
}

const VISIBLE_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

export function NatalChart({ astro, lang = 'ko' }: NatalChartProps) {
  const isKo = lang === 'ko'
  const planets = Array.isArray(astro?.planets) ? astro!.planets! : []
  const ascLongitude = astro?.ascendant?.longitude ?? 0
  const visible = VISIBLE_PLANETS
    .map((name) => planets.find((p) => p.name === name))
    .filter((p): p is PlanetInput => Boolean(p))

  return (
    <div className="relative flex flex-col items-center overflow-hidden rounded-xl border border-indigo-500/30 bg-slate-950/80 p-4 shadow-inner">
      <div className="mb-2 flex w-full items-center gap-1.5 text-left">
        <span className="text-indigo-400">✦</span>
        <span className="font-serif text-xs tracking-wider text-indigo-300">
          {isKo ? '네이탈 차트' : 'NATAL CHART'}
        </span>
      </div>

      <div className="relative mx-auto my-2 h-40 w-40">
        <motion.svg
          viewBox="0 0 200 200"
          className="absolute inset-0 h-full w-full drop-shadow-md"
          animate={{ rotate: 360 }}
          transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
        >
          <circle cx="100" cy="100" r="95" fill="none" stroke="rgba(99, 102, 241, 0.4)" strokeWidth="2" />
          <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(99, 102, 241, 0.2)" strokeWidth="1" />

          {ZODIAC_SIGNS.map((sign, i) => {
            const angle = (i * 30 + 15) * (Math.PI / 180)
            const textX = 100 + 82 * Math.cos(angle - Math.PI / 2)
            const textY = 100 + 82 * Math.sin(angle - Math.PI / 2)
            return (
              <text
                key={sign}
                x={textX}
                y={textY}
                fill="#a5b4fc"
                fontSize="16"
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${i * 30 + 15}, ${textX}, ${textY})`}
              >
                {sign}
              </text>
            )
          })}
        </motion.svg>

        <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full">
          {visible.length > 0 ? (
            visible.map((planet, i) => {
              const glyph = PLANET_GLYPHS[planet.name] || '·'
              const adjusted = ((planet.longitude - ascLongitude) % 360 + 360) % 360
              const radius = 45 + (i % 2) * 12
              const pos = polarToCartesian(100, 100, radius, adjusted)
              return (
                <text
                  key={planet.name}
                  x={pos.x}
                  y={pos.y}
                  fill="#fde047"
                  fontSize="18"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="drop-shadow-lg"
                >
                  {glyph}
                </text>
              )
            })
          ) : (
            <text x="100" y="105" fill="#94a3b8" fontSize="11" textAnchor="middle">
              {isKo ? '점성 데이터 없음' : 'No astro data'}
            </text>
          )}
          <circle cx="100" cy="100" r="3" fill="#818cf8" />
        </svg>
      </div>

      {visible.length > 0 && (
        <div className="mt-1 flex flex-wrap justify-center gap-2 text-[11px] text-indigo-200/80">
          {visible.slice(0, 5).map((p) => (
            <span key={p.name}>
              {PLANET_GLYPHS[p.name]} {Math.round(p.longitude)}°
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default NatalChart
