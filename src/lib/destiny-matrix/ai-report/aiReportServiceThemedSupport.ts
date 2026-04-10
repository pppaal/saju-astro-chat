import type { MatrixCalculationInput } from '../types'
import type { ReportTheme, ThemedReportSections, TimingData } from './types'
import {
  findReportCoreAdvisory,
  findReportCoreTimingWindow,
  type ReportCoreViewModel,
} from './reportCoreHelpers'
import { getReportDomainLabel, localizeReportNarrativeText } from './reportTextHelpers'
import { sanitizeUserFacingNarrative } from './reportNarrativeSanitizer'
import { buildReportOutputCoreFields } from './aiReportServiceRuntimeSupport'
import { buildTimingWindowNarrative } from './aiReportServiceNarrativeSupport'

export function joinNarrativeParts(parts: Array<string | null | undefined>): string {
  return sanitizeUserFacingNarrative(
    parts
      .map((part) => String(part || '').trim())
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

export function toSentenceCaseNarrativeLine(text: string, lang: 'ko' | 'en'): string {
  const normalized = sanitizeUserFacingNarrative(localizeReportNarrativeText(text, lang))
    .replace(/\s+/g, ' ')
    .trim()
  if (!normalized) return ''
  if (/[.!?]$/u.test(normalized)) return normalized
  return lang === 'ko' ? `${normalized}.` : `${normalized}.`
}

export function buildProjectionMoveSentence(
  moves: string[] | undefined,
  lang: 'ko' | 'en',
  fallback: string
): string {
  const first = String(moves?.[0] || '').trim()
  if (!first) return ''
  const normalized = toSentenceCaseNarrativeLine(first, lang)
  return normalized || fallback
}

export function collectProjectionDriverLabels(
  items: string[] | undefined,
  lang: 'ko' | 'en',
  limit = 2
): string[] {
  return (items || [])
    .map((item) => sanitizeUserFacingNarrative(localizeReportNarrativeText(item, lang)).trim())
    .filter(Boolean)
    .filter((item) => !/(recommended|recommend|caution|warning|recheck|verify)$/i.test(item))
    .filter((item) => item.length <= 24)
    .slice(0, limit)
}

function hasBatchim(text: string): boolean {
  const value = String(text || '').trim()
  if (!value) return false
  const last = value.charCodeAt(value.length - 1)
  if (last < 0xac00 || last > 0xd7a3) return false
  return (last - 0xac00) % 28 !== 0
}

function withSubjectParticle(text: string): string {
  const value = String(text || '').trim()
  if (!value) return ''
  return `${value}${hasBatchim(value) ? '이' : '가'}`
}

function buildKoThemedActionLead(
  actionDomain: string,
  actionLabel: string,
  decision: string
): string {
  switch (actionDomain) {
    case 'career':
      return `${actionLabel}에서는 ${decision} 기조로 역할 범위와 협상 기준을 먼저 세우는 편이 유리합니다.`
    case 'relationship':
      return `${actionLabel}에서는 ${decision} 기조로 답장 간격과 만나는 빈도를 먼저 맞추는 편이 유리합니다.`
    case 'wealth':
      return `${actionLabel}에서는 ${decision} 기조로 현금흐름과 손실 상한을 먼저 정리하는 편이 유리합니다.`
    case 'health':
      return `${actionLabel}에서는 ${decision} 기조로 회복 리듬과 과부하 한계를 먼저 바로잡는 편이 유리합니다.`
    case 'move':
      return `${actionLabel}에서는 ${decision} 기조로 후보 지역과 생활 조건을 먼저 비교하는 편이 유리합니다.`
    default:
      return `${actionLabel}에서는 ${decision} 기조를 먼저 세우는 편이 유리합니다.`
  }
}

function buildKoThemedConclusionLead(focusLabel: string, actionLabel: string): string {
  return `${withSubjectParticle(focusLabel)} 배경 압력축이고 ${withSubjectParticle(actionLabel)} 지금 실행을 결정하는 축입니다.`
}

function polishKoThemedActionPlan(
  base: string,
  actionDomain: string,
  actionLabel: string,
  decision: string
): string {
  const lead = buildKoThemedActionLead(actionDomain, actionLabel, decision)
  const cleaned = sanitizeUserFacingNarrative(
    base
      .replace(/지금은 준비와 정보 수집에 집중하세요\.?/g, '')
      .replace(/결론보다 검토 기준과 보류 조건을 먼저 정리하세요\.?/g, '')
      .replace(/감정 속도보다 확인 질문을 먼저 놓고 해석 오차를 줄이세요\.?/g, '')
      .replace(/다음 행동은\s*/g, '')
      .replace(/부터 작게 실행하는 것입니다\.?/g, ' 순서로 차례대로 점검하는 것입니다.')
      .replace(/\s{2,}/g, ' ')
      .trim()
  )
  return sanitizeUserFacingNarrative(`${lead} ${cleaned}`).trim()
}

function polishKoThemedConclusion(
  base: string,
  actionDomain: string,
  focusLabel: string,
  actionLabel: string,
  decision: string
): string {
  const lead = buildKoThemedConclusionLead(focusLabel, actionLabel)
  const closer =
    actionDomain === 'career'
      ? '지금은 제안 자체보다 역할 범위와 평가 기준을 먼저 고정하는 사람이 결과를 더 안정적으로 가져갑니다.'
      : actionDomain === 'relationship'
        ? '지금은 감정보다 답장 간격과 약속 경계를 맞춘 사람이 관계를 더 오래 안정적으로 끌고 갑니다.'
        : actionDomain === 'wealth'
          ? '지금은 수익 기대보다 누수와 조건선을 먼저 관리하는 사람이 재정 흔들림을 더 잘 줄입니다.'
          : actionDomain === 'health'
            ? '지금은 의욕보다 회복 리듬을 먼저 지키는 사람이 전체 흐름을 더 오래 유지합니다.'
            : actionDomain === 'move'
              ? '지금은 큰 결론보다 생활 조건과 이동 경로를 먼저 비교하는 사람이 손실을 더 잘 줄입니다.'
              : `${decision} 쪽으로 순서를 잡는 사람이 이 구간을 더 안정적으로 통과합니다.`

  const cleaned = sanitizeUserFacingNarrative(
    base
      .replace(/감정 속도보다 확인 질문을 먼저 놓고 해석 오차를 줄이세요\.?/g, '')
      .replace(/[\w가-힣]+이 배경 압력축이고 [\w가-힣]+이 현재 실행축입니다\.?/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
  )
  return sanitizeUserFacingNarrative(`${lead} ${cleaned} ${closer}`).trim()
}

function buildKoSharedDeepAnalysis(
  actionDomain: string,
  focusLabel: string,
  actionLabel: string,
  riskLabel: string,
  structureSummary: string,
  structureDetail: string,
  structureDrivers: string
): string {
  const intro =
    actionDomain === 'career'
      ? `${focusLabel}이 배경 구조라도 실제 결과는 ${actionLabel}에서 역할 범위와 평가 기준을 어떻게 세우느냐에 따라 갈립니다.`
      : actionDomain === 'relationship'
        ? `${focusLabel}이 배경 구조라도 실제 관계 흐름은 ${actionLabel}에서 답장 간격과 만나는 빈도를 어떻게 맞추느냐에 따라 갈립니다.`
        : actionDomain === 'wealth'
          ? `${focusLabel}이 배경 구조라도 실제 재정 흐름은 ${actionLabel}에서 현금흐름과 손실 상한을 어떻게 잠그느냐에 따라 갈립니다.`
          : actionDomain === 'health'
            ? `${focusLabel}이 배경 구조라도 실제 컨디션은 ${actionLabel}에서 회복 리듬과 과부하 한계를 어떻게 지키느냐에 따라 갈립니다.`
            : actionDomain === 'move'
              ? `${focusLabel}이 배경 구조라도 실제 생활 변화는 ${actionLabel}에서 거점, 동선, 계약 조건을 어떻게 비교하느냐에 따라 갈립니다.`
              : `${focusLabel}이 배경 구조라도 실제 결과를 바꾸는 전면 축은 ${actionLabel}입니다.`

  const support =
    structureDrivers && actionDomain === 'career'
      ? `${actionLabel} 축을 미는 동력은 ${structureDrivers}처럼 역할과 기준을 또렷하게 만드는 쪽에 모입니다.`
      : structureDrivers && actionDomain === 'relationship'
        ? `${actionLabel} 축을 미는 동력은 ${structureDrivers}처럼 답장 속도와 약속 이행을 조율하는 쪽에 모입니다.`
        : structureDrivers && actionDomain === 'wealth'
          ? `${actionLabel} 축을 미는 동력은 ${structureDrivers}처럼 돈의 흐름과 조건을 좁혀 보는 쪽에 모입니다.`
          : structureDrivers && actionDomain === 'health'
            ? `${actionLabel} 축을 미는 동력은 ${structureDrivers}처럼 회복 블록과 부하 한계를 다시 세우는 쪽에 모입니다.`
            : structureDrivers && actionDomain === 'move'
              ? `${actionLabel} 축을 미는 동력은 ${structureDrivers}처럼 생활 거점과 이동 동선을 다시 조정하는 쪽에 모입니다.`
              : structureDrivers
                ? `${actionLabel} 축을 미는 동력은 ${structureDrivers}입니다.`
                : ''

  const riskLine =
    actionDomain === 'health'
      ? `${riskLabel} 리스크는 전체 일정과 회복 블록을 함께 흔들 수 있으므로 초기에 바로 끊어야 합니다.`
      : `${riskLabel} 리스크를 같이 관리해야 해석 전체가 흔들리지 않습니다.`

  return joinNarrativeParts([intro, structureSummary || structureDetail, support, riskLine])
}

function buildKoSharedTiming(
  actionDomain: string,
  actionLabel: string,
  timingSummary: string,
  timingDetail: string,
  windowNarrative: string,
  matrixSummary: string,
  timingDrivers: string,
  branchEntryLead: string
): string {
  const driverLine =
    timingDrivers && actionDomain === 'career'
      ? `${actionLabel} 타이밍을 미는 조건은 ${timingDrivers}처럼 역할, 기준, 협상 여지가 맞물릴 때 더 선명해집니다.`
      : timingDrivers && actionDomain === 'relationship'
        ? `${actionLabel} 타이밍을 미는 조건은 ${timingDrivers}처럼 답장 간격과 만나는 빈도가 함께 맞아들 때 더 선명해집니다.`
        : timingDrivers && actionDomain === 'wealth'
          ? `${actionLabel} 타이밍을 미는 조건은 ${timingDrivers}처럼 현금흐름과 조건 통제가 동시에 잡힐 때 더 선명해집니다.`
          : timingDrivers && actionDomain === 'health'
            ? `${actionLabel} 타이밍을 미는 조건은 ${timingDrivers}처럼 회복 루틴과 일정 조절이 동시에 맞아들 때 더 선명해집니다.`
            : timingDrivers && actionDomain === 'move'
              ? `${actionLabel} 타이밍을 미는 조건은 ${timingDrivers}처럼 후보 지역, 동선, 계약 조건이 함께 정리될 때 더 선명해집니다.`
              : timingDrivers
                ? `${actionLabel} 타이밍을 미는 조건은 ${timingDrivers}입니다.`
                : ''

  const entryLine =
    branchEntryLead && actionDomain === 'career'
      ? `지금 들어가도 되는 조건은 ${branchEntryLead}처럼 역할과 책임선이 먼저 보일 때입니다.`
      : branchEntryLead && actionDomain === 'relationship'
        ? `지금 가까워져도 되는 조건은 ${branchEntryLead}처럼 연락 방식과 약속 이행 방식이 먼저 확인될 때입니다.`
        : branchEntryLead && actionDomain === 'wealth'
          ? `지금 움직여도 되는 조건은 ${branchEntryLead}처럼 손실 상한과 회수 조건이 먼저 보일 때입니다.`
          : branchEntryLead && actionDomain === 'health'
            ? `지금 버텨도 되는 조건은 ${branchEntryLead}처럼 회복 시간과 부하 제한이 먼저 확보될 때입니다.`
            : branchEntryLead && actionDomain === 'move'
              ? `지금 옮겨도 되는 조건은 ${branchEntryLead}처럼 거점과 생활비 구조가 먼저 맞아들 때입니다.`
              : branchEntryLead
                ? `지금 열리는 조건은 ${branchEntryLead}입니다.`
                : ''

  return joinNarrativeParts([
    timingSummary || timingDetail,
    windowNarrative,
    matrixSummary,
    driverLine,
    entryLine,
  ])
}

function buildKoDomainRecommendations(
  actionDomain: string,
  actionLabel: string,
  branchAbortLead: string,
  branchRisk: string,
  riskLabel: string
): string[] {
  const first =
    actionDomain === 'career'
      ? `${actionLabel}에서는 속도보다 역할 범위와 평가 기준을 먼저 문장으로 고정하세요.`
      : actionDomain === 'relationship'
        ? `${actionLabel}에서는 감정 표현보다 답장 간격과 만나는 빈도를 먼저 맞추세요.`
        : actionDomain === 'wealth'
          ? `${actionLabel}에서는 확장보다 지출 구조와 손실 상한을 먼저 고정하세요.`
          : actionDomain === 'health'
            ? `${actionLabel}에서는 의지보다 수면, 식사, 회복 시간을 먼저 고정하세요.`
            : actionDomain === 'move'
              ? `${actionLabel}에서는 큰 이동 결정보다 후보 지역과 생활 조건 비교표를 먼저 만드세요.`
              : `${actionLabel}에서는 속도보다 기준을 먼저 고정하세요.`

  const second = branchAbortLead
    ? actionDomain === 'relationship'
      ? `${branchAbortLead} 신호가 보이면 관계를 밀어붙이지 말고 거리와 속도를 다시 조정하세요.`
      : actionDomain === 'health'
        ? `${branchAbortLead} 신호가 보이면 일정을 줄이고 회복 루틴부터 복구하세요.`
        : actionDomain === 'move'
          ? `${branchAbortLead} 신호가 보이면 계약을 바로 확정하지 말고 경로와 비용을 다시 확인하세요.`
          : `${branchAbortLead} 신호가 보이면 바로 확정하지 말고 한 번 더 검토하세요.`
    : `${riskLabel} 부담이 올라오면 먼저 검토 모드로 전환하세요.`

  const third = branchRisk
    ? actionDomain === 'wealth'
      ? `${branchRisk}가 커지지 않도록 큰 결정보다 되돌릴 수 있는 작은 조정부터 시험하세요.`
      : actionDomain === 'health'
        ? `${branchRisk}가 커지지 않도록 무리한 버티기보다 회복 가능 범위 안에서만 움직이세요.`
        : `${branchRisk}가 커지지 않도록 작은 단위의 가역적 행동으로 시험하세요.`
    : actionDomain === 'move'
      ? '한 번에 주소를 바꾸기보다 출퇴근 동선과 생활비부터 작은 단위로 시험하세요.'
      : '한 번에 크게 움직이기보다 되돌릴 수 있는 작은 단계로 진행하세요.'

  return [first, second, third]
}

function buildKoSharedExecutionLine(actionDomain: string): string {
  switch (actionDomain) {
    case 'career':
      return '실행은 역할 범위, 평가 기준, 협상 여지를 한 장에 정리하는 순서로 가져가세요.'
    case 'relationship':
      return '실행은 답장 간격, 만나는 빈도, 책임 경계를 한 번에 밀어붙이지 말고 순서대로 확인하는 쪽이 맞습니다.'
    case 'wealth':
      return '실행은 고정지출, 손실 상한, 회수 조건을 먼저 잠그는 순서로 가져가세요.'
    case 'health':
      return '실행은 수면, 식사, 회복 시간을 먼저 다시 세워 과부하 한계를 낮추는 순서로 가져가세요.'
    case 'move':
      return '실행은 후보 지역, 생활비, 통근 동선을 같은 표 위에 올려 두고 비교하는 순서로 가져가세요.'
    default:
      return '실행은 작은 단계부터 순서대로 확인하는 쪽이 맞습니다.'
  }
}

function refineKoRelationshipNarrative(text: string): string {
  return sanitizeUserFacingNarrative(
    String(text || '')
      .replace(/관계 속도와 기대치/g, '답장 간격과 만나는 빈도')
      .replace(/관계 리듬과 신뢰/g, '답장 속도와 약속 이행')
      .replace(/관계 운영 방식/g, '연락 방식과 약속 이행 방식')
      .replace(/속도와 기대치/g, '답장 간격과 만나는 빈도')
      .replace(/속도와 경계/g, '답장 간격과 약속 경계')
      .replace(/리듬과 신뢰/g, '답장 속도와 약속 이행')
      .replace(/속도와 기대치가 함께 맞아들 때/g, '답장 간격과 만나는 빈도가 함께 맞아들 때')
      .replace(/속도와 기대치를 먼저 맞춰야/g, '답장 간격과 만나는 빈도를 먼저 맞춰야')
      .replace(/속도와 경계를 맞춘/g, '답장 간격과 약속 경계를 맞춘')
      .replace(/리듬과 경계가 맞는/g, '답장 간격과 생활 리듬이 맞는')
      .replace(/관계 속도, 기대치, 책임 경계/g, '답장 간격, 만나는 빈도, 책임 경계')
      .replace(/관계와 책임 경계/g, '연락 방식과 책임 경계')
      .replace(
        /관계는 감정 강도보다 해석과 생활 리듬이 맞을 때 더 오래 안정됩니다\./g,
        '관계는 감정의 강도보다 답장 간격과 생활 리듬이 맞을 때 더 오래 안정됩니다.'
      )
      .replace(
        /지금 관계는 속도와 기대치를 먼저 맞춰야 다음 단계로 부드럽게 넘어갑니다\./g,
        '지금 관계는 답장 간격과 만나는 빈도를 먼저 맞춰야 다음 단계로 부드럽게 넘어갑니다.'
      )
      .replace(
        /더 강한 궁합은 강렬함보다 리듬과 경계가 맞는 쪽에서 나옵니다\./g,
        '더 강한 궁합은 강렬함보다 답장 간격과 생활 리듬이 맞는 쪽에서 나옵니다.'
      )
      .trim()
  )
}

export function buildProjectionFirstThemedSections(
  theme: ReportTheme,
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  timingData: TimingData | undefined
): ThemedReportSections {
  const outputCore = buildReportOutputCoreFields(reportCore, lang)
  const projections = outputCore.projections
  const actionDomain = reportCore.actionFocusDomain || reportCore.focusDomain
  const focusLabel = getReportDomainLabel(reportCore.focusDomain, lang)
  const actionLabel = getReportDomainLabel(actionDomain, lang)
  const riskLabel = reportCore.riskAxisLabel || (lang === 'ko' ? '??' : 'health')

  const clean = (value: string | undefined): string =>
    sanitizeUserFacingNarrative(localizeReportNarrativeText(String(value || ''), lang)).trim()

  const focusTiming = findReportCoreTimingWindow(reportCore, actionDomain)
  const branchSet = (reportCore.branchSet || []).slice(0, 3)
  const matrixRows = reportCore.matrixView || []
  const actionMatrixRow = matrixRows.find((row) => row.domain === actionDomain) || matrixRows[0]
  const relationshipAdvisory = findReportCoreAdvisory(reportCore, 'relationship')
  const careerAdvisory = findReportCoreAdvisory(reportCore, 'career')
  const wealthAdvisory = findReportCoreAdvisory(reportCore, 'wealth')
  const healthAdvisory = findReportCoreAdvisory(reportCore, 'health')
  const relationshipProfile = reportCore.personModel?.relationshipProfile
  const relationshipStyle = reportCore.personModel?.appliedProfile?.relationshipStyleProfile
  const environmentProfile = reportCore.personModel?.appliedProfile?.environmentProfile
  const moveEvent = reportCore.personModel?.eventOutlook?.find((item) => item.domain === 'move')
  const relationshipEvent = reportCore.personModel?.eventOutlook?.find(
    (item) => item.domain === 'relationship'
  )

  const paragraph = (...parts: Array<string | undefined>): string =>
    joinNarrativeParts(parts.map((part) => clean(part)).filter(Boolean))

  const listText = (values: string[] | undefined): string => {
    const cleaned = (values || []).map((value) => clean(value)).filter(Boolean)
    return cleaned.join(lang === 'ko' ? ', ' : ', ')
  }

  const structureSummary = clean(projections?.structure?.summary || reportCore.thesis)
  const structureDetail = clean(projections?.structure?.detailLines?.[0] || '')
  const actionSummary = clean(projections?.action?.summary || reportCore.primaryAction)
  const actionDetail = clean(projections?.action?.detailLines?.[0] || '')
  const riskSummary = clean(projections?.risk?.summary || reportCore.riskControl)
  const timingSummary = clean(projections?.timing?.summary || reportCore.gradeReason)
  const timingDetail = clean(projections?.timing?.detailLines?.[0] || '')
  const conflictSummary = clean(projections?.conflict?.summary || reportCore.primaryCaution)
  const evidenceSummary = clean(
    projections?.evidence?.summary || reportCore.judgmentPolicy.rationale
  )

  const windowNarrative = focusTiming
    ? clean(buildTimingWindowNarrative(actionDomain, focusTiming, lang))
    : lang === 'ko'
      ? '??? ?? ????? ????? ??? ?????.'
      : 'This phase is better used to confirm direction before locking decisions.'

  const firstBranch = branchSet[0]
  const branchEntry = clean((firstBranch?.entry || []).join(', '))
  const branchEntryLead = clean(firstBranch?.entry?.[0] || '')
  const branchAbort = clean((firstBranch?.abort || []).join(', '))
  const branchAbortLead = clean(firstBranch?.abort?.[0] || '')
  const branchRisk = clean(firstBranch?.reversalRisk || firstBranch?.wrongMoveCost || '')
  const branchLead = branchSet
    .map((branch, index) => `${index + 1}. ${clean(branch.summary || branch.label || '')}`)
    .filter((line) => !/^[0-9]+\.\s*$/.test(line))
    .join('\n')

  const matrixSummary = actionMatrixRow
    ? lang === 'ko'
      ? `${actionLabel} ?? ${clean(
          actionMatrixRow.cells
            .map((cell) => cell.summary)
            .filter(Boolean)
            .slice(0, 2)
            .join(', ')
        )}`
      : `${actionLabel} currently reads as ${clean(
          actionMatrixRow.cells
            .map((cell) => cell.summary)
            .filter(Boolean)
            .slice(0, 2)
            .join(', ')
        )}`
    : ''

  const timingDrivers = listText(projections?.timing?.drivers)
  const actionMove = buildProjectionMoveSentence(projections?.action?.nextMoves, lang, '')
  const actionMoves = listText(projections?.action?.nextMoves)
  const riskCounters = listText(projections?.risk?.counterweights?.slice(0, 2))
  const structureDrivers = listText(projections?.structure?.drivers)
  const relationshipPartnerPatterns = listText(relationshipProfile?.partnerArchetypes)
  const relationshipInflowPaths = listText(relationshipProfile?.inflowPaths)
  const relationshipCommitmentConditions = listText(relationshipProfile?.commitmentConditions)
  const relationshipBreakPatterns = listText(relationshipProfile?.breakPatterns)
  const relationshipStabilizers = listText(relationshipStyle?.stabilizers)
  const relationshipRepairMoves = listText(relationshipStyle?.repairMoves)
  const movePreferredSettings = listText(environmentProfile?.preferredSettings)
  const moveDrainSignals = listText(environmentProfile?.drainSignals)
  const moveResetActions = listText(environmentProfile?.resetActions)

  const sharedDeepAnalysis =
    lang === 'ko'
      ? buildKoSharedDeepAnalysis(
          actionDomain,
          focusLabel,
          actionLabel,
          riskLabel,
          structureSummary,
          structureDetail,
          structureDrivers
        )
      : paragraph(
          `${focusLabel} forms the background while ${actionLabel} is the front line that actually changes outcomes.`,
          structureSummary || structureDetail,
          structureDrivers ? `${actionLabel} is being supported by ${structureDrivers}.` : '',
          `${riskLabel} must be managed at the same time to keep the whole read stable.`
        )

  const sharedTiming =
    lang === 'ko'
      ? buildKoSharedTiming(
          actionDomain,
          actionLabel,
          timingSummary,
          timingDetail,
          windowNarrative,
          matrixSummary,
          timingDrivers,
          branchEntryLead
        )
      : paragraph(
          timingSummary || timingDetail,
          windowNarrative,
          matrixSummary,
          timingDrivers ? `${actionLabel} timing is being pushed by ${timingDrivers}.` : '',
          branchEntryLead ? `Right now, the cleanest entry condition is ${branchEntryLead}.` : ''
        )

  const sharedActionRuleEn =
    actionDomain === 'move'
      ? 'On the relocation axis, compare the route, the base, and the contract terms before you commit.'
      : actionDomain === 'relationship'
        ? 'On the relationship axis, verify pace, boundaries, and commitment conditions before you move closer.'
        : actionDomain === 'career'
          ? 'On the career axis, verify role scope, ownership, and evaluation criteria before you accept the next step.'
          : actionDomain === 'wealth'
            ? 'On the wealth axis, review cashflow, payback terms, and downside limits before you expand or commit.'
            : actionDomain === 'health'
              ? 'On the health axis, stabilize recovery rhythm, sleep, and load limits before you raise output.'
              : `On the ${actionLabel} axis, ${reportCore.topDecisionLabel || reportCore.primaryAction} is the base operating rule.`

  const sharedExecutionLeadEn =
    actionDomain === 'move'
      ? 'Put the route, living base, housing cost, and contract terms side by side before you choose the next step.'
      : actionDomain === 'relationship'
        ? 'Align pace, boundaries, and relationship standards explicitly before you try to deepen the connection.'
        : actionDomain === 'career'
          ? 'Put role scope, reporting line, and negotiation room on one sheet before you lock the offer in.'
          : actionDomain === 'wealth'
            ? 'Put payment timing, loss caps, and reversal conditions on one sheet before you move money.'
            : actionDomain === 'health'
              ? 'Put recovery blocks, sleep timing, and load limits in place before you ask the body for more.'
              : 'Use this phase to verify scope, pace, and ownership before you lock anything in.'

  const sharedConclusionLeadEn =
    actionDomain === 'move'
      ? `The background pressure sits on ${focusLabel}, but this phase is actually decided by how carefully you verify relocation conditions.`
      : actionDomain === 'relationship'
        ? `The background pressure sits on ${focusLabel}, but this phase is actually decided by how clearly you align relational pace and standards.`
        : actionDomain === 'career'
          ? `The background pressure sits on ${focusLabel}, but this phase is actually decided by how cleanly you define the role and the decision terms.`
          : actionDomain === 'wealth'
            ? `The background pressure sits on ${focusLabel}, but this phase is actually decided by how tightly you control cashflow and downside terms.`
            : actionDomain === 'health'
              ? `The background pressure sits on ${focusLabel}, but this phase is actually decided by how reliably you protect recovery capacity.`
              : `The background pressure axis is ${focusLabel}; the live execution axis is ${actionLabel}.`

  const sharedActionPlan =
    lang === 'ko'
      ? paragraph(
          buildKoSharedExecutionLine(actionDomain),
          actionDomain === 'move' && movePreferredSettings
            ? `거점을 고를 때는 ${movePreferredSettings} 같은 생활 조건부터 먼저 표로 비교하세요.`
            : '',
          actionDomain === 'move' && moveEvent?.summary ? moveEvent.summary : '',
          actionDomain === 'relationship' && relationshipCommitmentConditions
            ? `관계에서는 ${relationshipCommitmentConditions} 같은 조건이 먼저 맞아야 다음 단계로 가도 무리가 없습니다.`
            : '',
          branchAbortLead ? `${branchAbortLead} 신호가 보이면 확정 전에 속도를 늦추세요.` : '',
          branchRisk ? `서두르면 ${branchRisk}` : '',
          riskCounters && actionDomain === 'health'
            ? `${riskLabel} 쪽에서는 ${riskCounters}부터 줄여야 전체 리듬이 버팁니다.`
            : ''
        )
      : paragraph(
          sharedActionRuleEn,
          sharedExecutionLeadEn,
          actionMove ? `Start with this move: ${actionMove}` : '',
          actionDomain === 'move' && movePreferredSettings
            ? `Compare living conditions such as ${movePreferredSettings} before you finalize the base.`
            : '',
          actionDomain === 'move' && moveEvent?.summary ? moveEvent.summary : '',
          actionDomain === 'relationship' && relationshipCommitmentConditions
            ? `Only move closer after conditions such as ${relationshipCommitmentConditions} are actually visible.`
            : '',
          branchAbortLead ? `If ${branchAbortLead} shows up, slow down before committing.` : '',
          branchRisk ? `If you rush, ${branchRisk}` : '',
          riskCounters ? `On the ${riskLabel} side, reduce ${riskCounters} first.` : ''
        )

  const recommendations =
    lang === 'ko'
      ? buildKoDomainRecommendations(
          actionDomain,
          actionLabel,
          branchAbortLead,
          branchRisk,
          riskLabel
        )
      : [
          `Fix criteria before speed on the ${actionLabel} axis.`,
          branchAbort
            ? `If ${branchAbort} appears, review before committing.`
            : `If ${riskLabel} rises, review before committing.`,
          branchRisk
            ? `Test in small reversible steps so ${branchRisk} does not grow.`
            : `Use small reversible moves instead of one large irreversible decision.`,
        ]

  const sharedConclusion =
    lang === 'ko'
      ? paragraph(
          `${focusLabel}이 배경 압력축이고 ${actionLabel}이 현재 실행축입니다.`,
          `${reportCore.topDecisionLabel || reportCore.primaryAction} 쪽으로 순서를 잡는 사람이 이 구간을 더 안정적으로 통과합니다.`,
          reportCore.riskControl
        )
      : paragraph(
          sharedConclusionLeadEn,
          actionDomain === 'career'
            ? 'The cleaner path comes from tightening role definition before commitment.'
            : actionDomain === 'wealth'
              ? 'The cleaner path comes from tightening conditions before you let money move.'
              : actionDomain === 'health'
                ? 'The cleaner path comes from protecting recovery before you ask for more output.'
                : `The person who sequences around ${reportCore.topDecisionLabel || reportCore.primaryAction} will move through this phase more cleanly.`,
          reportCore.riskControl
        )

  const themedActionPlan =
    lang === 'ko'
      ? polishKoThemedActionPlan(
          sharedActionPlan,
          actionDomain,
          actionLabel,
          reportCore.topDecisionLabel || reportCore.primaryAction
        )
      : sharedActionPlan

  const themedConclusion =
    lang === 'ko'
      ? polishKoThemedConclusion(
          sharedConclusion,
          actionDomain,
          focusLabel,
          actionLabel,
          reportCore.topDecisionLabel || reportCore.primaryAction
        )
      : sharedConclusion

  const relationshipDeepAnalysis =
    lang === 'ko' ? refineKoRelationshipNarrative(sharedDeepAnalysis) : sharedDeepAnalysis
  const relationshipTiming =
    lang === 'ko' ? refineKoRelationshipNarrative(sharedTiming) : sharedTiming
  const relationshipActionPlan =
    lang === 'ko' ? refineKoRelationshipNarrative(themedActionPlan) : themedActionPlan
  const relationshipConclusion =
    lang === 'ko' ? refineKoRelationshipNarrative(themedConclusion) : themedConclusion

  switch (theme) {
    case 'love':
      return {
        deepAnalysis: paragraph(
          relationshipDeepAnalysis,
          relationshipProfile?.summary,
          relationshipAdvisory?.thesis ||
            (lang === 'ko'
              ? '관계는 감정 강도보다 답장 간격과 생활 리듬이 맞을 때 더 오래 안정됩니다.'
              : 'Relationships become stable when interpretation and daily rhythm align better than emotional intensity alone.')
        ),
        patterns: paragraph(
          relationshipAdvisory?.caution || conflictSummary,
          relationshipBreakPatterns
            ? lang === 'ko'
              ? `특히 ${relationshipBreakPatterns} 같은 패턴이 반복되면 관계가 빨리 지치기 쉽습니다.`
              : `Relationship fatigue rises faster when patterns like ${relationshipBreakPatterns} repeat.`
            : '',
          lang === 'ko'
            ? '지금 관계는 답장 간격과 만나는 빈도를 먼저 맞춰야 다음 단계로 부드럽게 넘어갑니다.'
            : 'This relationship phase favors aligning pace and expectation before moving closer quickly.'
        ),
        timing: relationshipTiming,
        compatibility: paragraph(
          relationshipPartnerPatterns
            ? lang === 'ko'
              ? `잘 맞는 상대상은 ${relationshipPartnerPatterns} 쪽으로 더 선명합니다.`
              : `The stronger partner fit is more visible through patterns such as ${relationshipPartnerPatterns}.`
            : '',
          relationshipStabilizers
            ? lang === 'ko'
              ? `관계를 안정시키는 조건은 ${relationshipStabilizers} 쪽에 가깝습니다.`
              : `Relationship stability comes closer to ${relationshipStabilizers}.`
            : '',
          lang === 'ko'
            ? '더 강한 궁합은 강렬함보다 답장 간격과 생활 리듬이 맞는 쪽에서 나옵니다.'
            : 'The stronger match is based more on pace and boundaries than intensity.',
          evidenceSummary
        ),
        spouseProfile: paragraph(
          relationshipInflowPaths
            ? lang === 'ko'
              ? `인연 유입은 ${relationshipInflowPaths} 같은 생활 동선에서 더 현실적으로 열립니다.`
              : `Partner inflow is more realistic through paths such as ${relationshipInflowPaths}.`
            : '',
          lang === 'ko'
            ? '오래 가는 상대는 자극적인 사람보다 안정적이고 현실적인 사람일 가능성이 큽니다.'
            : 'The longer-lasting partner is steadier and more realistic than merely exciting.',
          relationshipEvent?.summary,
          relationshipAdvisory?.action
        ),
        marriageTiming: paragraph(
          sharedTiming,
          relationshipCommitmentConditions
            ? lang === 'ko'
              ? `관계 확정은 ${relationshipCommitmentConditions} 같은 조건이 실제로 맞을 때 더 강해집니다.`
              : `Commitment timing becomes stronger when conditions like ${relationshipCommitmentConditions} are actually met.`
            : '',
          lang === 'ko'
            ? '신뢰와 일상 적합도가 함께 올라올 때 관계 확정 타이밍도 강해집니다.'
            : 'Commitment timing strengthens when trust and daily fit rise together.'
        ),
        recommendations,
        actionPlan: relationshipActionPlan,
        conclusion: relationshipConclusion,
      } as ThemedReportSections
    case 'career':
      return {
        deepAnalysis: paragraph(
          sharedDeepAnalysis,
          careerAdvisory?.thesis ||
            (lang === 'ko'
              ? '커리어는 일을 더 많이 벌이는 사람보다 역할과 평가 기준을 먼저 고정하는 사람이 유리합니다.'
              : 'Career favors the person who fixes role and evaluation criteria before expanding workload.')
        ),
        patterns: paragraph(
          careerAdvisory?.caution || conflictSummary,
          lang === 'ko'
            ? '지금 커리어는 성급한 확장을 벌주고, 기준을 선명하게 세운 쪽에 보상을 줍니다.'
            : 'Right now career punishes rushed expansion and rewards clearly fixed standards.'
        ),
        timing: sharedTiming,
        strategy: paragraph(
          lang === 'ko'
            ? '전략은 기회를 늘리기보다 역할과 책임선을 먼저 고정하는 데 있습니다.'
            : 'The strategy is to fix role and ownership before chasing more opportunities.',
          actionMoves ? `실제 실행은 ${actionMoves}부터 시작하는 편이 맞습니다.` : ''
        ),
        roleFit: paragraph(
          lang === 'ko'
            ? '더 맞는 역할은 속도전보다 판단, 조율, 운영 감각이 요구되는 자리입니다.'
            : 'The better fit is a role where judgment and coordination matter more than raw speed.',
          structureDetail
        ),
        turningPoints: paragraph(
          lang === 'ko'
            ? '전환점은 기존 방식만으로는 더 이상 충분하지 않을 때 열립니다.'
            : 'Turning points open when the old operating method stops being enough.',
          sharedTiming,
          branchLead
        ),
        recommendations,
        actionPlan: themedActionPlan,
        conclusion: themedConclusion,
      } as ThemedReportSections
    case 'wealth':
      return {
        deepAnalysis: paragraph(
          sharedDeepAnalysis,
          wealthAdvisory?.thesis ||
            (lang === 'ko'
              ? '재정은 큰 상방을 쫓기보다 누수와 조건을 먼저 정리할 때 더 안정적으로 좋아집니다.'
              : 'Wealth improves more reliably by fixing leakage and conditions first than by chasing larger upside.')
        ),
        patterns: paragraph(
          wealthAdvisory?.caution || conflictSummary,
          lang === 'ko'
            ? '상방은 커 보여도 조건이 흐리면 손실과 피로가 함께 커질 수 있습니다.'
            : 'Upside can look large now, but unclear conditions can increase both loss and fatigue.'
        ),
        timing: sharedTiming,
        strategy: paragraph(
          lang === 'ko'
            ? '재정 전략은 금액, 시기, 하방 한도를 문서로 고정하는 것에서 시작합니다.'
            : 'The financial strategy starts by fixing amount, timing, and downside limit in writing.',
          actionDetail
        ),
        incomeStreams: paragraph(
          lang === 'ko'
            ? '새 수익원은 작게 시험하고 반복 가능성이 확인될 때만 남기는 편이 맞습니다.'
            : 'New income streams are better tested small and kept only if repeatable.',
          evidenceSummary
        ),
        riskManagement: paragraph(
          lang === 'ko'
            ? '리스크 관리는 수익 확대보다 손실 한도를 먼저 잠그는 데서 시작합니다.'
            : 'Risk management starts by limiting downside before enlarging return.',
          riskSummary,
          branchAbort ? `또한 ${branchAbort} 신호가 보이면 바로 속도를 낮추세요.` : ''
        ),
        recommendations,
        actionPlan: themedActionPlan,
        conclusion: themedConclusion,
      } as ThemedReportSections
    case 'health':
      return {
        deepAnalysis: paragraph(
          sharedDeepAnalysis,
          healthAdvisory?.thesis ||
            (lang === 'ko'
              ? '건강은 버티는 힘보다 반복 가능한 회복 리듬을 세울 때 더 안정적으로 좋아집니다.'
              : 'Health improves more through repeatable recovery rhythm than endurance alone.')
        ),
        patterns: paragraph(
          healthAdvisory?.caution || conflictSummary,
          lang === 'ko'
            ? '과부하를 초기에 끊지 못하면 작은 피로도 전체 리듬을 흔들 수 있습니다.'
            : 'If overload is not interrupted early, small fatigue can shake the whole rhythm.'
        ),
        timing: sharedTiming,
        prevention: paragraph(
          lang === 'ko'
            ? '예방은 작은 경고 신호에 초기에 반응하는 것에서 시작합니다.'
            : 'Prevention starts by responding to small warning signs early.',
          riskSummary
        ),
        riskWindows: paragraph(
          lang === 'ko'
            ? '리스크 창은 보통 회복이 밀리고 일정 압박이 누적될 때 조용히 열립니다.'
            : 'Risk windows usually open quietly when recovery lags and schedule pressure stacks up.',
          sharedTiming
        ),
        recoveryPlan: paragraph(
          lang === 'ko'
            ? '회복은 강한 한 번의 수정보다 반복 가능한 루틴으로 가져갈 때 더 오래 유지됩니다.'
            : 'Recovery holds better through repeatable routines than a single strong correction.',
          healthAdvisory?.action
        ),
        recommendations,
        actionPlan: themedActionPlan,
        conclusion: themedConclusion,
      } as ThemedReportSections
    case 'family':
      return {
        deepAnalysis: paragraph(
          sharedDeepAnalysis,
          actionDomain === 'move' ? environmentProfile?.summary : relationshipStyle?.summary,
          lang === 'ko'
            ? '가족 문제는 누가 맞는지보다 같은 장면을 같은 기준으로 읽을 때 정리됩니다.'
            : 'Family issues improve more through aligned interpretation than deciding who is right.'
        ),
        patterns: paragraph(
          conflictSummary,
          actionDomain === 'move' && moveDrainSignals
            ? lang === 'ko'
              ? `현재는 ${moveDrainSignals} 같은 생활 마찰이 가족 압박과 겹치기 쉽습니다.`
              : `Right now, friction such as ${moveDrainSignals} can stack with family pressure.`
            : '',
          lang === 'ko'
            ? '역할과 기대치가 암묵적으로 남아 있으면 피로와 서운함이 같이 누적됩니다.'
            : 'If roles and expectations stay implicit, fatigue and resentment accumulate.'
        ),
        timing: sharedTiming,
        dynamics: paragraph(
          lang === 'ko'
            ? '가족 역학은 감정보다 역할과 돌봄 분배를 선명히 할 때 더 많이 바뀝니다.'
            : 'Family dynamics shift more through clear roles and care distribution than emotion alone.',
          structureDetail
        ),
        communication: paragraph(
          relationshipRepairMoves
            ? lang === 'ko'
              ? `대화는 ${relationshipRepairMoves} 같은 수리 방식으로 짧고 분명하게 가져가는 편이 낫습니다.`
              : `Communication works better when it uses repair moves such as ${relationshipRepairMoves}.`
            : '',
          lang === 'ko'
            ? '가족 대화는 같은 장면을 같은 의미로 이해할 때 더 빨리 정리됩니다.'
            : 'Family communication improves when people understand the same scene the same way.',
          actionDetail
        ),
        legacy: paragraph(
          actionDomain === 'move' && moveResetActions
            ? lang === 'ko'
              ? `생활 거점을 ${moveResetActions} 쪽으로 다시 세우는 결정이 가족 리듬에도 오래 남습니다.`
              : `A base reset such as ${moveResetActions} can leave a long effect on family rhythm.`
            : '',
          lang === 'ko'
            ? '가족에 남는 건 한 번의 강한 장면보다 반복되는 패턴일 가능성이 큽니다.'
            : 'What remains in family life is shaped more by repeated patterns than one intense moment.',
          evidenceSummary
        ),
        recommendations,
        actionPlan: themedActionPlan,
        conclusion: themedConclusion,
      } as ThemedReportSections
  }
}
