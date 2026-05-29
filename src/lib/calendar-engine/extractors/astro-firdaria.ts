import { dignityOf } from '@/lib/astrology/foundation/dignities'
import type { Chart } from '@/lib/astrology/foundation/types'
import type { ActiveSignal, ExtractorContext, Polarity, SignalExtractor } from '../types'

/**
 * Firdaria (페르시아 시간 분할) 추출기.
 *
 * 75년 인생을 9개 메이저 챕터로 분할 — 7행성 + North Node + South Node.
 * 각 행성 메이저는 다시 7개 sub-period 로 분할 (메이저 / 7). NN/SN 메이저는
 * 짧아 sub-period 를 풀지 않는다 (전통 페르시아 룰).
 *
 * Sect (낮/밤 출생) 에 따라 행성 순서가 달라짐:
 *   Day:   Sun(10) → Venus(8) → Mercury(13) → Moon(9) → Saturn(11)
 *          → Jupiter(12) → Mars(7) → NorthNode(3) → SouthNode(2)
 *   Night: Moon(9) → Saturn(11) → Jupiter(12) → Mars(7) → Sun(10)
 *          → Venus(8) → Mercury(13) → NorthNode(3) → SouthNode(2)
 *   합산: 10+8+13+9+11+12+7+3+2 = 9+11+12+7+10+8+13+3+2 = 75년
 *
 * Sub-period 순서: 메이저 룰러부터 시작해 Day 시퀀스(Sun→Venus→Mercury→Moon
 * →Saturn→Jupiter→Mars) 의 행성 순환을 7회 돌린다. (Sect 와 무관 — 메이저
 * 시퀀스만 sect 영향을 받는 전통 규칙.)
 *
 * Polarity: 행성별 길흉 기본값 + 본명 차트 dignity 보너스.
 *   - Jupiter +2, Venus +2, Sun +1, Mercury +1, Moon 0, Mars -1, Saturn -1
 *   - NorthNode +1, SouthNode -1
 *   - 본명 차트에서 그 행성이 domicile/exaltation 이면 +1, detriment/fall 이면 -1
 */

type FirdariaRuler =
  | 'Sun' | 'Venus' | 'Mercury' | 'Moon' | 'Saturn' | 'Jupiter' | 'Mars'
  | 'NorthNode' | 'SouthNode'

const DAY_SEQUENCE: ReadonlyArray<{ ruler: FirdariaRuler; years: number }> = [
  { ruler: 'Sun',       years: 10 },
  { ruler: 'Venus',     years: 8 },
  { ruler: 'Mercury',   years: 13 },
  { ruler: 'Moon',      years: 9 },
  { ruler: 'Saturn',    years: 11 },
  { ruler: 'Jupiter',   years: 12 },
  { ruler: 'Mars',      years: 7 },
  { ruler: 'NorthNode', years: 3 },
  { ruler: 'SouthNode', years: 2 },
]

const NIGHT_SEQUENCE: ReadonlyArray<{ ruler: FirdariaRuler; years: number }> = [
  { ruler: 'Moon',      years: 9 },
  { ruler: 'Saturn',    years: 11 },
  { ruler: 'Jupiter',   years: 12 },
  { ruler: 'Mars',      years: 7 },
  { ruler: 'Sun',       years: 10 },
  { ruler: 'Venus',     years: 8 },
  { ruler: 'Mercury',   years: 13 },
  { ruler: 'NorthNode', years: 3 },
  { ruler: 'SouthNode', years: 2 },
]

// 75년 합계 검증 (컴파일 시 상수 — 어긋나면 즉시 throw).
const DAY_TOTAL = DAY_SEQUENCE.reduce((s, p) => s + p.years, 0)
const NIGHT_TOTAL = NIGHT_SEQUENCE.reduce((s, p) => s + p.years, 0)
if (DAY_TOTAL !== 75 || NIGHT_TOTAL !== 75) {
  throw new Error(`Firdaria 시퀀스 합 불일치: day=${DAY_TOTAL}, night=${NIGHT_TOTAL} (기대 75)`)
}

// Sub-period 순환 시퀀스 — 7행성 (Day Firdaria 메이저 순서와 동일).
// NN/SN 은 sub-period 발화하지 않으므로 여기 미포함.
const SUB_CYCLE: ReadonlyArray<FirdariaRuler> = [
  'Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars',
]

