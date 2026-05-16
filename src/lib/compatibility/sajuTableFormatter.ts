/**
 * Compact "table" serialization for saju + astro chart data,
 * intended for LLM prompts.
 *
 * The JSON form that buildAutoSajuContext returns is rich but very
 * token-heavy — a single person's chart serializes to ~6k JSON
 * characters even after prunePromptContext does its work. This
 * formatter takes the same object and renders it as a flat,
 * column-oriented text block. Same information, ~5× fewer tokens.
 *
 * Schema cheat sheet (what we render and where it comes from on the
 * `saju` object that calculateSajuData + buildAutoSajuContext
 * produce):
 *
 *   dayMaster.name / element / yin_yang
 *   fiveElements.{wood, fire, earth, metal, water}
 *   yearPillar.heavenlyStem.{name, element, yin_yang, sibsin}
 *   yearPillar.earthlyBranch.{name, element, yin_yang, sibsin}
 *   yearPillar.jijanggan.{chogi, junggi, jeonggi}.{name, sibsin}
 *   monthPillar / dayPillar / timePillar : same shape as yearPillar
 *   daeun.current.{age, heavenlyStem, earthlyBranch, sibsin}
 *   daeun.list[].{age, heavenlyStem, earthlyBranch, sibsin}
 *   yeonun[].{year, heavenlyStem, earthlyBranch, sibsin.cheon/.ji}
 *   wolun[]: same shape as yeonun + month
 *   iljin[]: same shape as wolun + day
 *
 * The pillar entries in daeun/yeonun/wolun/iljin sometimes carry the
 * stem/branch as nested {name, element, ...} objects and sometimes as
 * raw single-character strings depending on which code path produced
 * them. `s()` handles both.
 */

type Cell = string | undefined | null | { name?: string }

function s(value: Cell): string {
  if (value == null) return '?'
  if (typeof value === 'string') return value
  if (typeof value === 'object' && 'name' in value) return String(value.name ?? '?')
  return String(value)
}

function sibsin(value: unknown): { cheon: string; ji: string } {
  if (value && typeof value === 'object') {
    const v = value as { cheon?: string; ji?: string }
    return { cheon: s(v.cheon), ji: s(v.ji) }
  }
  return { cheon: '?', ji: '?' }
}

interface PillarLike {
  heavenlyStem?: { name?: string; element?: string; yin_yang?: string; sibsin?: string }
  earthlyBranch?: { name?: string; element?: string; yin_yang?: string; sibsin?: string }
  jijanggan?: {
    chogi?: { name?: string; sibsin?: string }
    junggi?: { name?: string; sibsin?: string }
    jeonggi?: { name?: string; sibsin?: string }
  }
}

function pillarRow(label: string, p?: PillarLike): string {
  const hs = p?.heavenlyStem
  const eb = p?.earthlyBranch
  // 60갑자 규칙상 천간 음이면 지지도 음, 천간 양이면 지지도 양 —
  // 음양은 한 쌍씩 묶여 있어 천간 옆에만 한 번 적으면 둘 다 알 수 있다.
  // 지지 음양 표기 제거 → 행마다 ~4자 절약 × 4행 × 2명 = ~30자.
  return `${label} | ${s(hs?.name)}${hs?.yin_yang ? `(${hs.yin_yang})` : ''} | ${s(eb?.name)} | ${s(hs?.element)} | ${s(eb?.element)} | ${s(hs?.sibsin)} | ${s(eb?.sibsin)}`
}

function jijangganLine(label: string, p?: PillarLike): string | null {
  const jg = p?.jijanggan
  if (!jg) return null
  const parts: string[] = []
  if (jg.chogi?.name) parts.push(`${jg.chogi.name}(${jg.chogi.sibsin ?? '?'})`)
  if (jg.junggi?.name) parts.push(`${jg.junggi.name}(${jg.junggi.sibsin ?? '?'})`)
  if (jg.jeonggi?.name) parts.push(`${jg.jeonggi.name}(${jg.jeonggi.sibsin ?? '?'})`)
  return parts.length > 0 ? `${label}: ${parts.join(' ')}` : null
}

interface LuckStage {
  age?: number
  heavenlyStem?: Cell
  earthlyBranch?: Cell
  sibsin?: unknown
}

function daeunRow(d: LuckStage, marker = ''): string {
  const sib = sibsin(d.sibsin)
  return `${d.age ?? '?'}세 ${s(d.heavenlyStem)}${s(d.earthlyBranch)} ${sib.cheon}/${sib.ji}${marker}`
}

interface AnnualEntry {
  year?: number
  heavenlyStem?: Cell
  earthlyBranch?: Cell
  sibsin?: unknown
}
function yeonunRow(y: AnnualEntry, marker = ''): string {
  const sib = sibsin(y.sibsin)
  return `${y.year ?? '?'} ${s(y.heavenlyStem)}${s(y.earthlyBranch)} ${sib.cheon}/${sib.ji}${marker}`
}

