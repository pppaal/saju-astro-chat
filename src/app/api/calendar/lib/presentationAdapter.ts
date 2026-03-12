import type { DomainKey, DomainScore } from '@/lib/destiny-matrix/types'
import type { FormattedDate } from './types'

type Locale = 'ko' | 'en'

type TopDomain = {
  domain: DomainKey | 'general'
  label: string
  score: number
}

type WeatherSummary = {
  grade: 'strong' | 'good' | 'neutral' | 'caution'
  summary: string
}

type DaySummary = {
  date: string
  summary: string
  focusDomain: string
  reliability: string
}

type WeekSummary = {
  rangeStart: string
  rangeEnd: string
  summary: string
}

type MonthSummary = {
  month: string
  summary: string
}

export type CalendarPresentationView = {
  daySummary: DaySummary
  weekSummary: WeekSummary
  monthSummary: MonthSummary
  topDomains: TopDomain[]
  timingSignals: string[]
  cautions: string[]
  recommendedActions: string[]
  relationshipWeather: WeatherSummary
  workMoneyWeather: WeatherSummary
}

function toDatePartsInTimeZone(
  date: Date,
  timeZone: string
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const getPart = (type: 'year' | 'month' | 'day') =>
    Number(parts.find((part) => part.type === type)?.value ?? '0')

  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
  }
}

function toIsoDate(parts: { year: number; month: number; day: number }): string {
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  return toIsoDate({ year: dt.getFullYear(), month: dt.getMonth() + 1, day: dt.getDate() })
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function dedupe(lines: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const line of lines) {
    const cleaned = String(line || '').trim()
    if (!cleaned) continue
    const key = cleaned.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(cleaned)
  }
  return out
}

function getDomainLabel(domain: DomainKey | 'general', locale: Locale): string {
  const ko: Record<DomainKey | 'general', string> = {
    career: '커리어',
    love: '관계',
    money: '재정',
    health: '건강',
    move: '이동/변화',
    general: '전반',
  }
  const en: Record<DomainKey | 'general', string> = {
    career: 'career',
    love: 'relationship',
    money: 'finance',
    health: 'health',
    move: 'movement',
    general: 'overall',
  }
  return locale === 'ko' ? ko[domain] : en[domain]
}

function getReliabilityText(
  locale: Locale,
  confidence?: number,
  crossAgreementPercent?: number
): string {
  const conf = typeof confidence === 'number' ? confidence : 0
  const agreement = typeof crossAgreementPercent === 'number' ? crossAgreementPercent : undefined
  const lowConf = conf < 40
  const lowAgreement = typeof agreement === 'number' && agreement < 60

  if (locale === 'ko') {
    if (lowConf && lowAgreement) return '신호 일치도 낮음: 확정보다 검토 우선'
    if (lowConf) return '근거 강도 낮음: 보수적 실행 권장'
    if (lowAgreement) return '사주/점성 합의 약함: 재확인 권장'
    return '신호 안정: 핵심 1~2개 실행 집중'
  }

  if (lowConf && lowAgreement) return 'Low alignment: review before commitment'
  if (lowConf) return 'Low evidence strength: run conservatively'
  if (lowAgreement) return 'Weak cross-agreement: verify once more'
  return 'Signals are stable: execute 1-2 priorities'
}

function isDefensivePhase(value?: string): boolean {
  if (!value) return false
  return /(defensive|reset|stabil|재정렬|방어|안정)/i.test(value)
}

function softenForDefensivePhase(line: string, locale: Locale): string {
  if (locale === 'ko') {
    return line
      .replace(/(서명|계약|확정|예약|즉시 결정|큰 결정)/g, '검토')
      .replace(/최적/g, '점검 우선')
      .replace(/바로/g, '검토 후')
  }
  return line
    .replace(/\b(sign|finalize|confirm|book|commit now|big decision)\b/gi, 'review')
    .replace(/\b(best|optimal|perfect)\b/gi, 'review-first')
}

function pickSelectedDate(allDates: FormattedDate[], timeZone: string): FormattedDate | undefined {
  const todayIso = toIsoDate(toDatePartsInTimeZone(new Date(), timeZone))
  return allDates.find((d) => d.date === todayIso) || allDates[0]
}

function scoreToWeatherGrade(avg: number, cautionRatio: number): WeatherSummary['grade'] {
  if (cautionRatio >= 0.5 || avg < 45) return 'caution'
  if (avg >= 78) return 'strong'
  if (avg >= 62) return 'good'
  return 'neutral'
}

