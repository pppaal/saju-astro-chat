'use client'

/* ============================================================
   destinypal · YearTier — ② 1년 (YEARLY) · "올해의 모양"

   메인 표면은 jargon-free:
     · "N년의 모양" 헤드라인 + 평문 한 줄
     · "열두 달의 흐름" — monthlyScores 를 톤으로 색칠한 12막대.
       큰 달은 봉인(ring/seal), 조심할 달은 표시. 숫자는 없음.
     · "큰 달 / 조심" 한 줄 (monthlyScores 에서 파생)
     · 평문 crossings 리스트 (영역 × 행성 + 톤) — 있으면.
   전문가용(하우스 휠·글리프·프로펙션·sect·dignity·Lord-of-Year·ZR·세운 간지·raw note)은
   전부 "자세한 신호 보기" <details> 하나로 접어 둠.
   ============================================================ */

import type {
  DestinyUserSummary,
  DestinyYear,
  DestinyDignityEntry,
  DestinyDecadeZRChapter,
} from '@/types/calendar'
import { Ganji } from '../atoms/Ganji'
import { LayerTag } from '../atoms/LayerTag'
import { sibsinArea, sibsinAreaEn } from '@/lib/calendar-engine/derivers/plainLanguage'
import { ordinalEn } from '@/lib/calendar-engine/ordinal'
import styles from './YearTier.module.css'
import { CrossingList } from '@/components/calendar/atoms/CrossingList'
import summaryStyles from '@/components/calendar/atoms/TierSummary.module.css'
import { useI18n } from '@/i18n/I18nProvider'
import {
  TierFrame,
  RiseButton,
  Eyebrow,
  TierHero,
  Band,
  WhyList,
  type WhyItem,
} from '@/components/calendar/layout/TierFrame'

const MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

// ----------------------------------------------------------------
// Props
// ----------------------------------------------------------------

export interface YearTierProps {
  /** 본명 — 자세히 보기 안의 하우스 휠 도트 + 룰러 dignity 검색에 사용. */
  user: DestinyUserSummary
  /** 세운 + Profection wheel. */
  year: DestinyYear
  /** 월(month) tier 로 다이브. */
  onDive: () => void
  /** Lifetime tier 로 라이즈. */
  onRise: () => void
}

// ----------------------------------------------------------------
// Helpers (자세히 보기 — 전문가용 휠/도트/dignity)
// ----------------------------------------------------------------

/** 영문 zodiac → 1..12 인덱스 (Aries=1) — 본명 ASC 기준 whole-sign house 매핑용. */
const SIGN_ORDER = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
] as const

/** 행성 영문 → 한자 glyph (wheel dot 표기). */
const PLANET_GLYPH: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
}

/** 본명 ASC 기준 whole-sign house 계산 — 행성 sign → house 1..12. */
function signToHouse(planetSign: string, ascSign: string): number {
  const ai = SIGN_ORDER.indexOf(ascSign as (typeof SIGN_ORDER)[number])
  const pi = SIGN_ORDER.indexOf(planetSign as (typeof SIGN_ORDER)[number])
  if (ai < 0 || pi < 0) return 1
  return ((pi - ai + 12) % 12) + 1
}

/** dignity entry → 한 줄 표기 ('domicile · +5' 등) + polarity tone. */
function formatDignity(d: DestinyDignityEntry): {
  text: string
  tone: 'pos' | 'neg' | 'neu'
} {
  const tiers = d.tiers
  const flags: string[] = []
  if (tiers?.domicile) flags.push('domicile')
  if (tiers?.exaltation) flags.push('exaltation')
  if (tiers?.detriment) flags.push('detriment')
  if (tiers?.fall) flags.push('fall')
  if (tiers?.triplicity) flags.push('triplicity')
  if (tiers?.term) flags.push('term')
  if (tiers?.face) flags.push('face')
  const score = d.score ?? 0
  const tone: 'pos' | 'neg' | 'neu' = score > 0 ? 'pos' : score < 0 ? 'neg' : 'neu'
  const flagText = flags.length > 0 ? flags.join(' · ') : 'peregrine'
  return { text: flagText, tone }
}

/** 본명 dignities 에서 행성 검색 (룰러 영문명). */
function findDignity(
  dignities: DestinyDignityEntry[] | undefined,
  planetName: string
): DestinyDignityEntry | undefined {
  if (!dignities) return undefined
  return dignities.find((d) => d.planet === planetName)
}

/** 본명 행성 도트 — user.dignities → { house, planet, glyph }. */
interface NatalDot {
  house: number
  planet: string
  glyph: string
}
function buildNatalDots(user: DestinyUserSummary): NatalDot[] {
  const asc = user.astro?.ascEn ?? 'Aries'
  const dignities = user.dignities ?? []
  return dignities.map((d) => ({
    house: signToHouse(d.sign, asc),
    planet: String(d.planet),
    glyph: PLANET_GLYPH[String(d.planet)] ?? '·',
  }))
}