const RULER_POLARITY: Record<FirdariaRuler, Polarity> = {
  Jupiter: 2,
  Venus: 2,
  Sun: 1,
  Mercury: 1,
  Moon: 0,
  Mars: -1,
  Saturn: -1,
  NorthNode: 1,
  SouthNode: -1,
}

const RULER_KO: Record<FirdariaRuler, string> = {
  Sun: '태양',
  Venus: '금성',
  Mercury: '수성',
  Moon: '달',
  Saturn: '토성',
  Jupiter: '목성',
  Mars: '화성',
  NorthNode: '북교점',
  SouthNode: '남교점',
}

interface MajorPeriod {
  ruler: FirdariaRuler
  ageStart: number
  ageEnd: number
  index: number // 0~8 (시퀀스 내 순서)
}

interface SubPeriod {
  major: MajorPeriod
  ruler: FirdariaRuler
  ageStart: number
  ageEnd: number
  index: number // 0~6 (메이저 내 sub 순서)
}

function clampPolarity(value: number): Polarity {
  if (value > 3) return 3
  if (value < -3) return -3
  return Math.round(value) as Polarity
}

/**
 * 본명 차트의 출생 시점 절대 (UTC) 타임스탬프.
 * astro.chart.meta.isoUTC 가 있으면 사용 (정확), 없으면 NatalInput 의 UTC 환산
 * fallback. Firdaria 는 출생 시점부터 절대 시간 흐름이라 timezone 가정 금지.
 */
function birthEpochMs(natal: ExtractorContext['natal']): number {
  const isoUTC = natal.astro.chart.meta?.isoUTC
  if (isoUTC) {
    const ms = new Date(isoUTC).getTime()
    if (Number.isFinite(ms)) return ms
  }
  // Fallback: NatalInput 의 (year,month,date,hour,minute) + offset.
  // timeZone 은 IANA 이름이라 직접 환산이 불가능 → 0시 0분 UTC 로 근사. 본명
  // chart.meta 가 있는 한 도달하지 않음.
  const { year, month, date, hour, minute } = natal.input
  return Date.UTC(year, month - 1, date, hour, minute)
}

function ageToDate(birthMs: number, ageYears: number): Date {
  return new Date(birthMs + ageYears * 365.25 * 86400 * 1000)
}

function rangeWindow(birthMs: number, startAge: number, endAge: number) {
  const start = ageToDate(birthMs, startAge).toISOString()
  const end = ageToDate(birthMs, endAge).toISOString()
  const peak = ageToDate(birthMs, (startAge + endAge) / 2).toISOString()
  return { start, peak, end }
}

function overlaps(
  win: { start: string; end: string },
  range: { start: string; end: string },
): boolean {
  const ws = new Date(win.start).getTime()
  const we = new Date(win.end).getTime()
  const rs = new Date(range.start).getTime()
  const re = new Date(range.end).getTime()
  return !(we < rs || ws > re)
}

/**
 * 본명 차트에서 행성의 dignity 보너스 — domicile/exaltation +1, detriment/fall -1.
 * Node 는 전통 dignity 표가 없어 0 반환.
 */
function dignityBonus(chart: Chart, ruler: FirdariaRuler): number {
  if (ruler === 'NorthNode' || ruler === 'SouthNode') return 0
  const planet = chart.planets.find((p) => p.name === ruler)
  if (!planet || !planet.sign) return 0
  const d = dignityOf(ruler, planet.sign)
  if (d === 'domicile' || d === 'exaltation') return 1
  if (d === 'detriment' || d === 'fall') return -1
  return 0
}

function buildMajorPeriods(sect: 'day' | 'night'): MajorPeriod[] {
  const seq = sect === 'day' ? DAY_SEQUENCE : NIGHT_SEQUENCE
  const out: MajorPeriod[] = []
  let cursor = 0
  seq.forEach((entry, index) => {
    out.push({
      ruler: entry.ruler,
      ageStart: cursor,
      ageEnd: cursor + entry.years,
      index,
    })
    cursor += entry.years
  })
  return out
}

