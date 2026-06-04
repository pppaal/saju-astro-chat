import type { DomainKey } from '@/lib/calendar-engine/matrix/types'
import type { CalendarDailyView, CalendarMonthView, CalendarWeekView, FormattedDate } from './types'
import { clamp01 } from '@/lib/utils/math'

export type Locale = 'ko' | 'en'
export type PresentationDomain = DomainKey | 'general'

export type TopDomain = {
  domain: PresentationDomain
  label: string
  score: number
}

export type WeatherSummary = {
  grade: 'strong' | 'good' | 'neutral' | 'caution'
  summary: string
}

export type SurfaceCard = {
  key: 'action' | 'risk' | 'window' | 'agreement' | 'branch'
  label: string
  summary: string
  tag?: string
  details?: string[]
  visual?:
    | {
        kind: 'agreement'
        agreementPercent: number
        contradictionPercent: number
        leadLagState: 'structure-ahead' | 'trigger-ahead' | 'balanced'
      }
    | {
        kind: 'branch'
        rows: Array<{ label: string; text: string }>
      }
}

export type DaySummary = {
  date: string
  summary: string
  focusDomain: string
  actionFocusDomain: string
  backgroundFocusDomain?: string
  reliability: string
  doNow?: string
  watchOut?: string
  bestTimes?: string[]
}

export type WeekSummary = {
  rangeStart: string
  rangeEnd: string
  summary: string
}

export type MonthSummary = {
  month: string
  summary: string
}

export type CalendarPresentationView = {
  daySummary: DaySummary
  weekSummary: WeekSummary
  monthSummary: MonthSummary
  dailyView: CalendarDailyView
  weekView: CalendarWeekView
  monthView: CalendarMonthView
  surfaceCards: SurfaceCard[]
  topDomains: TopDomain[]
  timingSignals: string[]
  cautions: string[]
  recommendedActions: string[]
  relationshipWeather: WeatherSummary
  workMoneyWeather: WeatherSummary
}

