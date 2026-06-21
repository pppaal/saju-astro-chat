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

export const AXES: Array<{
  key: keyof Counts
  ko: string
  en: string
  koShort: string
  koEl: string
  enShort: string
  enEl: string
}> = [
  {
    key: 'wood',
    ko: '창의력 (목)',
    en: 'Creativity (Wood)',
    koShort: '창의력',
    koEl: '木',
    enShort: 'Creativity',
    enEl: 'Wood',
  },
  {
    key: 'fire',
    ko: '추진력 (화)',
    en: 'Drive (Fire)',
    koShort: '추진력',
    koEl: '火',
    enShort: 'Drive',
    enEl: 'Fire',
  },
  {
    key: 'earth',
    ko: '안정성 (토)',
    en: 'Stability (Earth)',
    koShort: '안정성',
    koEl: '土',
    enShort: 'Stability',
    enEl: 'Earth',
  },
  {
    key: 'metal',
    ko: '결단력 (금)',
    en: 'Decision (Metal)',
    koShort: '결단력',
    koEl: '金',
    enShort: 'Decision',
    enEl: 'Metal',
  },
  {
    key: 'water',
    ko: '유연성 (수)',
    en: 'Flexibility (Water)',
    koShort: '유연성',
    koEl: '水',
    enShort: 'Flexibility',
    enEl: 'Water',
  },
]
const TRAIT_EN: Record<keyof Counts, string> = {
  wood: 'creativity',
  fire: 'drive',
  earth: 'stability',
  metal: 'decisiveness',
  water: 'flexibility',
}
const PHRASE_KO: Record<keyof Counts, string> = {
  wood: '아이디어를 기획하고 새로 시작하는 데 강해요.',
  fire: '밀어붙이는 추진력과 표현력이 돋보여요.',
  earth: '중심을 잡고 꾸준히 버티는 힘이 강해요.',
  metal: '결단과 마무리, 원칙이 분명해요.',
  water: '유연하게 적응하고 깊이 사고하는 힘이 강해요.',
}

// 약한 원소 처방 — counts === 0 또는 1 일 때만 노출. 균형 잡힌 사람은 표시 X.
const WEAK_REMEDY_KO: Record<keyof Counts, string> = {
  wood: '식물·산책·창작이 균형을 잡아줘요.',
  fire: '운동·발표·뜨거운 색이 균형을 잡아줘요.',
  earth: '실용·신뢰·돌봄 활동이 균형을 잡아줘요.',
  metal: '정리·체계·결단 연습이 균형을 잡아줘요.',
  water: '학습·명상·여행이 균형을 잡아줘요.',
}
const WEAK_REMEDY_EN: Record<keyof Counts, string> = {
  wood: 'planting, walks, creative work help balance.',
  fire: 'exercise, public speaking, warm colors help balance.',
  earth: 'practical work, trust, caregiving help balance.',
  metal: 'organizing, structure, decisiveness help balance.',
  water: 'learning, meditation, travel help balance.',
}

const EL_KEY: Record<string, keyof Counts> = {
  목: 'wood',
  화: 'fire',
  토: 'earth',
  금: 'metal',
  수: 'water',
  wood: 'wood',
  fire: 'fire',
  earth: 'earth',
  metal: 'metal',
  water: 'water',
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
      if (key && typeof v === 'number') {
        out[key] += v
        any = true
      }
    }
    if (any) return out
  }
  const pillars = (s.pillars ?? {}) as Record<
    string,
    { heavenlyStem?: { element?: string }; earthlyBranch?: { element?: string } }
  >
  const legacy = ['yearPillar', 'monthPillar', 'dayPillar', 'timePillar', 'hourPillar']
  const out = { ...zero }
  let any = false
  const add = (el?: string) => {
    const key = el ? EL_KEY[el] : undefined
    if (key) {
      out[key] += 1
      any = true
    }
  }
  for (const k of ['year', 'month', 'day', 'time']) {
    add(pillars[k]?.heavenlyStem?.element)
    add(pillars[k]?.earthlyBranch?.element)
  }
  for (const k of legacy) {
    const p = s[k] as
      | { heavenlyStem?: { element?: string }; earthlyBranch?: { element?: string } }
      | undefined
    if (p) {
      add(p.heavenlyStem?.element)
      add(p.earthlyBranch?.element)
    }
  }
  return any ? out : zero
}

