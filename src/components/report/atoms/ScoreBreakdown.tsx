'use client'

import React from 'react'

/**
 * 궁합 점수 분해 카드 — 총점 + 5 카테고리 시각 바.
 *
 * Level 1 모달에서 PersonaCard/InsightStrip 다음, 두 사람의 사주·천문
 * raw 데이터를 받아 "왜 이 점수인가" 를 한눈에 보여줌. breakdown 을 직접
 * 넘기면 그대로 표시, 미제공이면 sajuA/sajuB(천간·지지) + astroA/astroB
 * (planets/aspects) 에서 자동 계산.
 */

interface BreakdownScores {
  /** 사주 합 (천간합·삼합·육합·방합) — 0~100 */
  eastern_hap?: number
  /** 사주 충 (감점 반전 — 높을수록 충 없음) — 0~100 */
  eastern_chung?: number
  /** 오행 보완 — 0~100 */
  elements_match?: number
  /** 시너스트리 트라인/섹스타일 — 0~100 */
  synastry_harmonic?: number
  /** 시너스트리 사각/대립 (감점 반전 — 높을수록 긴장 없음) — 0~100 */
  synastry_tension?: number
}

export interface ScoreBreakdownProps {
  /** 총합 점수 0-100. 미제공 시 breakdown 평균으로 도출. */
  total?: number
  /** 카테고리별 0-100. 없으면 saju/astro raw 에서 도출. */
  breakdown?: BreakdownScores
  sajuA?: unknown
  sajuB?: unknown
  astroA?: unknown
  astroB?: unknown
  lang?: 'ko' | 'en'
  className?: string
  /**
   * 'score' (기본) — 큰 "N / 100" 숫자 + verdict + 분해 바.
   * 'band' — 점수 산식이 보정된 휴리스틱이라 정밀 숫자를 헤드라인으로 박지
   *   않는다. 큰 숫자 대신 verdict 밴드 라벨을 크게 + 분해 바로 근거를 그대로
   *   노출(조화/긴장 포함). 차트 리포트 히어로용.
   */
  variant?: 'score' | 'band'
}

// ─── 사주 raw 추출 ────────────────────────────────────────────────────

interface GanjiCell {
  name?: string
  element?: string
}
interface PillarShape {
  heavenlyStem?: GanjiCell
  earthlyBranch?: GanjiCell
}
interface SajuLike {
  yearPillar?: PillarShape
  monthPillar?: PillarShape
  dayPillar?: PillarShape
  timePillar?: PillarShape
  hourPillar?: PillarShape
  pillars?: { year?: PillarShape; month?: PillarShape; day?: PillarShape; time?: PillarShape }
  fiveElements?: Record<string, number>
}

function pickStemsAndBranches(saju: SajuLike | undefined): { stems: string[]; branches: string[] } {
  if (!saju) return { stems: [], branches: [] }
  const pillars: Array<PillarShape | undefined> = [
    saju.yearPillar ?? saju.pillars?.year,
    saju.monthPillar ?? saju.pillars?.month,
    saju.dayPillar ?? saju.pillars?.day,
    saju.timePillar ?? saju.hourPillar ?? saju.pillars?.time,
  ]
  const stems: string[] = []
  const branches: string[] = []
  for (const p of pillars) {
    const s = p?.heavenlyStem?.name
    const b = p?.earthlyBranch?.name
    if (s) stems.push(s)
    if (b) branches.push(b)
  }
  return { stems, branches }
}

// ─── 합·충 사전 ───────────────────────────────────────────────────────

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
const BRANCH_SAMHAP: string[][] = [
  ['申', '子', '辰'],
  ['亥', '卯', '未'],
  ['寅', '午', '戌'],
  ['巳', '酉', '丑'],
]
const BRANCH_BANGHAP: string[][] = [
  ['寅', '卯', '辰'],
  ['巳', '午', '未'],
  ['申', '酉', '戌'],
  ['亥', '子', '丑'],
]
const BRANCH_CHUNG: Array<[string, string]> = [
  ['子', '午'],
  ['丑', '未'],
  ['寅', '申'],
  ['卯', '酉'],
  ['辰', '戌'],
  ['巳', '亥'],
]

function countPairMatches(setA: string[], setB: string[], pairs: Array<[string, string]>): number {
  let n = 0
  for (const [x, y] of pairs) {
    const ab = setA.includes(x) && setB.includes(y)
    const ba = setA.includes(y) && setB.includes(x)
    if (ab || ba) n += 1
  }
  return n
}

function countTrineMatches(setA: string[], setB: string[], groups: string[][]): number {
  let n = 0
  for (const g of groups) {
    // A 와 B 가 함께 g 의 모든 원소를 채우면 매칭 (A 만 또는 B 만 풀 셋이면 카운트 안 함)
    const inA = g.filter((b) => setA.includes(b)).length
    const inB = g.filter((b) => setB.includes(b)).length
    if (inA >= 1 && inB >= 1 && inA + inB >= g.length) n += 1
  }
  return n
}

