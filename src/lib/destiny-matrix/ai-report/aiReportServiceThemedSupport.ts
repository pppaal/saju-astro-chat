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
  const branchAbort = clean((firstBranch?.abort || []).join(', '))
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
  const actionMoves = listText(projections?.action?.nextMoves)
  const riskCounters = listText(projections?.risk?.counterweights)
  const structureDrivers = listText(projections?.structure?.drivers)

  const sharedDeepAnalysis =
    lang === 'ko'
      ? paragraph(
          `${focusLabel}? ?? ??? ???, ?? ??? ???? ? ?? ${actionLabel}???.`,
          structureSummary || structureDetail,
          structureDrivers ? `${actionLabel} ??? ??? ???? ??? ${structureDrivers}???.` : '',
          `${riskLabel} ??? ?? ???? ?? ??? ???? ????.`
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
          timingDrivers ? `${actionLabel} ???? ??? ?? ??? ${timingDrivers}???.` : '',
          branchEntry ? `??? ${branchEntry}` : ''
        )
      : paragraph(
          timingSummary || timingDetail,
          windowNarrative,
          matrixSummary,
          timingDrivers ? `${actionLabel} timing is being pushed by ${timingDrivers}.` : '',
          branchEntry ? `For now, ${branchEntry}` : ''
        )

  const sharedActionPlan =
    lang === 'ko'
      ? paragraph(
          `?? ${actionLabel}?? ?? ?? ?? ??? ${reportCore.topDecisionLabel || reportCore.primaryAction}???.`,
          actionDetail,
          actionMoves ? `?? ??? ${actionMoves}?? ??? ???? ?? ????.` : '',
          branchAbort ? `${branchAbort} ??? ??? ?? ???? ?? ?? ???? ???.` : '',
          branchRisk ? `???? ${branchRisk}` : '',
          riskCounters ? `${riskLabel} ???? ${riskCounters}?? ?? ???? ?? ?????.` : ''
        )
      : paragraph(
          `On the ${actionLabel} axis, ${actionSummary || reportCore.topDecisionLabel || reportCore.primaryAction} is the base operating rule.`,
          actionDetail,
          actionMoves ? `The next practical move is ${actionMoves}.` : '',
          branchAbort ? `If ${branchAbort} shows up, slow down before committing.` : '',
          branchRisk ? `If you rush, ${branchRisk}` : '',
          riskCounters ? `On the ${riskLabel} side, reduce ${riskCounters} first.` : ''
        )

  const recommendations =
    lang === 'ko'
      ? [
          `${actionLabel}??? ???? ??? ???? ?? ????.`,
          branchAbort
            ? `${branchAbort} ??? ??? ?? ??? ?? ???? ???.`
            : `${riskLabel} ??? ??? ???? ???? ?????.`,
          branchRisk
            ? `${branchRisk} ?? ??? ??? ??? ?? ??? ??? ? ??? ?? ????.`
            : `? ?? ?? ?????? ??? ? ?? ?? ???? ???? ?? ????.`,
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

  switch (theme) {
    case 'love':
      return {
        deepAnalysis: paragraph(
          sharedDeepAnalysis,
          relationshipAdvisory?.thesis ||
            (lang === 'ko'
              ? '??? ??? ???? ??? ??? ?? ??? ?? ? ????? ?????.'
              : 'Relationships become stable when interpretation and daily rhythm align better than emotional intensity alone.')
        ),
        patterns: paragraph(
          relationshipAdvisory?.caution || conflictSummary,
          lang === 'ko'
            ? '?? ?? ??? ??? ????? ??? ???? ??? ?? ??? ?? ?? ?????.'
            : 'This relationship phase favors aligning pace and expectation before moving closer quickly.'
        ),
        timing: sharedTiming,
        compatibility: paragraph(
          lang === 'ko'
            ? '? ?? ??? ??? ???? ?? ??? ?? ??? ??? ?????.'
            : 'The stronger match is based more on pace and boundaries than intensity.',
          evidenceSummary
        ),
        spouseProfile: paragraph(
          lang === 'ko'
            ? '?? ?? ??? ?? ??? ? ???? ???? ?? ??? ?? ?? ? ?? ?? ?? ?????.'
            : 'The longer-lasting partner is steadier and more realistic than merely exciting.',
          relationshipAdvisory?.action
        ),
        marriageTiming: paragraph(
          sharedTiming,
          lang === 'ko'
            ? '???? ??? ??? ?? ??? ??? ?? ??? ?? ?? ? ? ?????.'
            : 'Commitment timing strengthens when trust and daily fit rise together.'
        ),
        recommendations,
        actionPlan: sharedActionPlan,
      }
    case 'career':
      return {
        deepAnalysis: paragraph(
          sharedDeepAnalysis,
          careerAdvisory?.thesis ||
            (lang === 'ko'
              ? '???? ? ?? ?? ??? ???? ??? ?? ??? ?? ???? ??? ??? ??? ?????.'
              : 'Career favors the person who fixes role and evaluation criteria before expanding workload.')
        ),
        patterns: paragraph(
          careerAdvisory?.caution || conflictSummary,
          lang === 'ko'
            ? '?? ???? ??? ????? ???? ??? ???, ??? ?? ??? ??? ?? ?????.'
            : 'Right now career punishes rushed expansion and rewards clearly fixed standards.'
        ),
        timing: sharedTiming,
        strategy: paragraph(
          lang === 'ko'
            ? '??? ??? ??? ? ?? ?? ?? ???, ?? ??? ??? ??? ?? ???? ? ????.'
            : 'The strategy is to fix role and ownership before chasing more opportunities.',
          actionDetail,
          actionMoves ? `?????? ${actionMoves}?? ???? ?? ????.` : ''
        ),
        roleFit: paragraph(
          lang === 'ko'
            ? '? ?? ??? ??? ???? ???? ??, ??, ?? ??? ??? ?????.'
            : 'The better fit is a role where judgment and coordination matter more than raw speed.',
          structureDetail
        ),
        turningPoints: paragraph(
          lang === 'ko'
            ? '???? ? ? ??? ?? ?? ???, ?? ????? ?? ??? ? ??? ??? ???? ? ????.'
            : 'Turning points open when the old operating method stops being enough.',
          sharedTiming,
          branchLead
        ),
        recommendations,
        actionPlan: sharedActionPlan,
      }
    case 'wealth':
      return {
        deepAnalysis: paragraph(
          sharedDeepAnalysis,
          wealthAdvisory?.thesis ||
            (lang === 'ko'
              ? '??? ?? ?? ????, ?? ??? ?? ?? ??? ???? ??? ?? ????? ?????.'
              : 'Wealth improves more reliably by fixing leakage and conditions first than by chasing larger upside.')
        ),
        patterns: paragraph(
          wealthAdvisory?.caution || conflictSummary,
          lang === 'ko'
            ? '??? ?? ??? ??? ?? ??, ?? ?? ???? ??? ??? ?? ??? ? ????.'
            : 'Upside can look large now, but unclear conditions can increase both loss and fatigue.'
        ),
        timing: sharedTiming,
        strategy: paragraph(
          lang === 'ko'
            ? '?? ??? ??? ??, ??, ?? ??? ?? ?? ?? ? ????.'
            : 'The financial strategy starts by fixing amount, timing, and downside limit in writing.',
          actionDetail
        ),
        incomeStreams: paragraph(
          lang === 'ko'
            ? '? ???? ?? ? ? ?? ????, ?? ???? ?? ??? ??? ??? ??? ? ????.'
            : 'New income streams are better tested small and kept only if repeatable.',
          evidenceSummary
        ),
        riskManagement: paragraph(
          lang === 'ko'
            ? '??? ??? ??? ??? ??? ??? ???? ??? ?? ??? ?? ?????.'
            : 'Risk management starts by limiting downside before enlarging return.',
          riskSummary,
          branchAbort ? `?? ${branchAbort} ?? ??? ??? ?? ??? ???.` : ''
        ),
        recommendations,
        actionPlan: sharedActionPlan,
      }
    case 'health':
      return {
        deepAnalysis: paragraph(
          sharedDeepAnalysis,
          healthAdvisory?.thesis ||
            (lang === 'ko'
              ? '??? ??? ??? ?? ??? ??? ?? ???? ?? ?? ?????.'
              : 'Health improves more through repeatable recovery rhythm than endurance alone.')
        ),
        patterns: paragraph(
          healthAdvisory?.caution || conflictSummary,
          lang === 'ko'
            ? '???? ??? ?? ??? ?? ??? ?? ??? ?? ?? ??? ?? ? ????.'
            : 'If overload is not interrupted early, small fatigue can shake the whole rhythm.'
        ),
        timing: sharedTiming,
        prevention: paragraph(
          lang === 'ko'
            ? '??? ??? ? ??? ?? ?? ?? ?? ??? ?? ??? ????.'
            : 'Prevention starts by responding to small warning signs early.',
          riskSummary
        ),
        riskWindows: paragraph(
          lang === 'ko'
            ? '?? ??? ??? ??????, ??? ???? ?? ??? ???? ??? ??? ??? ????.'
            : 'Risk windows usually open quietly when recovery lags and schedule pressure stacks up.',
          sharedTiming
        ),
        recoveryPlan: paragraph(
          lang === 'ko'
            ? '??? ?? ?? ? ???, ?????????? ?? ?? ?? ??? ??? ??? ??? ? ?? ? ????.'
            : 'Recovery holds better through repeatable routines than a single strong correction.',
          healthAdvisory?.action
        ),
        recommendations,
        actionPlan: sharedActionPlan,
      }
    case 'family':
      return {
        deepAnalysis: paragraph(
          sharedDeepAnalysis,
          lang === 'ko'
            ? '?? ??? ?? ????? ??? ?? ??? ??? ?? ? ???? ? ?????.'
            : 'Family issues improve more through aligned interpretation than deciding who is right.'
        ),
        patterns: paragraph(
          conflictSummary,
          lang === 'ko'
            ? '??? ???? ????? ?? ??? ??? ???? ?? ???? ????.'
            : 'If roles and expectations stay implicit, fatigue and resentment accumulate.'
        ),
        timing: sharedTiming,
        dynamics: paragraph(
          lang === 'ko'
            ? '?? ??? ??? ???? ??? ??, ?? ??? ??? ????? ?? ?? ?????.'
            : 'Family dynamics shift more through clear roles and care distribution than emotion alone.',
          structureDetail
        ),
        communication: paragraph(
          lang === 'ko'
            ? '?? ??? ?? ?? ?? ???, ?? ??? ?? ??? ???? ??? ?? ? ?????.'
            : 'Family communication improves when people understand the same scene the same way.',
          actionDetail
        ),
        legacy: paragraph(
          lang === 'ko'
            ? '??? ?? ?? ? ?? ?? ??? ??? ??? ?? ?????.'
            : 'What remains in family life is shaped more by repeated patterns than one intense moment.',
          evidenceSummary
        ),
        recommendations,
        actionPlan: sharedActionPlan,
      }
  }
}
