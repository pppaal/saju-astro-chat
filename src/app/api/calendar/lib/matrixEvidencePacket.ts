import type { CalendarCoreAdapterResult } from '@/lib/destiny-matrix/core/adapters'

export interface CalendarMatrixEvidencePacket {
  focusDomain: string
  verdict: string
  guardrail: string
  topClaims: Array<{
    id: string
    text: string
  }>
  topAnchorSummary: string
  strategyBrief?: {
    overallPhase: string
    overallPhaseLabel: string
    attackPercent: number
    defensePercent: number
  }
  topTimingWindow?: {
    window: string
    whyNow: string
    entryConditions: string[]
    abortConditions: string[]
  }
}

export type CalendarMatrixEvidencePacketMap = Record<string, CalendarMatrixEvidencePacket>

const PACKET_DOMAIN_BY_THEME = {
  career: 'career',
  love: 'relationship',
  wealth: 'wealth',
  health: 'health',
  today: null,
  general: null,
} as const

function pickTimingWindow(
  core: CalendarCoreAdapterResult,
  domain: string | null
): CalendarCoreAdapterResult['domainTimingWindows'][number] | undefined {
  if (domain) {
    const direct = core.domainTimingWindows.find((item) => item.domain === domain)
    if (direct) return direct
  }
  return core.domainTimingWindows.find((item) => item.domain === core.actionFocusDomain) || core.domainTimingWindows[0]
}

function pickAdvisory(
  core: CalendarCoreAdapterResult,
  domain: string | null
): CalendarCoreAdapterResult['advisories'][number] | undefined {
  if (domain) {
    const direct = core.advisories.find((item) => item.domain === domain)
    if (direct) return direct
  }
  return core.advisories.find((item) => item.domain === core.actionFocusDomain) || core.advisories[0]
}

export function buildCalendarMatrixEvidencePacketMap(
  core: CalendarCoreAdapterResult
): CalendarMatrixEvidencePacketMap {
  const out: CalendarMatrixEvidencePacketMap = {}

  for (const key of Object.keys(PACKET_DOMAIN_BY_THEME) as Array<keyof typeof PACKET_DOMAIN_BY_THEME>) {
    const domain = PACKET_DOMAIN_BY_THEME[key]
    const timing = pickTimingWindow(core, domain)
    const advisory = pickAdvisory(core, domain)

    out[key] = {
      focusDomain: domain || core.focusDomain,
      verdict: advisory?.thesis || core.thesis,
      guardrail: advisory?.caution || core.primaryCaution || core.riskControl,
      topClaims: [
        {
          id: core.claimIds[0] || 'core-thesis',
          text: advisory?.thesis || core.thesis,
        },
      ],
      topAnchorSummary:
        core.projections.evidence.detailLines[0] ||
        core.projections.evidence.summary ||
        core.gradeReason,
      strategyBrief: {
        overallPhase: core.phase,
        overallPhaseLabel: core.phaseLabel,
        attackPercent: core.attackPercent,
        defensePercent: core.defensePercent,
      },
      topTimingWindow: timing
        ? {
            window: timing.window,
            whyNow: timing.whyNow,
            entryConditions: timing.entryConditions || [],
            abortConditions: timing.abortConditions || [],
          }
        : undefined,
    }
  }

  return out
}