// ─── 오행 ─────────────────────────────────────────────────────────────

const EN_TO_KO_ELEMENT: Record<string, string> = {
  wood: '목',
  fire: '화',
  earth: '토',
  metal: '금',
  water: '수',
}
const ELEMENTS_KO = ['목', '화', '토', '금', '수'] as const

function normalizeFiveElements(
  raw: Record<string, number> | undefined
): Record<string, number> | undefined {
  if (!raw) return undefined
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v !== 'number') continue
    const ko = EN_TO_KO_ELEMENT[k] ?? k
    out[ko] = (out[ko] ?? 0) + v
  }
  return out
}

function elementsComplementScore(
  a: SajuLike | undefined,
  b: SajuLike | undefined
): number | undefined {
  const ea = normalizeFiveElements(a?.fiveElements)
  const eb = normalizeFiveElements(b?.fiveElements)
  if (!ea || !eb) return undefined
  const haveAny = ELEMENTS_KO.some((e) => ea[e] !== undefined || eb[e] !== undefined)
  if (!haveAny) return undefined
  // A 부족 (≤1) ↔ B 풍부 (≥2) 각 매칭 +20, 양방향 합산 max 100.
  let score = 0
  for (const el of ELEMENTS_KO) {
    const av = ea[el] ?? 0
    const bv = eb[el] ?? 0
    if (av <= 1 && bv >= 2) score += 20
    if (bv <= 1 && av >= 2) score += 20
  }
  return Math.min(100, score)
}

// ─── 시너스트리 ───────────────────────────────────────────────────────

interface PlanetInput {
  name: string
  longitude: number
}
interface AspectInput {
  type?: string
  kind?: string
  aspect?: string
  planetA?: string
  planetB?: string
  a?: string
  b?: string
}
interface AstroLike {
  planets?: PlanetInput[]
  aspects?: AspectInput[]
  synastry?: { aspects?: AspectInput[] }
}

const HARMONIC_TYPES = new Set(['trine', 'sextile', 'conjunction'])
const TENSION_TYPES = new Set(['square', 'opposition'])

function classifyByLongitude(diff: number): 'harmonic' | 'tension' | null {
  const d = Math.abs(((diff + 180) % 360) - 180) // 0~180
  // 6° orb
  const within = (target: number) => Math.abs(d - target) <= 6
  if (within(120) || within(60) || within(0)) return 'harmonic'
  if (within(90) || within(180)) return 'tension'
  return null
}

function synastryScores(
  astroA: AstroLike | undefined,
  astroB: AstroLike | undefined
): { harmonic?: number; tension?: number } {
  if (!astroA && !astroB) return {}
  // 우선순위 1: 명시적 synastry.aspects (이미 계산됨)
  const explicit = astroA?.synastry?.aspects ?? astroB?.synastry?.aspects
  if (explicit && explicit.length > 0) {
    let harm = 0
    let tens = 0
    for (const asp of explicit) {
      const t = (asp.type ?? asp.kind ?? asp.aspect ?? '').toLowerCase()
      if (HARMONIC_TYPES.has(t)) harm += 1
      else if (TENSION_TYPES.has(t)) tens += 1
    }
    return {
      harmonic: Math.min(100, harm * 12),
      tension: Math.max(0, 100 - tens * 12),
    }
  }
  // 우선순위 2: planets cross-pair longitude diff
  const pa = astroA?.planets
  const pb = astroB?.planets
  if (!Array.isArray(pa) || !Array.isArray(pb) || pa.length === 0 || pb.length === 0) {
    return {}
  }
  let harm = 0
  let tens = 0
  for (const a of pa) {
    if (typeof a.longitude !== 'number') continue
    for (const b of pb) {
      if (typeof b.longitude !== 'number') continue
      const kind = classifyByLongitude(a.longitude - b.longitude)
      if (kind === 'harmonic') harm += 1
      else if (kind === 'tension') tens += 1
    }
  }
  return {
    harmonic: Math.min(100, harm * 5),
    tension: Math.max(0, 100 - tens * 5),
  }
}

// ─── breakdown 자동 도출 ─────────────────────────────────────────────