function weatherSummaryText(
  locale: Locale,
  area: 'relationship' | 'workMoney',
  grade: WeatherSummary['grade']
): string {
  if (locale === 'ko') {
    if (area === 'relationship') {
      if (grade === 'strong')
        return '관계 흐름이 좋습니다. 연결을 넓히되 약속은 간결하게 확인하세요.'
      if (grade === 'good') return '관계는 무난한 상승 흐름입니다. 핵심 대화 1건에 집중하세요.'
      if (grade === 'neutral')
        return '관계는 보통 흐름입니다. 기대치 정리를 먼저 하면 충돌을 줄일 수 있습니다.'
      return '관계는 주의 구간입니다. 감정 반응보다 문장 확인을 우선하세요.'
    }
    if (grade === 'strong') return '일/돈 흐름이 강합니다. 확장보다 우선순위 1개를 확실히 잡으세요.'
    if (grade === 'good')
      return '일/돈은 실무형 실행에 유리합니다. 작은 검증을 붙이면 성과가 커집니다.'
    if (grade === 'neutral')
      return '일/돈은 보통 흐름입니다. 속도보다 체크리스트 운영이 안전합니다.'
    return '일/돈은 변동성 구간입니다. 신규 확정보다 조건 점검이 우선입니다.'
  }

  if (area === 'relationship') {
    if (grade === 'strong')
      return 'Relationship flow is strong. Expand connections, but confirm commitments briefly.'
    if (grade === 'good') return 'Relationship flow is positive. Focus on one key conversation.'
    if (grade === 'neutral') return 'Relationship flow is neutral. Align expectations first.'
    return 'Relationship flow is cautious. Verify wording before reacting.'
  }
  if (grade === 'strong')
    return 'Work/finance momentum is strong. Keep focus on one high-impact priority.'
  if (grade === 'good')
    return 'Work/finance supports practical execution. Add one verification step.'
  if (grade === 'neutral')
    return 'Work/finance is neutral. Checklist-based pacing is safer than speed.'
  return 'Work/finance is volatile. Review terms before any commitment.'
}

