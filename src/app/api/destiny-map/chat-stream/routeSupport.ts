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

interface DaeunRow {
  age: number | null
  endAge: number | null
  stem: string
  branch: string
  element: string
  theme: string
  isCurrent: boolean
}

interface SaeunRow {
  year: number | null
  stem: string
  branch: string
  element: string
  summary: string
  isCurrent: boolean
}

function buildDaeunRows(
  saju: Record<string, unknown>,
  currentAge: number | null
): DaeunRow[] {
  const daeWoon = asRecord(saju.daeWoon) || asRecord(saju.daeun)
  const unse = asRecord(saju.unse)
  // Prefer the fuller daeWoon.list (has theme/startAge/endAge), fall back
  // to unse.daeun (lighter shape).
  const raw =
    asArray(daeWoon?.list).length > 0
      ? asArray(daeWoon?.list)
      : asArray(daeWoon?.cycles).length > 0
      ? asArray(daeWoon?.cycles)
      : asArray(unse?.daeun)
  const rows: DaeunRow[] = []
  for (let i = 0; i < raw.length; i++) {
    const item = asRecord(raw[i])
    if (!item) continue
    const startAge = toNumber(item.startAge ?? item.age)
    let endAge = toNumber(item.endAge)
    if (endAge === null && startAge !== null) {
      const next = asRecord(raw[i + 1])
      const nextStart = next ? toNumber(next.startAge ?? next.age) : null
      endAge = nextStart !== null ? nextStart - 1 : startAge + 9
    }
    const isCurrent =
      currentAge !== null &&
      startAge !== null &&
      endAge !== null &&
      currentAge >= startAge &&
      currentAge <= endAge
    rows.push({
      age: startAge,
      endAge,
      stem: getStr(item.heavenlyStem ?? item.stem),
      branch: getStr(item.earthlyBranch ?? item.branch),
      element: getStr(item.element),
      theme: getStr(item.theme),
      isCurrent,
    })
  }
  return rows
}

function buildSaeunRows(
  saju: Record<string, unknown>,
  currentYear: number,
  windowBack = 0,
  windowForward = 5
): SaeunRow[] {
  const unse = asRecord(saju.unse)
  const list =
    asArray(unse?.annual).length > 0 ? asArray(unse?.annual) : asArray(saju.yeonun)
  // The engine pre-computes from currentYear forward only. If older entries
  // appear they are kept; otherwise we just render what's present in the
  // requested window.
  const rows: SaeunRow[] = []
  for (const raw of list) {
    const item = asRecord(raw)
    if (!item) continue
    const year = toNumber(item.year)
    if (year === null) continue
    if (year < currentYear - windowBack || year > currentYear + windowForward) continue
    rows.push({
      year,
      stem: getStr(item.heavenlyStem ?? item.stem),
      branch: getStr(item.earthlyBranch ?? item.branch),
      element: getStr(item.element),
      summary: getStr(item.summary),
      isCurrent: year === currentYear,
    })
  }
  rows.sort((a, b) => (a.year ?? 0) - (b.year ?? 0))
  return rows
}

