'use client'

import React from 'react'
import { getRelationMeaning, type RelationCategory } from '@/lib/chart-dictionary'
import type { SajuCompatPillarRel } from '@/lib/compatibility/sajuSynastryFormatter'

/**
 * 궁합 라인 — 두 사람 사주 8글자 사이 합·충·시너스트리 시각화.
 *
 * A/B 각자 4기둥(時·日·月·年) 을 양쪽 column 으로 세로 배치하고, 두 column
 * 사이를 SVG overlay 로 가로질러 색-coded 관계 라인 (천간합/충, 지지육합/삼합/충, 원진)
 * 을 잇는다. 라인 hover/탭 → chart-dictionary tooltip ("寅亥 육합 — 다정한 결").
 *
 * 가독성 위해 상위 6개 관계만 표시 (일주 관여 → 천간합 → 지지육합 → 천간충 → 나머지 순).
 */

interface CompatLinesProps {
  /** A 사주 raw — 8글자 박스 *표시*용 (관계 계산 X) */
  sajuA: unknown
  /** B 사주 raw */
  sajuB: unknown
  /** 서버에서 계산한 기둥 cross 관계 (SSOT). 라인은 이걸로만 그린다. */
  relations: SajuCompatPillarRel[]
  lang?: 'ko' | 'en'
  className?: string
}

type PillarKey = 'time' | 'day' | 'month' | 'year'
const PILLAR_ORDER: PillarKey[] = ['time', 'day', 'month', 'year']
const PILLAR_LABEL_KO: Record<PillarKey, string> = {
  time: '時',
  day: '日',
  month: '月',
  year: '年',
}
const PILLAR_LABEL_EN: Record<PillarKey, string> = {
  time: 'Hr',
  day: 'Dy',
  month: 'Mo',
  year: 'Yr',
}

interface Pillars {
  time: { stem?: string; branch?: string }
  day: { stem?: string; branch?: string }
  month: { stem?: string; branch?: string }
  year: { stem?: string; branch?: string }
}

// ── pillars 추출 (박스 글자 표시용 — 관계 계산은 서버) ───────────────────────
function pillarsOf(saju: unknown): Pillars {
  const s = (saju ?? {}) as Record<string, unknown>
  const pRoot = (s.pillars ?? {
    year: s.yearPillar,
    month: s.monthPillar,
    day: s.dayPillar,
    time: s.timePillar,
  }) as Record<string, unknown>
  const pick = (k: PillarKey) => {
    const p = (pRoot[k] ?? {}) as Record<string, unknown>
    const stem = (p.heavenlyStem as { name?: string } | undefined)?.name
    const branch = (p.earthlyBranch as { name?: string } | undefined)?.name
    return { stem, branch }
  }
  return { time: pick('time'), day: pick('day'), month: pick('month'), year: pick('year') }
}

// ── 라인 모델 — 서버 관계(SajuCompatPillarRel) → 라인 ───────────────────────
interface RelLine {
  kind: string // 대표 태그 (천간합/천간충/육합/충/형/자형/해/파)
  fromIdx: number // 0..3 — A 의 PILLAR_ORDER index (時→0)
  toIdx: number
  fromChar: string
  toChar: string
  tags: string[]
  tone: SajuCompatPillarRel['tone']
  priority: number
}

// 서버 기둥 라벨(년/월/일/시) → PillarKey
const PILLAR_KEY_FROM_LABEL: Record<string, PillarKey> = {
  년: 'year',
  월: 'month',
  일: 'day',
  시: 'time',
}

const LINE_STYLE: Record<string, { stroke: string; width: number; dash?: string; label: string }> =
  {
    천간합: { stroke: 'var(--ds-gold)', width: 2, label: '천간합' },
    육합: { stroke: '#059669', width: 1.5, label: '육합' },
    천간충: { stroke: '#f87171', width: 1.5, dash: '4 3', label: '천간충' },
    충: { stroke: '#f87171', width: 1.2, dash: '4 3', label: '충' },
    형: { stroke: '#ea580c', width: 1.3, dash: '5 3', label: '형' },
    자형: { stroke: '#ea580c', width: 1.3, dash: '5 3', label: '자형' },
    해: { stroke: '#d97706', width: 1, dash: '2 2', label: '해' },
    파: { stroke: '#9c8b6a', width: 1, dash: '2 2', label: '파' },
  }
