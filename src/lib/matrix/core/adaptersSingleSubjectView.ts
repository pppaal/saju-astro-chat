import type { DestinyCoreResult } from './runDestinyCore'
import { formatPolicyCheckLabels } from './actionCopy'
import type {
  AdapterArbitrationBrief,
  AdapterBranchCandidate,
  AdapterLatentAxis,
  AdapterMatrixViewRow,
  AdapterProjectionSet,
  AdapterSingleSubjectBranch,
  AdapterSingleSubjectPressure,
  AdapterSingleSubjectTimingCell,
  AdapterSingleSubjectView,
  AdapterTimingMatrixRow,
} from './adaptersTypes'
import { getAllowedActionLabels, getTopDecisionLabel, localizeDomain } from './adaptersPresentation'

type BuildSingleSubjectViewParams = {
  core: DestinyCoreResult
  locale: 'ko' | 'en'
  riskAxisDomain: AdapterSingleSubjectView['riskAxis']['domain']
  timingMatrix: AdapterTimingMatrixRow[]
  matrixView: AdapterMatrixViewRow[]
  branchSet: AdapterBranchCandidate[]
  arbitrationBrief: AdapterArbitrationBrief
  latentTopAxes: AdapterLatentAxis[]
  projections: AdapterProjectionSet
}

function hasBatchim(text: string): boolean {
  const trimmed = text.trim()
  const last = trimmed.charCodeAt(trimmed.length - 1)
  if (!Number.isFinite(last) || last < 0xac00 || last > 0xd7a3) return false
  return (last - 0xac00) % 28 !== 0
}

function withObjectParticle(text: string): string {
  return `${text}${hasBatchim(text) ? '을' : '를'}`
}

function buildKoDirectAnswer(
  actionLabel: string,
  bestWindow: string,
  topDecisionLabel: string
): string {
  if (bestWindow === 'now' || bestWindow === '지금') {
    return `${actionLabel}에서는 지금 ${topDecisionLabel}부터 시작하는 쪽이 유리합니다.`
  }
  if (/우선$/.test(topDecisionLabel)) {
    return `${actionLabel}에서는 ${bestWindow} 창을 목표로 ${topDecisionLabel} 전략을 먼저 세우는 쪽이 유리합니다.`
  }
  return `${actionLabel}에서는 ${bestWindow} 창을 목표로 ${withObjectParticle(topDecisionLabel)} 준비하는 쪽이 유리합니다.`
}

function getCellStatus(
  agreement: number,
  contradiction: number
): AdapterSingleSubjectTimingCell['status'] {
  if (agreement >= Math.max(0.58, contradiction + 0.14)) return 'open'
  if (contradiction >= Math.max(0.52, agreement + 0.14)) return 'blocked'
  return 'mixed'
}

function summarizeWhyNotYet(
  locale: 'ko' | 'en',
  abortConditions: string[],
  fallback: string
): string {
  const firstAbort = abortConditions.find(Boolean)
  if (firstAbort) {
    return locale === 'ko'
      ? `${firstAbort} 신호가 남아 있어 서두르기보다 조건 정리가 먼저입니다.`
      : `${firstAbort} is still active, so conditions need to be cleaned up before speed helps.`
  }
  return fallback
}

function buildTimingWindows(
  row: AdapterMatrixViewRow | undefined
): AdapterSingleSubjectTimingCell[] {
  return (row?.cells || []).slice(0, 4).map((cell) => ({
    timescale: cell.timescale,
    status: getCellStatus(cell.agreement, cell.contradiction),
    agreement: cell.agreement,
    contradiction: cell.contradiction,
    leadLag: cell.leadLag,
    summary: cell.summary,
  }))
}

function findNextWindow(cells: AdapterSingleSubjectTimingCell[]): string | undefined {
  const futureCell = cells.find(
    (cell) => cell.timescale !== 'now' && (cell.status === 'open' || cell.status === 'mixed')
  )
  return futureCell?.timescale
}

function buildCompetingPressures(rows: AdapterMatrixViewRow[]): AdapterSingleSubjectPressure[] {
  return rows.slice(0, 4).map((row) => {
    const nowCell = row.cells.find((cell) => cell.timescale === 'now') || row.cells[0]
    const cells = buildTimingWindows(row)
    return {
      domain: row.domain,
      label: row.label,
      status: nowCell ? getCellStatus(nowCell.agreement, nowCell.contradiction) : 'mixed',
      nextWindow: findNextWindow(cells),
      agreement: nowCell?.agreement,
      contradiction: nowCell?.contradiction,
      leadLag: nowCell?.leadLag,
      summary: nowCell?.summary || row.cells[0]?.summary || '',
    }
  })
}

