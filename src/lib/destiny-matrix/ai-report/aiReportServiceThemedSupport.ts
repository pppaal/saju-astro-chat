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

  const sharedDeepAnalysis =
    lang === 'ko'
      ? paragraph(
          `${focusLabel}이 배경 구조라면, 실제 결과를 바꾸는 전면 축은 ${actionLabel}입니다.`,
          structureSummary || structureDetail,
          structureDrivers ? `${actionLabel} 축을 미는 동력은 ${structureDrivers}입니다.` : '',
          `${riskLabel} 리스크를 같이 관리해야 해석 전체가 흔들리지 않습니다.`
        )
      : paragraph(
          `${focusLabel} forms the background while ${actionLabel} is the front line that actually changes outcomes.`,
          structureSummary || structureDetail,
          structureDrivers ? `${actionLabel} is being supported by ${structureDrivers}.` : '',
          `${riskLabel} must be managed at the same time to keep the whole read stable.`
        )

  const sharedTiming =
    lang === 'ko'
      ? paragraph(
          timingSummary || timingDetail,
          windowNarrative,
          matrixSummary,
          timingDrivers ? `${actionLabel} 타이밍을 밀어주는 조건은 ${timingDrivers}입니다.` : '',
          branchEntry ? `지금 열리는 조건은 ${branchEntry}입니다.` : ''
        )
      : paragraph(
          timingSummary || timingDetail,
          windowNarrative,
          matrixSummary,
          timingDrivers ? `${actionLabel} timing is being pushed by ${timingDrivers}.` : '',
          branchEntryLead ? `Right now, the cleanest entry condition is ${branchEntryLead}.` : ''
        )

  const sharedActionPlan =
    lang === 'ko'
      ? paragraph(
          `지금 ${actionLabel}에서 가장 맞는 기본 자세는 ${reportCore.topDecisionLabel || reportCore.primaryAction}입니다.`,
          actionMoves ? `다음 행동은 ${actionMoves}부터 작게 실행하는 것입니다.` : '',
          branchAbort ? `${branchAbort} 신호가 보이면 확정 전에 속도를 늦추세요.` : '',
          branchRisk ? `서두르면 ${branchRisk}` : '',
          riskCounters ? `${riskLabel} 쪽에서는 ${riskCounters}를 먼저 줄여야 합니다.` : ''
        )
      : paragraph(
          `On the ${actionLabel} axis, ${reportCore.topDecisionLabel || reportCore.primaryAction} is the base operating rule.`,
          `Use this phase to verify scope, pace, and ownership before you lock anything in.`,
          actionMove ? `Start with this move: ${actionMove}` : '',
          branchAbortLead ? `If ${branchAbortLead} shows up, slow down before committing.` : '',
          branchRisk ? `If you rush, ${branchRisk}` : '',
          riskCounters ? `On the ${riskLabel} side, reduce ${riskCounters} first.` : ''
        )

  const recommendations =
    lang === 'ko'
      ? [
          `${actionLabel}에서는 속도보다 기준을 먼저 고정하세요.`,
          branchAbort
            ? `${branchAbort} 신호가 보이면 바로 확정하지 말고 한 번 더 검토하세요.`
            : `${riskLabel} 부담이 올라오면 먼저 검토 모드로 전환하세요.`,
          branchRisk
            ? `${branchRisk}가 커지지 않도록 작은 단위의 가역적 행동으로 시험하세요.`
            : `한 번에 크게 움직이기보다 되돌릴 수 있는 작은 단계로 진행하세요.`,
        ]
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
          `The background pressure axis is ${focusLabel}; the live execution axis is ${actionLabel}.`,
          `The person who sequences around ${reportCore.topDecisionLabel || reportCore.primaryAction} will move through this phase more cleanly.`,
          reportCore.riskControl
        )

  switch (theme) {
    case 'love':
      return {
        deepAnalysis: paragraph(
          sharedDeepAnalysis,
          relationshipAdvisory?.thesis ||
            (lang === 'ko'
              ? '관계는 감정 강도보다 해석과 생활 리듬이 맞을 때 더 오래 안정됩니다.'
              : 'Relationships become stable when interpretation and daily rhythm align better than emotional intensity alone.')
        ),
        patterns: paragraph(
          relationshipAdvisory?.caution || conflictSummary,
          lang === 'ko'
            ? '지금 관계는 속도와 기대치를 먼저 맞춰야 다음 단계로 부드럽게 넘어갑니다.'
            : 'This relationship phase favors aligning pace and expectation before moving closer quickly.'
        ),
        timing: sharedTiming,
        compatibility: paragraph(
          lang === 'ko'
            ? '더 강한 궁합은 강렬함보다 리듬과 경계가 맞는 쪽에서 나옵니다.'
            : 'The stronger match is based more on pace and boundaries than intensity.',
          evidenceSummary
        ),
        spouseProfile: paragraph(
          lang === 'ko'
            ? '오래 가는 상대는 자극적인 사람보다 안정적이고 현실적인 사람일 가능성이 큽니다.'
            : 'The longer-lasting partner is steadier and more realistic than merely exciting.',
          relationshipAdvisory?.action
        ),
        marriageTiming: paragraph(
          sharedTiming,
          lang === 'ko'
            ? '신뢰와 일상 적합도가 함께 올라올 때 관계 확정 타이밍도 강해집니다.'
            : 'Commitment timing strengthens when trust and daily fit rise together.'
        ),
        recommendations,
        actionPlan: sharedActionPlan,
        conclusion: sharedConclusion,
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
        actionPlan: sharedActionPlan,
        conclusion: sharedConclusion,
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
        actionPlan: sharedActionPlan,
        conclusion: sharedConclusion,
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
        actionPlan: sharedActionPlan,
        conclusion: sharedConclusion,
      } as ThemedReportSections
    case 'family':
      return {
        deepAnalysis: paragraph(
          sharedDeepAnalysis,
          lang === 'ko'
            ? '가족 문제는 누가 맞는지보다 같은 장면을 같은 기준으로 읽을 때 정리됩니다.'
            : 'Family issues improve more through aligned interpretation than deciding who is right.'
        ),
        patterns: paragraph(
          conflictSummary,
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
          lang === 'ko'
            ? '가족 대화는 같은 장면을 같은 의미로 이해할 때 더 빨리 정리됩니다.'
            : 'Family communication improves when people understand the same scene the same way.',
          actionDetail
        ),
        legacy: paragraph(
          lang === 'ko'
            ? '가족에 남는 건 한 번의 강한 장면보다 반복되는 패턴일 가능성이 큽니다.'
            : 'What remains in family life is shaped more by repeated patterns than one intense moment.',
          evidenceSummary
        ),
        recommendations,
        actionPlan: sharedActionPlan,
        conclusion: sharedConclusion,
      } as ThemedReportSections
  }
}
