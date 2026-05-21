'use client'

import React from 'react'

/**
 * 오행 (five-element) balance radar for the 동양 side of the destiny chart.
 * Reads element counts from saju.fiveElements ({wood,fire,earth,metal,water});
 * falls back to counting pillar stems/branches if those aren't present.
 */

interface ElementRadarProps {
  saju?: unknown
  lang?: 'ko' | 'en'
  size?: number
}

type Counts = { wood: number; fire: number; earth: number; metal: number; water: number }

const AXES: Array<{ key: keyof Counts; ko: string; en: string }> = [
  { key: 'wood', ko: '창의력 (목)', en: 'Creativity (Wood)' },
  { key: 'fire', ko: '추진력 (화)', en: 'Drive (Fire)' },
  { key: 'earth', ko: '안정성 (토)', en: 'Stability (Earth)' },
  { key: 'metal', ko: '결단력 (금)', en: 'Decision (Metal)' },
  { key: 'water', ko: '유연성 (수)', en: 'Flexibility (Water)' },
]

const EL_KEY: Record<string, keyof Counts> = {
  목: 'wood', 화: 'fire', 토: 'earth', 금: 'metal', 수: 'water',
  wood: 'wood', fire: 'fire', earth: 'earth', metal: 'metal', water: 'water',
}

function deriveCounts(saju: unknown): Counts {
  const zero: Counts = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
  if (!saju || typeof saju !== 'object') return zero
  const s = saju as Record<string, unknown>
  // 1) engine-provided counts (includes hidden stems)
  const fe = s.fiveElements as Partial<Record<string, number>> | undefined
  if (fe && typeof fe === 'object') {
    const out = { ...zero }
    let any = false
    for (const [k, v] of Object.entries(fe)) {
      const key = EL_KEY[k]
      if (key && typeof v === 'number') { out[key] += v; any = true }
    }
    if (any) return out
  }
  // 2) fallback: count pillar stem + branch elements (8 chars)
  const pillars = (s.pillars ?? {}) as Record<string, { heavenlyStem?: { element?: string }; earthlyBranch?: { element?: string } }>
  const legacy = ['yearPillar', 'monthPillar', 'dayPillar', 'timePillar', 'hourPillar']
  const out = { ...zero }
  let any = false
  const add = (el?: string) => { const key = el ? EL_KEY[el] : undefined; if (key) { out[key] += 1; any = true } }
  for (const k of ['year', 'month', 'day', 'time']) {
    add(pillars[k]?.heavenlyStem?.element)
    add(pillars[k]?.earthlyBranch?.element)
  }
  for (const k of legacy) {
    const p = s[k] as { heavenlyStem?: { element?: string }; earthlyBranch?: { element?: string } } | undefined
    if (p) { add(p.heavenlyStem?.element); add(p.earthlyBranch?.element) }
  }
  return any ? out : zero
}

export function ElementRadar({ saju, lang = 'ko', size = 240 }: ElementRadarProps) {
  const isKo = lang === 'ko'
  const counts = deriveCounts(saju)
  const vals = AXES.map((a) => counts[a.key])
  const max = Math.max(...vals, 1)

  const cx = size / 2
  const cy = size / 2 - 4
  const R = size * 0.3
  const pt = (r: number, i: number) => {
    const deg = -90 + i * 72
    const rad = (deg * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }
  const ringPoly = (frac: number) => AXES.map((_, i) => { const p = pt(R * frac, i); return `${p.x},${p.y}` }).join(' ')
  const dataPoly = AXES.map((a, i) => {
    const frac = Math.max(0.05, counts[a.key] / max)
    const p = pt(R * frac, i)
    return `${p.x},${p.y}`
  }).join(' ')

  if (max <= 0) {
    return (
      <div className="rounded-xl border border-stone-700/50 bg-stone-900/40 p-4 text-center text-sm text-stone-400">
        {isKo ? '오행 정보가 아직 계산되지 않았습니다.' : 'Element data is not ready yet.'}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-950/80 p-3 shadow-inner">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon key={f} points={ringPoly(f)} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="1" />
        ))}
        {AXES.map((_, i) => { const p = pt(R, i); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(148,163,184,0.18)" strokeWidth="1" /> })}
        <polygon points={dataPoly} fill="rgba(167,139,250,0.35)" stroke="#a78bfa" strokeWidth="2" />
        {AXES.map((a, i) => {
          const p = pt(R * counts[a.key] / max, i)
          return <circle key={a.key} cx={p.x} cy={p.y} r="2.5" fill="#c4b5fd" />
        })}
        {AXES.map((a, i) => {
          const lp = pt(R + 18, i)
          const c = Math.cos((-90 + i * 72) * Math.PI / 180)
          const anchor = c > 0.3 ? 'start' : c < -0.3 ? 'end' : 'middle'
          return (
            <text key={a.key} x={lp.x} y={lp.y} fill="#cbd5e1" fontSize="11" textAnchor={anchor} dominantBaseline="middle">
              {isKo ? a.ko : a.en}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

export default ElementRadar