function buildBranches(
  branches: AdapterBranchCandidate[],
  fallbackNextMove: string
): AdapterSingleSubjectBranch[] {
  return branches.slice(0, 3).map((branch, index) => ({
    label: branch.label || `Branch ${index + 1}`,
    summary: branch.summary,
    entryConditions: (branch.entry || []).slice(0, 3),
    abortConditions: (branch.abort || []).slice(0, 3),
    nextMove: branch.sustain?.[0] || branch.entry?.[0] || branch.summary || fallbackNextMove,
  }))
}

export function buildSingleSubjectView({
  core,
  locale,
  riskAxisDomain,
  timingMatrix,
  matrixView,
  branchSet,
  arbitrationBrief,
  latentTopAxes,
  projections,
}: BuildSingleSubjectViewParams): AdapterSingleSubjectView {
  const actionDomain = core.canonical.actionFocusDomain || core.canonical.focusDomain
  const focusDomain = core.canonical.focusDomain
  const actionLabel = localizeDomain(actionDomain, locale)
  const focusLabel = localizeDomain(focusDomain, locale)
  const riskLabel = localizeDomain(riskAxisDomain, locale)
  const topDecisionLabel =
    getTopDecisionLabel(core, locale) ||
    getAllowedActionLabels(
      [core.canonical.topDecision?.action || core.canonical.primaryAction],
      locale
    )[0] ||
    core.canonical.primaryAction

  const actionTimingRow =
    timingMatrix.find((row) => row.domain === actionDomain) ||
    timingMatrix.find((row) => row.domain === focusDomain) ||
    timingMatrix[0]
  const actionMatrixRow =
    matrixView.find((row) => row.domain === actionDomain) ||
    matrixView.find((row) => row.domain === focusDomain) ||
    matrixView[0]
  const actionTimingWindow = core.canonical.domainTimingWindows.find(
    (item) => item.domain === actionDomain
  )
  const timingWindows = buildTimingWindows(actionMatrixRow)
  const bestWindow = actionTimingRow?.window || actionTimingWindow?.window || 'now'
  const actionNextMoves = (projections.action.nextMoves || []).filter(Boolean)
  const nextMove =
    actionNextMoves[0] ||
    topDecisionLabel ||
    core.canonical.primaryAction ||
    core.canonical.primaryCaution
  const hardStops = formatPolicyCheckLabels(core.canonical.judgmentPolicy.hardStops).slice(0, 3)
  const entryConditions = [...(actionTimingWindow?.entryConditions || [])].slice(0, 3)
  const abortConditions = [...(actionTimingWindow?.abortConditions || [])].slice(0, 3)
  const whyNow =
    actionTimingWindow?.whyNow || actionTimingRow?.summary || projections.timing.summary
  const whyNotYet =
    actionTimingWindow?.timingConflictMode && actionTimingWindow.timingConflictMode !== 'aligned'
      ? summarizeWhyNotYet(locale, abortConditions, actionTimingWindow.timingConflictNarrative)
      : abortConditions.length > 0
        ? summarizeWhyNotYet(locale, abortConditions, projections.risk.summary)
        : undefined

  const directAnswer =
    locale === 'ko'
      ? buildKoDirectAnswer(actionLabel, bestWindow, topDecisionLabel)
      : bestWindow === 'now'
        ? `On the ${actionLabel} axis, ${topDecisionLabel} should be the first move now.`
        : `On the ${actionLabel} axis, prepare ${topDecisionLabel} toward the ${bestWindow} window.`

  return {
    directAnswer,
    structureAxis: {
      domain: focusDomain,
      label: focusLabel,
      thesis: projections.structure.summary || core.canonical.thesis,
      topAxes: latentTopAxes.slice(0, 4).map((axis) => axis.label),
    },
    actionAxis: {
      domain: actionDomain,
      label: actionLabel,
      nowAction: nextMove,
      whyThisFirst:
        projections.action.summary ||
        arbitrationBrief.actionNarrative ||
        core.canonical.primaryAction,
    },
    riskAxis: {
      domain: riskAxisDomain,
      label: riskLabel,
      warning:
        projections.risk.summary || core.canonical.primaryCaution || core.canonical.riskControl,
      hardStops,
    },
    timingState: {
      bestWindow,
      whyNow,
      whyNotYet,
      confidence: actionTimingWindow?.confidence ?? core.canonical.confidence,
      windows: timingWindows,
    },
    competingPressures: buildCompetingPressures(matrixView),
    branches: buildBranches(branchSet, nextMove),
    entryConditions,
    abortConditions,
    nextMove,
    confidence: core.canonical.confidence,
    reliability: {
      crossAgreement: core.canonical.crossAgreement,
      contradictionFlags: [...core.canonical.coherenceAudit.contradictionFlags].slice(0, 4),
      notes: [...core.canonical.coherenceAudit.notes].slice(0, 4),
    },
  }
}