interface MonthlyEntry extends AnnualEntry {
  month?: number
}
function wolunRow(m: MonthlyEntry, marker = ''): string {
  const sib = sibsin(m.sibsin)
  return `${m.year ?? '?'}-${m.month ?? '?'} ${s(m.heavenlyStem)}${s(m.earthlyBranch)} ${sib.cheon}/${sib.ji}${marker}`
}

interface DailyEntry extends MonthlyEntry {
  day?: number
}
function iljinRow(d: DailyEntry, marker = ''): string {
  const sib = sibsin(d.sibsin)
  return `${d.year ?? '?'}-${d.month ?? '?'}-${d.day ?? '?'} ${s(d.heavenlyStem)}${s(d.earthlyBranch)} ${sib.cheon}/${sib.ji}${marker}`
}

interface SajuLike {
  yearPillar?: PillarLike
  monthPillar?: PillarLike
  dayPillar?: PillarLike
  timePillar?: PillarLike
  dayMaster?: { name?: string; element?: string; yin_yang?: string }
  fiveElements?: { wood?: number; fire?: number; earth?: number; metal?: number; water?: number }
  daeun?: {
    current?: LuckStage
    list?: LuckStage[]
  }
  yeonun?: AnnualEntry[]
  wolun?: MonthlyEntry[]
  iljin?: DailyEntry[]
  currentSaeun?: AnnualEntry
}

/**
 * Render one person's saju as a compact text block.
 *
 * `label` is a short tag (e.g. "A", "B") that the route uses to keep
 * the two people distinguishable when both blocks are concatenated.
 */
export function formatSajuAsTable(saju: SajuLike | null | undefined, label: string): string {
  if (!saju) return `== ${label} 사주: (없음) ==`

  const lines: string[] = []
  lines.push(`== ${label} 사주 ==`)

  const dm = saju.dayMaster
  if (dm?.name) {
    lines.push(
      `일간: ${dm.name}${dm.yin_yang ? `(${dm.yin_yang}` : ''}${dm.element ? `${dm.element})` : dm.yin_yang ? ')' : ''}`,
    )
  }

  const fe = saju.fiveElements
  if (fe) {
    lines.push(
      `오행: 목 ${fe.wood ?? 0} / 화 ${fe.fire ?? 0} / 토 ${fe.earth ?? 0} / 금 ${fe.metal ?? 0} / 수 ${fe.water ?? 0}`,
    )
  }

  // Pillars table — flat column form. Header on its own line so the
  // model has explicit anchors when referencing columns.
  lines.push('')
  lines.push('[4기둥] 구분 | 천간 | 지지 | 천간오행 | 지지오행 | 천간십신 | 지지십신')
  lines.push(pillarRow('연', saju.yearPillar))
  lines.push(pillarRow('월', saju.monthPillar))
  lines.push(pillarRow('일', saju.dayPillar))
  lines.push(pillarRow('시', saju.timePillar))

  // 지장간 — only listed when present. Skipping the section entirely
  // when the chart has no jijanggan saves a few tokens for partial
  // imports (time-unknown people, etc).
  const jgLines = [
    jijangganLine('연지', saju.yearPillar),
    jijangganLine('월지', saju.monthPillar),
    jijangganLine('일지', saju.dayPillar),
    jijangganLine('시지', saju.timePillar),
  ].filter((line): line is string => Boolean(line))
  if (jgLines.length > 0) {
    lines.push('')
    lines.push('[지장간]')
    lines.push(...jgLines)
  }

  // 대운 — print prev / current / next instead of the full 10 stages.
  // The full list balloons to ~10 rows × 2 people while ~80% of the
  // entries are too far past or future for any single answer to cite.
  // Keep daeun.current intact so the active stage is fully described.
  const daeun = saju.daeun
  if (daeun?.list && daeun.list.length > 0) {
    lines.push('')
    lines.push('[대운]')
    const currentAge = daeun.current?.age
    const idx = currentAge != null ? daeun.list.findIndex((d) => d.age === currentAge) : -1
    const center = idx >= 0 ? idx : 0
    const window = daeun.list.slice(Math.max(0, center - 1), Math.min(daeun.list.length, center + 2))
    window.forEach((d) => {
      const isCurrent = currentAge != null && d.age === currentAge
      lines.push(daeunRow(d, isCurrent ? ' ← 현재' : ''))
    })
  }

  // 세운 — keep ±1 year window (last / this / next). Full 10-year
  // arc almost never gets referenced explicitly.
  if (saju.yeonun && saju.yeonun.length > 0) {
    lines.push('')
    lines.push('[세운]')
    const nowYear = new Date().getFullYear()
    const idx = saju.yeonun.findIndex((y) => y.year === nowYear)
    const center = idx >= 0 ? idx : 0
    const window = saju.yeonun.slice(Math.max(0, center - 1), Math.min(saju.yeonun.length, center + 2))
    window.forEach((y) => {
      lines.push(yeonunRow(y, y.year === nowYear ? ' ← 올해' : ''))
    })
  }

  // 월운 — ±1 month window. Full 12-month arc is too coarse-grained
  // for any single answer to use; prev/this/next is what gets cited.
  if (saju.wolun && saju.wolun.length > 0) {
    lines.push('')
    lines.push('[월운]')
    const now = new Date()
    const nowYear = now.getFullYear()
    const nowMonth = now.getMonth() + 1
    const idx = saju.wolun.findIndex((m) => m.year === nowYear && m.month === nowMonth)
    const center = idx >= 0 ? idx : 0
    const window = saju.wolun.slice(Math.max(0, center - 1), Math.min(saju.wolun.length, center + 2))
    window.forEach((m) => {
      const isNow = m.year === nowYear && m.month === nowMonth
      lines.push(wolunRow(m, isNow ? ' ← 이번달' : ''))
    })
  }

  // 일운 — today ±3 (7 days). The buildAutoSajuContext output ships
  // the full month (31 entries); answers almost never reach beyond
  // "this week" so trimming saves ~70% of the daily rows.
  if (saju.iljin && saju.iljin.length > 0) {
    lines.push('')
    lines.push('[일운]')
    const now = new Date()
    const nowYear = now.getFullYear()
    const nowMonth = now.getMonth() + 1
    const nowDay = now.getDate()
    const idx = saju.iljin.findIndex(
      (d) => d.year === nowYear && d.month === nowMonth && d.day === nowDay,
    )
    const center = idx >= 0 ? idx : 0
    const window = saju.iljin.slice(Math.max(0, center - 3), Math.min(saju.iljin.length, center + 4))
    window.forEach((d) => {
      const isToday = d.year === nowYear && d.month === nowMonth && d.day === nowDay
      lines.push(iljinRow(d, isToday ? ' ← 오늘' : ''))
    })
  }

  return lines.join('\n')
}

