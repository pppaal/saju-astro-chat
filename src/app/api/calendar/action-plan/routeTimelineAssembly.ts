import { normalizeMojibakePayload, repairMojibakeText } from '@/lib/text/mojibake'
import type {
  ActionPlanCalendarContext,
  ActionPlanIcpProfile,
  ActionPlanInsights,
  ActionPlanPersonaProfile,
  SlotType,
  SlotWhy,
  TimelineSlot,
  TimelineTone,
} from './route'

type TimelineAssemblyDeps = {
  buildPersonalizationHint: (input: {
    locale: 'ko' | 'en'
    tone: TimelineTone
    icp?: ActionPlanIcpProfile
    persona?: ActionPlanPersonaProfile
  }) => string | null
  pickCategoryByHour: (categories: string[] | undefined, hour: number) => string
  inferSlotTypes: (input: {
    hour: number
    tone: TimelineTone
    category?: string
    note: string
  }) => SlotType[]
  buildSlotWhy: (input: {
    locale: 'ko' | 'en'
    slot: TimelineSlot
    slotTypes: SlotType[]
    category?: string
    calendar?: ActionPlanCalendarContext
    icp?: ActionPlanIcpProfile
    persona?: ActionPlanPersonaProfile
  }) => SlotWhy
  buildSlotGuardrail: (input: {
    locale: 'ko' | 'en'
    slotTypes: SlotType[]
    tone: TimelineTone
    calendar?: ActionPlanCalendarContext
  }) => string
  buildSlotNarrative: (input: {
    locale: 'ko' | 'en'
    hour: number
    tone: TimelineTone
    slotTypes: SlotType[]
    category?: string
    calendar?: ActionPlanCalendarContext
    fallbackNote?: string
    source?: 'rule' | 'rag' | 'hybrid'
  }) => string
  analyzeConfidenceMeta: (input: {
    locale: 'ko' | 'en'
    slot: TimelineSlot
    calendar?: ActionPlanCalendarContext
    baselineConfidence?: number
    why: SlotWhy
  }) => { score: number; reasons: string[] }
  buildActionPlanInsights: (input: {
    locale: 'ko' | 'en'
    timeline: TimelineSlot[]
    calendar?: ActionPlanCalendarContext
    icp?: ActionPlanIcpProfile
    persona?: ActionPlanPersonaProfile
    isPremiumUser: boolean
  }) => ActionPlanInsights
  buildPersonalSummaryTag: (input: {
    locale: 'ko' | 'en'
    icp?: ActionPlanIcpProfile
    persona?: ActionPlanPersonaProfile
  }) => string | null
}

type BuildActionPlanPayloadInput = {
  locale: 'ko' | 'en'
  sourceTimeline: TimelineSlot[]
  calendar?: ActionPlanCalendarContext
  icp?: ActionPlanIcpProfile
  persona?: ActionPlanPersonaProfile
  isPremiumUser: boolean
  baselineConfidence?: number
  intervalMinutes: 30 | 60
}

function buildCanonicalActionPlanLead(input: {
  locale: 'ko' | 'en'
  calendar?: ActionPlanCalendarContext
}): string | null {
  const { locale, calendar } = input
  const canonical = calendar?.canonicalCore
  if (!canonical) return null

  const actionDomain = canonical.actionFocusDomain || canonical.focusDomain
  const timingRow =
    canonical.topTimingWindow ||
    canonical.domainTimingWindows?.find((item) => item.domain === actionDomain) ||
    canonical.domainTimingWindows?.[0]
  const branch =
    canonical.singleSubjectView?.branches?.[0]?.summary ||
    canonical.singleSubjectView?.branches?.[0]?.nextMove ||
    canonical.projections?.branches?.detailLines?.[0] ||
    canonical.projections?.branches?.summary ||
    canonical.projections?.branches?.nextMoves?.[0]
  const domainState =
    canonical.personModel?.domainStateGraph?.find((item) => item.domain === actionDomain) ||
    canonical.personModel?.domainStateGraph?.[0]
  const eventOutlook =
    canonical.personModel?.eventOutlook?.find((item) => item.domain === actionDomain) ||
    canonical.personModel?.eventOutlook?.[0]

  const parts = [
    canonical.singleSubjectView?.directAnswer ||
      canonical.singleSubjectView?.actionAxis?.nowAction ||
      canonical.topDecisionLabel ||
      canonical.primaryAction,
    canonical.singleSubjectView?.timingState?.whyNow ||
      timingRow?.whyNow ||
      timingRow?.timingConflictNarrative,
    domainState?.thesis,
    eventOutlook?.nextMove || branch,
    canonical.riskAxisLabel
      ? locale === 'ko'
        ? `${canonical.riskAxisLabel} 축 리스크를 먼저 관리`
        : `Manage the ${canonical.riskAxisLabel} risk axis first`
      : null,
  ].filter(Boolean)

  if (parts.length === 0) return null
  return repairMojibakeText(parts.join(locale === 'ko' ? ' · ' : ' · ')).trim() || null
}

