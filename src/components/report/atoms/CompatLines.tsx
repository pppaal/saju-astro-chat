'use client'

import React from 'react'
import { getRelationMeaning, type RelationCategory } from '@/lib/chart-dictionary'

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
  /** A 사주 raw — pillars 추출 */
  sajuA: unknown
  /** B 사주 raw */
  sajuB: unknown
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

// ── 관계 사전 ────────────────────────────────────────────────────────────────
const STEM_HAP: Array<[string, string]> = [
  ['甲', '己'],
  ['乙', '庚'],
  ['丙', '辛'],
  ['丁', '壬'],
  ['戊', '癸'],
]
const STEM_CHUNG: Array<[string, string]> = [
  ['甲', '庚'],
  ['乙', '辛'],
  ['丙', '壬'],
  ['丁', '癸'],
]
const BRANCH_YUKHAP: Array<[string, string]> = [
  ['子', '丑'],
  ['寅', '亥'],
  ['卯', '戌'],
  ['辰', '酉'],
  ['巳', '申'],
  ['午', '未'],
]
const BRANCH_CHUNG: Array<[string, string]> = [
  ['子', '午'],
  ['丑', '未'],
  ['寅', '申'],
  ['卯', '酉'],
  ['辰', '戌'],
  ['巳', '亥'],
]
const BRANCH_WONJIN: Array<[string, string]> = [
  ['子', '未'],
  ['丑', '午'],
  ['寅', '酉'],
  ['卯', '申'],
  ['辰', '亥'],
  ['巳', '戌'],
]
// 삼합 4 국 — 두 지지가 같은 국 안에 있으면 partial 삼합.
const BRANCH_SAMHAP_GROUPS: string[][] = [
  ['申', '子', '辰'],
  ['亥', '卯', '未'],
  ['寅', '午', '戌'],
  ['巳', '酉', '丑'],
]

function isPair(pairs: Array<[string, string]>, a: string, b: string): boolean {
  return pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
}
function inSameSamhap(a: string, b: string): boolean {
  if (a === b) return false
  return BRANCH_SAMHAP_GROUPS.some((g) => g.includes(a) && g.includes(b))
}

// ── pillars 추출 ────────────────────────────────────────────────────────────
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

// ── 라인 모델 ────────────────────────────────────────────────────────────────
type LineKind = 'stemHap' | 'stemChung' | 'branchYukhap' | 'branchSamhap' | 'branchChung' | 'wonjin'
interface RelLine {
  kind: LineKind
  fromIdx: number // 0..3 — A 의 PILLAR_ORDER index (時→0)
  toIdx: number // 0..3 — B 의 PILLAR_ORDER index
  fromChar: string
  toChar: string
  category: RelationCategory
  pairKey: string // 사전 lookup 용 (예: '寅亥')
  priority: number // 작을수록 먼저 표시
}

const LINE_STYLE: Record<
  LineKind,
  { stroke: string; width: number; dash?: string; label: string }
> = {
  stemHap: { stroke: 'var(--ds-gold-on-dark)', width: 2, label: '천간합' },
  stemChung: { stroke: '#f87171', width: 1.5, dash: '4 3', label: '천간충' },
  branchYukhap: { stroke: '#34d399', width: 1.5, label: '지지육합' },
  branchSamhap: { stroke: '#a78bfa', width: 1.5, label: '지지삼합' },
  branchChung: { stroke: '#f87171', width: 1.2, dash: '4 3', label: '지지충' },
  wonjin: { stroke: '#fbbf24', width: 1, dash: '2 2', label: '원진' },
}

const LINE_STYLE_EN: Record<LineKind, string> = {
  stemHap: 'Stem Combine',
  stemChung: 'Stem Clash',
  branchYukhap: 'Branch Six-Harmony',
  branchSamhap: 'Branch Trine',
  branchChung: 'Branch Clash',
  wonjin: 'Wonjin',
}

