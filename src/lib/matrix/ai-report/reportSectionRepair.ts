import type { MatrixCalculationInput } from '../types'
import type { AIPremiumReport } from './reportTypes'
import type { ReportCoreViewModel } from './reportCoreHelpers'
import {
  findReportCoreAdvisory,
  findReportCoreTimingWindow,
  findReportCoreVerdict,
} from './reportCoreHelpers'
import { getReportDomainLabel, getTimingWindowLabel } from './reportTextHelpers'
import { sanitizeSectionNarrative, sanitizeUserFacingNarrative } from './reportNarrativeSanitizer'

type Lang = 'ko' | 'en'

const COMPREHENSIVE_SECTION_KEYS: Array<keyof AIPremiumReport['sections']> = [
  'introduction',
  'personalityDeep',
  'careerPath',
  'relationshipDynamics',
  'wealthPotential',
  'healthGuidance',
  'lifeMission',
  'timingAdvice',
  'actionPlan',
  'conclusion',
]

function needsRepair(text: string | undefined | null, lang: Lang): boolean {
  const value = String(text || '').trim()
  if (!value || lang !== 'ko') return false
  return (
    /\?{2,}|List promotion criteria|List leverage points|Name your narrow edge|stayed secondary because|identity focus stayed on|Expansion without role clarity|natal baseline|jeongjae/i.test(
      value
    ) || value.includes('커리어??') || value.includes('건강???')
  )
}

function joinSentences(lines: Array<string | undefined | null>): string {
  return sanitizeSectionNarrative(
    lines
      .map((line) => String(line || '').trim())
      .filter(Boolean)
      .join(' ')
  )
}

function topBranchLabels(reportCore: ReportCoreViewModel): string[] {
  return (reportCore.branchSet || [])
    .slice(0, 3)
    .map((item) => {
      const label = String(item.label || '').trim()
      if (label && !/\?{2,}/.test(label)) return label
      if (/promotion_review/i.test(item.id)) return '승진 검토'
      if (/contract_negotiation/i.test(item.id)) return '조건 협상'
      if (/manager_track/i.test(item.id)) return '관리자 트랙'
      if (/specialist_track/i.test(item.id)) return '전문화 트랙'
      if (/entry/i.test(item.id)) return '새 역할 진입'
      return ''
    })
    .filter(Boolean)
}

function summarizeMatrix(reportCore: ReportCoreViewModel): string {
  const row = (reportCore.matrixView || []).find((item) => item.domain === reportCore.actionFocusDomain)
  const first = row?.cells?.[0]?.summary || ''
  const second = row?.cells?.[1]?.summary || ''
  return [first, second].filter(Boolean).join(', ')
}

