import {
  describeEvidenceConfidence,
  describeExecutionStance,
  describePhaseFlow,
  describeTimingWindowTakeaways,
  describeTimingWindowNarrative,
} from '@/lib/destiny-matrix/interpretation/humanSemantics'
import type { MatrixSnapshot } from './routePromptSupport'

type CounselorUiEvidencePayload = {
  title: string
  summary: string
  bullets: string[]
}

function normalizeCrossEvidenceDomain(value: string | undefined): string | undefined {
  if (!value) return undefined
  switch (value) {
    case 'love':
    case 'family':
    case 'relationship':
      return 'relationship'
    case 'career':
      return 'career'
    case 'wealth':
    case 'money':
      return 'wealth'
    case 'health':
      return 'health'
    case 'move':
      return 'move'
    default:
      return undefined
  }
}

export function collectCrossEvidenceHighlights(
  crossSnapshot: unknown,
  focusDomain?: string,
  limit = 4
): string[] {
  const snapshot =
    crossSnapshot && typeof crossSnapshot === 'object'
      ? (crossSnapshot as Record<string, unknown>)
      : null
  const crossEvidence =
    snapshot?.crossEvidence && typeof snapshot.crossEvidence === 'object'
      ? (snapshot.crossEvidence as Record<string, unknown>)
      : null
  if (!crossEvidence) return []

  const out: string[] = []
  const seen = new Set<string>()
  const pushText = (value: unknown) => {
    if (typeof value !== 'string') return
    const cleaned = value.replace(/\s+/g, ' ').trim()
    if (!cleaned || seen.has(cleaned)) return
    seen.add(cleaned)
    out.push(cleaned)
  }

  const normalizedDomain = normalizeCrossEvidenceDomain(focusDomain)
  const domainMap =
    crossEvidence.domains && typeof crossEvidence.domains === 'object'
      ? (crossEvidence.domains as Record<string, unknown>)
      : null
  if (
    normalizedDomain &&
    domainMap?.[normalizedDomain] &&
    typeof domainMap[normalizedDomain] === 'object'
  ) {
    pushText((domainMap[normalizedDomain] as { crossConclusion?: unknown }).crossConclusion)
  }

  const summary = Array.isArray(crossEvidence.summary) ? crossEvidence.summary : []
  for (const item of summary) {
    if (!normalizedDomain) break
    if (!item || typeof item !== 'object') continue
    const summaryDomain = normalizeCrossEvidenceDomain(
      typeof (item as { domain?: unknown }).domain === 'string'
        ? (item as { domain?: string }).domain
        : undefined
    )
    if (summaryDomain === normalizedDomain) {
      pushText((item as { text?: unknown }).text)
    }
  }

  for (const item of summary) {
    if (out.length >= limit) break
    if (!item || typeof item !== 'object') continue
    pushText((item as { text?: unknown }).text)
  }

  return out.slice(0, limit)
}

