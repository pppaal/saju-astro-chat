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
  // The compat path's buildAutoSajuContext aliases the raw saju.daeWoon
  // as `daeun`; the destiny path leaves it as `daeWoon`. Accept either
  // so this formatter can be reused for both routes.
  daeun?: {
    current?: LuckStage | null
    list?: LuckStage[]
  }
  daeWoon?: {
    current?: LuckStage | null
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

  // 대운 — prev / current / next (3 of 10). Static raw fields above
  // are kept full; only the time-series windows around "now" get
  // trimmed since 5-stage-out daeun almost never gets cited and
  // every row costs ~20 chars. Accept `daeun` (compat alias) or
  // `daeWoon` (raw saju lib key) as the source.
  const daeun = saju.daeun ?? saju.daeWoon
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

  // 세운 — last / this / next year (3 of 10).
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

  // 월운 — prev / this / next month (3 of 12).
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

  // 일운 — today ±3 days (7 of 31).
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

  // Natal aspects — full set as findNatalAspects returns it (up to
  // 80, ranked by score). User explicitly asked for raw astro intact,
  // so no extra slicing on top of the upstream library cap.
  const aspects = natal?.aspects
  if (Array.isArray(aspects) && aspects.length > 0) {
    const valid = aspects.filter((a) => a.from?.name && a.to?.name && a.type)
    if (valid.length > 0) {
      lines.push('')
      lines.push('[Natal 어스펙트] from | type | to | orb')
      valid.forEach((a) => {
        lines.push(
          `${s(a.from?.name)} | ${s(a.type)} | ${s(a.to?.name)} | ${a.orb != null ? a.orb.toFixed(1) + '°' : '?'}${a.applying ? ' →' : ''}`,
        )
      })
    }
  }

  return lines.join('\n')
}

/* --------------------------------------------------------------------
 * Destiny-route adapters
 *
 * The destiny counselor (/api/counselor/realtime) passes data through
 * a SajuNormalizerInput / AstroNormalizerInput shape that differs from
 * the compat counselor's buildAutoSajuContext output. The saju portion
 * is close enough that the main formatSajuAsTable handles it via the
 * daeWoon fallback above; what's left is the destiny-only "current
 * single-entry" timing block and the astro block in Chart shape.
 * ------------------------------------------------------------------ */

interface UnseLike {
  heavenlyStem?: string
  earthlyBranch?: string
  sibsin?: { cheon?: string; ji?: string } | string
  year?: number
  month?: number
  day?: number
  age?: number
}

function unseLine(u: UnseLike | null | undefined): string | null {
  if (!u) return null
  const stem = s(u.heavenlyStem)
  const branch = s(u.earthlyBranch)
  let sib = '?'
  if (typeof u.sibsin === 'string') sib = u.sibsin
  else if (u.sibsin && typeof u.sibsin === 'object') {
    const v = u.sibsin
    sib = `${v.cheon ?? '?'}/${v.ji ?? '?'}`
  }
  const when =
    u.day != null
      ? `${u.year ?? '?'}-${u.month ?? '?'}-${u.day}`
      : u.month != null
        ? `${u.year ?? '?'}-${u.month}`
        : u.year != null
          ? String(u.year)
          : u.age != null
            ? `${u.age}세`
            : ''
  return `${when ? when + ' ' : ''}${stem}${branch} ${sib}`
}

/**
 * Single-entry timing block used by the destiny counselor.
 * Renders currentDaeun / currentSeun / currentWolun / currentIljin in
 * one compact section + a daeunSequence summary if present. This
 * replaces ~150 chars of pretty JSON per category with ~50.
 */
export function formatDestinyTiming(input: {
  currentDaeun?: UnseLike | null
  currentSeun?: UnseLike | null
  currentWolun?: UnseLike | null
  currentIljin?: UnseLike | null
  daeunSequence?: {
    index?: number
    yearsIntoCurrent?: number
    yearsToNext?: number
    previous?: UnseLike | null
    next?: UnseLike | null
  } | null
}): string {
  const lines: string[] = []
  const daeunStr = unseLine(input.currentDaeun)
  const seunStr = unseLine(input.currentSeun)
  const wolunStr = unseLine(input.currentWolun)
  const iljinStr = unseLine(input.currentIljin)
  if (daeunStr || seunStr || wolunStr || iljinStr) {
    lines.push('[현재 시기]')
    if (daeunStr) lines.push(`대운: ${daeunStr}`)
    if (seunStr) lines.push(`세운: ${seunStr}`)
    if (wolunStr) lines.push(`월운: ${wolunStr}`)
    if (iljinStr) lines.push(`일운: ${iljinStr}`)
  }

  const seq = input.daeunSequence
  if (seq) {
    const prev = unseLine(seq.previous)
    const next = unseLine(seq.next)
    if (prev || next) {
      lines.push('[대운 전/다음]')
      if (prev) lines.push(`이전: ${prev}`)
      if (next) {
        const tail =
          seq.yearsToNext != null && seq.yearsToNext <= 1
            ? ` (전환 임박, ${seq.yearsToNext.toFixed(1)}년 남음)`
            : seq.yearsToNext != null
              ? ` (${seq.yearsToNext.toFixed(1)}년 남음)`
              : ''
        lines.push(`다음: ${next}${tail}`)
      }
    }
  }

  return lines.join('\n')
}