export function buildActionPlanPayload(
  input: BuildActionPlanPayloadInput,
  deps: TimelineAssemblyDeps
) {
  const {
    locale,
    sourceTimeline,
    calendar,
    icp,
    persona,
    isPremiumUser,
    baselineConfidence,
    intervalMinutes,
  } = input

  const timeline = sourceTimeline.map((slot) => {
    const baseEvidence = (slot.evidenceSummary || []).filter(Boolean)
    const tone = slot.tone ?? 'neutral'
    const personalHint = deps.buildPersonalizationHint({ locale, tone, icp, persona })
    const personalLine = personalHint
      ? locale === 'ko'
        ? `\uac1c\uc778\ud654 \ud3ec\uc778\ud2b8: ${personalHint}`
        : `Personalization point: ${personalHint}`
      : null
    const category = deps.pickCategoryByHour(calendar?.categories, slot.hour)
    const slotTypes = deps.inferSlotTypes({ hour: slot.hour, tone, category, note: slot.note })
    const why = deps.buildSlotWhy({
      locale,
      slot: { ...slot, tone, note: slot.note },
      slotTypes,
      category,
      calendar,
      icp,
      persona,
    })
    const guardrail = deps.buildSlotGuardrail({ locale, slotTypes, tone, calendar })
    const note = deps.buildSlotNarrative({
      locale,
      hour: slot.hour,
      tone,
      slotTypes,
      category,
      calendar,
      fallbackNote: slot.note,
      source: slot.source,
    })
    const confidenceMeta = deps.analyzeConfidenceMeta({
      locale,
      slot: { ...slot, tone, note, slotTypes, why, guardrail },
      calendar,
      baselineConfidence,
      why,
    })

    const common = {
      ...slot,
      note,
      tone,
      slotTypes,
      why,
      guardrail,
      confidence: confidenceMeta.score,
      confidenceReason: confidenceMeta.reasons,
    }

    if (isPremiumUser) {
      const alternativeLine =
        locale === 'ko'
          ? `\ub300\uc548 \ud589\ub3d9: ${
              tone === 'caution'
                ? '\uacb0\uc815 \ubcf4\ub958 \ud6c4 \uccb4\ud06c\ub9ac\uc2a4\ud2b8 \uc810\uac80'
                : '\ud575\uc2ec \ud589\ub3d9 1\uac1c \uc644\ub8cc \ud6c4 \uacb0\uacfc \uae30\ub85d'
            }`
          : `Alternative: ${tone === 'caution' ? 'pause decision and run checklist' : 'complete one key action and log result'}`
      return {
        ...common,
        evidenceSummary: [
          ...baseEvidence.slice(0, 2),
          ...(personalLine ? [personalLine] : []),
          alternativeLine,
        ].slice(0, 4),
      }
    }

    return {
      ...common,
      evidenceSummary: [...baseEvidence.slice(0, 2), ...(personalLine ? [personalLine] : [])].slice(
        0,
        3
      ),
    }
  })

  const insights = deps.buildActionPlanInsights({
    locale,
    timeline,
    calendar,
    icp,
    persona,
    isPremiumUser,
  })

  const summaryParts: string[] = []
  const canonicalLead = buildCanonicalActionPlanLead({ locale, calendar })
  if (canonicalLead) {
    summaryParts.push(canonicalLead)
  }
  if (calendar?.bestTimes?.length) {
    summaryParts.push(
      locale === 'ko'
        ? `\uc88b\uc740 \uc2dc\uac04: ${calendar.bestTimes.slice(0, 2).join(', ')}`
        : `Best times: ${calendar.bestTimes.slice(0, 2).join(', ')}`
    )
  }
  if (calendar?.warnings?.length) {
    summaryParts.push(
      locale === 'ko'
        ? `\uc8fc\uc758: ${calendar.warnings.slice(0, 1).join(', ')}`
        : `Caution: ${calendar.warnings.slice(0, 1).join(', ')}`
    )
  }
  const personalizationTag = deps.buildPersonalSummaryTag({ locale, icp, persona })
  if (personalizationTag) {
    summaryParts.push(personalizationTag)
  }
  return normalizeMojibakePayload({
    timeline,
    summary: repairMojibakeText(summaryParts.join(' · ')) || undefined,
    insights,
    intervalMinutes,
    precisionMode: 'rule',
    isPremiumUser,
  })
}