// wide viewBox keeps side labels inside the canvas — 좌·우 측 라벨 ("유연성"
// 같은 3 글자) 가 잘리지 않도록 viewBox 좌측에 여백 둠 (x 음수 시작).
const W = 320
const H = 244
const VB_X = -10 // viewBox 시작 x — 좌측 라벨 ('유연성') cutoff 방지
const CX = 150 // 펜타곤 중심은 그대로 (라벨만 음수 영역으로 확장)
const CY = 112
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
      <div
        className="rounded-xl p-4 text-center text-sm"
        style={{
          background: 'var(--ds-dark-surface)',
          border: '1px solid var(--ds-dark-border)',
          color: 'var(--ds-dark-text-muted)',
        }}
      >
        {isKo ? '오행 정보가 아직 계산되지 않았습니다.' : 'Element data is not ready yet.'}
      </div>
    )
  }

  const ringPoly = (frac: number) =>
    AXES.map((_, i) => {
      const p = pt(R * frac, i)
      return `${p.x},${p.y}`
    }).join(' ')
  const dataPoly = AXES.map((a, i) => {
    const p = pt(R * Math.max(0.05, counts[a.key] / max), i)
    return `${p.x},${p.y}`
  }).join(' ')

  // dominant element → interpretation comment
  const domKey = (Object.keys(counts) as Array<keyof Counts>).reduce(
    (a, b) => (counts[b] > counts[a] ? b : a),
    'wood' as keyof Counts
  )
  const domEl = AXES.find((a) => a.key === domKey)!

  // weak element — counts === 0 또는 1 일 때만 노출. 균형이면 약함 없음.
  const weakKey = (Object.keys(counts) as Array<keyof Counts>).reduce(
    (a, b) => (counts[b] < counts[a] ? b : a),
    'wood' as keyof Counts
  )
  const weakEl = AXES.find((a) => a.key === weakKey)!
  const showWeak = counts[weakKey] <= 1 && weakKey !== domKey

  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: 'var(--ds-dark-surface)',
        border: '1px solid var(--ds-gold-line)',
      }}
    >
      <svg viewBox={`${VB_X} 0 ${W} ${H}`} className="h-auto w-full">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon
            key={f}
            points={ringPoly(f)}
            fill="none"
            stroke="rgba(148,163,184,0.18)"
            strokeWidth="1"
          />
        ))}
        {AXES.map((_, i) => {
          const p = pt(R, i)
          return (
            <line
              key={i}
              x1={CX}
              y1={CY}
              x2={p.x}
              y2={p.y}
              stroke="rgba(148,163,184,0.18)"
              strokeWidth="1"
            />
          )
        })}
        <g className="chart-grow-in">
          {/* 보라 (rgba(168,85,247) / #a855f7 / #c4b5fd) → gold. About/FAQ
              디자인 시스템 통일. PR #770 의 navy+gold 톤과 일치. */}
          <polygon
            points={dataPoly}
            fill="rgba(212,181,114,0.32)"
            stroke="#d4b572"
            strokeWidth="2"
          />
          {/* 옛 vertex 점 (circle r=2.5) 제거 — 사용자 피드백 "왜 점이 있어".
              데이터 polygon 만으로 충분히 읽힘. 점은 시각 노이즈만 됐음. */}
        </g>
        {AXES.map((a, i) => {
          const lp = pt(R + 18, i)
          const c = Math.cos(((-90 + i * 72) * Math.PI) / 180)
          const anchor = c > 0.3 ? 'start' : c < -0.3 ? 'end' : 'middle'
          // 2줄 라벨 — 1줄: "창의력" (capability), 2줄: "木" (한자/element).
          // 글자 짧아져 좌·우 cutoff 해결 + 한자가 시각적으로 강조됨.
          const phrase = isKo ? a.koShort : a.enShort
          const el = isKo ? a.koEl : a.enEl
          return (
            <text
              key={a.key}
              x={lp.x}
              y={lp.y}
              fill="#e5e7eb"
              fontSize="11"
              fontWeight="600"
              textAnchor={anchor}
              dominantBaseline="middle"
            >
              <tspan x={lp.x} dy="-0.42em">
                {phrase}
              </tspan>
              <tspan x={lp.x} dy="1.12em" fontSize="10" fontWeight="500" fill="#d4b572">
                {el}
              </tspan>
            </text>
          )
        })}
        {/* "중심에서 멀수록 강함" 미세 라벨 — 시각 단서. */}
        <text x={CX} y={H - 8} fill="rgba(245,247,251,0.4)" fontSize="9" textAnchor="middle">
          {isKo ? '중심 ← 약함 · 멀수록 강함 →' : 'center = weak · further out = stronger'}
        </text>
      </svg>

      <div
        className="mt-2 rounded-xl p-3 text-center"
        style={{ background: 'var(--ds-dark-surface-strong)' }}
      >
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ds-dark-text)' }}>
          {isKo ? (
            <>
              가장 강한 건 <span className="font-bold text-[#e8cc8a]">{domEl.koShort}</span> (
              {domEl.koEl}) 이에요.
              <br />
              {PHRASE_KO[domKey]}
            </>
          ) : (
            <>
              Your strongest pull is{' '}
              <span className="font-bold text-[#e8cc8a]">{TRAIT_EN[domKey]}</span> ({domEl.en}).
            </>
          )}
        </p>
        {showWeak && (
          <p
            className="mt-2 text-xs leading-relaxed"
            style={{ color: 'var(--ds-dark-text-muted)' }}
          >
            {isKo ? (
              <>
                약한 건 <span className="font-semibold">{weakEl.koShort}</span> ({weakEl.koEl}).{' '}
                {WEAK_REMEDY_KO[weakKey]}
              </>
            ) : (
              <>
                Weakest is <span className="font-semibold">{TRAIT_EN[weakKey]}</span> ({weakEl.en}
                ). {WEAK_REMEDY_EN[weakKey]}
              </>
            )}
          </p>
        )}
      </div>
    </div>
  )
}
