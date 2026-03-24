export type AiTimelineSlot = {
  hour: number
  minute?: number
  note: string
  tone?: 'neutral' | 'best' | 'caution'
  slotTypes?: Array<
    'deepWork' | 'decision' | 'communication' | 'money' | 'relationship' | 'recovery'
  >
  why?: {
    signalIds?: string[]
    anchorIds?: string[]
    patterns?: string[]
    summary?: string
  }
  guardrail?: string
  evidenceSummary?: string[]
  confidence?: number
  confidenceReason?: string[]
}

export type ActionPlanPrecisionMode = 'ai-graphrag' | 'rule-fallback' | null

export type ActionPlanInsights = {
  ifThenRules: string[]
  situationTriggers: string[]
  actionFramework: {
    do: string[]
    dont: string[]
    alternative: string[]
  }
  riskTriggers: string[]
  successKpi: string[]
  deltaToday: string
}

export type ActionPlanCacheEntry = {
  timeline: AiTimelineSlot[]
  summary: string | null
  precisionMode: ActionPlanPrecisionMode
  insights: ActionPlanInsights | null
}

type CleanText = (value: string | undefined, fallback?: string) => string

export function sanitizeActionPlanAiTimeline(input: {
  raw: unknown
  cleanText: CleanText
  clampConfidence: (value: number) => number
  isSanitizedSlotType: (value: string) => boolean
}): AiTimelineSlot[] {
  const { raw, cleanText, clampConfidence, isSanitizedSlotType } = input
  if (!Array.isArray(raw)) return []

  const cleaned: AiTimelineSlot[] = []
  raw.forEach((item) => {
    if (!item || typeof item !== 'object') return

    const hour = Number((item as { hour?: unknown }).hour)
    const minuteRaw = (item as { minute?: unknown }).minute
    const minute = minuteRaw === undefined ? 0 : Number(minuteRaw)
    const noteRaw = (item as { note?: unknown }).note
    const note = typeof noteRaw === 'string' ? cleanText(noteRaw, '') : ''
    if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !note) return
    if (!Number.isInteger(minute) || (minute !== 0 && minute !== 30)) return

    const toneValue = (item as { tone?: unknown }).tone
    const tone =
      toneValue === 'best' || toneValue === 'caution' || toneValue === 'neutral'
        ? toneValue
        : undefined

    const evidenceRaw = (item as { evidenceSummary?: unknown }).evidenceSummary
    const evidenceSummary = Array.isArray(evidenceRaw)
      ? evidenceRaw
          .map((line) => (typeof line === 'string' ? cleanText(line, '') : ''))
          .filter(Boolean)
          .slice(0, 3)
      : undefined

    const slotTypesRaw = (item as { slotTypes?: unknown }).slotTypes
    const slotTypes = Array.isArray(slotTypesRaw)
      ? slotTypesRaw
          .map((type) => (typeof type === 'string' ? cleanText(type, '') : ''))
          .filter(isSanitizedSlotType)
          .slice(0, 2) as NonNullable<AiTimelineSlot['slotTypes']>
      : undefined

    const whyRaw = (item as { why?: unknown }).why
    const whySummary =
      whyRaw && typeof whyRaw === 'object'
        ? cleanText((whyRaw as { summary?: unknown }).summary as string | undefined, '')
        : ''
    const whySignalIds =
      whyRaw &&
      typeof whyRaw === 'object' &&
      Array.isArray((whyRaw as { signalIds?: unknown }).signalIds)
        ? ((whyRaw as { signalIds?: unknown }).signalIds as unknown[])
            .map((line) => (typeof line === 'string' ? cleanText(line, '') : ''))
            .filter(Boolean)
            .slice(0, 4)
        : undefined
    const whyAnchorIds =
      whyRaw &&
      typeof whyRaw === 'object' &&
      Array.isArray((whyRaw as { anchorIds?: unknown }).anchorIds)
        ? ((whyRaw as { anchorIds?: unknown }).anchorIds as unknown[])
            .map((line) => (typeof line === 'string' ? cleanText(line, '') : ''))
            .filter(Boolean)
            .slice(0, 3)
        : undefined
    const whyPatterns =
      whyRaw &&
      typeof whyRaw === 'object' &&
      Array.isArray((whyRaw as { patterns?: unknown }).patterns)
        ? ((whyRaw as { patterns?: unknown }).patterns as unknown[])
            .map((line) => (typeof line === 'string' ? cleanText(line, '') : ''))
            .filter(Boolean)
            .slice(0, 3)
        : undefined

    const guardrailRaw = (item as { guardrail?: unknown }).guardrail
    const guardrail = typeof guardrailRaw === 'string' ? cleanText(guardrailRaw, '') : ''
    const confidenceRaw = (item as { confidence?: unknown }).confidence
    const confidence =
      typeof confidenceRaw === 'number' && Number.isFinite(confidenceRaw)
        ? clampConfidence(confidenceRaw)
        : undefined
    const confidenceReasonRaw = (item as { confidenceReason?: unknown }).confidenceReason
    const confidenceReason = Array.isArray(confidenceReasonRaw)
      ? confidenceReasonRaw
          .map((line) => (typeof line === 'string' ? cleanText(line, '') : ''))
          .filter(Boolean)
          .slice(0, 3)
      : undefined

    cleaned.push({
      hour,
      minute,
      note,
      tone,
      slotTypes: slotTypes && slotTypes.length > 0 ? slotTypes : undefined,
      why:
        whySummary || (whySignalIds && whySignalIds.length > 0)
          ? {
              summary: whySummary || undefined,
              signalIds: whySignalIds,
              anchorIds: whyAnchorIds,
              patterns: whyPatterns,
            }
          : undefined,
      guardrail: guardrail || undefined,
      evidenceSummary,
      confidence,
      confidenceReason,
    })
  })

  return cleaned
}