const LINE_STYLE_EN: Record<string, string> = {
  천간합: 'Stem Combine',
  육합: 'Six-Harmony',
  천간충: 'Stem Clash',
  충: 'Branch Clash',
  형: 'Punishment',
  자형: 'Self-Punishment',
  해: 'Harm',
  파: 'Break',
}
// 대표 태그 — clash 계열이 우세하게 (라인 색 결정).
const TAG_PRI: Record<string, number> = {
  충: 0,
  형: 1,
  자형: 1,
  천간충: 2,
  해: 3,
  파: 4,
  천간합: 5,
  육합: 6,
}
function dominantTag(tags: string[]): string {
  return [...tags].sort((x, y) => (TAG_PRI[x] ?? 9) - (TAG_PRI[y] ?? 9))[0] ?? tags[0] ?? ''
}

function buildLines(relations: SajuCompatPillarRel[]): RelLine[] {
  const out: RelLine[] = []
  for (const r of relations) {
    const fk = PILLAR_KEY_FROM_LABEL[r.aPillar]
    const tk = PILLAR_KEY_FROM_LABEL[r.bPillar]
    if (!fk || !tk) continue
    const kind = dominantTag(r.tags)
    if (!LINE_STYLE[kind]) continue
    out.push({
      kind,
      fromIdx: PILLAR_ORDER.indexOf(fk),
      toIdx: PILLAR_ORDER.indexOf(tk),
      fromChar: r.aChar,
      toChar: r.bChar,
      tags: r.tags,
      tone: r.tone,
      priority: (r.isDayInvolved ? 0 : 10) + (TAG_PRI[kind] ?? 9),
    })
  }
  // 일주 관여 → clash 우선. 과밀 방지로 상위 8개.
  out.sort((a, b) => a.priority - b.priority)
  return out.slice(0, 8)
}

// 합/충은 chart-dictionary 정해석, 형/해/파는 tags + tone 글로스.
const TAG_TO_CAT: Record<string, RelationCategory> = {
  천간합: '천간합',
  천간충: '천간충',
  육합: '지지육합',
  충: '지지충',
}
const TONE_GLOSS_KO: Record<string, string> = {
  bond: '끌어당기는 결',
  clash: '부딪히는 결',
  friction: '미묘한 거리감',
  minor: '사소한 파열',
}
const TONE_GLOSS_EN: Record<string, string> = {
  bond: 'a pull together',
  clash: 'a clash',
  friction: 'a subtle distance',
  minor: 'a small break',
}
function lookupRelation(rel: RelLine, lang: 'ko' | 'en'): string {
  const cat = TAG_TO_CAT[rel.kind]
  if (cat) {
    for (const k of [`${rel.fromChar}${rel.toChar}`, `${rel.toChar}${rel.fromChar}`]) {
      const m = getRelationMeaning(cat, k, lang)
      if (m?.meaning) return m.meaning
    }
  }
  const tagStr = rel.tags.join(lang === 'ko' ? '·' : '+')
  const gloss = (lang === 'ko' ? TONE_GLOSS_KO : TONE_GLOSS_EN)[rel.tone] ?? ''
  return `${rel.fromChar}${rel.toChar} ${tagStr}${gloss ? ` — ${gloss}` : ''}`
}

// ── 컴포넌트 ────────────────────────────────────────────────────────────────
/** A/B side 와 pillar key 를 합쳐 ref 사전 key 로 사용 — 예: 'A-time', 'B-day'. */
type AnchorKey = `${'A' | 'B'}-${PillarKey}`

interface ContainerSize {
  width: number
  height: number
}
interface Point {
  x: number
  y: number
}