function deriveBreakdown(
  sajuA: SajuLike | undefined,
  sajuB: SajuLike | undefined,
  astroA: AstroLike | undefined,
  astroB: AstroLike | undefined
): BreakdownScores {
  const out: BreakdownScores = {}

  const A = pickStemsAndBranches(sajuA)
  const B = pickStemsAndBranches(sajuB)
  const haveSaju = A.stems.length + A.branches.length > 0 && B.stems.length + B.branches.length > 0

  if (haveSaju) {
    // 합: 천간합 +20 / 육합 +10 / 삼합 +15 / 방합 +5 (가중치 축소)
    // 자평진전 기준 — 삼합 (오행 변환) 이 강한 합, 방합 (같은 계절 모임) 은
    // 같은 지지 멤버가 삼합·방합 양쪽 group 에 속해 double-count 위험 존재
    // (예: 寅 이 寅卯辰 방합 + 寅午戌 삼합 모두 멤버). 방합 가중치를 낮춰
    // 동일 매칭이 양쪽에서 잡힐 때 점수 인플레 완화.
    const stemHap = countPairMatches(A.stems, B.stems, STEM_HAP) * 20
    const yukhap = countPairMatches(A.branches, B.branches, BRANCH_YUKHAP) * 10
    const samhap = countTrineMatches(A.branches, B.branches, BRANCH_SAMHAP) * 15
    const banghap = countTrineMatches(A.branches, B.branches, BRANCH_BANGHAP) * 5
    out.eastern_hap = Math.max(0, Math.min(100, stemHap + yukhap + samhap + banghap))

    // 충: 천간충 -15, 지지충 -10 → 100 에서 차감
    const stemChung = countPairMatches(A.stems, B.stems, STEM_CHUNG) * 15
    const branchChung = countPairMatches(A.branches, B.branches, BRANCH_CHUNG) * 10
    out.eastern_chung = Math.max(0, Math.min(100, 100 - (stemChung + branchChung)))
  }

  const elem = elementsComplementScore(sajuA, sajuB)
  if (elem !== undefined) out.elements_match = elem

  const syn = synastryScores(astroA, astroB)
  if (syn.harmonic !== undefined) out.synastry_harmonic = syn.harmonic
  if (syn.tension !== undefined) out.synastry_tension = syn.tension

  return out
}

// ─── verdict ─────────────────────────────────────────────────────────

function verdictText(total: number, lang: 'ko' | 'en'): string {
  if (lang === 'en') {
    if (total >= 90) return 'Profound bond — naturally aligned'
    if (total >= 75) return 'Complementary differences — deep harmony with gentle spark'
    if (total >= 60) return 'Moderate — grows with mutual effort'
    if (total >= 45) return 'Challenging — mind the friction zones'
    return 'Very different rhythms — approach with care'
  }
  if (total >= 90) return '매우 깊은 인연 — 자연스러운 합'
  if (total >= 75) return '서로 다른 결이 보완 — 깊은 합 + 약간 자극'
  if (total >= 60) return '보통 — 노력하면 좋아짐'
  if (total >= 45) return '도전적 — 충돌 영역 의식 필요'
  return '결이 매우 다름 — 신중한 접근'
}

// ─── 표시 ────────────────────────────────────────────────────────────

interface RowConfig {
  key: keyof BreakdownScores
  emoji: string
  labelKo: string
  labelEn: string
  /** 바 색 — 조화 계열(골드) vs 긴장 계열(로즈레드). */
  tone: 'harmony' | 'tension'
  /** 0-100 점수에서 빈 바일 때 표시할 보조 텍스트 */
  emptyKo: string
  emptyEn: string
}

const ROWS: RowConfig[] = [
  {
    key: 'eastern_hap',
    emoji: '💕',
    labelKo: '사주 합',
    labelEn: 'Saju Union',
    tone: 'harmony',
    emptyKo: '합 없음',
    emptyEn: 'no union',
  },
  {
    key: 'eastern_chung',
    emoji: '⚠️',
    labelKo: '사주 충',
    labelEn: 'Saju Clash',
    tone: 'tension',
    emptyKo: '충돌 강함',
    emptyEn: 'high clash',
  },
  {
    key: 'elements_match',
    emoji: '🌿',
    labelKo: '오행 보완',
    labelEn: 'Element Match',
    tone: 'harmony',
    emptyKo: '보완 적음',
    emptyEn: 'low complement',
  },
  {
    key: 'synastry_harmonic',
    emoji: '♀♂',
    labelKo: '시너 조화',
    labelEn: 'Synastry Harmony',
    tone: 'harmony',
    emptyKo: '조화 적음',
    emptyEn: 'low harmony',
  },
  {
    key: 'synastry_tension',
    emoji: '♂♄',
    labelKo: '시너 긴장',
    labelEn: 'Synastry Tension',
    tone: 'tension',
    emptyKo: '긴장 강함',
    emptyEn: 'high tension',
  },
]

