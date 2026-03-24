import { apiClient } from '@/lib/api/ApiClient'
import type { ActionPlanCalendarContext, RagContextResponse, TimelineSlot } from './route'

const OPENAI_RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504])

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const tryParseTimelineJson = (
  content: string
): { timeline?: unknown; summary?: unknown } | null => {
  const trimmed = content.trim()
  const fenced = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  const candidates = [trimmed, fenced]
  const firstBrace = fenced.indexOf('{')
  const lastBrace = fenced.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(fenced.slice(firstBrace, lastBrace + 1))
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as { timeline?: unknown; summary?: unknown }
    } catch {
      continue
    }
  }
  return null
}

type PrecisionTimelineDeps = {
  extractHoursFromText: (value: string) => number[]
  getEffectiveCalendarGrade: (calendar?: ActionPlanCalendarContext) => number
  getEffectiveCalendarScore: (calendar?: ActionPlanCalendarContext) => number | undefined
  getMatrixPacket: (calendar?: ActionPlanCalendarContext) => unknown
  summarizeMatrixPacketForPrompt: (packet: unknown, locale: 'ko' | 'en') => string
  summarizeMatrixVerdictForPrompt: (
    calendar: ActionPlanCalendarContext | undefined,
    locale: 'ko' | 'en'
  ) => string
  cleanGuidanceText: (value: string, maxLength?: number) => string
  clampPercent: (value: number) => number
}

function sanitizeTimelineForInterval(
  raw: unknown,
  intervalMinutes: 30 | 60,
  deps: Pick<PrecisionTimelineDeps, 'cleanGuidanceText' | 'clampPercent'>
): TimelineSlot[] {
  if (!Array.isArray(raw)) return []
  const cleaned: TimelineSlot[] = []
  const dedupe = new Set<string>()
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const hour = Number((item as { hour?: unknown }).hour)
    const minuteRaw = (item as { minute?: unknown }).minute
    const minute = minuteRaw === undefined ? 0 : Number(minuteRaw)
    const noteRaw = (item as { note?: unknown }).note
    const note = typeof noteRaw === 'string' ? deps.cleanGuidanceText(noteRaw, 140) : ''
    const toneRaw = (item as { tone?: unknown }).tone
    const tone =
      toneRaw === 'best' || toneRaw === 'caution' || toneRaw === 'neutral' ? toneRaw : undefined
    const evidenceRaw = (item as { evidenceSummary?: unknown }).evidenceSummary
    const evidenceSummary = Array.isArray(evidenceRaw)
      ? evidenceRaw
          .map((line) => (typeof line === 'string' ? deps.cleanGuidanceText(line, 120) : ''))
          .filter(Boolean)
          .slice(0, 3)
      : undefined
    const confidenceRaw = (item as { confidence?: unknown }).confidence
    const confidence =
      typeof confidenceRaw === 'number' && Number.isFinite(confidenceRaw)
        ? deps.clampPercent(confidenceRaw)
        : undefined

    if (!Number.isInteger(hour) || hour < 0 || hour > 23) continue
    if (!Number.isInteger(minute) || (minute !== 0 && minute !== 30)) continue
    const normalizedMinute = intervalMinutes === 60 ? 0 : minute
    if (!note) continue
    const key = `${hour}:${normalizedMinute}`
    if (dedupe.has(key)) continue
    dedupe.add(key)

    cleaned.push({
      hour,
      minute: normalizedMinute,
      note,
      tone,
      evidenceSummary,
      confidence,
      source: 'rag',
    })
  }
  return cleaned
}

async function fetchCalendarRagContext(input: {
  locale: 'ko' | 'en'
  category?: string
  recommendations?: string[]
  warnings?: string[]
  sajuFactors?: string[]
  astroFactors?: string[]
}): Promise<string> {
  const firstSaju = input.sajuFactors?.[0]
  const firstAstro = input.astroFactors?.[0]
  const eventType = input.category || 'general'
  const query = [
    firstSaju,
    firstAstro,
    ...(input.recommendations || []).slice(0, 1),
    ...(input.warnings || []).slice(0, 1),
  ]
    .filter(Boolean)
    .join(' / ')

  try {
    const response = await apiClient.post(
      '/api/prediction/rag-context',
      {
        sipsin: firstSaju,
        event_type: eventType,
        query,
        locale: input.locale,
      },
      { timeout: 8000 }
    )
    if (!response.ok) return ''
    const data = response.data as RagContextResponse
    const rag = data.rag_context
    if (!rag) return ''
    return [rag.sipsin, rag.timing, rag.query_result, ...(rag.insights || []).slice(0, 2)]
      .filter(Boolean)
      .join('\n')
      .slice(0, 1200)
  } catch {
    return ''
  }
}

