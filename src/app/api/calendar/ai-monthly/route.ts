/**
 * Calendar AI monthly narrative
 *
 * POST /api/calendar/ai-monthly
 * Body: { year, month, payload }
 *
 * Premium-gated. Synthesizes 한 달 요약 — top good days, caution
 * windows, dominant 흐름 — into 2-3 paragraph Korean prose so users
 * actually read the month rather than scanning a 30-cell grid.
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
  year: z.number().int().min(1900).max(2100),
  month: z.number().int().min(1).max(12),
  payload: z.record(z.string(), z.unknown()),
})

const SYSTEM_PROMPT = `당신은 사주 + 점성을 통합해 한 달의 흐름을 잡아주는 한국 운세 상담사입니다.

답변 규칙:
- 분량은 2-3 단락. 각 단락 2-3 문장.
- 첫 단락: 이번 달 큰 결을 한 문장으로 요약하고, 본명 일주가 월운/세운/대운과 어떻게 만나는지 자연어로 풀어 설명.
- 두번째 단락: 가장 좋은 날 1-2개와 그 이유, 그리고 가장 조심할 날 1개와 그 이유를 구체적으로 제시.
- 세번째 단락(선택): 한 달 전체에 걸친 행동 권유 (어떤 일을 앞쪽에 두고, 어떤 일을 뒤로 밀지).
- 한자/십신 라벨 풀어 쓰기.
- 단정적 예언 금지. "유리합니다 / 점검하세요" 가능성 톤.
- 마크다운/불릿 금지. 자연 산문.`

export const POST = withApiMiddleware(
  async (request: NextRequest, context) => {
    if (!isClaudeAvailable()) {
      return apiError(ErrorCodes.SERVICE_UNAVAILABLE, 'AI service not configured')
    }
    if (!context.userId) {
      return apiError(ErrorCodes.UNAUTHORIZED, 'Login required for AI monthly')
    }
    const balance = await getCreditBalance(context.userId)
    if (!balance || balance.plan === 'free') {
      return apiError(ErrorCodes.FORBIDDEN, '프리미엄 플랜에서만 월간 AI 요약을 제공합니다.')
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
        route: 'calendar-ai-monthly',
      })
    }
    const { year, month, payload } = parsed.data
    const payloadKey = JSON.stringify(payload).slice(0, 1024)
    const cacheKey = CacheKeys.calendarAIMonthly(context.userId, `${year}-${month}`, payloadKey)
    const text = await cacheOrCalculate(
      cacheKey,
      async () => {
        try {
          const userPrompt = buildUserPrompt(year, month, payload)
          const result = await callClaude({
            systemPrompt: SYSTEM_PROMPT,
            userPrompt,
            maxTokens: 800,
            temperature: 0.6,
            model: DEFAULT_CLAUDE_MODEL,
            label: 'calendar-ai-monthly',
          })
          return result.text.trim()
        } catch (err) {
          logger.warn('[calendar/ai-monthly] Claude call failed', {
            error: err instanceof Error ? err.message : String(err),
          })
          return ''
        }
      },
      CACHE_TTL.CALENDAR_DATA
    )
    if (!text) {
      return apiError(ErrorCodes.SERVICE_UNAVAILABLE, 'AI monthly unavailable')
    }
    return apiSuccess({ year, month, narrative: text })
  },
  {
    route: 'calendar-ai-monthly',
    requireAuth: true,
    rateLimit: { limit: 20, windowSeconds: 60 },
  }
)

function buildUserPrompt(
  year: number,
  month: number,
  payload: Record<string, unknown>
): string {
  const lines: string[] = []
  lines.push(`기간: ${year}년 ${month}월`)
  lines.push('')
  lines.push('아래는 엔진이 뽑은 이번 달의 사주·점성 데이터입니다 (raw JSON):')
  lines.push('```json')
  lines.push(JSON.stringify(payload, null, 2).slice(0, 6000))
  lines.push('```')
  lines.push('')
  lines.push(
    '위 데이터를 한국어 산문 2-3 단락으로 풀어 주세요. 사용자가 이번 달 어떤 ' +
      '날을 앞쪽에 두고 어떤 날을 미루면 좋을지 알 수 있게 구체적으로.'
  )
  return lines.join('\n')
}