/** 외행성 transit 도트 — 본명 ASC 기준 (외행성: Jupiter / Saturn / Uranus / Neptune / Pluto). */
function buildTransitDots(user: DestinyUserSummary): NatalDot[] {
  const OUTERS = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']
  const asc = user.astro?.ascEn ?? 'Aries'
  const dignities = user.dignities ?? []
  return dignities
    .filter((d) => OUTERS.includes(String(d.planet)))
    .map((d) => ({
      house: signToHouse(d.sign, asc),
      planet: String(d.planet),
      glyph: PLANET_GLYPH[String(d.planet)] ?? '·',
    }))
}

/** 행성 영문 → benefic/malefic 극성 (whyItems 톤용). 모르면 neutral. */
const BENEFIC = new Set(['Venus', 'Jupiter', 'Moon'])
const MALEFIC = new Set(['Mars', 'Saturn'])
function planetTone(planetEn: string): 'positive' | 'caution' | 'neutral' {
  if (BENEFIC.has(planetEn)) return 'positive'
  if (MALEFIC.has(planetEn)) return 'caution'
  return 'neutral'
}

/** house 1..12 → wheel mid angle (radians). */
function houseAngle(house: number): number {
  const i = house - 1
  return ((i + 0.5) / 12) * Math.PI * 2 - Math.PI / 2
}

/** ZR chapter pivotal 표기 (LoB / Peak). */
function zrPivotalTag(c: DestinyDecadeZRChapter, ko: boolean): string | null {
  const sub = c.subPeriods?.find((s) => s.isLoosingOfTheBond || s.isPeak)
  if (sub?.isLoosingOfTheBond) return ko ? 'LoB · 풀린 매듭' : 'LoB · loosed bond'
  if (sub?.isPeak) return ko ? 'Peak · 정점' : 'Peak'
  return null
}

/** wheel 좌상단 pivotal 배지 — 올해에 ZR LoB/Peak 가 걸려있나. */
function readWheelPivotal(year: DestinyYear): {
  kind: 'lob' | 'peak'
  label: string
  han: string
} | null {
  const all = [...(year.zrSpiritChapters ?? []), ...(year.zrFortuneChapters ?? [])]
  for (const c of all) {
    const sub = c.subPeriods?.find((s) => s.isLoosingOfTheBond)
    if (sub) return { kind: 'lob', label: 'Loosing of the Bond', han: '解' }
  }
  for (const c of all) {
    const sub = c.subPeriods?.find((s) => s.isPeak)
    if (sub) return { kind: 'peak', label: 'Peak Period', han: '頂' }
  }
  return null
}

// ----------------------------------------------------------------
// 메인 표면 — "열두 달의 흐름" 막대 (jargon-free, 숫자 없음).
//   톤: 큰 달(좋음) / 평이 / 조심할 달. 큰 달은 봉인 링, 조심은 점.
// ----------------------------------------------------------------

type MonthTone = 'big' | 'steady' | 'caution'

function monthTone(score: number): MonthTone {
  if (score >= 60) return 'big'
  if (score >= 40) return 'steady'
  return 'caution'
}

interface MonthShapeItem {
  month: number // 1..12
  score: number
  tone: MonthTone
  isPeak: boolean // 큰 달 중에서도 최고점들 — 봉인
}

/** monthlyScores → 12달 모양 + 큰 달/조심 파생. 결정론적. */
function buildMonthShape(scores: Array<{ month: number; score: number; bestDay?: string }>): {
  items: MonthShapeItem[]
  bigMonths: number[] // 봉인할 최고 달
  cautionMonths: number[] // 조심할 최저 달
} {
  const byMonth = new Map(scores.map((s) => [s.month, s.score]))
  const items: MonthShapeItem[] = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    const score = byMonth.get(month) ?? 0
    return { month, score, tone: monthTone(score), isPeak: false }
  })

  // 큰 달 — 최고점 상위 (최대 3, 동점 포함, 좋음 밴드만).
  const bigCandidates = items.filter((it) => it.tone === 'big')
  const sortedDesc = [...bigCandidates].sort((a, b) => b.score - a.score)
  const peakScore = sortedDesc.length > 0 ? sortedDesc[0].score : Infinity
  const bigMonths = sortedDesc
    .filter((it) => it.score === peakScore)
    .slice(0, 3)
    .map((it) => it.month)
    .sort((a, b) => a - b)
  for (const it of items) if (bigMonths.includes(it.month)) it.isPeak = true

  // 조심할 달 — 최저점 (caution 밴드만, 최대 3, 최저 동점 포함).
  const cautionCandidates = items.filter((it) => it.tone === 'caution')
  const sortedAsc = [...cautionCandidates].sort((a, b) => a.score - b.score)
  const lowScore = sortedAsc.length > 0 ? sortedAsc[0].score : -Infinity
  const cautionMonths = sortedAsc
    .filter((it) => it.score === lowScore)
    .slice(0, 3)
    .map((it) => it.month)
    .sort((a, b) => a - b)

  return { items, bigMonths, cautionMonths }
}