function computeLines(a: Pillars, b: Pillars): RelLine[] {
  const out: RelLine[] = []
  PILLAR_ORDER.forEach((ka, ai) => {
    PILLAR_ORDER.forEach((kb, bi) => {
      const aStem = a[ka].stem
      const bStem = b[kb].stem
      const aBr = a[ka].branch
      const bBr = b[kb].branch
      const dayInvolved = ka === 'day' || kb === 'day'
      const basePri = dayInvolved ? 0 : 10

      if (aStem && bStem) {
        if (isPair(STEM_HAP, aStem, bStem)) {
          out.push({
            kind: 'stemHap',
            fromIdx: ai,
            toIdx: bi,
            fromChar: aStem,
            toChar: bStem,
            category: '천간합',
            pairKey: pickKey('천간합', aStem, bStem),
            priority: basePri + 1,
          })
        } else if (isPair(STEM_CHUNG, aStem, bStem)) {
          out.push({
            kind: 'stemChung',
            fromIdx: ai,
            toIdx: bi,
            fromChar: aStem,
            toChar: bStem,
            category: '천간충',
            pairKey: pickKey('천간충', aStem, bStem),
            priority: basePri + 3,
          })
        }
      }
      if (aBr && bBr) {
        if (isPair(BRANCH_YUKHAP, aBr, bBr)) {
          out.push({
            kind: 'branchYukhap',
            fromIdx: ai,
            toIdx: bi,
            fromChar: aBr,
            toChar: bBr,
            category: '지지육합',
            pairKey: pickKey('지지육합', aBr, bBr),
            priority: basePri + 2,
          })
        } else if (isPair(BRANCH_CHUNG, aBr, bBr)) {
          out.push({
            kind: 'branchChung',
            fromIdx: ai,
            toIdx: bi,
            fromChar: aBr,
            toChar: bBr,
            category: '지지충',
            pairKey: pickKey('지지충', aBr, bBr),
            priority: basePri + 4,
          })
        } else if (isPair(BRANCH_WONJIN, aBr, bBr)) {
          out.push({
            kind: 'wonjin',
            fromIdx: ai,
            toIdx: bi,
            fromChar: aBr,
            toChar: bBr,
            category: '원진',
            pairKey: pickKey('원진', aBr, bBr),
            priority: basePri + 6,
          })
        } else if (inSameSamhap(aBr, bBr)) {
          // 삼합은 단일 글자 쌍 키가 사전에 없을 수 있어 pairKey 는 그룹 표기.
          const group = BRANCH_SAMHAP_GROUPS.find((g) => g.includes(aBr) && g.includes(bBr))!
          out.push({
            kind: 'branchSamhap',
            fromIdx: ai,
            toIdx: bi,
            fromChar: aBr,
            toChar: bBr,
            category: '지지삼합',
            pairKey: group.join(''),
            priority: basePri + 5,
          })
        }
      }
    })
  })
  // 정렬 후 상위 6개만 — 라인 과밀 방지.
  out.sort((x, y) => x.priority - y.priority)
  return out.slice(0, 6)
}

// 사전 키는 정렬-독립이 아닌 고정 순서 (예: '寅亥'). 두 방향 모두 시도해서 존재 키 반환.
function pickKey(_cat: RelationCategory, a: string, b: string): string {
  return `${a}${b}`
}
function lookupRelation(rel: RelLine, lang: 'ko' | 'en'): string | null {
  const tryKeys = [rel.pairKey, `${rel.toChar}${rel.fromChar}`]
  for (const k of tryKeys) {
    const r = getRelationMeaning(rel.category, k, lang)
    if (r?.meaning) return r.meaning
  }
  // 삼합 그룹 키 (3자) 도 시도.
  const r3 = getRelationMeaning(rel.category, rel.pairKey, lang)
  return r3?.meaning ?? null
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

export function CompatLines({ sajuA, sajuB, lang = 'ko', className }: CompatLinesProps) {
  const a = React.useMemo(() => pillarsOf(sajuA), [sajuA])
  const b = React.useMemo(() => pillarsOf(sajuB), [sajuB])
  const lines = React.useMemo(() => computeLines(a, b), [a, b])
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
          background: 'rgba(20, 16, 32, 0.55)',
        }}
      >
        <div className="flex flex-col items-center leading-tight">
          <span className="text-[9px] opacity-60">
            {side} {label}
          </span>
          <span className="text-sm font-semibold" style={{ color: 'var(--ds-gold-on-dark)' }}>
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
                  background: 'rgba(20, 16, 32, 0.85)',
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
                      background: 'rgba(20, 16, 32, 0.96)',
                      color: 'rgba(245, 247, 251, 0.92)',
                      border: '1px solid rgba(212, 181, 114, 0.4)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                    }}
                    role="tooltip"
                  >
                    <span style={{ color: 'var(--ds-gold-on-dark)', fontWeight: 600 }}>
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
        {(Object.keys(LINE_STYLE) as LineKind[]).map((k) => {
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
