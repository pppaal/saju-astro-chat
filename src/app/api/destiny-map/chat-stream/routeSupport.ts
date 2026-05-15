// Single-user timing formatter for the destiny counselor.
// Mirrors the compatibility counselor's `formatTimingForPrompt` shape so
// the LLM sees the same prose-with-headers structure in both flows, but
// scoped to one person and with the current cycle marked by ★.
//
// Reads pre-computed cycles off the saju/astro inputs — does NOT compute
// timing. Calculation lives in `calculateSajuData()` / the astrology
// engine; this file is presentation only.

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function getStr(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

interface SaeunRow {
  year: number | null
  stem: string
  branch: string
  element: string
  summary: string
  isCurrent: boolean
}

// 60갑자 inline 계산. saju.unse.annual은 현재 연도부터 forward로만
// 사전 populate되지만, 같은 modular 공식이라 과거 연도도 cost 0으로
// 재구성된다.
const SAEUN_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const SAEUN_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const SAEUN_STEM_ELEMENT_KO = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수']

function computeSaeunRow(year: number, currentYear: number): SaeunRow {
  const idx60 = (year - 4 + 6000) % 60
  const stem = SAEUN_STEMS[idx60 % 10]
  const branch = SAEUN_BRANCHES[idx60 % 12]
  const element = SAEUN_STEM_ELEMENT_KO[idx60 % 10]
  return {
    year,
    stem,
    branch,
    element,
    summary: '',
    isCurrent: year === currentYear,
  }
}

function buildSaeunRows(
  saju: Record<string, unknown>,
  currentYear: number,
  windowBack = 3,
  windowForward = 5
): SaeunRow[] {
  const unse = asRecord(saju.unse)
  const preComputed =
    asArray(unse?.annual).length > 0 ? asArray(unse?.annual) : asArray(saju.yeonun)
  // Index pre-computed entries by year so any extra fields (summary,
  // sibsin) carry through; missing years are filled with the inline
  // modular computation.
  const byYear = new Map<number, SaeunRow>()
  for (const raw of preComputed) {
    const item = asRecord(raw)
    if (!item) continue
    const year = toNumber(item.year)
    if (year === null) continue
    byYear.set(year, {
      year,
      stem: getStr(item.heavenlyStem ?? item.stem),
      branch: getStr(item.earthlyBranch ?? item.branch),
      element: getStr(item.element),
      summary: getStr(item.summary),
      isCurrent: year === currentYear,
    })
  }
  const rows: SaeunRow[] = []
  for (let y = currentYear - windowBack; y <= currentYear + windowForward; y++) {
    rows.push(byYear.get(y) ?? computeSaeunRow(y, currentYear))
  }
  return rows
}

interface TransitAspect {
  from?: { name?: string; sign?: string }
  to?: { name?: string; sign?: string }
  type?: string
  orb?: number
  applying?: boolean
}

const SLOW_PLANETS = new Set(['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Chiron'])

function pickTopTransits(aspects: unknown, limit = 5): string[] {
  if (!Array.isArray(aspects)) return []
  const list = (aspects as TransitAspect[]).filter(
    (a) => a && a.from?.name && a.to?.name && a.type && typeof a.orb === 'number'
  )
  list.sort((a, b) => {
    const aSlow = SLOW_PLANETS.has(String(a.from?.name)) ? 0 : 1
    const bSlow = SLOW_PLANETS.has(String(b.from?.name)) ? 0 : 1
    if (aSlow !== bSlow) return aSlow - bSlow
    return (a.orb ?? 99) - (b.orb ?? 99)
  })
  return list.slice(0, limit).map((a) => {
    const arrow = a.applying ? '↗' : '↘'
    const fromName = String(a.from?.name)
    const toName = String(a.to?.name)
    const toSign = a.to?.sign ? ` ${a.to.sign}` : ''
    return `${fromName} ${a.type} ${toName}${toSign} (orb ${(a.orb ?? 0).toFixed(1)}° ${arrow})`
  })
}

export interface TimedTransitSnapshot {
  label: string
  isoDate: string
  aspects: unknown[]
}

export interface FormatTimingInput {
  saju?: Record<string, unknown> | null
  astro?: Record<string, unknown> | null
  birthDate?: string
  lang: 'ko' | 'en'
  now?: Date
  /**
   * Optional past/future transit snapshots. The engine can compute
   * findMajorTransits at any date — the destiny route passes a small
   * window (past ~12mo, +6mo) so the LLM can answer "why was last year
   * heavy?" / "what's coming next half?" without hallucinating ephemeris.
   */
  timedTransits?: TimedTransitSnapshot[]
}

/**
 * Single-user timing block for the destiny counselor prompt.
 *
 * Output (Korean example):
 *
 *   == 시기 흐름 (사주 대운/세운 + 점성 트랜짓·리턴) ==
 *
 *   [사주 대운 — 전 생애]
 *       1대운 (5-14)   壬辰 水
 *       2대운 (15-24)  辛卯 木
 *     ★ 4대운 (35-44)  己丑 土   ← 현재
 *     ...
 *   [사주 세운] (현재 + 향후)
 *     ★ 2026  丙午 火
 *       2027  丁未 土
 *     ...
 *   [사주 월운] 2026-05: 癸巳
 *   [점성 트랜짓] (2026-05-14)
 *     - Saturn trine Sun (orb 2.1° ↘)
 *     - Jupiter square Moon (orb 3.8° ↗)
 *   [점성 솔라 리턴] 2026: Asc Libra, ...
 *   [점성 루나 리턴] 2026-05: Asc Gemini, ...
 */
/**
 * Supplementary timing block — emits ONLY data that the main
 * `buildAllDataPrompt` (COMPREHENSIVE SNAPSHOT) does NOT already
 * carry:
 *
 *   1. 사주 세운 과거 3년 — main template only ships future saeun.
 *   2. 점성 트랜짓 -12mo / +6mo snapshots — main template only ships
 *      current transits.
 *
 * Anything else (대운 전 생애, 월운 현재, 솔라/루나 리턴, 현재
 * 트랜짓) is already produced by `buildAllDataPrompt` and emitting it
 * again here just inflates the prompt without new signal.
 */
export function formatTimingForPrompt(input: FormatTimingInput): string {
  const { saju, lang } = input
  const now = input.now ?? new Date()
  const isKo = lang === 'ko'

  const sajuRecord = asRecord(saju)
  const currentYear = now.getFullYear()

  const out: string[] = []

  // --- 사주 세운 — 과거 3년만 (현재 + 미래는 main template에 있음)
  if (sajuRecord) {
    const saeunRows = buildSaeunRows(sajuRecord, currentYear, 3, 0).filter(
      (row) => row.year !== null && row.year < currentYear
    )
    if (saeunRows.length > 0) {
      out.push(isKo ? '[사주 세운 — 과거 3년]' : '[Saju Saeun — past 3y]')
      for (const row of saeunRows) {
        const gz = `${row.stem}${row.branch}`.trim()
        const elem = row.element ? ` ${row.element}` : ''
        const summary = row.summary ? ` — ${row.summary}` : ''
        out.push(`   ${row.year}  ${gz}${elem}${summary}`)
      }
      out.push('')
    }
  }

  // --- 점성 트랜짓 — -12mo / +6mo snapshot만 (현재는 main template에 있음)
  const timed = (input.timedTransits ?? []).filter(
    (snap) => snap.label && !/현재|now/i.test(snap.label)
  )
  if (timed.length > 0) {
    out.push(isKo ? '[점성 트랜짓 — 과거/미래 스냅샷]' : '[Astro Transits — past/future snapshots]')
    for (const snap of timed) {
      const lines = pickTopTransits(snap.aspects, 5)
      if (lines.length === 0) continue
      out.push(`  ${snap.label} (${snap.isoDate.slice(0, 10)}):`)
      lines.forEach((line) => out.push(`    - ${line}`))
    }
    out.push('')
  }

  if (out.length === 0) return ''

  const header = isKo
    ? '== 추가 시점 (과거 세운 + ±스냅샷 트랜짓) =='
    : '== Supplementary timing (past saeun + ±snapshot transits) =='
  return [header, '', ...out].join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
