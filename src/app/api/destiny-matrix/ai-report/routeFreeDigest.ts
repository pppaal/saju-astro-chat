import type { InsightDomain } from '@/lib/destiny-matrix'
import type { ReportPeriod, ReportTheme } from '@/lib/destiny-matrix/ai-report'
import { PERIOD_LABELS, THEME_LABELS } from './routeReportPersistence'

export type FreeAIDigestReport = {
  id: string
  tier: 'free'
  generatedAt: string
  lang: 'ko' | 'en'
  headline: string
  summary: string
  overallScore: number
  grade: string
  topInsights: Array<{
    title: string
    reason: string
    action: string
  }>
  focusAreas: Array<{
    domain: string
    score: number
    summary: string
  }>
  caution: string[]
  nextSteps: string[]
  sections: Array<{
    title: string
    content: string
  }>
  legacySections?: Array<{
    title: string
    content: string
  }>
}

type FreePreviewSectionKey = 'summary' | 'insights' | 'focus' | 'cautions' | 'nextSteps'

function resolveThemedDomain(theme?: ReportTheme): InsightDomain | undefined {
  switch (theme) {
    case 'love':
    case 'family':
      return 'relationship'
    case 'career':
      return 'career'
    case 'wealth':
      return 'wealth'
    case 'health':
      return 'health'
    default:
      return undefined
  }
}

function getInsightDomainLabel(domain: InsightDomain | undefined, lang: 'ko' | 'en'): string {
  if (!domain) return lang === 'ko' ? '전체 흐름' : 'overall flow'
  const ko: Record<string, string> = {
    career: '커리어',
    relationship: '관계',
    wealth: '재정',
    health: '건강',
    move: '이동',
    timing: '타이밍',
    life: '삶 전반',
  }
  const en: Record<string, string> = {
    career: 'career',
    relationship: 'relationship',
    wealth: 'wealth',
    health: 'health',
    move: 'movement',
    timing: 'timing',
    life: 'overall life',
  }
  return lang === 'ko' ? ko[domain] || domain : en[domain] || domain
}

function buildFreePreviewLead(params: {
  lang: 'ko' | 'en'
  theme?: ReportTheme
  period?: ReportPeriod
  queryDomain?: InsightDomain
  gradeDescription: string
}): string {
  const { lang, theme, period, queryDomain, gradeDescription } = params
  if (lang === 'ko') {
    if (theme === 'love') {
      return `${gradeDescription} 이번 무료 요약은 관계의 감정 크기보다 해석 차이와 속도 차이를 먼저 압축해서 보여줍니다.`
    }
    if (theme === 'career') {
      return `${gradeDescription} 이번 무료 요약은 커리어에서 무엇을 더 벌일지보다, 어디에서 판단력을 보여줘야 하는지를 먼저 짚습니다.`
    }
    if (theme === 'wealth') {
      return `${gradeDescription} 이번 무료 요약은 수익 기대보다 손실 상한과 조건 관리 포인트를 먼저 압축해서 보여줍니다.`
    }
    if (theme === 'health') {
      return `${gradeDescription} 이번 무료 요약은 버티는 힘보다 회복 리듬과 무리 신호를 먼저 확인하게 만듭니다.`
    }
    if (theme === 'family') {
      return `${gradeDescription} 이번 무료 요약은 가족 문제의 정답보다 해석 차이와 소통 마찰 지점을 먼저 보여줍니다.`
    }
    if (period === 'daily') {
      return `${gradeDescription} 오늘 무료 요약은 무엇을 많이 할지보다, 어떤 순서로 닫아야 하는지를 먼저 보여줍니다.`
    }
    if (period === 'monthly') {
      return `${gradeDescription} 이번달 무료 요약은 확장과 점검 중 어디에 힘을 실어야 하는지 먼저 압축해서 보여줍니다.`
    }
    if (period === 'yearly') {
      return `${gradeDescription} 올해 무료 요약은 큰 흐름의 방향과 변곡점 후보를 먼저 짚어주는 스냅샷입니다.`
    }
    if (queryDomain) {
      return `${gradeDescription} 이번 무료 요약은 ${getInsightDomainLabel(queryDomain, lang)} 축에서 지금 바로 봐야 할 신호만 먼저 압축했습니다.`
    }
    return `${gradeDescription} 핵심 신호를 빠르게 훑되, 무엇부터 움직여야 하는지 중심으로 압축했습니다.`
  }

  if (theme === 'love')
    return `${gradeDescription} This free snapshot focuses on relationship interpretation gaps before emotional intensity.`
  if (theme === 'career')
    return `${gradeDescription} This free snapshot focuses on where judgment matters more than expansion.`
  if (theme === 'wealth')
    return `${gradeDescription} This free snapshot focuses on downside control before upside pursuit.`
  if (theme === 'health')
    return `${gradeDescription} This free snapshot focuses on recovery rhythm before endurance.`
  if (theme === 'family')
    return `${gradeDescription} This free snapshot focuses on family friction points before emotional escalation.`
  if (period === 'daily')
    return `${gradeDescription} This free daily snapshot focuses on sequencing before speed.`
  if (period === 'monthly')
    return `${gradeDescription} This free monthly snapshot focuses on where to push and where to re-check first.`
  if (period === 'yearly')
    return `${gradeDescription} This free yearly snapshot focuses on major direction and turning points first.`
  if (queryDomain) {
    return `${gradeDescription} This free snapshot focuses first on ${getInsightDomainLabel(queryDomain, lang)} signals that need attention now.`
  }
  return `${gradeDescription} This free snapshot compresses the key signals into the next move that matters most.`
}