export function encodeCounselorUiEvidence(
  snapshot: MatrixSnapshot | null,
  lang: 'ko' | 'en'
): string | null {
  const core = snapshot?.core
  const packet = core?.counselorEvidence
  if (!core || !packet) return null

  const topClaim = (packet.topClaims?.[0]?.text || '').replace(/\s+/g, ' ').trim().slice(0, 140)
  const topAnchor = (packet.topAnchors?.[0]?.summary || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
  const cautionSignal = (packet.selectedSignals || [])
    .find((signal) => signal.polarity === 'caution')
    ?.summary?.replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
  const phase =
    core.overallPhaseLabel?.trim() || packet.strategyBrief?.overallPhaseLabel?.trim() || ''
  const focus = packet.focusDomain?.trim() || ''
  const phaseText = describePhaseFlow(phase, lang)
  const stanceText = describeExecutionStance(core.attackPercent, core.defensePercent, lang)
  const confidenceText = describeEvidenceConfidence(snapshot?.confidenceScore, lang)
  const whyStack = (packet.whyStack || []).slice(0, 3)
  const crossEvidenceHighlights = collectCrossEvidenceHighlights(
    snapshot?.crossEvidenceHighlights,
    packet.focusDomain
  ).slice(0, 2)
  const actionFocus =
    packet.actionFocusDomain?.trim() || packet.canonicalBrief?.actionFocusDomain?.trim() || ''
  const latentTopAxes = (packet.canonicalBrief?.latentTopAxes || []).slice(0, 2)
  const projectionPacket = packet as typeof packet & {
    projections?: {
      structure?: { summary?: string; detailLines?: string[] }
      timing?: { summary?: string; detailLines?: string[] }
      conflict?: { summary?: string; detailLines?: string[] }
      action?: { summary?: string; detailLines?: string[] }
      risk?: { summary?: string; detailLines?: string[] }
    }
  }
  const projectionStructure =
    projectionPacket.projections?.structure?.detailLines?.[0] ||
    projectionPacket.projections?.structure?.summary ||
    ''
  const projectionTiming =
    projectionPacket.projections?.timing?.detailLines?.[0] ||
    projectionPacket.projections?.timing?.summary ||
    ''
  const projectionConflict =
    projectionPacket.projections?.conflict?.detailLines?.[0] ||
    projectionPacket.projections?.conflict?.summary ||
    ''
  const projectionAction =
    projectionPacket.projections?.action?.detailLines?.[0] ||
    projectionPacket.projections?.action?.summary ||
    ''
  const projectionRisk =
    projectionPacket.projections?.risk?.detailLines?.[0] ||
    projectionPacket.projections?.risk?.summary ||
    ''
  const timingTakeaways = packet.topTimingWindow
    ? describeTimingWindowTakeaways({
        domainLabel: focus || packet.topTimingWindow.domain,
        window: packet.topTimingWindow.window,
        whyNow: packet.topTimingWindow.whyNow,
        entryConditions: packet.topTimingWindow.entryConditions,
        abortConditions: packet.topTimingWindow.abortConditions,
        lang,
      })
    : []
  const timingText =
    timingTakeaways[0] ||
    (packet.topTimingWindow
      ? describeTimingWindowNarrative({
          domainLabel: focus || packet.topTimingWindow.domain,
          window: packet.topTimingWindow.window,
          whyNow: packet.topTimingWindow.whyNow,
          entryConditions: packet.topTimingWindow.entryConditions,
          abortConditions: packet.topTimingWindow.abortConditions,
          lang,
        })
      : '')

  const payload: CounselorUiEvidencePayload =
    lang === 'ko'
      ? {
          title: '왜 이런 답변이 나왔는지',
          summary: topClaim || `${focus || '지금 질문'}을 먼저 보기 위해 ${phaseText}`,
          bullets: [
            projectionStructure ? `구조 해석: ${projectionStructure}` : '',
            projectionTiming ? `타이밍 해석: ${projectionTiming}` : '',
            projectionConflict ? `충돌 해석: ${projectionConflict}` : '',
            projectionAction ? `행동 해석: ${projectionAction}` : '',
            projectionRisk ? `리스크 해석: ${projectionRisk}` : '',
            phase ? `현재 흐름: ${phaseText}` : '',
            actionFocus && actionFocus !== focus ? `행동축: 지금 우선 행동축은 ${actionFocus}` : '',
            timingText ? `타이밍 해석: ${timingText}` : '',
            timingTakeaways[1] ? `들어갈 조건: ${timingTakeaways[1]}` : '',
            timingTakeaways[2] ? `늦출 신호: ${timingTakeaways[2]}` : '',
            stanceText ? `실행 감각: ${stanceText}` : '',
            confidenceText ? `근거 상태: ${confidenceText}` : '',
            latentTopAxes.length > 0 ? `핵심 작동층: ${latentTopAxes.join(', ')}` : '',
            ...whyStack.map((line) => `왜 이렇게 보나: ${line}`),
            topAnchor ? `핵심 근거: ${topAnchor}` : '',
            cautionSignal ? `주의 신호: ${cautionSignal}` : '',
          ].filter(Boolean),
        }
      : {
          title: 'Why this answer',
          summary:
            topClaim ||
            `This answer prioritizes ${focus || 'your current concern'} because ${phaseText.toLowerCase()}`,
          bullets: [
            projectionStructure ? `Structure read: ${projectionStructure}` : '',
            projectionTiming ? `Timing read: ${projectionTiming}` : '',
            projectionConflict ? `Conflict read: ${projectionConflict}` : '',
            projectionAction ? `Action read: ${projectionAction}` : '',
            projectionRisk ? `Risk read: ${projectionRisk}` : '',
            phase ? `Current flow: ${phaseText}` : '',
            actionFocus && actionFocus !== focus ? `Action axis: ${actionFocus}` : '',
            timingText ? `Timing read: ${timingText}` : '',
            timingTakeaways[1] ? `Go conditions: ${timingTakeaways[1]}` : '',
            timingTakeaways[2] ? `Slow-down signal: ${timingTakeaways[2]}` : '',
            stanceText ? `Execution stance: ${stanceText}` : '',
            confidenceText ? `Evidence read: ${confidenceText}` : '',
            latentTopAxes.length > 0 ? `Active layers: ${latentTopAxes.join(', ')}` : '',
            ...whyStack.map((line) => `Why this matters: ${line}`),
            topAnchor ? `Primary anchor: ${topAnchor}` : '',
            cautionSignal ? `Caution signal: ${cautionSignal}` : '',
          ].filter(Boolean),
        }

  if (crossEvidenceHighlights.length > 0) {
    const crossBullets = crossEvidenceHighlights.map((line) =>
      lang === 'ko' ? `교차 해석: ${line}` : `Cross read: ${line}`
    )
    payload.bullets = [...payload.bullets, ...crossBullets]
  }

  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}