function ScoreBar({ value, tone = 'harmony' }: { value: number; tone?: 'harmony' | 'tension' }) {
  const clamped = Math.max(0, Math.min(100, value))
  // 긴장 계열(시너 긴장·사주 충)은 로즈레드, 조화 계열은 골드 — 한눈에 좋은
  // 신호 vs 마찰 신호를 색으로 구분(차트 전체 tension red #f9a8a8 와 통일).
  const fill =
    tone === 'tension'
      ? 'linear-gradient(90deg, #f9a8a8 0%, rgba(249,168,168,0.5) 100%)'
      : 'linear-gradient(90deg, var(--ds-gold-on-dark, #d4af6a) 0%, var(--ds-gold-on-dark-soft, #c9a76a) 100%)'
  return (
    <div
      className="relative h-2 flex-1 overflow-hidden rounded-full"
      style={{ background: 'rgba(255,255,255,0.08)' }}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${clamped}%`, background: fill }}
      />
    </div>
  )
}

export function ScoreBreakdown({
  total,
  breakdown,
  sajuA,
  sajuB,
  astroA,
  astroB,
  lang = 'ko',
  className,
  variant = 'score',
}: ScoreBreakdownProps) {
  const computed: BreakdownScores =
    breakdown ??
    deriveBreakdown(
      sajuA as SajuLike | undefined,
      sajuB as SajuLike | undefined,
      astroA as AstroLike | undefined,
      astroB as AstroLike | undefined
    )

  const availableRows = ROWS.filter((r) => computed[r.key] !== undefined)

  // 총합: 명시 total > breakdown 평균 > 0
  let totalScore: number
  if (typeof total === 'number') {
    totalScore = Math.max(0, Math.min(100, total))
  } else {
    const vals = availableRows
      .map((r) => computed[r.key])
      .filter((v): v is number => typeof v === 'number')
    totalScore = vals.length > 0 ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0
  }

  if (availableRows.length === 0 && total === undefined) {
    return null
  }

  const verdict = verdictText(totalScore, lang)
  const headerKo = '총합 궁합 점수'
  const headerEn = 'Overall Compatibility'

  return (
    <div
      className={`rounded-xl p-4 ${className ?? ''}`}
      style={{
        background:
          'linear-gradient(135deg, rgba(212,175,106,0.10) 0%, rgba(168,131,240,0.10) 100%)',
        border: '1px solid var(--ds-dark-border, rgba(255,255,255,0.10))',
      }}
    >
      {/* 총점 헤더 */}
      <div className="flex flex-col items-center gap-1 pb-3">
        <div
          className="text-[11px] font-medium uppercase tracking-wider"
          style={{ color: 'var(--ds-gold-on-dark, #d4af6a)' }}
        >
          {lang === 'en' ? headerEn : headerKo}
        </div>
        {variant === 'band' ? (
          // 밴드 모드 — 큰 숫자 대신 verdict 라벨을 크게. 근거는 아래 분해 바.
          <div
            className="px-2 text-center font-semibold"
            style={{
              fontSize: 24,
              lineHeight: 1.25,
              fontFamily: 'var(--font-cinzel), Georgia, serif',
              color: 'var(--ds-gold-on-dark, #d4af6a)',
              textShadow: '0 1px 12px rgba(212,175,106,0.25)',
            }}
          >
            {verdict}
          </div>
        ) : (
          <>
            <div
              className="font-bold leading-none"
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: 'var(--ds-gold-on-dark, #d4af6a)',
              }}
            >
              {totalScore}
              <span
                className="text-base font-normal"
                style={{ color: 'var(--ds-dark-text-muted, rgba(255,255,255,0.55))' }}
              >
                {' '}
                / 100
              </span>
            </div>
            <div
              className="text-center text-xs"
              style={{ color: 'var(--ds-dark-text, rgba(255,255,255,0.85))' }}
            >
              {verdict}
            </div>
          </>
        )}
      </div>

      {/* 구분선 */}
      <div
        className="my-2 h-px"
        style={{ background: 'var(--ds-dark-border, rgba(255,255,255,0.10))' }}
      />

      {/* 카테고리 바 */}
      <ul className="space-y-2">
        {availableRows.map((row) => {
          const score = computed[row.key] ?? 0
          const isEmpty = score <= 5
          return (
            <li key={row.key} className="flex items-center gap-3 text-xs">
              <span
                className="flex w-24 shrink-0 items-center gap-1.5"
                style={{ color: 'var(--ds-dark-text, rgba(255,255,255,0.85))' }}
              >
                <span aria-hidden="true">{row.emoji}</span>
                <span>{lang === 'en' ? row.labelEn : row.labelKo}</span>
              </span>
              <ScoreBar value={score} tone={row.tone} />
              <span
                className="w-14 shrink-0 text-right tabular-nums"
                style={{
                  color: isEmpty
                    ? 'var(--ds-dark-text-muted, rgba(255,255,255,0.5))'
                    : 'var(--ds-gold-on-dark-soft, #c9a76a)',
                }}
              >
                {isEmpty ? (lang === 'en' ? row.emptyEn : row.emptyKo) : Math.round(score)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
