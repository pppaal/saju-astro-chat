/**
 * 신년 / 월운세 리포트용 타이밍 압축 로직.
 *
 * 캘린더 lite 엔진(calculateYearlyImportantDatesLite)이 365일 어레이를 만들고,
 * 본 모듈은 그 어레이를 받아 한 해 / 한 달 단위 narrative를 압축합니다.
 *
 *  - 좋은 시기 (grade 0~1) 클러스터링 — 연속된 강한 구간을 묶어 "X월 초~중순"
 *  - 주의 시기 (grade 3~4) 클러스터링
 *  - 도메인별 피크 — 한 해 동안 어떤 도메인이 언제 가장 강한지
 *  - 월별 톤 (12개월) — 월간 리포트가 한 달 안에서 주차별 분기
 *
 * 새 엔진을 만들지 않습니다. 캘린더가 이미 산출한 점수·도메인·교차 신뢰도를
 * 그대로 받아서 narrative만 합성.
 */

import type { LiteImportantDate } from '@/app/api/calendar/lib/liteYearlyDates'

export type TimingCluster = {
  /** 'YYYY-MM-DD' 시작·종료 */
  start: string
  end: string
  /** 평균 점수 (0~99) */
  avgScore: number
  /** 평균 grade (0=가장 좋음 ~ 4=가장 나쁨) */
  avgGrade: number
  /** 한 줄 자연어 라벨 — 예: "3월 초~중순" / "early to mid March" */
  label: { ko: string; en: string }
  /** 도메인 분포 */
  topDomain?: 'career' | 'love' | 'money' | 'health' | 'move'
}

export type DomainPeak = {
  domain: 'career' | 'love' | 'money' | 'health' | 'move'
  /** 'YYYY-MM' */
  monthKey: string
  /** 평균 점수 */
  avgScore: number
}

export type MonthlyToneSegment = {
  /** 1=초/4=후반, 1주~4주 */
  weekIdx: 1 | 2 | 3 | 4
  /** 시작·종료 일 (1~31) */
  startDay: number
  endDay: number
  /** 톤: rising/aligned/wavering/guarded */
  tone: 'rising' | 'aligned' | 'wavering' | 'guarded'
  /** 평균 점수 */
  avgScore: number
  /** 한 줄 자연어 — 예: "3월 1주: 추진 강한 흐름" */
  summary: { ko: string; en: string }
}

export type YearlyTimingDigest = {
  year: number
  /** 한 해 평균 점수 */
  avgScore: number
  /** 한 해 평균 교차 일치도 */
  avgCrossAgreement: number
  /** 좋은 시기 클러스터 (grade 0~1 연속 구간) */
  favorable: TimingCluster[]
  /** 주의 시기 클러스터 (grade 3~4 연속 구간) */
  caution: TimingCluster[]
  /** 도메인별 피크 (5도메인 각각) */
  domainPeaks: DomainPeak[]
  /** 월별 평균 점수 (12) */
  monthlyAverages: { monthKey: string; avgScore: number; tone: MonthlyToneSegment['tone'] }[]
}

export type MonthlyTimingDigest = {
  year: number
  month: number // 1-12
  avgScore: number
  avgCrossAgreement: number
  /** 4주차 분할 (각 주의 톤·평균) */
  weeks: MonthlyToneSegment[]
  /** 그 달 가장 강한 도메인 */
  topDomain?: 'career' | 'love' | 'money' | 'health' | 'move'
  /** 그 달 강한 날 (grade 0~1) — 최대 5개 */
  topDates: LiteImportantDate[]
  /** 그 달 주의 날 (grade 3~4) — 최대 5개 */
  cautionDates: LiteImportantDate[]
}

const MONTH_KO = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
const MONTH_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function dayWindowLabel(day: number, lang: 'ko' | 'en'): string {
  if (lang === 'ko') {
    if (day <= 10) return '초순'
    if (day <= 20) return '중순'
    return '후반'
  }
  if (day <= 10) return 'early'
  if (day <= 20) return 'mid'
  return 'late'
}

function clusterLabel(start: Date, end: Date, lang: 'ko' | 'en'): { ko: string; en: string } {
  const sm = start.getMonth()
  const em = end.getMonth()
  const sd = start.getDate()
  const ed = end.getDate()
  const koStart = `${MONTH_KO[sm]} ${dayWindowLabel(sd, 'ko')}`
  const koEnd = `${MONTH_KO[em]} ${dayWindowLabel(ed, 'ko')}`
  const enStart = `${dayWindowLabel(sd, 'en')} ${MONTH_EN[sm]}`
  const enEnd = `${dayWindowLabel(ed, 'en')} ${MONTH_EN[em]}`
  return {
    ko: koStart === koEnd ? koStart : `${koStart}~${koEnd}`,
    en: enStart === enEnd ? enStart : `${enStart} to ${enEnd}`,
  }
}

