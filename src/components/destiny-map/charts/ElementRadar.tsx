'use client'

import React from 'react'

/**
 * 오행 (five-element) balance radar for the 동양 side of the destiny chart.
 * Reads element counts from saju.fiveElements ({wood,fire,earth,metal,water});
 * falls back to counting pillar stems/branches if those aren't present.
 * viewBox is wider than tall so the left/right axis labels never clip.
 */

interface ElementRadarProps {
  saju?: unknown
  lang?: 'ko' | 'en'
}

export type Counts = { wood: number; fire: number; earth: number; metal: number; water: number }

export const AXES: Array<{ key: keyof Counts; ko: string; en: string }> = [
  { key: 'wood', ko: '창의력 (목)', en: 'Creativity (Wood)' },
  { key: 'fire', ko: '추진력 (화)', en: 'Drive (Fire)' },
  { key: 'earth', ko: '안정성 (토)', en: 'Stability (Earth)' },
  { key: 'metal', ko: '결단력 (금)', en: 'Decision (Metal)' },
  { key: 'water', ko: '유연성 (수)', en: 'Flexibility (Water)' },
]
const TRAIT_EN: Record<keyof Counts, string> = { wood: 'creativity', fire: 'drive', earth: 'stability', metal: 'decisiveness', water: 'flexibility' }
const PHRASE_KO: Record<keyof Counts, string> = {
  wood: '아이디어를 기획하고 새로 시작하는 데 강해요.',
  fire: '밀어붙이는 추진력과 표현력이 돋보여요.',
  earth: '중심을 잡고 꾸준히 버티는 힘이 강해요.',
  metal: '결단과 마무리, 원칙이 분명해요.',
  water: '유연하게 적응하고 깊이 사고하는 힘이 강해요.',
}

const EL_KEY: Record<string, keyof Counts> = {
  목: 'wood', 화: 'fire', 토: 'earth', 금: 'metal', 수: 'water',
  wood: 'wood', fire: 'fire', earth: 'earth', metal: 'metal', water: 'water',
}

export function deriveCounts(saju: unknown): Counts {
  const zero: Counts = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
  if (!saju || typeof saju !== 'object') return zero
  const s = saju as Record<string, unknown>
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

// wide viewBox keeps side labels inside the canvas
const W = 300
const H = 232
const CX = W / 2
const CY = 108
const R = 60

const pt = (r: number, i: number) => {
  const deg = -90 + i * 72
  const rad = (deg * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

export function ElementRadar({ saju, lang = 'ko' }: ElementRadarProps) {
  const isKo = lang === 'ko'
  const counts = deriveCounts(saju)
  const vals = AXES.map((a) => counts[a.key])
  const max = Math.max(...vals, 1)

  if (Math.max(...vals) <= 0) {
    return (
      <div className="rounded-xl border border-stone-700/50 bg-stone-900/40 p-4 text-center text-sm text-stone-400">
        {isKo ? '오행 정보가 아직 계산되지 않았습니다.' : 'Element data is not ready yet.'}
      </div>
    )
  }

  const ringPoly = (frac: number) => AXES.map((_, i) => { const p = pt(R * frac, i); return `${p.x},${p.y}` }).join(' ')
  const dataPoly = AXES.map((a, i) => { const p = pt(R * Math.max(0.05, counts[a.key] / max), i); return `${p.x},${p.y}` }).join(' ')

  // dominant element → interpretation comment
  const domKey = (Object.keys(counts) as Array<keyof Counts>).reduce((a, b) => (counts[b] > counts[a] ? b : a), 'wood')
  const domEl = AXES.find((a) => a.key === domKey)!

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-950/80 p-3 shadow-inner">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon key={f} points={ringPoly(f)} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="1" />
        ))}
        {AXES.map((_, i) => { const p = pt(R, i); return <line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke="rgba(148,163,184,0.18)" strokeWidth="1" /> })}
        <g className="chart-grow-in">
          <polygon points={dataPoly} fill="rgba(168,85,247,0.4)" stroke="#a855f7" strokeWidth="2" />
          {AXES.map((a, i) => { const p = pt(R * counts[a.key] / max, i); return <circle key={a.key} cx={p.x} cy={p.y} r="2.5" fill="#c4b5fd" /> })}
        </g>
        {AXES.map((a, i) => {
          const lp = pt(R + 16, i)
          const c = Math.cos((-90 + i * 72) * Math.PI / 180)
          const anchor = c > 0.3 ? 'start' : c < -0.3 ? 'end' : 'middle'
          return (
            <text key={a.key} x={lp.x} y={lp.y} fill="#e5e7eb" fontSize="12" fontWeight="600" textAnchor={anchor} dominantBaseline="middle">
              {isKo ? a.ko : a.en}
            </text>
          )
        })}
      </svg>

      <div className="mt-2 rounded-xl bg-stone-800/50 p-3 text-center">
        <p className="text-sm leading-relaxed text-stone-300">
          {isKo ? (
            <>현재 <span className="font-bold text-purple-400">{domEl.ko}</span>이(가) 가장 두드러집니다.<br />{PHRASE_KO[domKey]}</>
          ) : (
            <>Your strongest pull is <span className="font-bold text-purple-400">{TRAIT_EN[domKey]}</span> ({domEl.en}).</>
          )}
        </p>
      </div>
    </div>
  )
}

export default ElementRadar