function buildCoreSlots(
  input: Pick<
    GeneratePrecisionTimelineInput,
    'baseTimeline' | 'calendar'
  >,
  deps: Pick<PrecisionTimelineDeps, 'extractHoursFromText' | 'getEffectiveCalendarGrade'>
) {
  const bestHours = new Set<number>()
  input.calendar?.bestTimes?.forEach((time) => {
    deps.extractHoursFromText(time).forEach((hour) => bestHours.add(hour))
  })
  const cautionHours = new Set<number>()
  input.calendar?.warnings?.forEach((warning) => {
    deps.extractHoursFromText(warning).forEach((hour) => cautionHours.add(hour))
  })
  if (deps.getEffectiveCalendarGrade(input.calendar) >= 3) {
    cautionHours.add(13)
    cautionHours.add(21)
  }

  const coreSlots: Array<{ hour: number; minute: number }> = []
  const seenCore = new Set<string>()
  for (const slot of input.baseTimeline) {
    const isCore = bestHours.has(slot.hour) || cautionHours.has(slot.hour)
    if (!isCore) continue
    const key = `${slot.hour}:${slot.minute ?? 0}`
    if (seenCore.has(key)) continue
    seenCore.add(key)
    coreSlots.push({ hour: slot.hour, minute: slot.minute ?? 0 })
    if (coreSlots.length >= 5) break
  }
  if (coreSlots.length === 0) {
    const fallbackHours = [10, 15, 21]
    for (const hour of fallbackHours) {
      const slot = input.baseTimeline.find((candidate) => candidate.hour === hour)
      if (!slot) continue
      const key = `${slot.hour}:${slot.minute ?? 0}`
      if (seenCore.has(key)) continue
      seenCore.add(key)
      coreSlots.push({ hour: slot.hour, minute: slot.minute ?? 0 })
      if (coreSlots.length >= 3) break
    }
  }
  return coreSlots
}

type GeneratePrecisionTimelineInput = {
  date: string
  locale: 'ko' | 'en'
  intervalMinutes: 30 | 60
  baseTimeline: TimelineSlot[]
  calendar?: ActionPlanCalendarContext
}