function dateOf(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function monthKeyOf(iso: string): string {
  return iso.slice(0, 7)
}

function pickTopCategory(date: LiteImportantDate): DomainPeak['domain'] | undefined {
  // EventCategory: "wealth" | "career" | "love" | "health" | "travel" | "study" | "general"
  // → DomainPeak['domain']: "career" | "love" | "money" | "health" | "move"
  const cat = date.categories?.[0]
  if (!cat) return undefined
  if (cat === 'career' || cat === 'love' || cat === 'health') return cat
  if (cat === 'wealth') return 'money'
  if (cat === 'travel') return 'move'
  return undefined
}

function clusterByGrade(
  dates: LiteImportantDate[],
  predicate: (g: number) => boolean,
  minLen = 2
): TimingCluster[] {
  const out: TimingCluster[] = []
  let buf: LiteImportantDate[] = []
  const flush = () => {
    if (buf.length < minLen) {
      buf = []
      return
    }
    const start = buf[0].date
    const end = buf[buf.length - 1].date
    const avgScore =
      buf.reduce((sum, d) => sum + (d.score || 0), 0) / buf.length
    const avgGrade = buf.reduce((sum, d) => sum + d.grade, 0) / buf.length
    const counts = new Map<DomainPeak['domain'], number>()
    for (const d of buf) {
      const dom = pickTopCategory(d)
      if (dom) counts.set(dom, (counts.get(dom) || 0) + 1)
    }
    let topDomain: DomainPeak['domain'] | undefined
    let topCount = 0
    for (const [dom, cnt] of counts) {
      if (cnt > topCount) {
        topDomain = dom
        topCount = cnt
      }
    }
    out.push({
      start,
      end,
      avgScore: Math.round(avgScore),
      avgGrade: Number(avgGrade.toFixed(2)),
      label: clusterLabel(dateOf(start), dateOf(end), 'ko'),
      topDomain,
    })
    buf = []
  }
  for (const d of dates) {
    if (predicate(d.grade)) {
      buf.push(d)
    } else {
      flush()
    }
  }
  flush()
  // ko/en label은 별도 — 위에서 ko만 채웠으니 en도 합성
  return out.map((c) => ({
    ...c,
    label: clusterLabel(dateOf(c.start), dateOf(c.end), 'ko')
      ? { ko: clusterLabel(dateOf(c.start), dateOf(c.end), 'ko').ko, en: clusterLabel(dateOf(c.start), dateOf(c.end), 'en').en }
      : c.label,
  }))
}

function toneFromAvg(avg: number): MonthlyToneSegment['tone'] {
  if (avg >= 75) return 'rising'
  if (avg >= 60) return 'aligned'
  if (avg >= 45) return 'wavering'
  return 'guarded'
}

function toneSummary(weekIdx: 1 | 2 | 3 | 4, tone: MonthlyToneSegment['tone']): { ko: string; en: string } {
  const koWeek = ['1주', '2주', '3주', '4주'][weekIdx - 1]
  const enWeek = `Week ${weekIdx}`
  const koTone =
    tone === 'rising'
      ? '추진력이 강한 구간'
      : tone === 'aligned'
        ? '안정적으로 진행되는 구간'
        : tone === 'wavering'
          ? '점검·재정렬이 필요한 구간'
          : '한 발 물러서는 게 안전한 구간'
  const enTone =
    tone === 'rising'
      ? 'strong push window'
      : tone === 'aligned'
        ? 'steady alignment window'
        : tone === 'wavering'
          ? 'review and recalibrate'
          : 'pull back and protect'
  return { ko: `${koWeek}: ${koTone}`, en: `${enWeek}: ${enTone}` }
}

/**
 * 한 해(365일) lite 데이터를 받아 신년 운세 디제스트로 압축.
 */
export function buildYearlyTimingDigest(
  year: number,
  yearlyDates: LiteImportantDate[]
): YearlyTimingDigest {
  const sortedByDate = [...yearlyDates].sort((a, b) => a.date.localeCompare(b.date))
  const avgScore =
    sortedByDate.length > 0
      ? Math.round(
          sortedByDate.reduce((sum, d) => sum + (d.score || 0), 0) / sortedByDate.length
        )
      : 0
  const xValues = sortedByDate
    .map((d) => d.crossAgreementPercent || 0)
    .filter((v) => v > 0)
  const avgCrossAgreement =
    xValues.length > 0
      ? Math.round(xValues.reduce((sum, v) => sum + v, 0) / xValues.length)
      : 0

  const favorable = clusterByGrade(sortedByDate, (g) => g <= 1, 2)
  const caution = clusterByGrade(sortedByDate, (g) => g >= 3, 2)

  // 도메인별 피크 (월별 평균 → 가장 큰 달)
  const domainMonth = new Map<DomainPeak['domain'], Map<string, { sum: number; n: number }>>()
  for (const d of sortedByDate) {
    const dom = pickTopCategory(d)
    if (!dom) continue
    const mk = monthKeyOf(d.date)
    if (!domainMonth.has(dom)) domainMonth.set(dom, new Map())
    const inner = domainMonth.get(dom)!
    const cur = inner.get(mk) || { sum: 0, n: 0 }
    inner.set(mk, { sum: cur.sum + (d.score || 0), n: cur.n + 1 })
  }
  const domainPeaks: DomainPeak[] = []
  for (const [dom, months] of domainMonth) {
    let bestMk = ''
    let bestAvg = -1
    for (const [mk, agg] of months) {
      const avg = agg.sum / Math.max(1, agg.n)
      if (avg > bestAvg) {
        bestAvg = avg
        bestMk = mk
      }
    }
    if (bestMk) domainPeaks.push({ domain: dom, monthKey: bestMk, avgScore: Math.round(bestAvg) })
  }
  domainPeaks.sort((a, b) => b.avgScore - a.avgScore)

  // 월별 평균
  const monthAgg = new Map<string, { sum: number; n: number }>()
  for (const d of sortedByDate) {
    const mk = monthKeyOf(d.date)
    const cur = monthAgg.get(mk) || { sum: 0, n: 0 }
    monthAgg.set(mk, { sum: cur.sum + (d.score || 0), n: cur.n + 1 })
  }
  const monthlyAverages: YearlyTimingDigest['monthlyAverages'] = []
  for (let m = 1; m <= 12; m++) {
    const mk = `${year}-${String(m).padStart(2, '0')}`
    const agg = monthAgg.get(mk)
    const avg = agg ? Math.round(agg.sum / Math.max(1, agg.n)) : 50
    monthlyAverages.push({ monthKey: mk, avgScore: avg, tone: toneFromAvg(avg) })
  }

  return {
    year,
    avgScore,
    avgCrossAgreement,
    favorable,
    caution,
    domainPeaks,
    monthlyAverages,
  }
}

/**
 * 한 달(약 30일) lite 데이터를 받아 월간 운세 디제스트로 압축.
 * @param yearlyDates 한 해 전체 또는 그 달이 포함된 데이터
 */
export function buildMonthlyTimingDigest(
  year: number,
  month: number,
  yearlyDates: LiteImportantDate[]
): MonthlyTimingDigest {
  const monthDates = yearlyDates.filter((d) => {
    const [y, m] = d.date.split('-').map(Number)
    return y === year && m === month
  })
  const avgScore =
    monthDates.length > 0
      ? Math.round(
          monthDates.reduce((sum, d) => sum + (d.score || 0), 0) / monthDates.length
        )
      : 50
  const xValues = monthDates
    .map((d) => d.crossAgreementPercent || 0)
    .filter((v) => v > 0)
  const avgCrossAgreement =
    xValues.length > 0
      ? Math.round(xValues.reduce((sum, v) => sum + v, 0) / xValues.length)
      : 0

  // 4주차 분할
  const weeks: MonthlyToneSegment[] = []
  for (let w = 1 as 1 | 2 | 3 | 4; w <= 4; w = (w + 1) as 1 | 2 | 3 | 4) {
    const startDay = (w - 1) * 7 + 1
    const endDay = w === 4 ? 31 : w * 7
    const weekDates = monthDates.filter((d) => {
      const day = Number(d.date.split('-')[2])
      return day >= startDay && day <= endDay
    })
    const wAvg =
      weekDates.length > 0
        ? Math.round(
            weekDates.reduce((sum, d) => sum + (d.score || 0), 0) / weekDates.length
          )
        : avgScore
    const tone = toneFromAvg(wAvg)
    weeks.push({
      weekIdx: w,
      startDay,
      endDay,
      tone,
      avgScore: wAvg,
      summary: toneSummary(w, tone),
    })
    if (w === 4) break
  }

  // top domain
  const domCounts = new Map<DomainPeak['domain'], number>()
  for (const d of monthDates) {
    const dom = pickTopCategory(d)
    if (dom) domCounts.set(dom, (domCounts.get(dom) || 0) + 1)
  }
  let topDomain: DomainPeak['domain'] | undefined
  let topCount = 0
  for (const [dom, cnt] of domCounts) {
    if (cnt > topCount) {
      topDomain = dom
      topCount = cnt
    }
  }

  const topDates = [...monthDates]
    .filter((d) => d.grade <= 1)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 5)
  const cautionDates = [...monthDates]
    .filter((d) => d.grade >= 3)
    .sort((a, b) => (a.score || 0) - (b.score || 0))
    .slice(0, 5)

  return {
    year,
    month,
    avgScore,
    avgCrossAgreement,
    weeks,
    topDomain,
    topDates,
    cautionDates,
  }
}