export function toDatePartsInTimeZone(
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

export function toIsoDate(parts: { year: number; month: number; day: number }): string {
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  return toIsoDate({ year: dt.getFullYear(), month: dt.getMonth() + 1, day: dt.getDate() })
}

export function dedupe(lines: string[]): string[] {
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

export function mapPresentationDomainToDomainKey(domain: PresentationDomain): DomainKey | null {
  if (domain === 'general') return null
  return domain
}

export function buildAgreementCardData(input: {
  locale: Locale
  focusDomainLabel: string
  actionDomain: PresentationDomain
  fallbackAgreementPercent?: number
  fallbackConflictText?: string
}): Pick<SurfaceCard, 'summary' | 'tag' | 'details' | 'visual'> {
  const { locale, focusDomainLabel, fallbackAgreementPercent, fallbackConflictText } = input

  if (fallbackConflictText) {
    return {
      summary: fallbackConflictText,
      tag: locale === 'ko' ? '합의 점검' : 'Check alignment',
      details: [],
      visual: {
        kind: 'agreement',
        agreementPercent:
          typeof fallbackAgreementPercent === 'number' ? fallbackAgreementPercent : 50,
        contradictionPercent: 40,
        leadLagState: 'balanced',
      },
    }
  }
  if (typeof fallbackAgreementPercent === 'number') {
    return locale === 'ko'
      ? {
          summary: `${focusDomainLabel} 기준 교차 합의도는 ${fallbackAgreementPercent}% 수준입니다.`,
          tag: '합의 점검',
          details: ['세부 창과 충돌 신호를 한 번 더 확인하는 편이 낫습니다.'],
          visual: {
            kind: 'agreement',
            agreementPercent: fallbackAgreementPercent,
            contradictionPercent: Math.max(0, 100 - fallbackAgreementPercent),
            leadLagState: 'balanced',
          },
        }
      : {
          summary: `Cross-agreement for ${focusDomainLabel} is around ${fallbackAgreementPercent}%.`,
          tag: 'Recheck alignment',
          details: ['A second pass on timing and conflict signals is still useful.'],
          visual: {
            kind: 'agreement',
            agreementPercent: fallbackAgreementPercent,
            contradictionPercent: Math.max(0, 100 - fallbackAgreementPercent),
            leadLagState: 'balanced',
          },
        }
  }
  return locale === 'ko'
    ? {
        summary: `${focusDomainLabel} 기준 합의도는 중간 수준입니다.`,
        tag: '합의 보통',
        details: ['한 방향으로만 밀기보다 중간 점검을 끼워 넣는 편이 낫습니다.'],
        visual: {
          kind: 'agreement',
          agreementPercent: 58,
          contradictionPercent: 28,
          leadLagState: 'balanced',
        },
      }
    : {
        summary: `Agreement for ${focusDomainLabel} is moderate.`,
        tag: 'Mixed alignment',
        details: ['Build in confirmation instead of pushing one-way execution.'],
        visual: {
          kind: 'agreement',
          agreementPercent: 58,
          contradictionPercent: 28,
          leadLagState: 'balanced',
        },
      }
}

export function buildBranchCardData(input: {
  locale: Locale
  actionDomainLabel: string
  projectionBranch: string
}): Pick<SurfaceCard, 'summary' | 'tag' | 'details' | 'visual'> {
  const { locale, actionDomainLabel, projectionBranch } = input
  if (locale === 'ko') {
    const modeLead = '한 경로만 밀기보다 조건형으로 읽어야 합니다.'
    const entryLead = '들어가도 되는 조건: 핵심 조건부터 맞춘 뒤 움직이기'
    const abortLead = '멈춰야 하는 조건: 충돌 신호가 커지면 속도 줄이기'
    return {
      summary:
        projectionBranch || `${actionDomainLabel} 축은 하나의 답보다 여러 경로를 함께 봐야 합니다.`,
      tag: '분기형 실행',
      details: [entryLead, abortLead, `서두르면 생기는 리스크: ${modeLead}`],
      visual: {
        kind: 'branch',
        rows: [
          { label: '진입', text: entryLead },
          { label: '중단', text: abortLead },
          { label: '리스크', text: `서두르면 생기는 리스크: ${modeLead}` },
        ],
      },
    }
  }
  const modeLead = 'Read this through multiple live branches rather than one fixed path.'
  const entryLead = 'Entry condition: line up the core conditions first'
  const abortLead = 'Abort signal: slow down when conflict pressure grows'
  return {
    summary:
      projectionBranch ||
      `${actionDomainLabel} should be read through multiple live branches rather than one fixed path.`,
    tag: 'Branch-led',
    details: [entryLead, abortLead, `Risk of rushing: ${modeLead}`],
    visual: {
      kind: 'branch',
      rows: [
        { label: 'Entry', text: entryLead },
        { label: 'Abort', text: abortLead },
        { label: 'Risk', text: `Risk of rushing: ${modeLead}` },
      ],
    },
  }
}

export function matchesPresentationDomain(
  date: FormattedDate,
  domain: PresentationDomain
): boolean {
  if (domain === 'general') return true

  const matrixDomain = date.evidence?.matrix?.domain
  if (domain === 'money' && matrixDomain === 'money') return true
  if (matrixDomain === domain) return true

  if (domain === 'career')
    return date.categories.includes('career') || date.categories.includes('study')
  if (domain === 'love') return date.categories.includes('love')
  if (domain === 'money') return date.categories.includes('wealth')
  if (domain === 'health') return date.categories.includes('health')
  if (domain === 'move') return date.categories.includes('travel')
  return false
}

export function pickDomainAlignedDate(
  allDates: FormattedDate[],
  domain: PresentationDomain,
  fallback: FormattedDate
): FormattedDate {
  if (matchesPresentationDomain(fallback, domain)) return fallback
  return fallback
}

export function getDomainLabel(domain: PresentationDomain, locale: Locale): string {
  const ko: Record<PresentationDomain, string> = {
    career: '커리어',
    love: '관계',
    money: '재정',
    health: '건강',
    move: '이동/변화',
    general: '전반',
  }
  const en: Record<PresentationDomain, string> = {
    career: 'career',
    love: 'relationship',
    money: 'finance',
    health: 'health',
    move: 'movement',
    general: 'overall',
  }
  return locale === 'ko' ? ko[domain] : en[domain]
}

export function getReliabilityText(
  locale: Locale,
  confidence?: number,
  crossAgreementPercent?: number
): string {
  const conf = typeof confidence === 'number' ? confidence : 0
  const agreement = typeof crossAgreementPercent === 'number' ? crossAgreementPercent : undefined
  const lowConf = conf < 40
  const lowAgreement = typeof agreement === 'number' && agreement < 60

  if (locale === 'ko') {
    if (lowConf && lowAgreement) return '신호 일치도가 낮아 확정보다 검토가 우선입니다.'
    if (lowConf) return '근거 강도가 낮아 보수적으로 움직이는 편이 좋습니다.'
    if (lowAgreement) return '사주와 점성의 합의가 약해 한 번 더 확인하는 편이 유리합니다.'
    return '신호는 안정적인 편이며 핵심 1~2개 실행에 집중하기 좋습니다.'
  }

  if (lowConf && lowAgreement)
    return 'Signal alignment is low, so review should come before commitment.'
  if (lowConf) return 'Evidence strength is low, so act conservatively.'
  if (lowAgreement) return 'Cross-agreement is weak, so a second check helps.'
  return 'Signals are stable enough to focus on one or two priorities.'
}

export function isDefensivePhase(value?: string): boolean {
  if (!value) return false
  return /(defensive|reset|stabil|재정렬|방어|안정)/i.test(value)
}

export function softenForDefensivePhase(line: string, locale: Locale): string {
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

export function pickSelectedDate(
  allDates: FormattedDate[],
  timeZone: string
): FormattedDate | undefined {
  const todayIso = toIsoDate(toDatePartsInTimeZone(new Date(), timeZone))
  return allDates.find((d) => d.date === todayIso) || allDates[0]
}

export function scoreToWeatherGrade(avg: number, cautionRatio: number): WeatherSummary['grade'] {
  if (cautionRatio >= 0.5 || avg < 45) return 'caution'
  if (avg >= 78) return 'strong'
  if (avg >= 62) return 'good'
  return 'neutral'
}

export function weatherSummaryText(
  locale: Locale,
  area: 'relationship' | 'workMoney',
  grade: WeatherSummary['grade']
): string {
  if (locale === 'ko') {
    if (area === 'relationship') {
      if (grade === 'strong')
        return '관계 흐름이 좋습니다. 연결은 넓히되 약속은 짧게 확인하는 편이 낫습니다.'
      if (grade === 'good') return '관계 흐름은 우호적입니다. 핵심 대화 한 건에 집중하면 좋습니다.'
      if (grade === 'neutral')
        return '관계는 무난한 흐름입니다. 기대치와 표현 방식을 먼저 맞추는 편이 안정적입니다.'
      return '관계는 주의 구간입니다. 반응보다 확인, 추정보다 문장 정리가 우선입니다.'
    }
    if (grade === 'strong')
      return '일과 돈의 흐름이 강합니다. 확장보다 우선순위 하나를 정확히 잡는 편이 더 좋습니다.'
    if (grade === 'good')
      return '일과 돈은 실행 가능성이 높습니다. 작은 검증 단계를 끼우면 성과가 안정됩니다.'
    if (grade === 'neutral')
      return '일과 돈은 무난한 흐름입니다. 속도보다 체크리스트 운영이 더 안전합니다.'
    return '일과 돈은 변동성이 있어 신규 확정보다 조건 검토와 손실 방지가 우선입니다.'
  }

  if (area === 'relationship') {
    if (grade === 'strong')
      return 'Relationship flow is strong. Expand gently and confirm commitments briefly.'
    if (grade === 'good') return 'Relationship flow is supportive. Focus on one key conversation.'
    if (grade === 'neutral') return 'Relationship flow is neutral. Align expectations first.'
    return 'Relationship flow is cautious. Verification matters more than reaction.'
  }

  if (grade === 'strong') return 'Work and finance are strong. Lock one high-impact priority first.'
  if (grade === 'good') return 'Work and finance support execution. Add one verification step.'
  if (grade === 'neutral')
    return 'Work and finance are neutral. Checklist pacing is safer than speed.'
  return 'Work and finance are volatile. Review terms before any commitment.'
}

export function buildDomainSummaryFrame(
  locale: Locale,
  scope: 'day' | 'week' | 'month',
  domain: PresentationDomain,
  base: string
): string {
  if (locale !== 'ko') return base

  const trimmedBase = String(base || '').trim()
  if (!trimmedBase) return trimmedBase

  const prefix =
    scope === 'day'
      ? domain === 'career'
        ? '오늘 일은'
        : domain === 'love'
          ? '오늘 관계는'
          : domain === 'money'
            ? '오늘 돈 문제는'
            : domain === 'health'
              ? '오늘 컨디션은'
              : domain === 'move'
                ? '오늘 이동과 변화는'
                : '오늘은'
      : scope === 'week'
        ? domain === 'career'
          ? '이번 주 일은'
          : domain === 'love'
            ? '이번 주 관계는'
            : domain === 'money'
              ? '이번 주 돈 문제는'
              : domain === 'health'
                ? '이번 주 컨디션은'
                : domain === 'move'
                  ? '이번 주 이동과 변화는'
                  : '이번 주는'
        : domain === 'career'
          ? '이번 달 일은'
          : domain === 'love'
            ? '이번 달 관계는'
            : domain === 'money'
              ? '이번 달 돈 문제는'
              : domain === 'health'
                ? '이번 달 컨디션은'
                : domain === 'move'
                  ? '이번 달 이동과 변화는'
                  : '이번 달은'

  const tail =
    domain === 'career'
      ? '우선순위와 맡을 범위를 먼저 정해 둘수록 실제 성과로 이어지기 쉽습니다.'
      : domain === 'love'
        ? '감정 해석보다 대화 순서와 확인 방식이 결과를 더 크게 좌우합니다.'
        : domain === 'money'
          ? '기대감보다 금액, 기한, 손실 상한을 먼저 닫아야 흔들림이 줄어듭니다.'
          : domain === 'health'
            ? '무리해서 끌어올리기보다 수면과 회복 시간을 먼저 지키는 편이 낫습니다.'
            : domain === 'move'
              ? '한 번에 확정하기보다 순서와 여유 시간을 먼저 확보하는 편이 안전합니다.'
              : '욕심을 넓히기보다 핵심 조건을 먼저 맞추는 편이 유리합니다.'

  const baseWithoutDuplicatePrefix = trimmedBase
    .replace(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`), '')
    .replace(/^오늘 일은\s+커리어는/u, '커리어는')
    .replace(/^오늘 관계는\s+관계는/u, '관계는')
    .replace(/^오늘 돈 문제는\s+재정은/u, '재정은')
    .replace(/^오늘 컨디션은\s+건강은/u, '건강은')
    .replace(/^오늘 이동과 변화는\s+이동\/변화는/u, '이동/변화는')
    .replace(/^이번 주 일은\s+커리어/u, '커리어')
    .replace(/^이번 주 관계는\s+관계/u, '관계')
    .replace(/^이번 주 돈 문제는\s+재정/u, '재정')
    .replace(/^이번 달 일은\s+\d{4}-\d{2}은\s+커리어/u, (m) => m.replace(/^이번 달 일은\s+/, ''))
    .replace(/^이번 달 관계는\s+\d{4}-\d{2}은\s+관계/u, (m) => m.replace(/^이번 달 관계는\s+/, ''))
    .replace(/^이번 달 돈 문제는\s+\d{4}-\d{2}은\s+재정/u, (m) =>
      m.replace(/^이번 달 돈 문제는\s+/, '')
    )

  const finalTail = baseWithoutDuplicatePrefix.includes(tail) ? '' : tail
  const keywordMatchedTail =
    (domain === 'career' &&
      (baseWithoutDuplicatePrefix.includes('역할·범위·마감') ||
        baseWithoutDuplicatePrefix.includes('우선순위'))) ||
    (domain === 'love' &&
      (baseWithoutDuplicatePrefix.includes('대화 순서') ||
        baseWithoutDuplicatePrefix.includes('확인 방식'))) ||
    (domain === 'money' &&
      (baseWithoutDuplicatePrefix.includes('금액·기한·손실 상한') ||
        baseWithoutDuplicatePrefix.includes('금액, 기한, 손실 상한'))) ||
    (domain === 'health' &&
      (baseWithoutDuplicatePrefix.includes('수면과 회복') ||
        baseWithoutDuplicatePrefix.includes('회복 시간'))) ||
    (domain === 'move' &&
      (baseWithoutDuplicatePrefix.includes('순서와 여유 시간') ||
        baseWithoutDuplicatePrefix.includes('한 번에 확정하기보다')))

  const needsPrefix =
    !baseWithoutDuplicatePrefix.startsWith('커리어는') &&
    !baseWithoutDuplicatePrefix.startsWith('관계는') &&
    !baseWithoutDuplicatePrefix.startsWith('재정은') &&
    !baseWithoutDuplicatePrefix.startsWith('건강은') &&
    !baseWithoutDuplicatePrefix.startsWith('이동/변화는') &&
    !/^\d{4}-\d{2}은/u.test(baseWithoutDuplicatePrefix)

  return [
    needsPrefix ? prefix : '',
    baseWithoutDuplicatePrefix,
    keywordMatchedTail ? '' : finalTail,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()
}

export function buildTopDomains(locale: Locale, allDates: FormattedDate[]): TopDomain[] {
  const buckets = new Map<PresentationDomain, { sum: number; count: number }>()
  for (const date of allDates) {
    const domain = (date.evidence?.matrix?.domain || 'general') as PresentationDomain
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

export function prioritizeTopDomains(
  rows: TopDomain[],
  preferredFocusDomain?: PresentationDomain
): TopDomain[] {
  if (!preferredFocusDomain) return rows
  return rows.slice().sort((a, b) => {
    if (a.domain === preferredFocusDomain && b.domain !== preferredFocusDomain) return -1
    if (b.domain === preferredFocusDomain && a.domain !== preferredFocusDomain) return 1
    return b.score - a.score
  })
}