interface DestinyChartLike {
  planets?: PlanetLike[]
  ascendant?: { sign?: string; degree?: number }
  mc?: { sign?: string; degree?: number }
}

interface DestinyAstroInput {
  natal?: DestinyChartLike
  natalAspects?: AspectLike[]
  transits?: DestinyChartLike
  transitAspects?: AspectLike[]
  solarReturn?: { chart?: DestinyChartLike; aspects?: AspectLike[] }
  lunarReturn?: { chart?: DestinyChartLike; aspects?: AspectLike[] }
  profectionHouse?: number
}

function chartBlock(label: string, c: DestinyChartLike | undefined): string[] {
  if (!c) return []
  const lines: string[] = [label]
  if (c.ascendant?.sign) {
    lines.push(
      `Asc: ${c.ascendant.sign}${c.ascendant.degree != null ? ` ${c.ascendant.degree.toFixed(1)}°` : ''}`,
    )
  }
  if (c.mc?.sign) {
    lines.push(`MC: ${c.mc.sign}${c.mc.degree != null ? ` ${c.mc.degree.toFixed(1)}°` : ''}`)
  }
  if (c.planets && c.planets.length > 0) {
    lines.push('이름 | 사인 | 하우스 | 도수')
    c.planets.forEach((p) => {
      lines.push(
        `${s(p.name)} | ${s(p.sign)} | ${p.house ?? '?'} | ${p.degree != null ? p.degree.toFixed(1) : '?'}${p.retrograde ? ' R' : ''}`,
      )
    })
  }
  return lines
}

function aspectBlock(label: string, list: AspectLike[] | undefined, max: number): string[] {
  if (!list || list.length === 0) return []
  const valid = list.filter((a) => a.from?.name && a.to?.name && a.type)
  if (valid.length === 0) return []
  const sorted = [...valid].sort((a, b) => (a.orb ?? 99) - (b.orb ?? 99)).slice(0, max)
  const lines = [label, 'from | type | to | orb']
  sorted.forEach((a) => {
    lines.push(
      `${s(a.from?.name)} | ${s(a.type)} | ${s(a.to?.name)} | ${a.orb != null ? a.orb.toFixed(1) + '°' : '?'}${a.applying ? ' →' : ''}`,
    )
  })
  return lines
}

/**
 * Compact destiny-route astrology block.
 *
 * Same coverage as serializeAstro's JSON output, ~5× fewer chars:
 *  - natal (Asc / MC / planets)
 *  - natalAspects (full)
 *  - currentTransits (chart + top 5 aspects)
 *  - solarReturn / lunarReturn (chart + tight aspects)
 *
 * profectionHouse is rendered as a one-line header when present.
 */
export function formatDestinyAstro(input: DestinyAstroInput): string {
  const lines: string[] = ['== 점성 ==']

  if (typeof input.profectionHouse === 'number') {
    lines.push(`Profection: ${input.profectionHouse}H`)
  }

  const natalLines = chartBlock('[Natal]', input.natal)
  if (natalLines.length > 1) {
    lines.push('')
    lines.push(...natalLines)
  }

  const natalAspectLines = aspectBlock('[Natal 어스펙트]', input.natalAspects, 999)
  if (natalAspectLines.length > 0) {
    lines.push('')
    lines.push(...natalAspectLines)
  }

  const transitChart = chartBlock('[현재 트랜짓 행성]', input.transits)
  if (transitChart.length > 1) {
    lines.push('')
    lines.push(...transitChart)
  }

  const transitAspectLines = aspectBlock('[현재 트랜짓 어스펙트]', input.transitAspects, 5)
  if (transitAspectLines.length > 0) {
    lines.push('')
    lines.push(...transitAspectLines)
  }

  const sr = input.solarReturn
  if (sr) {
    const srChart = chartBlock('[Solar Return]', sr.chart)
    if (srChart.length > 1) {
      lines.push('')
      lines.push(...srChart)
    }
    const srAspects = aspectBlock('[Solar Return 어스펙트]', sr.aspects, 5)
    if (srAspects.length > 0) {
      lines.push('')
      lines.push(...srAspects)
    }
  }

  const lr = input.lunarReturn
  if (lr) {
    const lrChart = chartBlock('[Lunar Return]', lr.chart)
    if (lrChart.length > 1) {
      lines.push('')
      lines.push(...lrChart)
    }
    const lrAspects = aspectBlock('[Lunar Return 어스펙트]', lr.aspects, 5)
    if (lrAspects.length > 0) {
      lines.push('')
      lines.push(...lrAspects)
    }
  }

  return lines.join('\n')
}