/* --------------------------------------------------------------------
 * Astro
 *
 * The natal-chart object that buildAutoAstroContext returns is much
 * less regular than the saju one, so this formatter is intentionally
 * loose: anything missing simply doesn't appear in the output.
 * ------------------------------------------------------------------ */

interface PlanetLike {
  name?: string
  sign?: string
  house?: number
  degree?: number
  retrograde?: boolean
}

interface AspectLike {
  from?: { name?: string }
  to?: { name?: string }
  type?: string
  orb?: number
  applying?: boolean
  score?: number
}

interface AstroLike {
  natalData?: {
    planets?: PlanetLike[]
    ascendant?: { sign?: string; degree?: number }
    midheaven?: { sign?: string; degree?: number }
    mc?: { sign?: string; degree?: number }
    aspects?: AspectLike[]
  }
  sun?: { sign?: string }
  moon?: { sign?: string }
  rising?: { sign?: string }
  transits?: unknown
}

export function formatAstroAsTable(astro: AstroLike | null | undefined, label: string): string {
  if (!astro) return `== ${label} 점성: (없음) ==`

  const lines: string[] = []
  lines.push(`== ${label} 점성 ==`)

  const natal = astro.natalData
  const asc = natal?.ascendant
  if (asc?.sign) lines.push(`Asc: ${asc.sign}${asc.degree != null ? ` ${asc.degree.toFixed(1)}°` : ''}`)
  // buildAutoAstroContext spells the midheaven as `mc`; older callers
  // may use the long form. Accept either.
  const mc = natal?.midheaven ?? natal?.mc
  if (mc?.sign) {
    lines.push(`MC: ${mc.sign}${mc.degree != null ? ` ${mc.degree.toFixed(1)}°` : ''}`)
  }

  if (natal?.planets && natal.planets.length > 0) {
    lines.push('')
    lines.push('[행성] 이름 | 사인 | 하우스 | 도수')
    natal.planets.forEach((p) => {
      lines.push(
        `${s(p.name)} | ${s(p.sign)} | ${p.house ?? '?'} | ${p.degree != null ? p.degree.toFixed(1) : '?'}${p.retrograde ? ' R' : ''}`,
      )
    })
  }

  // Natal aspects — the geometric relationships between the chart's
  // planets (conjunction / sextile / square / trine / opposition + a
  // handful of minor angles). Same role in astro as 합/충 plays in
  // saju, so the model genuinely needs them. We keep the top 12 by
  // tightest orb — findNatalAspects already returns up to 80 ranked
  // by score, so 12 captures the strongest signals without bloating
  // the prompt.
  const aspects = natal?.aspects
  if (Array.isArray(aspects) && aspects.length > 0) {
    const top = [...aspects]
      .filter((a) => a.from?.name && a.to?.name && a.type)
      .sort((a, b) => (a.orb ?? 99) - (b.orb ?? 99))
      .slice(0, 12)
    if (top.length > 0) {
      lines.push('')
      lines.push('[Natal 어스펙트] from | type | to | orb')
      top.forEach((a) => {
        lines.push(
          `${s(a.from?.name)} | ${s(a.type)} | ${s(a.to?.name)} | ${a.orb != null ? a.orb.toFixed(1) + '°' : '?'}${a.applying ? ' →' : ''}`,
        )
      })
    }
  }

  return lines.join('\n')
}