function buildRepairSection(
  section: keyof AIPremiumReport['sections'],
  reportCore: ReportCoreViewModel,
  input: MatrixCalculationInput,
  lang: Lang
): string {
  if (lang !== 'ko') return ''

  const focusLabel = getReportDomainLabel(reportCore.focusDomain, lang)
  const actionLabel = getReportDomainLabel(reportCore.actionFocusDomain, lang)
  const riskLabel = reportCore.riskAxisLabel || getReportDomainLabel(reportCore.riskAxisDomain, lang)
  const leadTiming = findReportCoreTimingWindow(reportCore, reportCore.actionFocusDomain)
  const leadTimingLabel = leadTiming ? getTimingWindowLabel(leadTiming.window, lang) : '지금'
  const leadAdvisory = findReportCoreAdvisory(reportCore, reportCore.actionFocusDomain)
  const relationshipAdvisory = findReportCoreAdvisory(reportCore, 'relationship')
  const wealthAdvisory = findReportCoreAdvisory(reportCore, 'wealth')
  const healthAdvisory = findReportCoreAdvisory(reportCore, 'health')
  const careerAdvisory = findReportCoreAdvisory(reportCore, 'career')
  const leadVerdict = findReportCoreVerdict(reportCore, reportCore.actionFocusDomain)
  const branchLabels = topBranchLabels(reportCore)
  const matrixSummary = summarizeMatrix(reportCore)
  const birthDate = typeof input.profileContext?.birthDate === 'string' ? input.profileContext.birthDate : ''
  const currentAge =
    birthDate
      ? Math.max(0, new Date().getUTCFullYear() - Number(birthDate.slice(0, 4)))
      : null

  switch (section) {
    case 'introduction':
      return joinSentences([
        `이번 리포트에서 먼저 봐야 할 것은 삶의 배경 흐름과 지금 먼저 움직여야 할 영역이 다르다는 점입니다. 지금 삶의 바탕에는 ${focusLabel} 흐름이 깔려 있지만, 실제로 손을 대고 움직여야 하는 쪽은 ${actionLabel}입니다.`,
        `그래서 이 시기의 승부는 무엇이 중요한가를 아는 데서 끝나지 않고, 무엇을 먼저 정리하고 무엇을 나중에 확정할지를 분명히 가르는 데서 갈립니다.`,
        `${riskLabel} 문제가 가장 예민한 변수로 같이 움직이기 때문에, 좋은 기회가 와도 운영 순서를 잘못 잡으면 결과보다 소모가 먼저 커질 수 있습니다.`,
        leadAdvisory?.thesis ||
          `${actionLabel} 흐름은 지금 현실적인 변화 여지가 열려 있지만, 성급한 확정보다 검토와 기준 정리가 먼저인 구간입니다.`,
        `현재 타이밍은 ${leadTimingLabel} 창이 가장 직접적이며, ${matrixSummary || '지금과 1~3개월 구간에서 합의도가 비교적 안정적입니다.'}`,
      ])
    case 'personalityDeep':
      return joinSentences([
        `${currentAge ? `현재 만 ${currentAge}세 전후의 흐름에서는` : '지금은'} 겉으로 보이는 결단력보다, 기준을 세운 뒤 움직이는 운영 감각이 더 중요하게 작동합니다.`,
        `당신은 방향을 잡으면 오래 밀 수 있는 힘이 있지만, 기준이 불명확할 때는 오히려 에너지가 분산되거나 자기검열이 강해질 가능성도 함께 가지고 있습니다.`,
        `이 시기의 핵심은 감으로 먼저 돌진하는 사람이 되는 것이 아니라, 무엇을 위해 움직이는지 한 문장으로 설명할 수 있는 사람이 되는 것입니다.`,
        `그래서 성향 차원에서도 빠른 결론보다 확인 질문을 먼저 놓고, 한 번 정한 원칙을 실제 행동 순서로 연결하는 훈련이 중요합니다.`,
      ])
    case 'careerPath':
      return joinSentences([
        `커리어는 지금 가장 전면에 있는 실행축입니다. 그래서 일의 양을 늘리는 것보다 역할, 책임, 평가 기준을 먼저 고정하는 사람이 훨씬 유리합니다.`,
        careerAdvisory?.thesis ||
          '커리어 흐름은 닫혀 있지 않고 오히려 재정렬과 확장의 여지가 같이 열려 있습니다.',
        careerAdvisory?.action ||
          '바로 확정하기보다 검토 우선으로 접근하고, 중간 점검 지점을 분명히 두는 편이 맞습니다.',
        branchLabels.length > 0
          ? `현실적으로는 ${branchLabels.join(', ')} 같은 경로가 함께 열려 있습니다. 즉 한 번의 극단적 선택보다, 몇 가지 가능한 경로를 비교하면서 자신에게 맞는 포지션을 좁혀가는 방식이 더 현실적입니다.`
          : '현실적으로는 한 가지 해답보다 여러 실행 경로를 비교하며 포지션을 좁혀가는 방식이 더 현실적입니다.',
      ])
    case 'relationshipDynamics':
      return joinSentences([
        `관계는 지금 삶의 배경 구조를 이루는 축입니다. 그래서 사람, 협업, 기대치, 거리 조절 문제가 커리어나 다른 결정의 바닥에 같이 깔려 작동합니다.`,
        relationshipAdvisory?.thesis ||
          '관계에서는 감정의 크기보다 해석의 정확도가 훨씬 더 중요하게 작동합니다.',
        relationshipAdvisory?.action ||
          '결론을 서두르기보다 서로 이해한 문장을 먼저 맞추는 쪽이 안정적입니다.',
        `이 시기 관계의 승부처는 누가 더 강한가가 아니라, 누가 더 분명한 조건과 경계를 만들 수 있는가에 있습니다.`,
      ])
    case 'wealthPotential':
      return joinSentences([
        `재정은 지금 가장 앞에 서는 영역은 아니지만, ${actionLabel} 결정을 현실화하거나 흔들 수 있는 보조 흐름으로 강하게 작동합니다.`,
        wealthAdvisory?.thesis ||
          '재정 흐름에서는 기회와 리스크가 함께 움직이기 때문에 기대수익보다 조건 검증이 먼저입니다.',
        wealthAdvisory?.action ||
          '금액, 기한, 취소 조건, 손실 상한 같은 실무 기준을 먼저 적어두는 편이 맞습니다.',
        `이 시기 재정의 핵심은 크게 버는 장면보다, 무엇을 감당할 수 있고 무엇을 감당할 수 없는지 선명하게 가르는 데 있습니다.`,
      ])
    case 'healthGuidance':
      return joinSentences([
        `${riskLabel} 문제가 현재 가장 민감한 변수입니다. 이 말은 건강운이 단순히 나쁘다는 뜻이 아니라, 과부하와 회복 지연이 다른 모든 판단의 품질을 떨어뜨릴 수 있다는 뜻입니다.`,
        healthAdvisory?.thesis ||
          '몸 상태는 결과 이후에 챙기는 보조 문제가 아니라, 지금 의사결정의 질을 좌우하는 핵심 변수입니다.',
        healthAdvisory?.action ||
          '무리해서 버티기보다 회복 루틴을 먼저 고정하고, 일정과 에너지 배분을 함께 조절하는 편이 맞습니다.',
        `좋은 기회도 회복 리듬이 무너지면 나쁜 방식으로 받게 될 수 있으니, 이 시기에는 능력보다 운영 순서가 더 중요합니다.`,
      ])
    case 'lifeMission':
      return joinSentences([
        `장기적으로 보면 지금 구간의 과제는 성과 하나를 더 만드는 것보다, 앞으로 오래 들고 갈 기준을 다시 세우는 데 있습니다.`,
        `삶의 바탕에 깔린 ${focusLabel} 흐름은 결국 어떤 관계, 어떤 협업, 어떤 거리감을 선택할 사람인지를 묻고 있고, 실제로 먼저 움직여야 하는 ${actionLabel} 쪽은 그 기준을 현실 결정으로 옮기라고 압박합니다.`,
        `그래서 이번 시기의 장기 과제는 선택지를 늘리는 데 있지 않고, 반복해서 지킬 수 있는 판단 기준을 만드는 데 있습니다.`,
      ])
    case 'timingAdvice':
      return joinSentences([
        `타이밍은 ${leadTimingLabel} 창이 가장 직접적이지만, 그 의미는 지금 당장 확정하라는 뜻이 아닙니다.`,
        leadVerdict?.rationale ||
          `${actionLabel} 흐름은 구조 지지와 촉발 신호를 같이 보면서, 사건을 좁혀 보기보다 판이 살아나는지부터 확인하는 편이 맞습니다.`,
        `지금은 실행과 검토를 같은 속도로 밀기보다, 먼저 조건을 정리하고 그 다음 확정 속도를 올려야 손실이 줄어듭니다.`,
        `특히 ${matrixSummary || '지금과 다음 1~3개월의 합의도 변화'}를 같이 보면, 짧은 감정 파동보다 지속 가능한 조건이 더 중요하다는 점이 분명하게 드러납니다.`,
      ])
    case 'actionPlan':
      return joinSentences([
        `${actionLabel}에서 지금 가장 맞는 기본 자세는 ${reportCore.topDecisionLabel || reportCore.topDecisionAction || '검토 우선'}입니다.`,
        leadAdvisory?.action ||
          '바로 확정하기보다 역할과 범위를 먼저 고정하고, 중간 확인 지점을 설계한 뒤 단계적으로 움직이는 편이 맞습니다.',
        `실행 전에 맞춰야 할 조건은 세 가지입니다. 기준을 문서로 남길 것, 보류 기준을 함께 적을 것, 그리고 ${riskLabel} 리스크가 커질 때 어떤 선택을 멈출지 미리 정해둘 것입니다.`,
        branchLabels.length > 0
          ? `실행 경로는 ${branchLabels.join(', ')}처럼 2~3개로 열려 있으니, 하나만 정답처럼 밀기보다 가장 비용이 낮고 되돌림이 가능한 경로부터 비교하는 편이 안전합니다.`
          : '실행 경로는 하나만 정답처럼 밀기보다, 비용이 낮고 되돌림이 가능한 순서부터 비교하는 편이 안전합니다.',
      ])
    case 'conclusion':
      return joinSentences([
        `이번 흐름의 결론은 단순합니다. 배경 구조는 ${focusLabel}에 있지만, 실제로 결과를 바꾸는 손은 ${actionLabel}에 있습니다.`,
        `${riskLabel} 리스크를 무시하면 좋은 기회도 소모로 바뀔 수 있으므로, 속도보다 순서, 결심보다 운영이 더 중요합니다.`,
        `한 번에 인생을 뒤집는 결정보다, 기준을 먼저 세우고 가능한 경로를 비교하면서 움직일 때 이번 구간의 힘을 가장 제대로 쓸 수 있습니다.`,
      ])
  }

  return ''
}

export function repairMalformedComprehensiveSections(
  sections: AIPremiumReport['sections'],
  reportCore: ReportCoreViewModel,
  input: MatrixCalculationInput,
  lang: Lang
): AIPremiumReport['sections'] {
  if (lang !== 'ko') return sections
  const repaired = { ...sections }
  for (const key of COMPREHENSIVE_SECTION_KEYS) {
    const value = repaired[key]
    if (!needsRepair(value, lang)) continue
    repaired[key] = sanitizeUserFacingNarrative(buildRepairSection(key, reportCore, input, lang))
  }
  return repaired
}

