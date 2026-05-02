'use client'

/**
 * Couple Planet Strip — at-a-glance comparison of both persons' core
 * personal planets (Sun · Moon · Venus · Mars · Mercury · ASC) showing
 * which sign each lands in. Lets users instantly see whether they
 * share signs, sit in same elements, or face opposing positions.
 */

import { memo } from 'react'

interface PlanetPos {
  sign?: string
  element?: string
}

interface PersonChart {
  sun?: PlanetPos
  moon?: PlanetPos
  venus?: PlanetPos
  mars?: PlanetPos
  mercury?: PlanetPos
  ascendant?: PlanetPos
}

interface CouplePlanetStripProps {
  p1: PersonChart
  p2: PersonChart
  p1Name: string
  p2Name: string
}

const SIGN_KO: Record<string, string> = {
  Aries: '양',
  Taurus: '황소',
  Gemini: '쌍둥이',
  Cancer: '게',
  Leo: '사자',
  Virgo: '처녀',
  Libra: '천칭',
  Scorpio: '전갈',
  Sagittarius: '사수',
  Capricorn: '염소',
  Aquarius: '물병',
  Pisces: '물고기',
}

const ELEMENT_COLOR: Record<string, string> = {
  fire: '#ef4444',
  earth: '#eab308',
  air: '#a3a3a3',
  water: '#3b82f6',
}

const PLANET_LABEL: Array<{ key: keyof PersonChart; ko: string; emoji: string }> = [
  { key: 'sun', ko: '태양', emoji: '☀️' },
  { key: 'moon', ko: '달', emoji: '🌙' },
  { key: 'mercury', ko: '수성', emoji: '☿' },
  { key: 'venus', ko: '금성', emoji: '♀' },
  { key: 'mars', ko: '화성', emoji: '♂' },
  { key: 'ascendant', ko: '상승점', emoji: '↑' },
]

function relationFor(p1?: PlanetPos, p2?: PlanetPos): { tone: 'match' | 'compat' | 'neutral'; label: string } {
  if (!p1?.sign || !p2?.sign) return { tone: 'neutral', label: '' }
  if (p1.sign === p2.sign) return { tone: 'match', label: '같은 사인' }
  // Same element = compatible
  if (p1.element && p2.element && p1.element === p2.element) {
    return { tone: 'compat', label: '같은 원소' }
  }
  // Compatible elements (fire+air, water+earth)
  const compat: Record<string, string[]> = {
    fire: ['air'],
    air: ['fire'],
    water: ['earth'],
    earth: ['water'],
  }
  if (p1.element && p2.element && compat[p1.element]?.includes(p2.element)) {
    return { tone: 'compat', label: '잘 어울리는 원소' }
  }
  return { tone: 'neutral', label: '' }
}

export const CouplePlanetStrip = memo(function CouplePlanetStrip({
  p1,
  p2,
  p1Name,
  p2Name,
}: CouplePlanetStripProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      {/* Header row */}
      <div className="grid grid-cols-[80px_1fr_1fr_70px] items-center gap-2 border-b border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        <span>행성</span>
        <span className="truncate">{p1Name}</span>
        <span className="truncate">{p2Name}</span>
        <span className="text-right">관계</span>
      </div>
      {/* Rows */}
      {PLANET_LABEL.map(({ key, ko, emoji }) => {
        const a = p1[key]
        const b = p2[key]
        const rel = relationFor(a, b)
        const accent =
          rel.tone === 'match'
            ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100'
            : rel.tone === 'compat'
              ? 'border-cyan-300/25 bg-cyan-400/10 text-cyan-100'
              : 'border-white/10 bg-white/[0.03] text-slate-400'
        return (
          <div
            key={key}
            className="grid grid-cols-[80px_1fr_1fr_70px] items-center gap-2 border-b border-white/[0.04] px-3 py-2 last:border-b-0"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[14px]">{emoji}</span>
              <span className="text-[12.5px] text-slate-300">{ko}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[12.5px]">
              {a?.sign ? (
                <>
                  {a.element && (
                    <span
                      className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                      style={{ background: ELEMENT_COLOR[a.element] || '#a3a3a3' }}
                      aria-hidden
                    />
                  )}
                  <span className="text-slate-200">{SIGN_KO[a.sign] || a.sign}</span>
                </>
              ) : (
                <span className="text-slate-600">—</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[12.5px]">
              {b?.sign ? (
                <>
                  {b.element && (
                    <span
                      className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                      style={{ background: ELEMENT_COLOR[b.element] || '#a3a3a3' }}
                      aria-hidden
                    />
                  )}
                  <span className="text-slate-200">{SIGN_KO[b.sign] || b.sign}</span>
                </>
              ) : (
                <span className="text-slate-600">—</span>
              )}
            </div>
            <div className="text-right">
              {rel.label ? (
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${accent}`}>
                  {rel.label}
                </span>
              ) : (
                <span className="text-[10px] text-slate-600">—</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
})