function buildFreePreviewNextSteps(params: {
  lang: 'ko' | 'en'
  theme?: ReportTheme
  period?: ReportPeriod
  queryDomain?: InsightDomain
}): string[] {
  const { lang, theme, period, queryDomain } = params
  if (lang === 'ko') {
    if (theme === 'love') {
      return [
        '결론을 서두르지 말고, 상대와 내 해석이 어디에서 어긋나는지 한 줄로 적어보세요.',
        '연락, 표현, 거리 조절 중 지금 가장 먼저 바로잡을 한 가지를 정하세요.',
        '프리미엄 리포트에서 관계 타이밍과 재접근 조건을 더 깊게 확인하세요.',
      ]
    }
    if (theme === 'career') {
      return [
        '지금 맡을 일과 미룰 일을 분리해 역할과 우선순위를 먼저 고정하세요.',
        '결정 전에 범위, 책임, 마감 세 가지만 다시 확인하세요.',
        '프리미엄 리포트에서 커리어 전환점과 실행 전략을 더 깊게 확인하세요.',
      ]
    }
    if (theme === 'wealth') {
      return [
        '수익 기대보다 손실 상한과 조건 검토 항목을 먼저 적어두세요.',
        '지출, 투자, 계약 중 이번에 가장 흔들리기 쉬운 한 지점을 먼저 점검하세요.',
        '프리미엄 리포트에서 수입 구조와 리스크 관리 포인트를 더 깊게 확인하세요.',
      ]
    }
    if (theme === 'health') {
      return [
        '무리 신호가 올라오는 시간대와 회복이 잘 되는 루틴을 먼저 적어보세요.',
        '강한 보정보다 지킬 수 있는 회복 습관 1~2개부터 고정하세요.',
        '프리미엄 리포트에서 건강 타이밍과 회복 계획을 더 깊게 확인하세요.',
      ]
    }
    if (theme === 'family') {
      return [
        '누가 맞는지보다 어떤 해석 차이가 반복되는지 먼저 적어보세요.',
        '대화 길이를 줄이고, 맥락을 먼저 맞출 문장 하나를 준비하세요.',
        '프리미엄 리포트에서 가족 관계 흐름과 소통 포인트를 더 깊게 확인하세요.',
      ]
    }
    if (period === 'daily') {
      return [
        '오늘 끝낼 일 1~2개만 남기고 나머지는 재확인 슬롯으로 보내세요.',
        '급한 결정일수록 조건, 책임, 마감 순서로 다시 확인하세요.',
        '프리미엄 리포트에서 오늘의 세부 타이밍과 주의 구간을 확인하세요.',
      ]
    }
    if (period === 'monthly') {
      return [
        '이번달은 확장할 일과 점검할 일을 분리해서 관리하세요.',
        '중요한 움직임은 월초 확정보다 중간 점검을 한 번 더 두는 편이 안전합니다.',
        '프리미엄 리포트에서 이번달 기회 구간과 주의 구간을 확인하세요.',
      ]
    }
    if (period === 'yearly') {
      return [
        '올해는 큰 결정을 한 번에 밀기보다 분기별 점검 포인트를 먼저 잡으세요.',
        '기회 구간과 보수 구간을 분리해 체력과 자원을 배분하세요.',
        '프리미엄 리포트에서 연간 변곡점과 장기 실행 플랜을 확인하세요.',
      ]
    }
    if (queryDomain) {
      return [
        `${getInsightDomainLabel(queryDomain, lang)} 관련 핵심 과제 1~2개만 먼저 남기세요.`,
        '결정 전에는 조건, 기한, 리스크를 한 번 더 짧게 점검하세요.',
        '프리미엄 리포트에서 교차 근거와 상세 실행 플랜을 확인하세요.',
      ]
    }
    return [
      '오늘 기준 실행 과제 1~2개만 선정하세요.',
      '중요 결정 전 조건, 기한, 리스크를 다시 확인하세요.',
      '프리미엄 버전에서 교차 근거와 상세 행동 플랜을 확인하세요.',
    ]
  }

  return [
    'Limit today to one or two moves that actually need execution.',
    'Re-check conditions, timing, and risk before locking a decision.',
    'Use the premium report for cross-evidence and a deeper action plan.',
  ]
}