function monthLabel(month: number, ko: boolean): string {
  return ko ? `${month}월` : MONTH_ABBR[month - 1]
}

function joinMonths(months: number[], ko: boolean): string {
  return months.map((m) => monthLabel(m, ko)).join(', ')
}

/** "열두 달의 흐름" 범례 — 큰 달 / 조심할 달 (Band aside 슬롯). */
function MonthShapeLegend({ ko }: { ko: boolean }) {
  return (
    <span className={styles.shapeLegend}>
      <span className={styles.legBig}>
        <i className={styles.legDotBig} />
        {ko ? '큰 달' : 'Big months'}
      </span>
      <span className={styles.legCaution}>
        <i className={styles.legDotCaution} />
        {ko ? '조심할 달' : 'Careful months'}
      </span>
    </span>
  )
}

/** "열두 달의 흐름" — 톤으로 색칠한 12막대. 숫자 없음, 큰 달 봉인·조심 표시. */
function MonthShape({ shape, ko }: { shape: ReturnType<typeof buildMonthShape>; ko: boolean }) {
  const { items } = shape
  // 막대 높이는 점수에 비례하되 라벨/숫자는 노출하지 않음 (모양만).
  const heightFor = (it: MonthShapeItem) => {
    if (it.tone === 'big') return 100
    if (it.tone === 'steady') return 64
    return 36
  }
  const toneClass = (t: MonthTone) =>
    t === 'big' ? styles.shapeBig : t === 'caution' ? styles.shapeCaution : styles.shapeSteady

  return (
    <div className={styles.shapeWrap}>
      <div className={styles.shapeBars}>
        {items.map((it) => (
          <div className={styles.shapeCol} key={it.month}>
            <div className={styles.shapeTrack}>
              <div
                className={`${styles.shapeFill} ${toneClass(it.tone)}`}
                style={{ height: `${heightFor(it)}%` }}
              />
              {it.isPeak && <span className={styles.shapeSeal} aria-hidden="true" />}
              {it.tone === 'caution' && shape.cautionMonths.includes(it.month) && (
                <span className={styles.shapeMark} aria-hidden="true" />
              )}
            </div>
            <span className={styles.shapeLbl}>{ko ? it.month : MONTH_ABBR[it.month - 1][0]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export function YearTier({ user, year, onDive, onRise }: YearTierProps) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
  const p = year.profection

  // 12-house wheel (자세히 보기 안에서만).
  const R = 150
  const cx = 180
  const cy = 180
  const houses = Array.from({ length: 12 }, (_, i) => i + 1)

  const natalDots = buildNatalDots(user)
  const transitDots = buildTransitDots(user)

  const sect = user.sect ?? 'day'
  const lordOfYearName = p?.rulerEn ?? ''
  const lordDignity = findDignity(user.dignities, lordOfYearName)
  const lordReadout = lordDignity ? formatDignity(lordDignity) : null

  const zrSpiritNow = (year.zrSpiritChapters ?? []).find((c) => c.now)
  const zrFortuneNow = (year.zrFortuneChapters ?? []).find((c) => c.now)

  const wheelPivotal = readWheelPivotal(year)

  // ── 메인: 평문 crossings (영역 × 행성 + 톤). ──
  const toneTag = (t: 'good' | 'caution' | 'neutral') =>
    ko
      ? t === 'good'
        ? '길'
        : t === 'caution'
          ? '주의'
          : '중립'
      : t === 'good'
        ? 'good'
        : t === 'caution'
          ? 'caution'
          : 'neutral'
  const yearCrossItems = (year.crossings ?? []).map((c) => ({
    when: ko ? c.when : c.whenEn,
    title: `${ko ? c.title : c.titleEn} · ${toneTag(c.tone)}`,
    detail: ko ? c.detail : (c.detailEn ?? c.detail),
  }))
  const crossHeading = ko
    ? `올해 무엇이 겹치나 · ${year.year}`
    : `What overlaps this year · ${year.year}`

  // ── 메인: "열두 달의 흐름" 모양 + 큰 달/조심 한 줄. ──
  const hasMonths = (year.monthlyScores?.length ?? 0) > 0
  const monthShape = buildMonthShape(year.monthlyScores ?? [])

  // ── 자세히 보기 안: 12달 점수 리스트 (밴드 라벨). ──
  const yearBand = (s: number) =>
    s >= 60
      ? ko
        ? '좋은 달'
        : 'Good month'
      : s >= 40
        ? ko
          ? '평이한 달'
          : 'Steady month'
        : ko
          ? '조심할 달'
          : 'Cautious month'
  const flowHeading = ko ? `올해 12달 흐름 · ${year.year}` : `12-month flow · ${year.year}`
  const yearItems = (year.monthlyScores ?? []).map((m) => ({
    when: ko ? `${m.month}월` : MONTH_ABBR[m.month - 1],
    title: yearBand(m.score),
    detail: m.bestDay
      ? ko
        ? `좋은 날 ${m.bestDay} · ${m.score}점`
        : `Best day ${m.bestDay} · ${m.score}`
      : ko
        ? `${m.score}점`
        : `${m.score}`,
  }))

  // ── 왜 이렇게 보나 (근거) — 실제 용어 신호 → 쉬운 결론. fold 전용. ──
  // 새 계산 없음: 이미 year 폴드에 렌더되는 세운·프로펙션·sect·dignity·ZR·교차를
  // 용어 그대로 묶어 4~6개만 노출.
  const whyItems: WhyItem[] = []

  // ① 세운 간지 + 십신 — 한 해의 사주 바탕.
  {
    const gz = year.sewoonGz?.hanja ?? year.sewoon?.gz?.hanja ?? ''
    const area = ko ? sibsinArea(year.sewoonSibsin) : sibsinAreaEn(year.sewoonSibsin)
    whyItems.push({
      term: ko
        ? `세운 ${gz} · ${String(year.sewoonSibsin)}`
        : `Annual ${gz} · ${String(year.sewoonSibsin)}`,
      because: ko
        ? `‘${area}’ 기운이 올 한 해의 바탕을 이룹니다.`
        : `${area} sets the base theme of the year.`,
      tone: 'neutral',
    })
  }

  // ② 연간 프로펙션 하우스 + 룰러(Lord of Year).
  if (p) {
    whyItems.push({
      term: ko
        ? `프로펙션 ${p.house}실 · ${p.ruler}`
        : `Profection ${ordinalEn(p.house)} · ${p.rulerEn}`,
      because: ko
        ? `${p.house}번째 영역(${p.theme})이 무대로 올라오고, ${p.ruler}이(가) 올해의 주인공입니다.`
        : `Your ${ordinalEn(p.house)} house (${p.themeEn.toLowerCase()}) takes the stage, with ${p.rulerEn} as this year's lead.`,
      tone: planetTone(p.rulerEn),
    })
  }

  // ③ Sect (낮/밤) + Lord 의 길흉 — 주간생이면 길성, 야간생이면 흉성이 힘을 받음.
  {
    const sectKo = sect === 'day' ? '주간생(日)' : '야간생(夜)'
    const sectEn = sect === 'day' ? 'Diurnal (day)' : 'Nocturnal (night)'
    const lordTone = lordOfYearName ? planetTone(lordOfYearName) : 'neutral'
    const lordWord =
      lordTone === 'positive'
        ? ko
          ? '길성'
          : 'benefic'
        : lordTone === 'caution'
          ? ko
            ? '흉성'
            : 'malefic'
          : ko
            ? '중립성'
            : 'neutral'
    const lordLabel = ko ? p?.ruler : p?.rulerEn
    whyItems.push({
      term: ko
        ? `${sectKo}${lordLabel ? ` · ${lordWord} ${lordLabel}` : ''}`
        : `${sectEn}${lordLabel ? ` · ${lordWord} ${lordLabel}` : ''}`,
      because: ko
        ? sect === 'day'
          ? '낮 출생이라 길성이 더 또렷이 힘을 받습니다.'
          : '밤 출생이라 흉성을 다스리는 결이 한 해를 좌우합니다.'
        : sect === 'day'
          ? 'A day birth lets benefics carry more weight this year.'
          : 'A night birth makes handling malefics the year’s pivot.',
      tone: lordTone,
    })
  }

  // ④ Lord of Year 의 본명 dignity — 룰러가 강한 자리인가 약한 자리인가.
  if (lordReadout && lordOfYearName) {
    const dignTone =
      lordReadout.tone === 'pos' ? 'positive' : lordReadout.tone === 'neg' ? 'caution' : 'neutral'
    whyItems.push({
      term: ko
        ? `${p?.ruler ?? lordOfYearName} 위계 · ${lordReadout.text}`
        : `${p?.rulerEn ?? lordOfYearName} dignity · ${lordReadout.text}`,
      because:
        lordReadout.tone === 'pos'
          ? ko
            ? '올해의 주인공이 본명에서 강한 자리에 있어 추진력이 좋습니다.'
            : 'The year’s lead sits strong in your chart — good drive behind it.'
          : lordReadout.tone === 'neg'
            ? ko
              ? '올해의 주인공이 약한 자리에 있어 한 박자 조심이 필요합니다.'
              : 'The year’s lead sits weak — pace it with care.'
            : ko
              ? '주인공의 자리가 중립이라 결과는 노력에 달려 있습니다.'
              : 'The lead is neutral — outcomes track your effort.',
      tone: dignTone,
    })
  }

  // ⑤ 가장 센 Zodiacal Releasing 챕터/사인 (Spirit 우선, 없으면 Fortune).
  {
    const zrPick = zrSpiritNow ?? zrFortuneNow
    if (zrPick) {
      const isSpirit = !!zrSpiritNow
      whyItems.push({
        term: ko ? `ZR ${zrPick.sign}` : `ZR ${zrPick.sign}`,
        because: ko
          ? isSpirit
            ? `진로·영혼의 큰 장이 ${zrPick.sign} 구간에 있어요.`
            : `몸·물질의 큰 장이 ${zrPick.sign} 구간에 있어요.`
          : isSpirit
            ? `Your path/soul chapter runs through ${zrPick.sign}.`
            : `Your body/matter chapter runs through ${zrPick.sign}.`,
        tone: 'neutral',
      })
    }
  }

  // ⑥ 가장 센 사주 × 점성 월 교차.
  {
    const strongest = [...(year.crossings ?? [])].sort((a, b) => {
      const w = (t: 'good' | 'caution' | 'neutral') => (t === 'neutral' ? 0 : 1)
      return w(b.tone) - w(a.tone)
    })[0]
    if (strongest) {
      whyItems.push({
        term: ko
          ? `${strongest.title} · ${strongest.when}`
          : `${strongest.titleEn} · ${strongest.whenEn}`,
        because: ko
          ? (strongest.detail ?? '사주와 별이 함께 가리키는 구간입니다.')
          : (strongest.detailEn ??
            strongest.detail ??
            'A window where Saju and the sky point the same way.'),
        tone:
          strongest.tone === 'good'
            ? 'positive'
            : strongest.tone === 'caution'
              ? 'caution'
              : 'neutral',
      })
    }
  }

  // 4~6개만 — 강한 순(중립이 아닌 것 우선)으로 자르되 ①(세운)·②(프로펙션)는 항상 앞에.
  const headWhy = whyItems.slice(0, 2)
  const tailWhy = whyItems
    .slice(2)
    .sort(
      (a, b) =>
        Number((b.tone ?? 'neutral') !== 'neutral') - Number((a.tone ?? 'neutral') !== 'neutral')
    )
  const whyFinal = [...headWhy, ...tailWhy].slice(0, 6)

  // ── 올해 풀이 — 세운 십신 영역 + 프로펙션 하우스 테마 + 가장 큰 달을 엮은 2~3문장. ──
  const sewoonAreaPlain = ko ? sibsinArea(year.sewoonSibsin) : sibsinAreaEn(year.sewoonSibsin)
  const biggestMonth = monthShape.bigMonths.length > 0 ? monthShape.bigMonths[0] : null
  const cautionMonth = monthShape.cautionMonths.length > 0 ? monthShape.cautionMonths[0] : null
  const yearReadingParts: string[] = []
  yearReadingParts.push(
    ko
      ? `올해는 ‘${sewoonAreaPlain}’의 결이 한 해의 바탕을 이뤄요.`
      : `This year, ${sewoonAreaPlain} forms the underlying grain.`
  )
  if (p) {
    yearReadingParts.push(
      ko
        ? `무게중심은 ${p.house}번째 영역(${p.theme})으로 기울어, 그쪽 일이 가장 또렷하게 움직입니다.`
        : `The weight tilts toward your ${ordinalEn(p.house)} house (${p.themeEn.toLowerCase()}) — that’s where things move most clearly.`
    )
  }
  if (biggestMonth) {
    yearReadingParts.push(
      ko
        ? cautionMonth
          ? `${biggestMonth}월에 가장 크게 열리고, ${cautionMonth}월은 한 박자 쉬어 가세요.`
          : `${biggestMonth}월에 흐름이 가장 크게 열립니다.`
        : cautionMonth
          ? `It opens up most around ${monthLabel(biggestMonth, false)}; ease off near ${monthLabel(cautionMonth, false)}.`
          : `It opens up most around ${monthLabel(biggestMonth, false)}.`
    )
  }
  const yearReading = yearReadingParts.slice(0, 3).join(' ')

  return (
    <TierFrame screenLabel={`1년 ${year.year}`}>
      <RiseButton label={ko ? '인생으로 줌아웃' : 'Zoom out to lifetime'} onClick={onRise} />

      <Eyebrow>
        {ko ? '1년' : '1 YEAR'} · YEARLY · {year.year}
      </Eyebrow>

      {/* ── Hero — "N년의 모양" + 평문 한 줄. ── */}
      <TierHero
        lead={ko ? `${year.year}년의 모양` : `The shape of ${year.year}`}
        sub={
          ko
            ? year.headline
            : (year.headlineEn ??
              (year.profection
                ? `This year leans toward your house ${year.profection.house}${year.profection.themeEn ? ` — ${year.profection.themeEn.toLowerCase()}` : ''}.`
                : `${year.year} — a year the flow gets re-drawn.`))
        }
      />

      {/* ── 핵심 ①: 열두 달의 흐름 (모양 + 큰 달/조심) ── */}
      {hasMonths && (
        <Band
          title={ko ? '열두 달의 흐름' : 'Shape of the twelve months'}
          aside={<MonthShapeLegend ko={ko} />}
        >
          <MonthShape shape={monthShape} ko={ko} />
          <p className={styles.bigCaution}>
            {monthShape.bigMonths.length > 0 && (
              <span className={styles.bigPhrase}>
                <b>{ko ? '큰 달' : 'Big months'}</b> {joinMonths(monthShape.bigMonths, ko)}
              </span>
            )}
            {monthShape.bigMonths.length > 0 && monthShape.cautionMonths.length > 0 && (
              <span className={styles.bcSep}> · </span>
            )}
            {monthShape.cautionMonths.length > 0 && (
              <span className={styles.cautionPhrase}>
                <b>{ko ? '조심' : 'Careful'}</b> {joinMonths(monthShape.cautionMonths, ko)}
              </span>
            )}
          </p>
        </Band>
      )}

      {/* ── 올해 풀이 — 세운 영역 + 프로펙션 테마 + 큰 달을 엮은 평문 해석. ── */}
      {yearReading && (
        <Band title={ko ? '올해 풀이' : 'Reading the year'}>
          <p className={styles.yearReading}>{yearReading}</p>
        </Band>
      )}

      {/* ── 핵심 ②: 올해 무엇이 겹치나 (평문 교차) ── */}
      {yearCrossItems.length > 0 && (
        <Band title={crossHeading}>
          <CrossingList items={yearCrossItems} />
        </Band>
      )}

      {/* ── 자세한 신호 보기 — 휠·글리프·프로펙션·sect·dignity·ZR·세운 간지 전부 접음 ── */}
      <details className={summaryStyles.details}>
        <summary className={summaryStyles.detailsSummary}>
          {ko ? '자세한 신호 보기' : 'See the detailed signals'}
        </summary>

        {/* 왜 이렇게 보나 — 실제 용어 신호 → 쉬운 결론(근거). 표면 풀이의 출처. */}
        <WhyList title={ko ? '왜 이렇게 보나' : 'Why it reads this way'} items={whyFinal} />

        {/* 12달 점수 리스트 (밴드 라벨) — 상세. */}
        {hasMonths && <CrossingList heading={flowHeading} items={yearItems} />}

        <div className={styles.yearWrap}>
          {/* ── house wheel ── */}
          <div className={styles.wheelBox}>
            {wheelPivotal && (
              <div className={styles.pivotalBadge} aria-label={wheelPivotal.label}>
                <span className="han">{wheelPivotal.han}</span>
                {wheelPivotal.label}
              </div>
            )}

            <svg className={styles.wheel} viewBox="0 0 360 360">
              <defs>
                <radialGradient id="wheelglow-year" cx="0.5" cy="0.5" r="0.5">
                  <stop offset="0" stopColor="rgba(91,141,239,0.12)" />
                  <stop offset="1" stopColor="transparent" />
                </radialGradient>
              </defs>
              <circle cx={cx} cy={cy} r={R} fill="url(#wheelglow-year)" />
              <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--dp-line)" strokeWidth={1} />
              <circle
                cx={cx}
                cy={cy}
                r={R - 44}
                fill="none"
                stroke="var(--dp-line-soft)"
                strokeWidth={1}
              />

              {houses.map((h) => {
                const a0 = ((h - 1) / 12) * Math.PI * 2 - Math.PI / 2
                const a1 = (h / 12) * Math.PI * 2 - Math.PI / 2
                const mid = (a0 + a1) / 2
                const active = h === p?.house
                const lx = cx + Math.cos(mid) * (R - 22)
                const ly = cy + Math.sin(mid) * (R - 22)
                const sx = cx + Math.cos(a0) * R
                const sy = cy + Math.sin(a0) * R
                return (
                  <g key={h}>
                    <line
                      x1={cx}
                      y1={cy}
                      x2={sx}
                      y2={sy}
                      stroke="var(--dp-line-soft)"
                      strokeWidth={0.7}
                    />
                    {active &&
                      (() => {
                        const steps = 18
                        const pts: Array<[number, number]> = [[cx, cy]]
                        for (let s = 0; s <= steps; s++) {
                          const a = a0 + (a1 - a0) * (s / steps)
                          pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R])
                        }
                        return (
                          <polygon
                            points={pts.map((pt) => pt.join(',')).join(' ')}
                            fill="rgba(176,58,34,0.18)"
                            stroke="var(--dp-ember)"
                            strokeWidth={1}
                          />
                        )
                      })()}
                    <text
                      x={lx}
                      y={ly}
                      className={
                        active ? `${styles.houseNum} ${styles.houseNumActive}` : styles.houseNum
                      }
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {h}
                    </text>
                  </g>
                )
              })}

              {/* 본명 행성 도트 (안쪽 링). */}
              {natalDots.map((d, i) => {
                const ang = houseAngle(d.house)
                const sameHouseBefore = natalDots
                  .slice(0, i)
                  .filter((x) => x.house === d.house).length
                const rOff = R - 60 - sameHouseBefore * 10
                const x = cx + Math.cos(ang) * rOff
                const y = cy + Math.sin(ang) * rOff
                return (
                  <g key={`n-${d.planet}-${i}`}>
                    <circle cx={x} cy={y} r={3.2} className={styles.natalDot} />
                    <text x={x + 7} y={y + 3} className={styles.natalGlyph}>
                      {d.glyph}
                    </text>
                  </g>
                )
              })}

              {/* 외행성 트랜짓 도트 (바깥쪽 링). */}
              {transitDots.map((d, i) => {
                const ang = houseAngle(d.house)
                const sameHouseBefore = transitDots
                  .slice(0, i)
                  .filter((x) => x.house === d.house).length
                const rOff = R + 14 + sameHouseBefore * 12
                const x = cx + Math.cos(ang) * rOff
                const y = cy + Math.sin(ang) * rOff
                return (
                  <g key={`t-${d.planet}-${i}`}>
                    <circle cx={x} cy={y} r={3.6} className={styles.transitDot} />
                    <text x={x + 7} y={y + 3} className={styles.transitGlyph}>
                      {d.glyph}
                    </text>
                  </g>
                )
              })}

              <text x={cx} y={cy - 6} textAnchor="middle" className={styles.wheelCenterTop}>
                house
              </text>
              <text x={cx} y={cy + 18} textAnchor="middle" className={styles.wheelCenterHouse}>
                {p?.house ?? ''}
              </text>
            </svg>
          </div>

          {/* ── readout (astro + saju) ── */}
          <div>
            <LayerTag kind="astro" />
            <div className={styles.yearReadout}>
              <div className={styles.big}>
                {p
                  ? ko
                    ? `${p.house}번째 영역이 무대`
                    : `${ordinalEn(p.house)} house on stage`
                  : ko
                    ? '활성 영역 미정'
                    : 'house TBD'}
              </div>
              {p && (
                <p className={styles.lead} style={{ fontSize: 14 }}>
                  {ko ? p.theme : p.themeEn}
                </p>
              )}
              {p && (
                <dl className={styles.kv}>
                  <dt>profection</dt>
                  <dd>
                    <b>
                      {p.house}
                      {ko ? '하우스' : 'House'}
                    </b>{' '}
                    {ko ? '활성' : 'active'}
                  </dd>
                  <dt>cusp</dt>
                  <dd>{ko ? p.cusp : p.cuspEn}</dd>
                  <dt>ruler</dt>
                  <dd>
                    <b>{ko ? p.ruler : p.rulerEn}</b>
                  </dd>
                  <dt>{ko ? 'ruler 본명' : 'ruler (natal)'}</dt>
                  <dd>{ko ? p.rulerNatal : p.rulerNatalEn}</dd>
                </dl>
              )}

              <div
                className={
                  sect === 'day'
                    ? `${styles.sectLine} ${styles.sectLineDay}`
                    : `${styles.sectLine} ${styles.sectLineNight}`
                }
              >
                <span className="pip" />
                <span className="han">
                  {ko ? (sect === 'day' ? '낮' : '밤') : sect === 'day' ? 'Day' : 'Night'}
                </span>
                Sect · {sect === 'day' ? 'Diurnal' : 'Nocturnal'}
                {ko ? ' 출생' : ' birth'}
              </div>
              {lordReadout && p && (
                <p className={styles.lordOfYear}>
                  <b>Lord of Year</b> {ko ? p.ruler : p.rulerEn} —{' '}
                  <span className={styles[lordReadout.tone]}>{lordReadout.text}</span>
                </p>
              )}

              {(ko ? year.astroNote : (year.astroNoteEn ?? year.astroNote)) && (
                <p
                  className={styles.lead}
                  style={{
                    fontSize: 13,
                    marginTop: 14,
                    color: 'var(--dp-ink-mute)',
                  }}
                >
                  {ko ? year.astroNote : (year.astroNoteEn ?? year.astroNote)}
                </p>
              )}
            </div>

            <hr className={styles.hr} />

            <LayerTag kind="saju" />
            <div className={styles.sewoonRow}>
              <div className={styles.ganjiBox}>
                <Ganji data={year.sewoon?.gz ?? year.sewoonGz} size={42} />
              </div>
              <div>
                <div className={styles.ganjiMeta}>
                  {ko ? '세운 ' : 'Annual '}
                  {year.year} · {year.sewoonSibsin}
                  {(() => {
                    const area = ko
                      ? sibsinArea(year.sewoonSibsin)
                      : sibsinAreaEn(year.sewoonSibsin)
                    return area !== year.sewoonSibsin ? ` (${area})` : ''
                  })()}
                </div>
                <p className={styles.sajuNote}>
                  {ko ? year.sajuNote : (year.sajuNoteEn ?? year.sajuNote)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── ZR 카드 (Spirit / Fortune) ── */}
        <section className={styles.block}>
          <div className={styles.secHead}>
            <h2
              className={styles.secTitle}
              title={
                ko
                  ? '인생을 장(章)으로 나누는 점성 흐름 — 시기마다 무엇이 무대에 오르는지'
                  : 'An astrological flow that divides life into chapters — what takes the stage in each period'
              }
            >
              {ko ? '황도분기 · Zodiacal Releasing' : 'Zodiacal Releasing'}
            </h2>
            <span className={styles.secTag}>
              {ko ? 'L1 / L2 — 챕터 진행' : 'L1 / L2 — chapter progress'}
            </span>
          </div>
          <div className={styles.zrCard}>
            <div className={`${styles.zrPane} ${styles.zrPaneSpirit}`}>
              <div className={styles.zrPaneHead}>
                {ko ? 'Spirit · 영혼 · 진로' : 'Spirit · soul · path'}
              </div>
              {zrSpiritNow ? (
                <>
                  <div>
                    <span className={styles.zrLevel}>L1</span>
                    <span className={styles.zrSign}>{zrSpiritNow.sign}</span>
                    <span className={styles.zrSignEn}>{zrSpiritNow.ruler}</span>
                  </div>
                  <div className={styles.zrMeta}>
                    <span>
                      {zrSpiritNow.calendarStartYear}–{zrSpiritNow.calendarEndYear}
                    </span>
                    <span>
                      {zrSpiritNow.durationYears}
                      {ko ? '년' : 'y'}
                    </span>
                    {zrPivotalTag(zrSpiritNow, ko) && (
                      <span className={styles.pivot}>{zrPivotalTag(zrSpiritNow, ko)}</span>
                    )}
                  </div>
                  {zrSpiritNow.subPeriods && zrSpiritNow.subPeriods.length > 0 && (
                    <div className={styles.zrMeta}>
                      <span className={styles.zrLevel}>L2</span>
                      {zrSpiritNow.subPeriods.slice(0, 1).map((sub, i) => (
                        <span key={i}>
                          {sub.sign} · {sub.ruler} · {sub.durationMonths}
                          {ko ? '개월' : 'mo'}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.zrEmpty}>
                  {ko ? '현재 활성 Spirit 챕터 없음' : 'No active Spirit chapter'}
                </div>
              )}
            </div>

            <div className={`${styles.zrPane} ${styles.zrPaneFortune}`}>
              <div className={styles.zrPaneHead}>
                {ko ? 'Fortune · 몸 · 물질' : 'Fortune · body · matter'}
              </div>
              {zrFortuneNow ? (
                <>
                  <div>
                    <span className={styles.zrLevel}>L1</span>
                    <span className={styles.zrSign}>{zrFortuneNow.sign}</span>
                    <span className={styles.zrSignEn}>{zrFortuneNow.ruler}</span>
                  </div>
                  <div className={styles.zrMeta}>
                    <span>
                      {zrFortuneNow.calendarStartYear}–{zrFortuneNow.calendarEndYear}
                    </span>
                    <span>
                      {zrFortuneNow.durationYears}
                      {ko ? '년' : 'y'}
                    </span>
                    {zrPivotalTag(zrFortuneNow, ko) && (
                      <span className={styles.pivot}>{zrPivotalTag(zrFortuneNow, ko)}</span>
                    )}
                  </div>
                  {zrFortuneNow.subPeriods && zrFortuneNow.subPeriods.length > 0 && (
                    <div className={styles.zrMeta}>
                      <span className={styles.zrLevel}>L2</span>
                      {zrFortuneNow.subPeriods.slice(0, 1).map((sub, i) => (
                        <span key={i}>
                          {sub.sign} · {sub.ruler} · {sub.durationMonths}
                          {ko ? '개월' : 'mo'}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.zrEmpty}>
                  {ko ? '현재 활성 Fortune 챕터 없음' : 'No active Fortune chapter'}
                </div>
              )}
            </div>
          </div>
        </section>
      </details>

      {/* ── dive 버튼 ── */}
      <div className={styles.diveWrap}>
        <button className={styles.dive} onClick={onDive}>
          {ko ? '이번 달로 줌인' : 'Zoom in to this month'} <span className={styles.arrow}>↓</span>
        </button>
      </div>
    </TierFrame>
  )
}