/* --------------------------------------------------------------------
 * Saju extras + relations — the part of the chart that calculateSajuData
 * doesn't itself produce (신살 / 격국 / 용신 / 12운성) plus the
 * pillar-to-pillar relations (합·충·형·파·해·원진·공망).
 *
 * Destiny's runFortuneWithRaw populates these on SajuNormalizerInput.
 * Compat used to skip them entirely; pass through when available.
 * ------------------------------------------------------------------ */

interface ShinsalLike {
  kind?: string
  pillars?: string[]
  target?: string
  detail?: string
}

interface RelationLike {
  kind?: string
  pillars?: string[]
  detail?: string
  note?: string
}

interface SajuExtrasLike {
  shinsal?: ShinsalLike[]
  twelveStages?: { year?: string; month?: string; day?: string; time?: string }
  geokguk?: { primary?: string; category?: string; confidence?: number } | null
  yongsin?: {
    primary?: string
    primaryYongsin?: string
    type?: string
    yongsinType?: string
    kibsin?: string | null
    dayMasterStrength?: string
    daymasterStrength?: string
  } | null
}

/**
 * Compact extras + natalRelations block. Skips silently when nothing
 * is supplied — keeps the cached prefix clean for routes that don't
 * compute them.
 */
export function formatSajuExtras(input: {
  extras?: SajuExtrasLike | null
  natalRelations?: RelationLike[] | null
}): string {
  const lines: string[] = []
  const ex = input.extras
  const rels = input.natalRelations

  if (ex?.geokguk?.primary) {
    const confidence = ex.geokguk.confidence
    const conf =
      typeof confidence === 'number' && Number.isFinite(confidence)
        ? ` (${Math.round(confidence * 100)}%)`
        : ''
    lines.push(`격국: ${ex.geokguk.primary}${conf}`)
  }

  if (ex?.yongsin) {
    const primary = ex.yongsin.primary ?? ex.yongsin.primaryYongsin
    const type = ex.yongsin.type ?? ex.yongsin.yongsinType
    const strength = ex.yongsin.dayMasterStrength ?? ex.yongsin.daymasterStrength
    const kibsin = ex.yongsin.kibsin
    if (primary) {
      const parts = [primary]
      if (type) parts.push(`(${type})`)
      if (strength) parts.push(`· 일간 ${strength}`)
      if (kibsin) parts.push(`· 기신 ${kibsin}`)
      lines.push(`용신: ${parts.join(' ')}`)
    }
  }

  const ts = ex?.twelveStages
  if (ts && (ts.year || ts.month || ts.day || ts.time)) {
    lines.push(
      `12운성: 연 ${ts.year ?? '?'} / 월 ${ts.month ?? '?'} / 일 ${ts.day ?? '?'} / 시 ${ts.time ?? '?'}`,
    )
  }

  if (ex?.shinsal && ex.shinsal.length > 0) {
    const formatted = ex.shinsal
      .filter((s) => s.kind)
      .map((s) => {
        const tag = s.kind!
        const where = s.pillars && s.pillars.length > 0 ? `(${s.pillars.join('/')})` : ''
        return `${tag}${where}`
      })
    if (formatted.length > 0) {
      lines.push(`신살: ${formatted.join(' · ')}`)
    }
  }

  if (rels && rels.length > 0) {
    const valid = rels.filter((r) => r.kind && r.pillars && r.pillars.length > 0)
    if (valid.length > 0) {
      // Group by kind to keep the block tight — "지지충: 寅-申 (일-시)
      // / 子-午 (월-시)" reads better than four separate lines.
      const byKind = new Map<string, string[]>()
      valid.forEach((r) => {
        const entry = r.detail
          ? `${r.detail} (${r.pillars!.join('-')})`
          : `(${r.pillars!.join('-')})`
        if (!byKind.has(r.kind!)) byKind.set(r.kind!, [])
        byKind.get(r.kind!)!.push(entry)
      })
      const parts = Array.from(byKind.entries()).map(
        ([kind, items]) => `${kind}: ${items.join(' / ')}`,
      )
      lines.push(...parts)
    }
  }

  if (lines.length === 0) return ''
  return ['[격국·용신·신살·합충]', ...lines].join('\n')
}