export function sanitizeActionPlanAiInsights(input: {
  raw: unknown
  cleanText: CleanText
}): ActionPlanInsights | null {
  const { raw, cleanText } = input
  if (!raw || typeof raw !== 'object') return null

  const insights = raw as {
    ifThenRules?: unknown
    actionFramework?: {
      do?: unknown
      dont?: unknown
      alternative?: unknown
    }
    riskTriggers?: unknown
    successKpi?: unknown
  }

  const toLines = (value: unknown, max: number) =>
    Array.isArray(value)
      ? value
          .map((line) => (typeof line === 'string' ? cleanText(line, '') : ''))
          .filter(Boolean)
          .slice(0, max)
      : []

  const ifThenRules = toLines(insights.ifThenRules, 4)
  const situationTriggers = toLines((insights as { situationTriggers?: unknown }).situationTriggers, 5)
  const doLines = toLines(insights.actionFramework?.do, 5)
  const dontLines = toLines(insights.actionFramework?.dont, 5)
  const alternativeLines = toLines(insights.actionFramework?.alternative, 5)
  const riskTriggers = toLines(insights.riskTriggers, 5)
  const successKpi = toLines(insights.successKpi, 5)
  const deltaTodayRaw = (insights as { deltaToday?: unknown }).deltaToday
  const deltaToday = typeof deltaTodayRaw === 'string' ? cleanText(deltaTodayRaw, '') : ''

  if (
    ifThenRules.length === 0 &&
    situationTriggers.length === 0 &&
    doLines.length === 0 &&
    dontLines.length === 0 &&
    alternativeLines.length === 0 &&
    riskTriggers.length === 0 &&
    successKpi.length === 0 &&
    !deltaToday
  ) {
    return null
  }

  return {
    ifThenRules,
    situationTriggers,
    actionFramework: {
      do: doLines,
      dont: dontLines,
      alternative: alternativeLines,
    },
    riskTriggers,
    successKpi,
    deltaToday,
  }
}

export function resolveActionPlanPrecisionMode(value: unknown): ActionPlanPrecisionMode {
  return value === 'ai-graphrag' || value === 'rule-fallback' ? value : null
}

export function buildActionPlanAiStatusText(input: {
  isKo: boolean
  hasBaseInfo: boolean
  aiStatus: 'idle' | 'loading' | 'ready' | 'error'
  aiPrecisionMode: ActionPlanPrecisionMode
  aiContextLabel: string
}): string {
  const { isKo, hasBaseInfo, aiStatus, aiPrecisionMode, aiContextLabel } = input
  if (!hasBaseInfo) {
    return isKo ? '날짜 정보 없음' : 'No date data'
  }
  if (aiStatus === 'loading') {
    return isKo ? '정밀 타임라인 생성 중' : 'Generating precision timeline'
  }
  if (aiStatus === 'error') {
    return isKo
      ? '정밀 생성 실패 · 사주+점성 규칙 플랜 표시'
      : 'Precision failed · showing rule-based Saju+Astrology plan'
  }
  if (aiStatus === 'ready' && aiPrecisionMode === 'rule-fallback') {
    return isKo
      ? '규칙 기반 개인화 타임라인 · 사주+점성 근거 적용'
      : 'Rule-based personalized timeline · Saju+Astrology grounded'
  }
  if (aiStatus === 'ready') {
    return isKo
      ? `근거 기반 타임라인 적용 · ${aiContextLabel}`
      : `Evidence-based timeline applied · ${aiContextLabel}`
  }
  return isKo ? '정밀 준비됨' : 'Precision ready'
}

export function buildActionPlanAiButtonLabel(input: {
  isKo: boolean
  aiStatus: 'idle' | 'loading' | 'ready' | 'error'
  hasAiTimeline: boolean
}): string {
  const { isKo, aiStatus, hasAiTimeline } = input
  if (aiStatus === 'loading') {
    return isKo ? '정밀 생성 중' : 'Generating'
  }
  return hasAiTimeline
    ? isKo
      ? '정밀 새로고침'
      : 'Refresh precision'
    : isKo
      ? '정밀 생성'
      : 'Generate precision'
}

export function getActionPlanAiFallbackSummary(isKo: boolean): string {
  return isKo
    ? '정밀 생성이 일시 실패해 규칙 기반 플랜으로 표시합니다.'
    : 'Precision generation failed temporarily. Showing rule-based plan.'
}
