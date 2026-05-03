/**
 * Calendar AI narrative
 *
 * POST /api/calendar/ai-narrative
 * Body: { date, longCycleContext, cycleInteractions, sajuFactors,
 *         astroFactors, transit, lunarMansion, dayRuler, score, grade }
 *
 * Premium-gated: synthesizes the full per-date engine output (대운/세운/
 * 월운/일운, 충합, 12신살, 점성 트랜짓, 28수, 행성지배 etc) into one
 * cohesive 2-3 paragraph reading the user can actually understand
 * without parsing 13 separate sections.
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  apiError,
  apiSuccess,
  ErrorCodes,
  extractLocale,
  withApiMiddleware,
} from '@/lib/api/middleware'
import { createValidationErrorResponse } from '@/lib/api/zodValidation'
import { callClaude, isClaudeAvailable, DEFAULT_CLAUDE_MODEL } from '@/lib/llm/claude'
import { logger } from '@/lib/logger'
import { getCreditBalance } from '@/lib/credits/creditService'
import { cacheOrCalculate, CacheKeys, CACHE_TTL } from '@/lib/cache/redis-cache'

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthDate: z.string().optional(),
  payload: z.record(z.string(), z.unknown()),
})

const SYSTEM_PROMPT = `당신은 사주 + 점성을 통합해 하루를 읽어주는 한국 운세 상담사입니다.

답변 규칙:
- 분량은 2-3 단락. 각 단락은 2-3 문장.
- 첫 단락: 오늘 하루의 큰 결을 한 줄로 요약하고, 본명 일주와 대운/세운/월운이 어떻게 만나는지 자연스러운 한국어로 풀어 설명.
- 두번째 단락: 핵심 포인트(가장 강한 신살·충합·트랜짓)를 1-2개 골라 사용자가 오늘 어떤 행동을 하면 좋고 무엇을 피해야 하는지 구체적으로 제시.
- 세번째 단락(선택): 시간대 추천이나 전환 임박 신호처럼 행동에 직접 도움이 되는 디테일.
- 한자/십신 라벨은 풀어 쓰기. "편관" → "도전적 책임", "정관" → "공식 직책"처럼 평어로.
- 점성 용어는 가능하면 한국어로. "Mercury retrograde" → "수성역행".
- 단정적 예언("반드시 됩니다") 금지. "유리합니다 / 좋습니다 / 한 번 점검하세요" 같은 가능성 톤.
- 마크다운 헤더, 불릿 리스트 사용 금지. 자연스러운 산문.`

export const POST = withApiMiddleware(
  async (request: NextRequest, context) => {
    if (!isClaudeAvailable()) {
      return apiError(ErrorCodes.SERVICE_UNAVAILABLE, 'AI service not configured')
    }
    // Premium gate
    if (!context.userId) {
      return apiError(ErrorCodes.UNAUTHORIZED, 'Login required for AI narrative')
    }
    const balance = await getCreditBalance(context.userId)
    if (!balance || balance.plan === 'free') {
      return apiError(
        ErrorCodes.FORBIDDEN,
        '프리미엄 플랜에서만 AI 요약을 제공합니다.'
      )
    }
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return apiError(ErrorCodes.BAD_REQUEST, 'Invalid JSON')
    }
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return createValidationErrorResponse(parsed.error, {
        locale: extractLocale(request),
        route: 'calendar-ai-narrative',
      })
    }
    const { date, birthDate, payload } = parsed.data

    // Cache by (user, date, payload-hash) so repeated panel opens reuse.
    const payloadKey = JSON.stringify(payload).slice(0, 1024)
    const cacheKey = CacheKeys.calendarAINarrative(
      context.userId,
      date,
      payloadKey
    )
    const text = await cacheOrCalculate(
      cacheKey,
      async () => {
        const userPrompt = buildUserPrompt(date, birthDate, payload)
        try {
          const result = await callClaude({
            systemPrompt: SYSTEM_PROMPT,
            userPrompt,
            maxTokens: 800,
            temperature: 0.6,
            model: DEFAULT_CLAUDE_MODEL,
            label: 'calendar-ai-narrative',
          })
          return result.text.trim()
        } catch (err) {
          logger.warn('[calendar/ai-narrative] Claude call failed', {
            error: err instanceof Error ? err.message : String(err),
          })
          return ''
        }
      },
      CACHE_TTL.CALENDAR_DATA
    )
    if (!text) {
      return apiError(ErrorCodes.SERVICE_UNAVAILABLE, 'AI narrative unavailable')
    }
    return apiSuccess({ date, narrative: text })
  },
  {
    route: 'calendar-ai-narrative',
    requireAuth: true,
    rateLimit: { limit: 30, windowSeconds: 60 },
  }
)

function buildUserPrompt(
  date: string,
  birthDate: string | undefined,
  payload: Record<string, unknown>
): string {
  const lines: string[] = []
  lines.push(`날짜: ${date}`)
  if (birthDate) lines.push(`본인 생년월일: ${birthDate}`)
  // Inline structured data so Claude can compose. Trim sub-objects to
  // keep prompts under ~2k tokens.
  const safe = (v: unknown): unknown => {
    if (v == null) return undefined
    if (Array.isArray(v)) return v.slice(0, 5)
    return v
  }
  const compact: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(payload)) {
    const trimmed = safe(v)
    if (trimmed !== undefined) compact[k] = trimmed
  }
  lines.push('')
  lines.push('아래는 엔진이 뽑은 오늘의 사주·점성 데이터입니다 (raw JSON):')
  lines.push('```json')
  lines.push(JSON.stringify(compact, null, 2))
  lines.push('```')
  lines.push('')
  lines.push(
    '위 데이터를 한국어 산문 2-3 단락으로 풀어 주세요. 사용자가 오늘 무엇을 ' +
      '하면 좋고 무엇을 피해야 하는지 구체적으로 알 수 있게 해주세요.'
  )
  return lines.join('\n')
}
