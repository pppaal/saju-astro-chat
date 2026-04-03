import type { CalendarCoreAdapterResult } from '@/lib/destiny-matrix/core/adapters'
import type {
  CrossAgreementMatrixCell,
  CrossAgreementMatrixRow,
  DomainKey,
  DomainScore,
  MonthlyOverlapPoint,
  TimingCalibrationSummary,
} from '@/lib/destiny-matrix/types'
import {
  describeDataTrustSummary,
  describeIntraMonthPeakWindow,
  describeProvenanceSummary,
  describeSajuAstroConflictByDomain,
  describeTimingCalibrationSummary,
  describeTimingWindowBrief,
} from '@/lib/destiny-matrix/interpretation/humanSemantics'
import type { FormattedDate } from './types'

type Locale = 'ko' | 'en'
type PresentationDomain = DomainKey | 'general'

type TopDomain = {
  domain: PresentationDomain
  label: string
  score: number
}

type WeatherSummary = {
  grade: 'strong' | 'good' | 'neutral' | 'caution'
  summary: string
}

type SurfaceCard = {
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
  surfaceCards: SurfaceCard[]
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

function mapCoreDomainToPresentationDomain(domain?: string): PresentationDomain {
  if (!domain) return 'general'
  if (domain === 'relationship') return 'love'
  if (domain === 'wealth') return 'money'
  if (
    domain === 'career' ||
    domain === 'health' ||
    domain === 'move' ||
    domain === 'love' ||
    domain === 'money'
  ) {
    return domain
  }
  return 'general'
}

function mapPresentationDomainToDomainKey(domain: PresentationDomain): DomainKey | null {
  if (domain === 'general') return null
  return domain
}

function mapPresentationDomainToCrossDomain(
  domain: PresentationDomain
): CrossAgreementMatrixRow['domain'] | null {
  if (domain === 'general') return 'timing'
  if (domain === 'love') return 'relationship'
  if (domain === 'money') return 'wealth'
  return domain
}

function pickAgreementCell(
  matrix: CrossAgreementMatrixRow[] | undefined,
  domain: PresentationDomain
): { row: CrossAgreementMatrixRow; scale: string; cell: CrossAgreementMatrixCell } | null {
  const crossDomain = mapPresentationDomainToCrossDomain(domain)
  if (!crossDomain || !Array.isArray(matrix) || matrix.length === 0) return null
  const row = matrix.find((item) => item.domain === crossDomain)
  if (!row) return null
  const orderedScales: Array<'now' | '1-3m' | '3-6m' | '6-12m'> = ['now', '1-3m', '3-6m', '6-12m']
  for (const scale of orderedScales) {
    const cell = row.timescales?.[scale]
    if (cell) return { row, scale, cell }
  }
  return null
}

function localizeWindowToken(window: string, locale: Locale): string {
  if (locale === 'ko') {
    if (window === 'now') return '지금'
    if (window === '1-3m') return '1~3개월'
    if (window === '3-6m') return '3~6개월'
    if (window === '6-12m') return '6~12개월'
  }
  return window
}

function buildAgreementCardData(input: {
  locale: Locale
  focusDomainLabel: string
  actionDomain: PresentationDomain
  matrix: CrossAgreementMatrixRow[] | undefined
  fallbackAgreementPercent?: number
  fallbackConflictText?: string
}): Pick<SurfaceCard, 'summary' | 'tag' | 'details' | 'visual'> {
  const {
    locale,
    focusDomainLabel,
    actionDomain,
    matrix,
    fallbackAgreementPercent,
    fallbackConflictText,
  } = input
  const picked = pickAgreementCell(matrix, actionDomain)
  if (picked) {
    const agreementPct = Math.round((picked.cell.agreement || 0) * 100)
    const contradictionPct = Math.round((picked.cell.contradiction || 0) * 100)
    const leadLag = picked.cell.leadLag ?? picked.row.leadLag ?? 0
    const windowLabel = localizeWindowToken(picked.scale, locale)
    const tagKo = agreementPct >= 75 ? '합의 강함' : agreementPct >= 60 ? '합의 보통' : '충돌 주의'
    const tagEn =
      agreementPct >= 75
        ? 'Strong alignment'
        : agreementPct >= 60
          ? 'Mixed alignment'
          : 'Conflict watch'
    if (locale === 'ko') {
      const alignment =
        agreementPct >= 75
          ? '같은 방향이 강합니다'
          : agreementPct >= 60
            ? '대체로 같은 방향이지만 재확인이 필요합니다'
            : '엇갈림이 커서 보수적으로 읽어야 합니다'
      const contradictionLine =
        contradictionPct >= 35
          ? `충돌도 ${contradictionPct}%: 반대 신호가 꽤 큽니다.`
          : `충돌도 ${contradictionPct}%: 관리 가능한 수준입니다.`
      const leadLagLine =
        leadLag >= 0.18
          ? '구조가 먼저 열리고 촉발은 뒤따릅니다.'
          : leadLag <= -0.18
            ? '촉발은 먼저 오지만 구조 지지는 뒤에서 따라옵니다.'
            : '구조와 촉발의 시차는 크지 않습니다.'
      return {
        summary: `${windowLabel} 기준 ${focusDomainLabel} 합의도는 ${agreementPct}%입니다. ${alignment}`,
        tag: tagKo,
        details: [contradictionLine, leadLagLine].filter(Boolean),
        visual: {
          kind: 'agreement',
          agreementPercent: agreementPct,
          contradictionPercent: contradictionPct,
          leadLagState:
            leadLag >= 0.18 ? 'structure-ahead' : leadLag <= -0.18 ? 'trigger-ahead' : 'balanced',
        },
      }
    }
    const alignment =
      agreementPct >= 75
        ? 'alignment is strong'
        : agreementPct >= 60
          ? 'alignment is usable but still needs confirmation'
          : 'misalignment is high, so a conservative read is safer'
    const contradictionLine =
      contradictionPct >= 35
        ? `Contradiction ${contradictionPct}%: opposing pressure is meaningful.`
        : `Contradiction ${contradictionPct}%: still manageable.`
    const leadLagLine =
      leadLag >= 0.18
        ? 'Structure opens before trigger pressure.'
        : leadLag <= -0.18
          ? 'Trigger pressure arrives before structure catches up.'
          : 'Lead-lag between structure and trigger is limited.'
    return {
      summary: `In the ${windowLabel} window, agreement for ${focusDomainLabel} is ${agreementPct}% and ${alignment}.`,
      tag: tagEn,
      details: [contradictionLine, leadLagLine].filter(Boolean),
      visual: {
        kind: 'agreement',
        agreementPercent: agreementPct,
        contradictionPercent: contradictionPct,
        leadLagState:
          leadLag >= 0.18 ? 'structure-ahead' : leadLag <= -0.18 ? 'trigger-ahead' : 'balanced',
      },
    }
  }

  if (fallbackConflictText) {
    return {
      summary: fallbackConflictText,
      tag: locale === 'ko' ? '합의 재확인' : 'Recheck alignment',
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
          tag: '합의 재확인',
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
        details: ['한 방향으로만 밀기보다 재확인을 끼워 넣는 편이 낫습니다.'],
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

function buildBranchCardData(input: {
  locale: Locale
  actionDomainLabel: string
  projectionBranch: string
  actionTimingWindow?: {
    entryConditions?: string[]
    abortConditions?: string[]
    timingConflictMode?: string
  }
}): Pick<SurfaceCard, 'summary' | 'tag' | 'details' | 'visual'> {
  const { locale, actionDomainLabel, projectionBranch, actionTimingWindow } = input
  const entry = actionTimingWindow?.entryConditions?.[0]
  const abort = actionTimingWindow?.abortConditions?.[0]
  const mode = actionTimingWindow?.timingConflictMode
  if (locale === 'ko') {
    const modeLead =
      mode === 'trigger_ahead'
        ? '서두르면 지속성이 약해질 수 있습니다.'
        : mode === 'readiness_ahead'
          ? '조건을 맞춘 뒤 들어가는 편이 유리합니다.'
          : mode === 'weak_both'
            ? '지금은 진입보다 관찰과 정리가 우선입니다.'
            : '한 경로만 밀기보다 조건형으로 읽어야 합니다.'
    const entryLead = entry
      ? `들어가도 되는 조건: ${entry}`
      : '들어가도 되는 조건: 핵심 조건부터 맞춘 뒤 움직이기'
    const abortLead = abort
      ? `멈춰야 하는 조건: ${abort}`
      : '멈춰야 하는 조건: 충돌 신호가 커지면 속도 줄이기'
    return {
      summary:
        projectionBranch || `${actionDomainLabel} 축은 하나의 답보다 여러 경로를 함께 봐야 합니다.`,
      tag:
        mode === 'trigger_ahead'
          ? '서두름 주의'
          : mode === 'readiness_ahead'
            ? '조건 후 진입'
            : mode === 'weak_both'
              ? '관찰 우선'
              : '분기형 실행',
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
  const modeLead =
    mode === 'trigger_ahead'
      ? 'Rushing weakens sustainability because trigger arrives before structure.'
      : mode === 'readiness_ahead'
        ? 'Entry works better after conditions line up.'
        : mode === 'weak_both'
          ? 'Observation and reset matter more than entry right now.'
          : 'Read this through multiple live branches rather than one fixed path.'
  const entryLead = entry
    ? `Entry condition: ${entry}`
    : 'Entry condition: line up the core conditions first'
  const abortLead = abort
    ? `Abort signal: ${abort}`
    : 'Abort signal: slow down when conflict pressure grows'
  return {
    summary:
      projectionBranch ||
      `${actionDomainLabel} should be read through multiple live branches rather than one fixed path.`,
    tag:
      mode === 'trigger_ahead'
        ? 'Rush caution'
        : mode === 'readiness_ahead'
          ? 'Enter after setup'
          : mode === 'weak_both'
            ? 'Observe first'
            : 'Branch-led',
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

function matchesPresentationDomain(date: FormattedDate, domain: PresentationDomain): boolean {
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

function pickDomainAlignedDate(
  allDates: FormattedDate[],
  domain: PresentationDomain,
  fallback: FormattedDate
): FormattedDate {
  return allDates.find((item) => matchesPresentationDomain(item, domain)) || fallback
}

function getDomainLabel(domain: PresentationDomain, locale: Locale): string {
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
    if (lowConf && lowAgreement) return '신호 일치도가 낮아 확정보다 검토가 우선입니다.'
    if (lowConf) return '근거 강도가 낮아 보수적으로 움직이는 편이 좋습니다.'
    if (lowAgreement) return '사주와 점성의 합의가 약해 재확인이 유리합니다.'
    return '신호는 안정적인 편이며 핵심 1~2개 실행에 집중하기 좋습니다.'
  }

  if (lowConf && lowAgreement)
    return 'Signal alignment is low, so review should come before commitment.'
  if (lowConf) return 'Evidence strength is low, so act conservatively.'
  if (lowAgreement) return 'Cross-agreement is weak, so a second check helps.'
  return 'Signals are stable enough to focus on one or two priorities.'
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

function verdictModeToWeatherGrade(
  mode: 'execute' | 'verify' | 'prepare' | undefined,
  confidence?: number
): WeatherSummary['grade'] {
  const normalized = typeof confidence === 'number' ? clamp01(confidence) : 0
  if (mode === 'execute' && normalized >= 0.7) return 'strong'
  if (mode === 'execute' || (mode === 'verify' && normalized >= 0.55)) return 'good'
  if (mode === 'prepare' || normalized < 0.45) return 'caution'
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

function buildDomainSummaryFrame(
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

function buildTopDomains(
  locale: Locale,
  allDates: FormattedDate[],
  domainScores?: Record<DomainKey, DomainScore>
): TopDomain[] {
  if (domainScores && Object.keys(domainScores).length > 0) {
    return Object.values(domainScores)
      .slice()
      .sort((a, b) => b.finalScoreAdjusted - a.finalScoreAdjusted)
      .slice(0, 3)
      .map((item) => ({
        domain: item.domain,
        label: getDomainLabel(item.domain, locale),
        score: Number(clamp01(item.finalScoreAdjusted / 10).toFixed(2)),
      }))
  }

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

function prioritizeTopDomains(
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

function buildTopDomainsFromCanonical(
  locale: Locale,
  canonicalCore?: CalendarCoreAdapterResult
): TopDomain[] {
  if (!canonicalCore?.domainVerdicts?.length) return []

  return canonicalCore.domainVerdicts
    .slice()
    .sort((a, b) => b.confidence - a.confidence)
    .map((item) => {
      const domain = mapCoreDomainToPresentationDomain(item.domain)
      return {
        domain,
        label: getDomainLabel(domain, locale),
        score: Number(clamp01(item.confidence).toFixed(2)),
      }
    })
    .filter((item, index, rows) => rows.findIndex((row) => row.domain === item.domain) === index)
    .slice(0, 3)
}

export function buildCalendarPresentationView(input: {
  allDates: FormattedDate[]
  locale: Locale
  timeZone: string
  canonicalCore?: CalendarCoreAdapterResult
  preferredFocusDomain?: PresentationDomain
  matrixContract?: {
    overallPhase?: string
    overallPhaseLabel?: string
    focusDomain?: string
  }
  dataQuality?: {
    missingFields: string[]
    derivedFields: string[]
    conflictingFields: string[]
    qualityPenalties: string[]
    confidenceReason: string
  }
  timingCalibration?: TimingCalibrationSummary
  overlapTimelineByDomain?: Record<DomainKey, MonthlyOverlapPoint[]>
  domainScores?: Record<DomainKey, DomainScore>
}): CalendarPresentationView {
  const {
    allDates,
    locale,
    timeZone,
    canonicalCore,
    preferredFocusDomain,
    matrixContract,
    dataQuality,
    timingCalibration,
    overlapTimelineByDomain,
    domainScores,
  } = input
  const selected = pickSelectedDate(allDates, timeZone)

  if (!selected) {
    const emptySummary =
      locale === 'ko'
        ? '데이터가 부족해 요약을 만들지 못했습니다.'
        : 'Not enough data to build the summary.'
    return {
      daySummary: {
        date: '',
        summary: emptySummary,
        focusDomain: getDomainLabel('general', locale),
        reliability: emptySummary,
      },
      weekSummary: { rangeStart: '', rangeEnd: '', summary: emptySummary },
      monthSummary: { month: '', summary: emptySummary },
      surfaceCards: [],
      topDomains: [],
      timingSignals: [],
      cautions: [],
      recommendedActions: [],
      relationshipWeather: { grade: 'neutral', summary: emptySummary },
      workMoneyWeather: { grade: 'neutral', summary: emptySummary },
    }
  }

  const defensivePhase = isDefensivePhase(
    canonicalCore?.phaseLabel || matrixContract?.overallPhaseLabel || matrixContract?.overallPhase
  )
  const canonicalTopDomains = buildTopDomainsFromCanonical(locale, canonicalCore)
  const rawTopDomains =
    canonicalTopDomains.length > 0
      ? canonicalTopDomains
      : buildTopDomains(locale, allDates, domainScores)
  const focusDomain =
    preferredFocusDomain ||
    mapCoreDomainToPresentationDomain(canonicalCore?.focusDomain) ||
    (selected.evidence?.matrix?.domain as PresentationDomain | undefined) ||
    rawTopDomains[0]?.domain ||
    'general'
  const actionFocusDomain =
    mapCoreDomainToPresentationDomain(canonicalCore?.actionFocusDomain) || focusDomain
  const topDomains = prioritizeTopDomains(rawTopDomains, focusDomain).slice(0, 3)
  const focusDomainLabel = getDomainLabel(focusDomain, locale)
  const actionFocusDomainLabel = getDomainLabel(actionFocusDomain, locale)
  const singleSubjectView = canonicalCore?.singleSubjectView
  const personModel = canonicalCore?.personModel
  const focusPersonState =
    personModel?.domainStateGraph?.find(
      (item) => mapCoreDomainToPresentationDomain(item.domain) === focusDomain
    ) || personModel?.domainStateGraph?.[0]
  const actionPersonState =
    personModel?.domainStateGraph?.find(
      (item) => mapCoreDomainToPresentationDomain(item.domain) === actionFocusDomain
    ) || focusPersonState
  const actionEvent =
    personModel?.eventOutlook?.find(
      (item) => mapCoreDomainToPresentationDomain(item.domain) === actionFocusDomain
    ) || personModel?.eventOutlook?.[0]
  const detailSelected = pickDomainAlignedDate(allDates, focusDomain, selected)
  const canonicalAdvisories =
    canonicalCore?.advisories?.filter(
      (item) => mapCoreDomainToPresentationDomain(item.domain) === focusDomain
    ) || []
  const canonicalTimingWindows =
    canonicalCore?.domainTimingWindows?.filter(
      (item) => mapCoreDomainToPresentationDomain(item.domain) === focusDomain
    ) || []
  const actionTimingWindow =
    canonicalCore?.domainTimingWindows?.find(
      (item) => mapCoreDomainToPresentationDomain(item.domain) === actionFocusDomain
    ) || canonicalTimingWindows[0]
  const primaryProvenance =
    canonicalTimingWindows[0]?.provenance ||
    canonicalAdvisories[0]?.provenance ||
    canonicalCore?.domainVerdicts?.find(
      (item) => mapCoreDomainToPresentationDomain(item.domain) === focusDomain
    )?.provenance
  const reliability = dedupe([
    getReliabilityText(
      locale,
      typeof canonicalCore?.confidence === 'number'
        ? Math.round(canonicalCore.confidence * 100)
        : selected.evidence?.confidence,
      typeof canonicalCore?.crossAgreement === 'number'
        ? Math.round(canonicalCore.crossAgreement * 100)
        : selected.evidence?.crossAgreementPercent
    ),
    describeDataTrustSummary({
      score:
        typeof canonicalCore?.confidence === 'number'
          ? Math.round(canonicalCore.confidence * 100)
          : undefined,
      missingFields: dataQuality?.missingFields || [],
      derivedFields: dataQuality?.derivedFields || [],
      conflictingFields: dataQuality?.conflictingFields || [],
      confidenceReason: dataQuality?.confidenceReason,
      lang: locale,
    }),
    describeProvenanceSummary({
      sourceFields: primaryProvenance?.sourceFields || [],
      sourceSetIds: primaryProvenance?.sourceSetIds || [],
      sourceRuleIds: primaryProvenance?.sourceRuleIds || [],
      lang: locale,
    }),
    describeTimingCalibrationSummary({
      reliabilityBand: timingCalibration?.reliabilityBand,
      reliabilityScore: timingCalibration?.reliabilityScore,
      pastStability: timingCalibration?.pastStability,
      futureStability: timingCalibration?.futureStability,
      backtestConsistency: timingCalibration?.backtestConsistency,
      calibratedFromHistory: timingCalibration?.calibratedFromHistory,
      calibrationSampleSize: timingCalibration?.calibrationSampleSize,
      calibrationMatchedRate: timingCalibration?.calibrationMatchedRate,
      lang: locale,
    }),
    describeIntraMonthPeakWindow({
      domainLabel: getDomainLabel(focusDomain, locale),
      points:
        mapPresentationDomainToDomainKey(focusDomain) && overlapTimelineByDomain
          ? overlapTimelineByDomain[mapPresentationDomainToDomainKey(focusDomain) as DomainKey]
          : undefined,
      lang: locale,
    }),
  ]).join(' ')
  const projectionStructure =
    canonicalCore?.projections?.structure?.detailLines?.[0] ||
    canonicalCore?.projections?.structure?.summary ||
    ''
  const projectionTiming =
    canonicalCore?.projections?.timing?.detailLines?.[0] ||
    canonicalCore?.projections?.timing?.summary ||
    ''
  const projectionConflict =
    canonicalCore?.projections?.conflict?.detailLines?.[0] ||
    canonicalCore?.projections?.conflict?.summary ||
    ''
  const projectionAction =
    canonicalCore?.projections?.action?.detailLines?.[0] ||
    canonicalCore?.projections?.action?.summary ||
    ''
  const projectionRisk =
    canonicalCore?.projections?.risk?.detailLines?.[0] ||
    canonicalCore?.projections?.risk?.summary ||
    ''
  const projectionBranch =
    canonicalCore?.projections?.branches?.detailLines?.[0] ||
    canonicalCore?.projections?.branches?.summary ||
    ''
  const singleSubjectTimingSummary = dedupe(
    [
      singleSubjectView?.timingState?.bestWindow
        ? locale === 'ko'
          ? `강한 창 ${singleSubjectView.timingState.bestWindow}`
          : `Best window ${singleSubjectView.timingState.bestWindow}`
        : '',
      singleSubjectView?.timingState?.whyNow || '',
      singleSubjectView?.timingState?.whyNotYet || '',
    ].filter(Boolean)
  ).join(' ')
  const singleSubjectBranchSummary = dedupe(
    [
      singleSubjectView?.branches?.[0]?.summary || '',
      singleSubjectView?.branches?.[0]?.nextMove || '',
    ].filter(Boolean)
  ).join(' ')
  const crossConflictText = describeSajuAstroConflictByDomain({
    crossAgreement: canonicalCore?.crossAgreement,
    focusDomainLabel,
    lang: locale,
  })

  const timingSignals = dedupe([
    singleSubjectTimingSummary,
    projectionTiming,
    singleSubjectBranchSummary,
    projectionBranch,
    ...canonicalTimingWindows.map((item) =>
      describeTimingWindowBrief({
        domainLabel: getDomainLabel(mapCoreDomainToPresentationDomain(item.domain), locale),
        window: item.window,
        whyNow: item.whyNow,
        entryConditions: item.entryConditions,
        abortConditions: item.abortConditions,
        timingGranularity: item.timingGranularity,
        precisionReason: item.precisionReason,
        timingConflictNarrative: item.timingConflictNarrative,
        lang: locale,
      })
    ),
    ...(detailSelected.timingSignals || []),
  ]).slice(0, 4)
  const cautions = dedupe([
    singleSubjectView?.riskAxis?.warning || '',
    ...(singleSubjectView?.abortConditions || []),
    actionEvent?.abortConditions?.[0] || '',
    projectionConflict,
    projectionRisk,
    ...canonicalAdvisories.map((item) => item.caution),
    ...(canonicalCore?.judgmentPolicy.blockedActionLabels || []),
    ...(canonicalCore?.judgmentPolicy.hardStopLabels || []),
    canonicalCore?.primaryCaution || '',
    ...(detailSelected.warnings || []),
  ]).slice(0, 3)
  const baseActions = dedupe([
    singleSubjectView?.actionAxis?.nowAction || '',
    singleSubjectView?.nextMove || '',
    actionPersonState?.firstMove || '',
    actionEvent?.nextMove || '',
    projectionAction,
    canonicalCore?.topDecisionLabel || '',
    ...(canonicalCore?.judgmentPolicy.allowedActionLabels || []),
    ...(canonicalCore?.judgmentPolicy.softCheckLabels || []),
    ...canonicalAdvisories.map((item) => item.action),
    canonicalCore?.primaryAction || '',
    ...(detailSelected.recommendations || []),
  ]).slice(0, 3)
  const recommendedActions = defensivePhase
    ? baseActions.map((line) => softenForDefensivePhase(line, locale))
    : baseActions

  const actionCardSummary =
    singleSubjectView?.actionAxis?.nowAction ||
    actionEvent?.nextMove ||
    actionPersonState?.firstMove ||
    projectionAction ||
    canonicalCore?.topDecisionLabel ||
    canonicalCore?.primaryAction ||
    recommendedActions[0] ||
    (locale === 'ko'
      ? `${actionFocusDomainLabel} 축은 지금 작은 실행보다 기준 정리를 먼저 하는 편이 낫습니다.`
      : `${actionFocusDomainLabel} works better through clarified criteria than broad execution right now.`)
  const riskCardSummary =
    singleSubjectView?.riskAxis?.warning ||
    actionPersonState?.holdMove ||
    projectionRisk ||
    cautions[0] ||
    (locale === 'ko'
      ? `${canonicalCore?.riskAxisLabel || focusDomainLabel} 축은 오늘 가장 먼저 관리해야 할 리스크입니다.`
      : `${canonicalCore?.riskAxisLabel || focusDomainLabel} is the risk axis to manage first today.`)
  const agreementPercent =
    typeof canonicalCore?.crossAgreement === 'number'
      ? Math.round(canonicalCore.crossAgreement * 100)
      : selected.evidence?.crossAgreementPercent
  const agreementCard = buildAgreementCardData({
    locale,
    focusDomainLabel: actionFocusDomainLabel,
    actionDomain: actionFocusDomain,
    matrix: canonicalCore?.crossAgreementMatrix,
    fallbackAgreementPercent: agreementPercent,
    fallbackConflictText: crossConflictText,
  })
  const windowCardSummary =
    singleSubjectTimingSummary ||
    timingSignals[0] ||
    (canonicalTimingWindows[0]
      ? describeTimingWindowBrief({
          domainLabel: actionFocusDomainLabel,
          window: canonicalTimingWindows[0].window,
          whyNow: canonicalTimingWindows[0].whyNow,
          entryConditions: canonicalTimingWindows[0].entryConditions,
          abortConditions: canonicalTimingWindows[0].abortConditions,
          timingGranularity: canonicalTimingWindows[0].timingGranularity,
          precisionReason: canonicalTimingWindows[0].precisionReason,
          timingConflictNarrative: canonicalTimingWindows[0].timingConflictNarrative,
          lang: locale,
        })
      : locale === 'ko'
        ? `${actionFocusDomainLabel} 창은 지금은 작게 열려 있으니 검토 후 움직이는 편이 안전합니다.`
        : `The ${actionFocusDomainLabel} window is only partly open, so review before moving.`)
  const branchCard = buildBranchCardData({
    locale,
    actionDomainLabel: actionFocusDomainLabel,
    projectionBranch: singleSubjectBranchSummary || projectionBranch,
    actionTimingWindow,
  })
  const surfaceCards: SurfaceCard[] = [
    {
      key: 'action',
      label: locale === 'ko' ? '행동축' : 'Action',
      summary: actionCardSummary,
    },
    {
      key: 'risk',
      label: locale === 'ko' ? '리스크축' : 'Risk',
      summary: riskCardSummary,
    },
    {
      key: 'window',
      label: locale === 'ko' ? '강한 창' : 'Window',
      summary: windowCardSummary,
    },
    {
      key: 'agreement',
      label: locale === 'ko' ? '합의도' : 'Agreement',
      summary: agreementCard.summary,
      tag: agreementCard.tag,
      details: agreementCard.details,
    },
    {
      key: 'branch',
      label: locale === 'ko' ? '가능한 경로' : 'Branch',
      summary: branchCard.summary,
      tag: branchCard.tag,
      details: branchCard.details,
    },
  ]

  const daySummaryText =
    singleSubjectView?.directAnswer ||
    actionPersonState?.thesis ||
    actionEvent?.summary ||
    (canonicalTimingWindows[0]
      ? describeTimingWindowBrief({
          domainLabel: focusDomainLabel,
          window: canonicalTimingWindows[0].window,
          whyNow: canonicalTimingWindows[0].whyNow,
          entryConditions: canonicalTimingWindows[0].entryConditions,
          abortConditions: canonicalTimingWindows[0].abortConditions,
          timingGranularity: canonicalTimingWindows[0].timingGranularity,
          precisionReason: canonicalTimingWindows[0].precisionReason,
          timingConflictNarrative: canonicalTimingWindows[0].timingConflictNarrative,
          lang: locale,
        })
      : '') ||
    detailSelected.actionSummary ||
    detailSelected.summary ||
    canonicalCore?.thesis ||
    (locale === 'ko'
      ? '오늘은 핵심 과제 1~2개 중심으로 운영하는 편이 좋습니다.'
      : 'Today is better handled by focusing on one or two priorities.')
  const focusSplitLead =
    actionFocusDomain !== focusDomain
      ? locale === 'ko'
        ? `중심축은 ${focusDomainLabel}이고, 지금 행동축은 ${actionFocusDomainLabel}입니다.`
        : `The underlying axis is ${focusDomainLabel}, while the action axis right now is ${actionFocusDomainLabel}.`
      : ''
  const focusRunnerUpLabel = canonicalCore?.arbitrationBrief?.focusRunnerUpDomain
    ? getDomainLabel(
        mapCoreDomainToPresentationDomain(canonicalCore.arbitrationBrief.focusRunnerUpDomain) ||
          'general',
        locale
      )
    : ''
  const actionRunnerUpLabel = canonicalCore?.arbitrationBrief?.actionRunnerUpDomain
    ? getDomainLabel(
        mapCoreDomainToPresentationDomain(canonicalCore.arbitrationBrief.actionRunnerUpDomain) ||
          'general',
        locale
      )
    : ''
  const arbitrationLead = canonicalCore?.arbitrationBrief
    ? locale === 'ko'
      ? actionFocusDomain !== focusDomain
        ? actionRunnerUpLabel
          ? `${actionFocusDomainLabel} 축이 ${actionRunnerUpLabel}보다 앞서 이번 실행축으로 올라왔습니다.`
          : `${actionFocusDomainLabel} 축이 이번 실행 판단을 가장 직접 끌고 갑니다.`
        : focusRunnerUpLabel
          ? `${focusDomainLabel} 축이 ${focusRunnerUpLabel}보다 앞서 이번 중심축으로 남았습니다.`
          : `${focusDomainLabel} 축이 이번 중심 판단을 가장 직접 끌고 갑니다.`
      : actionFocusDomain !== focusDomain
        ? actionRunnerUpLabel
          ? `${actionFocusDomainLabel} moved ahead of ${actionRunnerUpLabel} as the current action axis.`
          : `${actionFocusDomainLabel} is carrying the action pressure most directly right now.`
        : focusRunnerUpLabel
          ? `${focusDomainLabel} stayed ahead of ${focusRunnerUpLabel} as the current lead axis.`
          : `${focusDomainLabel} is carrying the lead pressure most directly right now.`
    : ''
  const latentLead = canonicalCore?.latentTopAxes?.length
    ? locale === 'ko'
      ? `가장 강하게 작동하는 층은 ${canonicalCore.latentTopAxes
          .slice(0, 2)
          .map((axis) => axis.label)
          .join(', ')}입니다.`
      : `The strongest active layers are ${canonicalCore.latentTopAxes
          .slice(0, 2)
          .map((axis) => axis.label)
          .join(', ')}.`
    : ''
  const projectionDayLead = [projectionStructure, projectionTiming].filter(Boolean).join(' ')
  const projectionBranchLead = singleSubjectBranchSummary || projectionBranch
  const projectionRiskLead = [
    singleSubjectView?.riskAxis?.warning || '',
    projectionConflict,
    projectionRisk,
  ]
    .filter(Boolean)
    .join(' ')
  const projectionActionLead =
    singleSubjectView?.nextMove ||
    singleSubjectView?.actionAxis?.nowAction ||
    actionEvent?.nextMove ||
    projectionAction

  const daySummary: DaySummary = {
    date: selected.date,
    summary: buildDomainSummaryFrame(
      locale,
      'day',
      focusDomain,
      defensivePhase
        ? locale === 'ko'
          ? `${actionCardSummary} ${riskCardSummary} ${windowCardSummary} ${focusSplitLead} ${arbitrationLead} ${latentLead} ${projectionDayLead} ${projectionBranchLead} ${daySummaryText} 오늘은 확정보다 검토와 재정렬을 우선하세요.`
          : `${actionCardSummary} ${riskCardSummary} ${windowCardSummary} ${focusSplitLead} ${arbitrationLead} ${latentLead} ${projectionDayLead} ${projectionBranchLead} ${daySummaryText} Today favors review and reset over commitment.`
        : `${actionCardSummary} ${riskCardSummary} ${windowCardSummary} ${focusSplitLead} ${arbitrationLead} ${latentLead} ${projectionDayLead} ${projectionBranchLead} ${daySummaryText} ${projectionActionLead} ${crossConflictText}`.trim()
    ),
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
  const weekDomain = topDomains[0] || buildTopDomains(locale, weekDates, undefined)[0]
  const weekDomainLabel = preferredFocusDomain
    ? focusDomainLabel
    : weekDomain?.label || focusDomainLabel
  const weekSummaryText =
    locale === 'ko'
      ? `${weekDomainLabel} 흐름이 중심인 주간입니다. ${
          canonicalTimingWindows[0]
            ? describeTimingWindowBrief({
                domainLabel: weekDomainLabel,
                window: canonicalTimingWindows[0].window,
                whyNow: canonicalTimingWindows[0].whyNow,
                entryConditions: canonicalTimingWindows[0].entryConditions,
                abortConditions: canonicalTimingWindows[0].abortConditions,
                timingGranularity: canonicalTimingWindows[0].timingGranularity,
                precisionReason: canonicalTimingWindows[0].precisionReason,
                timingConflictNarrative: canonicalTimingWindows[0].timingConflictNarrative,
                lang: 'ko',
              })
            : canonicalCore?.riskControl ||
              `상대적으로 여유가 있는 날은 ${weekTop?.date || weekStart}, 보수적으로 운영할 날은 ${weekLow?.date || weekEnd} 쪽입니다.`
        }`
      : `This week centers on ${weekDomain?.label || focusDomainLabel}. The lighter window is around ${weekTop?.date || weekStart}, while the more conservative window is around ${weekLow?.date || weekEnd}.`

  const weekSummary: WeekSummary = {
    rangeStart: weekStart,
    rangeEnd: weekEnd,
    summary: buildDomainSummaryFrame(
      locale,
      'week',
      focusDomain,
      defensivePhase
        ? locale === 'ko'
          ? `${projectionStructure} ${weekSummaryText} ${projectionRiskLead} 주간 전체로는 검토형 실행이 더 유리합니다.`
          : `${projectionStructure} ${weekSummaryText} ${projectionRiskLead} Across the week, review-led execution is safer.`
        : `${projectionStructure} ${weekSummaryText} ${projectionActionLead} ${crossConflictText}`.trim()
    ),
  }

  const monthKey = selected.date.slice(0, 7)
  const monthDates = allDates.filter((d) => d.date.startsWith(monthKey))
  const monthDomain = topDomains[0] || buildTopDomains(locale, monthDates, undefined)[0]
  const monthAvg =
    monthDates.length > 0
      ? monthDates.reduce((sum, d) => sum + (d.displayScore ?? d.score), 0) / monthDates.length
      : (selected.displayScore ?? selected.score)
  const monthDomainLabel = preferredFocusDomain
    ? focusDomainLabel
    : monthDomain?.label || focusDomainLabel

  const monthSummary: MonthSummary = {
    month: monthKey,
    summary: buildDomainSummaryFrame(
      locale,
      'month',
      focusDomain,
      locale === 'ko'
        ? `${projectionStructure} ${monthKey}은 ${monthDomainLabel} 중심으로 보는 편이 맞습니다. ${
            canonicalTimingWindows[0]
              ? describeTimingWindowBrief({
                  domainLabel: monthDomainLabel,
                  window: canonicalTimingWindows[0].window,
                  whyNow: canonicalTimingWindows[0].whyNow,
                  entryConditions: canonicalTimingWindows[0].entryConditions,
                  abortConditions: canonicalTimingWindows[0].abortConditions,
                  timingGranularity: canonicalTimingWindows[0].timingGranularity,
                  precisionReason: canonicalTimingWindows[0].precisionReason,
                  timingConflictNarrative: canonicalTimingWindows[0].timingConflictNarrative,
                  lang: 'ko',
                })
              : `이번 달 평균 흐름은 ${Math.round(monthAvg)}/100 수준이며, 크게 벌리기보다 우선순위를 분명히 할수록 안정적입니다.`
          } ${projectionActionLead} ${crossConflictText}`.trim()
        : `${projectionStructure} ${monthKey} is best read through ${monthDomain?.label || focusDomainLabel}. ${canonicalCore?.gradeReason || `Average intensity is ${Math.round(monthAvg)}/100, with review and operation mixed into the month.`} ${projectionActionLead} ${crossConflictText}`.trim()
    ),
  }

  const timingSignalsWithConflict = dedupe(
    crossConflictText
      ? [projectionConflict, crossConflictText, ...timingSignals]
      : [projectionConflict, ...timingSignals]
  )

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
    const canonicalVerdicts =
      area === 'relationship'
        ? canonicalCore?.domainVerdicts?.filter((item) => item.domain === 'relationship') || []
        : canonicalCore?.domainVerdicts?.filter(
            (item) => item.domain === 'career' || item.domain === 'wealth'
          ) || []

    if (canonicalVerdicts.length > 0) {
      const primary = canonicalVerdicts.slice().sort((a, b) => b.confidence - a.confidence)[0]
      const grade = verdictModeToWeatherGrade(primary?.mode, primary?.confidence)
      return {
        grade,
        summary: weatherSummaryText(locale, area, grade),
      }
    }

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
    surfaceCards,
    topDomains,
    timingSignals: timingSignalsWithConflict,
    cautions,
    recommendedActions,
    relationshipWeather: buildWeather('relationship', relationCandidates),
    workMoneyWeather: buildWeather('workMoney', workMoneyCandidates),
  }
}