function buildSubPeriods(major: MajorPeriod): SubPeriod[] {
  // NN/SN 은 sub-period 분할 안 함 (전통 페르시아 룰).
  if (major.ruler === 'NorthNode' || major.ruler === 'SouthNode') return []
  const totalYears = major.ageEnd - major.ageStart
  const subYears = totalYears / SUB_CYCLE.length
  // sub-period 시작 = 메이저 룰러부터. 7행성을 메이저 룰러부터 1회 순환.
  const startIdx = SUB_CYCLE.indexOf(major.ruler)
  if (startIdx < 0) return []
  const subs: SubPeriod[] = []
  for (let i = 0; i < SUB_CYCLE.length; i += 1) {
    const ruler = SUB_CYCLE[(startIdx + i) % SUB_CYCLE.length]
    const ageStart = major.ageStart + i * subYears
    const ageEnd = ageStart + subYears
    subs.push({ major, ruler, ageStart, ageEnd, index: i })
  }
  return subs
}

const astroFirdariaExtractor: SignalExtractor = {
  source: 'astro',
  kind: 'firdaria',
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range } = ctx
    const sect = natal.astro.sect
    const birthMs = birthEpochMs(natal)
    const majors = buildMajorPeriods(sect)
    const signals: ActiveSignal[] = []

    for (const major of majors) {
      const majorWin = rangeWindow(birthMs, major.ageStart, major.ageEnd)
      const majorOverlaps = overlaps(majorWin, range)
      if (!majorOverlaps) continue

      const bonus = dignityBonus(natal.astro.chart, major.ruler)
      const majorPolarity = clampPolarity(RULER_POLARITY[major.ruler] + bonus)

      signals.push({
        id: `astro.firdaria.major.${sect}.${major.index}.${major.ruler}.${majorWin.start.slice(0, 10)}`,
        source: 'astro',
        kind: 'firdaria',
        name: `Firdaria Major: ${major.ruler} (${(major.ageEnd - major.ageStart).toFixed(0)}y)`,
        korean: `${RULER_KO[major.ruler]} 페르시아 챕터`,
        themes: [],
        polarity: majorPolarity,
        layer: 'decadal',
        active: majorWin,
        weight: 0.4,
        evidence: {
          module: 'astro-firdaria',
          planets: [major.ruler],
          detail: {
            level: 'major',
            sect,
            majorRuler: major.ruler,
            ageStart: major.ageStart,
            ageEnd: major.ageEnd,
            durationYears: major.ageEnd - major.ageStart,
            dignityBonus: bonus,
            chapterIndex: major.index,
          },
        },
      })

      // sub-period 들: range 와 겹치는 것만 emit.
      const subs = buildSubPeriods(major)
      for (const sub of subs) {
        const subWin = rangeWindow(birthMs, sub.ageStart, sub.ageEnd)
        if (!overlaps(subWin, range)) continue
        const subBonus = dignityBonus(natal.astro.chart, sub.ruler)
        const subPolarity = clampPolarity(
          // sub 는 메이저보다 절반 강도 — 길흉 본값 + dignity 보너스를 합한 뒤 1단계
          // 좁힘. (메이저 +2 / sub +1 의 톤 차이 유지.)
          Math.sign(RULER_POLARITY[sub.ruler]) * Math.max(0, Math.abs(RULER_POLARITY[sub.ruler]) - 1)
            + subBonus,
        )
        signals.push({
          id: `astro.firdaria.sub.${sect}.${major.index}.${sub.index}.${sub.ruler}.${subWin.start.slice(0, 10)}`,
          source: 'astro',
          kind: 'firdaria',
          name: `Firdaria Sub: ${sub.ruler} (under ${major.ruler})`,
          korean: `${RULER_KO[sub.ruler]} sub-period (${RULER_KO[major.ruler]} 챕터)`,
          themes: [],
          polarity: subPolarity,
          layer: 'yearly',
          active: subWin,
          weight: 0.4,
          evidence: {
            module: 'astro-firdaria',
            planets: [sub.ruler, major.ruler],
            detail: {
              level: 'sub',
              sect,
              majorRuler: major.ruler,
              subRuler: sub.ruler,
              ageStart: sub.ageStart,
              ageEnd: sub.ageEnd,
              durationYears: sub.ageEnd - sub.ageStart,
              dignityBonus: subBonus,
              majorIndex: major.index,
              subIndex: sub.index,
            },
          },
        })
      }
    }

    return signals
  },
}

export default astroFirdariaExtractor