export async function generatePrecisionTimelineWithRag(
  input: GeneratePrecisionTimelineInput,
  deps: PrecisionTimelineDeps
): Promise<{
  timeline: TimelineSlot[] | null
  summary?: string
  errorReason?: string
  debug?: string
}> {
  const openAiKey = process.env.OPENAI_API_KEY
  if (!openAiKey) return { timeline: null, errorReason: 'missing_openai_api_key' }

  const coreSlots = buildCoreSlots(input, deps)
  if (coreSlots.length === 0) {
    return { timeline: null, errorReason: 'no_core_slots' }
  }

  const ragContext = await fetchCalendarRagContext({
    locale: input.locale,
    category: input.calendar?.categories?.[0],
    recommendations: input.calendar?.recommendations,
    warnings: input.calendar?.warnings,
    sajuFactors: input.calendar?.sajuFactors,
    astroFactors: input.calendar?.astroFactors,
  })
  const matrixPacketSummary = deps.summarizeMatrixPacketForPrompt(
    deps.getMatrixPacket(input.calendar),
    input.locale
  )
  const matrixVerdictSummary = deps.summarizeMatrixVerdictForPrompt(input.calendar, input.locale)

  const systemPrompt = `You are a schedule optimization coach. Refine the base timeline with higher precision while preserving the requested locale.
Output must be valid JSON:
{"timeline":[{"hour":0-23,"minute":0|30,"note":"short sentence","tone":"best|caution|neutral"}],"summary":"one line"}
Rules:
1) note <= 140 chars.
2) No hype. Include one concrete action plus one brief reason.
3) Use tone=caution for risk windows and tone=best for focus windows.
4) If intervalMinutes=60, use minute=0 only.
5) If matrix_packet exists, align note wording to that claim/anchor/phase before adding general advice.`

  const userPrompt = JSON.stringify({
    date: input.date,
    locale: input.locale,
    intervalMinutes: input.intervalMinutes,
    coreSlots,
    calendar: {
      grade: deps.getEffectiveCalendarGrade(input.calendar),
      score: deps.getEffectiveCalendarScore(input.calendar),
      categories: input.calendar?.categories?.slice(0, 2),
      bestTimes: input.calendar?.bestTimes?.slice(0, 2),
      warnings: input.calendar?.warnings?.slice(0, 2),
      recommendations: input.calendar?.recommendations?.slice(0, 2),
      summary: input.calendar?.summary,
      evidence: input.calendar?.evidence,
      matrixPacketSummary,
      matrixVerdictSummary,
    },
    ragContext,
    baseTimeline: input.baseTimeline
      .filter((slot) =>
        coreSlots.some((core) => core.hour === slot.hour && core.minute === (slot.minute ?? 0))
      )
      .map((slot) => ({
        hour: slot.hour,
        minute: slot.minute ?? 0,
        note: slot.note,
        tone: slot.tone ?? 'neutral',
        evidenceSummary: slot.evidenceSummary?.slice(0, 2),
      })),
  })

  try {
    let response: Response | null = null
    let responseBody = ''
    const maxAttempts = 2
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.3,
          response_format: { type: 'json_object' },
          max_tokens: 1600,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      })

      if (response.ok) break

      responseBody = await response.text().catch(() => '')
      if (!OPENAI_RETRYABLE_STATUS.has(response.status) || attempt >= maxAttempts) {
        return {
          timeline: null,
          errorReason: `openai_http_${response.status}`,
          debug: responseBody.slice(0, 240),
        }
      }
      await sleep(250 * attempt)
    }

    if (!response || !response.ok) {
      return {
        timeline: null,
        errorReason: 'openai_no_response',
        debug: responseBody.slice(0, 240),
      }
    }

    const payload = await response.json()
    const content = payload?.choices?.[0]?.message?.content
    if (!content || typeof content !== 'string') {
      return { timeline: null, errorReason: 'openai_empty_content' }
    }
    const parsed = tryParseTimelineJson(content)
    if (!parsed) {
      return {
        timeline: null,
        errorReason: 'openai_invalid_json',
        debug: content.slice(0, 240),
      }
    }

    const timeline = sanitizeTimelineForInterval(parsed.timeline, input.intervalMinutes, deps)
    if (timeline.length === 0) {
      return { timeline: null, errorReason: 'openai_empty_timeline' }
    }

    const coreKeySet = new Set(coreSlots.map((slot) => `${slot.hour}:${slot.minute}`))
    const patchMap = new Map<string, TimelineSlot>()
    timeline.forEach((slot) => {
      const key = `${slot.hour}:${slot.minute ?? 0}`
      if (coreKeySet.has(key)) {
        patchMap.set(key, slot)
      }
    })

    const merged = input.baseTimeline.map((slot) => {
      const patch = patchMap.get(`${slot.hour}:${slot.minute ?? 0}`)
      if (!patch) return slot
      return {
        ...slot,
        note: patch.note,
        tone: patch.tone || slot.tone,
        evidenceSummary:
          patch.evidenceSummary && patch.evidenceSummary.length > 0
            ? patch.evidenceSummary.slice(0, 2)
            : slot.evidenceSummary,
        confidence: typeof patch.confidence === 'number' ? patch.confidence : slot.confidence,
        source: 'hybrid' as const,
      }
    })

    const summary = typeof parsed.summary === 'string' ? parsed.summary.slice(0, 240) : undefined
    return { timeline: merged, summary }
  } catch (error) {
    return {
      timeline: null,
      errorReason: 'openai_exception',
      debug: error instanceof Error ? error.message.slice(0, 240) : String(error).slice(0, 240),
    }
  }
}