function buildFreePreviewSectionOrder(params: {
  theme?: ReportTheme
  period?: ReportPeriod
  queryDomain?: InsightDomain
}): FreePreviewSectionKey[] {
  const { theme, period, queryDomain } = params
  if (theme === 'love') return ['summary', 'focus', 'cautions', 'insights', 'nextSteps']
  if (theme === 'career') return ['summary', 'insights', 'focus', 'nextSteps', 'cautions']
  if (theme === 'wealth') return ['summary', 'focus', 'cautions', 'insights', 'nextSteps']
  if (theme === 'health') return ['summary', 'cautions', 'focus', 'nextSteps', 'insights']
  if (theme === 'family') return ['summary', 'focus', 'insights', 'cautions', 'nextSteps']
  if (period === 'daily') return ['summary', 'nextSteps', 'focus', 'cautions', 'insights']
  if (period === 'monthly') return ['summary', 'focus', 'nextSteps', 'insights', 'cautions']
  if (period === 'yearly') return ['summary', 'focus', 'insights', 'nextSteps', 'cautions']
  if (queryDomain) return ['summary', 'focus', 'insights', 'nextSteps', 'cautions']
  return ['summary', 'insights', 'focus', 'cautions', 'nextSteps']
}

export function buildRichFreeDigestReport(baseReport: {
  overallScore: { total: number; grade: string; gradeDescription: string }
  topInsights: Array<{
    title: string
    description: string
    actionItems?: Array<{ text: string }>
    category?: string
  }>
  domainAnalysis: Array<{
    domain: string
    score: number
    summary: string
    hasData?: boolean
  }>
  lang: 'ko' | 'en'
  theme?: ReportTheme
  period?: ReportPeriod
  queryDomain?: InsightDomain
}): FreeAIDigestReport {
  const preferredDomain = baseReport.queryDomain || resolveThemedDomain(baseReport.theme)
  const topInsights = (baseReport.topInsights || []).slice(0, 3).map((item) => ({
    title: item.title,
    reason: item.description,
    action:
      item.actionItems && item.actionItems.length > 0
        ? item.actionItems[0]?.text ||
          (baseReport.lang === 'ko'
            ? '핵심 우선순위를 1개 정하세요.'
            : 'Pick one top priority first.')
        : baseReport.lang === 'ko'
          ? '핵심 우선순위를 1개 정하세요.'
          : 'Pick one top priority first.',
  }))

  const focusAreas = (baseReport.domainAnalysis || [])
    .filter((item) => item.hasData !== false)
    .sort((a, b) => {
      const aPreferred = preferredDomain && a.domain === preferredDomain ? 1 : 0
      const bPreferred = preferredDomain && b.domain === preferredDomain ? 1 : 0
      if (aPreferred !== bPreferred) return bPreferred - aPreferred
      return b.score - a.score
    })
    .slice(0, 3)
    .map((item) => ({
      domain: item.domain,
      score: item.score,
      summary: item.summary,
    }))

  const caution = (baseReport.topInsights || [])
    .filter((item) => item.category === 'caution' || item.category === 'challenge')
    .slice(0, 2)
    .map((item) => item.title)

  const headline =
    baseReport.lang === 'ko'
      ? baseReport.theme
        ? `${THEME_LABELS[baseReport.theme] || baseReport.theme} 무료 요약 리포트`
        : baseReport.period && baseReport.period !== 'comprehensive'
          ? `${PERIOD_LABELS[baseReport.period] || baseReport.period} 무료 요약 리포트`
          : 'AI 리포트 무료 버전 요약'
      : baseReport.theme
        ? `${baseReport.theme} Free Report Snapshot`
        : baseReport.period && baseReport.period !== 'comprehensive'
          ? `${baseReport.period} Free Report Snapshot`
          : 'AI Report Free Version Summary'

  const expressiveSummary = buildFreePreviewLead({
    lang: baseReport.lang,
    theme: baseReport.theme,
    period: baseReport.period,
    queryDomain: preferredDomain,
    gradeDescription: baseReport.overallScore.gradeDescription,
  })

  const expressiveNextSteps = buildFreePreviewNextSteps({
    lang: baseReport.lang,
    theme: baseReport.theme,
    period: baseReport.period,
    queryDomain: preferredDomain,
  })

  const freePreviewSectionsByKey: Partial<
    Record<FreePreviewSectionKey, { title: string; content: string }>
  > = {
    summary: {
      title: baseReport.lang === 'ko' ? '요약' : 'Summary',
      content: expressiveSummary,
    },
    insights:
      topInsights.length > 0
        ? {
            title: baseReport.lang === 'ko' ? '핵심 인사이트' : 'Top Insights',
            content: topInsights
              .map((item) => `${item.title}: ${item.reason} ${item.action}`.trim())
              .join(' '),
          }
        : undefined,
    focus:
      focusAreas.length > 0
        ? {
            title: baseReport.lang === 'ko' ? '집중 영역' : 'Focus Areas',
            content: focusAreas
              .map(
                (item) =>
                  `${getInsightDomainLabel(item.domain as InsightDomain, baseReport.lang)}(${item.score}): ${item.summary}`
              )
              .join(' '),
          }
        : undefined,
    cautions:
      caution.length > 0
        ? {
            title: baseReport.lang === 'ko' ? '주의 포인트' : 'Cautions',
            content: caution.join(' '),
          }
        : undefined,
    nextSteps: {
      title: baseReport.lang === 'ko' ? '다음 단계' : 'Next Steps',
      content: expressiveNextSteps.join(' '),
    },
  }

  const orderedSections = buildFreePreviewSectionOrder({
    theme: baseReport.theme,
    period: baseReport.period,
    queryDomain: preferredDomain,
  })
    .map((key) => freePreviewSectionsByKey[key])
    .filter((section): section is { title: string; content: string } => Boolean(section))

  return {
    id: `free_${Date.now()}`,
    tier: 'free',
    generatedAt: new Date().toISOString(),
    lang: baseReport.lang,
    headline,
    summary: expressiveSummary,
    overallScore: Math.round(baseReport.overallScore.total),
    grade: baseReport.overallScore.grade,
    topInsights,
    focusAreas,
    caution,
    nextSteps: expressiveNextSteps,
    legacySections: [
      {
        title: baseReport.lang === 'ko' ? '요약' : 'Summary',
        content: expressiveSummary,
      },
      ...(topInsights.length > 0
        ? [
            {
              title: baseReport.lang === 'ko' ? '핵심 인사이트' : 'Top Insights',
              content: topInsights
                .map((item) => `${item.title}: ${item.reason} ${item.action}`.trim())
                .join(' '),
            },
          ]
        : []),
      ...(focusAreas.length > 0
        ? [
            {
              title: baseReport.lang === 'ko' ? '집중 영역' : 'Focus Areas',
              content: focusAreas
                .map(
                  (item) =>
                    `${getInsightDomainLabel(item.domain as InsightDomain, baseReport.lang)}(${item.score}): ${item.summary}`
                )
                .join(' '),
            },
          ]
        : []),
      ...(caution.length > 0
        ? [
            {
              title: baseReport.lang === 'ko' ? '주의 포인트' : 'Cautions',
              content: caution.join(' '),
            },
          ]
        : []),
      {
        title: baseReport.lang === 'ko' ? '다음 단계' : 'Next Steps',
        content: expressiveNextSteps.join(' '),
      },
    ],
    sections: orderedSections,
  }
}