function pickCurrentMonthly(
  saju: Record<string, unknown>,
  year: number,
  month: number
): Record<string, unknown> | null {
  const unse = asRecord(saju.unse)
  const list =
    asArray(unse?.monthly).length > 0 ? asArray(unse?.monthly) : asArray(saju.wolun)
  for (const raw of list) {
    const item = asRecord(raw)
    if (!item) continue
    const y = toNumber(item.year)
    const m = toNumber(item.month)
    if (y === year && m === month) return item
  }
  const first = asRecord(list[0])
  return first ?? null
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

function renderReturnLine(
  ret: Record<string, unknown> | undefined,
  isLunar: boolean
): string | null {
  if (!ret) return null
  const asc = (ret.ascendant as Record<string, unknown> | undefined)?.sign
  const planets = ret.planets as Array<Record<string, unknown>> | undefined
  const sun = planets?.find((p) => String(p.name).toLowerCase() === 'sun')
  const moon = planets?.find((p) => String(p.name).toLowerCase() === 'moon')
  const yr = ret.returnYear || ''
  if (isLunar) {
    const mo = ret.returnMonth || ''
    return `${yr}-${mo}: Asc ${asc || '-'}, Moon ${moon?.sign || '-'} h${moon?.house || '-'}`
  }
  return `${yr}: Asc ${asc || '-'}, Sun ${sun?.sign || '-'} h${sun?.house || '-'}, Moon ${moon?.sign || '-'} h${moon?.house || '-'}`
}

export interface FormatTimingInput {
  saju?: Record<string, unknown> | null
  astro?: Record<string, unknown> | null
  birthDate?: string
  lang: 'ko' | 'en'
  now?: Date
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
export function formatTimingForPrompt(input: FormatTimingInput): string {
  const { saju, astro, birthDate, lang } = input
  const now = input.now ?? new Date()
  const isKo = lang === 'ko'

  const sajuRecord = asRecord(saju)
  const astroRecord = asRecord(astro)
  if (!sajuRecord && !astroRecord) return ''

  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const currentAge = (() => {
    const m = /^(\d{4})/.exec(birthDate || '')
    if (!m) return null
    const birthYear = Number(m[1])
    return Number.isFinite(birthYear) ? currentYear - birthYear + 1 : null
  })()

  const header = isKo
    ? '== 시기 흐름 (사주 대운/세운 + 점성 트랜짓·리턴) =='
    : '== Timing (Saju cycles + Astro transits/returns) =='
  const out: string[] = [header, '']

  // --- 사주 대운 (전 생애)
  if (sajuRecord) {
    const daeunRows = buildDaeunRows(sajuRecord, currentAge)
    if (daeunRows.length > 0) {
      out.push(isKo ? '[사주 대운 — 전 생애]' : '[Saju Daeun — full life]')
      daeunRows.forEach((row, i) => {
        const marker = row.isCurrent ? '  ★' : '   '
        const idx = `${i + 1}${isKo ? '대운' : 'th'}`
        const range = row.age !== null && row.endAge !== null ? `(${row.age}-${row.endAge})` : ''
        const gz = `${row.stem}${row.branch}`.trim()
        const elem = row.element ? ` ${row.element}` : ''
        const theme = row.theme ? ` — ${row.theme}` : ''
        const cur = row.isCurrent ? (isKo ? '   ← 현재' : '   ← current') : ''
        out.push(`${marker} ${idx.padEnd(5)} ${range.padEnd(8)} ${gz}${elem}${theme}${cur}`)
      })
      out.push('')
    }
  }

  // --- 사주 세운 (현재 + 향후 5년)
  if (sajuRecord) {
    const saeunRows = buildSaeunRows(sajuRecord, currentYear)
    if (saeunRows.length > 0) {
      out.push(isKo ? '[사주 세운 — 현재 + 향후]' : '[Saju Saeun — current + forward]')
      for (const row of saeunRows) {
        const marker = row.isCurrent ? '  ★' : '   '
        const gz = `${row.stem}${row.branch}`.trim()
        const elem = row.element ? ` ${row.element}` : ''
        const summary = row.summary ? ` — ${row.summary}` : ''
        const cur = row.isCurrent ? (isKo ? '   ← 현재' : '   ← current') : ''
        out.push(`${marker} ${row.year}  ${gz}${elem}${summary}${cur}`)
      }
      out.push('')
    }
  }

  // --- 사주 월운 (이번 달)
  if (sajuRecord) {
    const wolun = pickCurrentMonthly(sajuRecord, currentYear, currentMonth)
    if (wolun) {
      const stem = getStr(wolun.heavenlyStem ?? wolun.stem)
      const branch = getStr(wolun.earthlyBranch ?? wolun.branch)
      const yr = toNumber(wolun.year)
      const mo = toNumber(wolun.month)
      const summary = getStr(wolun.summary)
      if (stem || branch) {
        const label = isKo ? '[사주 월운]' : '[Saju Wolun]'
        const ym = yr !== null && mo !== null ? `${yr}-${String(mo).padStart(2, '0')}` : ''
        out.push(
          `${label} ${ym}: ${stem}${branch}${summary ? ' — ' + summary : ''}`
        )
        out.push('')
      }
    }
  }

  // --- 점성 트랜짓 (현재 snapshot)
  if (astroRecord) {
    const ct = astroRecord.currentTransits as Record<string, unknown> | undefined
    if (ct) {
      const asOf = ct.asOfIso ? String(ct.asOfIso).slice(0, 10) : ''
      const major = pickTopTransits(ct.majorTransits, 5)
      const fallback = major.length > 0 ? major : pickTopTransits(ct.aspects, 5)
      if (fallback.length > 0) {
        out.push(
          `${isKo ? '[점성 트랜짓]' : '[Astro Transits]'}${asOf ? ` (${asOf})` : ''}`
        )
        fallback.forEach((line) => out.push(`  - ${line}`))
        out.push('')
      }
    }
    const returns = astroRecord.returns as Record<string, unknown> | undefined
    const solar = renderReturnLine(
      returns?.solarReturn as Record<string, unknown> | undefined,
      false
    )
    if (solar) {
      out.push(`${isKo ? '[점성 솔라 리턴]' : '[Astro Solar Return]'} ${solar}`)
    }
    const lunar = renderReturnLine(
      returns?.lunarReturn as Record<string, unknown> | undefined,
      true
    )
    if (lunar) {
      out.push(`${isKo ? '[점성 루나 리턴]' : '[Astro Lunar Return]'} ${lunar}`)
    }
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