export function CompatLines({ sajuA, sajuB, relations, lang = 'ko', className }: CompatLinesProps) {
  const a = React.useMemo(() => pillarsOf(sajuA), [sajuA])
  const b = React.useMemo(() => pillarsOf(sajuB), [sajuB])
  const lines = React.useMemo(() => buildLines(relations), [relations])
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null)

  // ── refs ─────────────────────────────────────────────────────────────────
  // 컨테이너 (좌표 원점) 와 8 개 pillar 박스의 DOM 참조.
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const pillarRefs = React.useRef<Record<AnchorKey, HTMLDivElement | null>>({
    'A-time': null,
    'A-day': null,
    'A-month': null,
    'A-year': null,
    'B-time': null,
    'B-day': null,
    'B-month': null,
    'B-year': null,
  })
  const setPillarRef = React.useCallback(
    (key: AnchorKey) => (el: HTMLDivElement | null) => {
      pillarRefs.current[key] = el
    },
    []
  )

  // ── 실측 좌표 계산 ────────────────────────────────────────────────────────
  // A column 의 anchor = 박스 우측 중앙, B column 의 anchor = 박스 좌측 중앙.
  // 라인 endpoint 가 박스 경계에 정확히 붙어 자연스러운 연결을 만든다.
  const [anchors, setAnchors] = React.useState<Record<AnchorKey, Point | null>>({
    'A-time': null,
    'A-day': null,
    'A-month': null,
    'A-year': null,
    'B-time': null,
    'B-day': null,
    'B-month': null,
    'B-year': null,
  })
  const [containerSize, setContainerSize] = React.useState<ContainerSize>({ width: 0, height: 0 })

  const recompute = React.useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const cRect = container.getBoundingClientRect()
    const next: Record<AnchorKey, Point | null> = {
      'A-time': null,
      'A-day': null,
      'A-month': null,
      'A-year': null,
      'B-time': null,
      'B-day': null,
      'B-month': null,
      'B-year': null,
    }
    for (const key of Object.keys(pillarRefs.current) as AnchorKey[]) {
      const el = pillarRefs.current[key]
      if (!el) continue
      const r = el.getBoundingClientRect()
      const side = key.charAt(0) as 'A' | 'B'
      // A → 우측 중앙, B → 좌측 중앙.
      const x = side === 'A' ? r.right - cRect.left : r.left - cRect.left
      const y = r.top - cRect.top + r.height / 2
      next[key] = { x, y }
    }
    setAnchors(next)
    setContainerSize({ width: cRect.width, height: cRect.height })
  }, [])

  // 마운트·data 변경시 측정 (useLayoutEffect — paint 전 라인 좌표 확정).
  React.useLayoutEffect(() => {
    recompute()
  }, [recompute, a, b, lines.length, lang])

  // resize 대응 — 컨테이너 자체의 크기 변화 + window resize 둘 다.
  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => recompute())
    ro.observe(container)
    // 자식 박스 크기도 관찰 (폰트 로딩 / 컬럼 폭 변경).
    for (const el of Object.values(pillarRefs.current)) {
      if (el) ro.observe(el)
    }
    const onResize = () => recompute()
    window.addEventListener('resize', onResize)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [recompute])

  // ── 렌더링 helpers ────────────────────────────────────────────────────────
  const renderPillar = (p: Pillars[PillarKey], key: PillarKey, side: 'A' | 'B') => {
    const label = lang === 'ko' ? PILLAR_LABEL_KO[key] : PILLAR_LABEL_EN[key]
    const anchorKey: AnchorKey = `${side}-${key}`
    return (
      <div
        ref={setPillarRef(anchorKey)}
        className="flex h-10 items-center justify-center rounded-md border text-center"
        style={{
          borderColor: 'rgba(212, 181, 114, 0.3)',
          background: 'var(--ds-light-bg-soft, #f5f5f4)',
        }}
      >
        <div className="flex flex-col items-center leading-tight">
          <span className="text-[9px] opacity-60">
            {side} {label}
          </span>
          <span className="text-sm font-semibold" style={{ color: 'var(--ds-gold)' }}>
            {(p.stem ?? '·') + (p.branch ?? '·')}
          </span>
        </div>
      </div>
    )
  }

  // 각 라인의 endpoint 와 midpoint 를 픽셀 좌표로 미리 계산.
  // anchors 가 아직 측정 안 된 첫 paint 직전엔 빈 배열 → SVG 만 비어보이고 다음 frame 에 채워짐.
  const linesGeom = React.useMemo(() => {
    return lines.map((ln) => {
      const fromKey: AnchorKey = `A-${PILLAR_ORDER[ln.fromIdx]}`
      const toKey: AnchorKey = `B-${PILLAR_ORDER[ln.toIdx]}`
      const from = anchors[fromKey]
      const to = anchors[toKey]
      if (!from || !to) return null
      return {
        from,
        to,
        mid: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 } satisfies Point,
      }
    })
  }, [lines, anchors])

  return (
    <div className={`relative ${className ?? ''}`}>
      <div ref={containerRef} className="relative grid grid-cols-[1fr_auto_1fr] gap-x-2">
        {/* A column */}
        <div className="flex flex-col gap-2">
          {PILLAR_ORDER.map((k) => (
            <React.Fragment key={`a-${k}`}>{renderPillar(a[k], k, 'A')}</React.Fragment>
          ))}
        </div>
        {/* spacer — SVG overlay 가 가로지를 가운데 영역. */}
        <div className="w-16 sm:w-24" aria-hidden />
        {/* B column */}
        <div className="flex flex-col gap-2">
          {PILLAR_ORDER.map((k) => (
            <React.Fragment key={`b-${k}`}>{renderPillar(b[k], k, 'B')}</React.Fragment>
          ))}
        </div>

        {/* SVG overlay — pixel 좌표계, preserveAspectRatio 없이 1:1 매핑. */}
        <svg
          className="pointer-events-none absolute inset-0"
          width={containerSize.width || undefined}
          height={containerSize.height || undefined}
          viewBox={
            containerSize.width && containerSize.height
              ? `0 0 ${containerSize.width} ${containerSize.height}`
              : undefined
          }
          aria-hidden
        >
          {lines.map((ln, i) => {
            const geom = linesGeom[i]
            if (!geom) return null
            const style = LINE_STYLE[ln.kind]
            const active = hoverIdx === i
            return (
              <line
                key={`${ln.kind}-${ln.fromIdx}-${ln.toIdx}-${i}`}
                x1={geom.from.x}
                y1={geom.from.y}
                x2={geom.to.x}
                y2={geom.to.y}
                stroke={style.stroke}
                strokeWidth={active ? style.width + 1 : style.width}
                strokeDasharray={style.dash}
                strokeLinecap="round"
                opacity={active ? 1 : 0.85}
              />
            )
          })}
        </svg>

        {/* 라인 hit-target — 각 라인 midpoint pixel 좌표에 절대 배치. */}
        <div className="pointer-events-none absolute inset-0">
          {lines.map((ln, i) => {
            const geom = linesGeom[i]
            if (!geom) return null
            const label = lang === 'ko' ? LINE_STYLE[ln.kind].label : LINE_STYLE_EN[ln.kind]
            const meaning = lookupRelation(ln, lang)
            return (
              <button
                key={`hit-${i}`}
                type="button"
                className="pointer-events-auto absolute cursor-help rounded-full px-1.5 py-0.5 text-[9px]"
                style={{
                  left: `${geom.mid.x}px`,
                  top: `${geom.mid.y}px`,
                  transform: 'translate(-50%, -50%)',
                  background: '#ffffff',
                  border: `1px solid ${LINE_STYLE[ln.kind].stroke}`,
                  color: LINE_STYLE[ln.kind].stroke,
                }}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
                onFocus={() => setHoverIdx(i)}
                onBlur={() => setHoverIdx(null)}
                onClick={() => setHoverIdx((cur) => (cur === i ? null : i))}
                aria-label={`${ln.fromChar}${ln.toChar} ${label}`}
              >
                {ln.fromChar}
                {ln.toChar}
                {hoverIdx === i && (
                  <span
                    className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 w-max max-w-[220px] -translate-x-1/2
                      rounded-md px-2 py-1.5 text-[10px] font-normal leading-snug"
                    style={{
                      background: '#ffffff',
                      color: 'var(--ds-light-text)',
                      border: '1px solid rgba(212, 181, 114, 0.4)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                    }}
                    role="tooltip"
                  >
                    <span style={{ color: 'var(--ds-gold)', fontWeight: 600 }}>
                      {ln.fromChar}
                      {ln.toChar} {label}
                    </span>
                    {meaning && <div className="mt-0.5">{meaning}</div>}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[9px] opacity-70">
        {Object.keys(LINE_STYLE).map((k) => {
          const s = LINE_STYLE[k]
          const label = lang === 'ko' ? s.label : LINE_STYLE_EN[k]
          return (
            <span key={k} className="inline-flex items-center gap-1">
              <span
                aria-hidden
                style={{
                  display: 'inline-block',
                  width: 14,
                  height: 0,
                  borderTop: `${s.width}px ${s.dash ? 'dashed' : 'solid'} ${s.stroke}`,
                }}
              />
              {label}
            </span>
          )
        })}
      </div>

      {lines.length === 0 && (
        <p className="mt-3 text-center text-[10px] opacity-50">
          {lang === 'ko'
            ? '직접적 합·충 관계가 발견되지 않았습니다.'
            : 'No direct combine/clash relations detected.'}
        </p>
      )}
    </div>
  )
}