function buildTopDomains(
  locale: Locale,
  allDates: FormattedDate[],
  domainScores?: Record<DomainKey, DomainScore>
): TopDomain[] {
  if (domainScores && Object.keys(domainScores).length > 0) {
    return (Object.values(domainScores) || [])
      .slice()
      .sort((a, b) => b.finalScoreAdjusted - a.finalScoreAdjusted)
      .slice(0, 3)
      .map((item) => ({
        domain: item.domain,
        label: getDomainLabel(item.domain, locale),
        score: Number(clamp01(item.finalScoreAdjusted / 10).toFixed(2)),
      }))
  }

  const buckets = new Map<DomainKey | 'general', { sum: number; count: number }>()
  for (const date of allDates) {
    const domain = (date.evidence?.matrix?.domain || 'general') as DomainKey | 'general'
    const score = Number.isFinite(date.displayScore) ? (date.displayScore as number) : date.score
    const prev = buckets.get(domain) || { sum: 0, count: 0 }
    prev.sum += Math.max(0, Math.min(100, score))
    prev.count += 1
    buckets.set(domain, prev)
  }

  return [...buckets.entries()]
    .map(([domain, row]) => ({
      domain,
      label: getDomainLabel(domain, locale),
      score: Number(clamp01(row.count > 0 ? row.sum / row.count / 100 : 0).toFixed(2)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}

export function buildCalendarPresentationView(input: {
  allDates: FormattedDate[]
  locale: Locale
  timeZone: string
  matrixContract?: {
    overallPhase?: string
    overallPhaseLabel?: string
    focusDomain?: string
  }
  domainScores?: Record<DomainKey, DomainScore>
}): CalendarPresentationView {
  const { allDates, locale, timeZone, matrixContract, domainScores } = input
  const selected = pickSelectedDate(allDates, timeZone)

  if (!selected) {
    const emptySummary =
      locale === 'ko'
        ? '데이터가 부족해 요약을 생성하지 못했습니다.'
        : 'Not enough data to build summary.'
    return {
      daySummary: {
        date: '',
        summary: emptySummary,
        focusDomain: getDomainLabel('general', locale),
        reliability: emptySummary,
      },
      weekSummary: { rangeStart: '', rangeEnd: '', summary: emptySummary },
      monthSummary: { month: '', summary: emptySummary },
      topDomains: [],
      timingSignals: [],
      cautions: [],
      recommendedActions: [],
      relationshipWeather: { grade: 'neutral', summary: emptySummary },
      workMoneyWeather: { grade: 'neutral', summary: emptySummary },
    }
  }

  const defensivePhase = isDefensivePhase(
    matrixContract?.overallPhaseLabel || matrixContract?.overallPhase
  )
  const topDomains = buildTopDomains(locale, allDates, domainScores)
  const focusDomain = selected.evidence?.matrix?.domain || (topDomains[0]?.domain ?? 'general')
  const focusDomainLabel = getDomainLabel(focusDomain as DomainKey | 'general', locale)
  const reliability = getReliabilityText(
    locale,
    selected.evidence?.confidence,
    selected.evidence?.crossAgreementPercent
  )
  const timingSignals = dedupe(selected.timingSignals || []).slice(0, 4)
  const cautions = dedupe(selected.warnings || []).slice(0, 3)
  const baseActions = dedupe(selected.recommendations || []).slice(0, 3)
  const recommendedActions = defensivePhase
    ? baseActions.map((line) => softenForDefensivePhase(line, locale))
    : baseActions

  const daySummaryText =
    selected.actionSummary ||
    selected.summary ||
    (locale === 'ko'
      ? '오늘은 핵심 과제 1~2개 중심으로 운영하세요.'
      : 'Focus on one or two priorities today.')
  const daySummary: DaySummary = {
    date: selected.date,
    summary: defensivePhase
      ? locale === 'ko'
        ? `${daySummaryText} (국면: 방어/재정렬)`
        : `${daySummaryText} (phase: defensive/reset)`
      : daySummaryText,
    focusDomain: focusDomainLabel,
    reliability,
  }

  const weekStart = selected.date
  const weekEnd = addDaysIso(weekStart, 6)
  const weekDates = allDates.filter((d) => d.date >= weekStart && d.date <= weekEnd)
  const weekSorted = [...weekDates].sort(
    (a, b) => (b.displayScore ?? b.score) - (a.displayScore ?? a.score)
  )
  const weekTop = weekSorted[0]
  const weekLow = weekSorted[weekSorted.length - 1]
  const weekDomain = buildTopDomains(locale, weekDates, undefined)[0]
  const weekSummaryText =
    locale === 'ko'
      ? `이번 주는 ${weekDomain?.label || focusDomainLabel} 축이 중심입니다. 고점은 ${weekTop?.date || weekStart}, 저점은 ${weekLow?.date || weekEnd}입니다.`
      : `This week centers on ${weekDomain?.label || focusDomainLabel}. High point: ${weekTop?.date || weekStart}, low point: ${weekLow?.date || weekEnd}.`
  const weekSummary: WeekSummary = {
    rangeStart: weekStart,
    rangeEnd: weekEnd,
    summary: defensivePhase
      ? locale === 'ko'
        ? `${weekSummaryText} 확정보다 점검형 실행이 유리합니다.`
        : `${weekSummaryText} Review-first execution is safer than hard commitments.`
      : weekSummaryText,
  }

  const monthKey = selected.date.slice(0, 7)
  const monthDates = allDates.filter((d) => d.date.startsWith(monthKey))
  const monthDomain = buildTopDomains(locale, monthDates, undefined)[0]
  const monthAvg =
    monthDates.length > 0
      ? monthDates.reduce((sum, d) => sum + (d.displayScore ?? d.score), 0) / monthDates.length
      : (selected.displayScore ?? selected.score)
  const monthSummary: MonthSummary = {
    month: monthKey,
    summary:
      locale === 'ko'
        ? `${monthKey}은 ${monthDomain?.label || focusDomainLabel} 중심 흐름이며 평균 점수는 ${Math.round(monthAvg)}/100입니다.`
        : `${monthKey} centers on ${monthDomain?.label || focusDomainLabel} with an average score of ${Math.round(monthAvg)}/100.`,
  }

  const relationCandidates = allDates.filter(
    (d) => d.evidence?.matrix?.domain === 'love' || d.categories.includes('love')
  )
  const workMoneyCandidates = allDates.filter((d) => {
    const domain = d.evidence?.matrix?.domain
    return (
      domain === 'career' ||
      domain === 'money' ||
      d.categories.includes('career') ||
      d.categories.includes('wealth')
    )
  })

  const buildWeather = (
    area: 'relationship' | 'workMoney',
    rows: FormattedDate[]
  ): WeatherSummary => {
    const avg =
      rows.length > 0
        ? rows.reduce((sum, d) => sum + (d.displayScore ?? d.score), 0) / rows.length
        : (selected.displayScore ?? selected.score)
    const cautionRatio =
      rows.length > 0 ? rows.filter((d) => (d.warnings || []).length > 0).length / rows.length : 0
    const grade = scoreToWeatherGrade(avg, cautionRatio)
    return {
      grade,
      summary: weatherSummaryText(locale, area, grade),
    }
  }

  return {
    daySummary,
    weekSummary,
    monthSummary,
    topDomains,
    timingSignals,
    cautions,
    recommendedActions,
    relationshipWeather: buildWeather('relationship', relationCandidates),
    workMoneyWeather: buildWeather('workMoney', workMoneyCandidates),
  }
}
