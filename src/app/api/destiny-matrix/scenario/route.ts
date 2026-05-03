import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createPublicStreamGuard, extractLocale, type ApiContext } from '@/lib/api/middleware'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { parseRequestBody } from '@/lib/api/requestParser'
import { logger } from '@/lib/logger'
import { simulateScenario, compareScenarios } from '@/lib/destiny-matrix/scenario'
import type { ScenarioAction } from '@/lib/destiny-matrix/scenario'

const VALID_ACTIONS: readonly ScenarioAction[] = [
  'careerChange', 'startBusiness', 'marriage', 'meetSomeone',
  'relocation', 'travel', 'invest', 'majorPurchase',
  'startStudy', 'healthRestart',
] as const

type ScenarioReqBody = {
  birthDate?: string
  birthTime?: string
  gender?: string
  action?: string
  targetDate?: string
  alternatives?: unknown
}

function validIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime())
}
function validTime(s: string): boolean {
  return /^\d{2}:\d{2}$/.test(s)
}

const errBody = (
  req: NextRequest,
  msg: string,
  code: keyof typeof ErrorCodes = 'BAD_REQUEST'
) =>
  createErrorResponse({
    code: ErrorCodes[code],
    message: msg,
    locale: extractLocale(req),
    route: 'destiny-matrix/scenario',
  })

export const POST = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    try {
      const body = await parseRequestBody<ScenarioReqBody>(req, { context: 'Scenario' })
      if (!body || typeof body !== 'object') return errBody(req, 'Body required')
      const { birthDate, birthTime, gender, action, targetDate } = body
      if (!birthDate || !birthTime || !gender || !action || !targetDate) {
        return errBody(req, 'birthDate, birthTime, gender, action, targetDate 필수')
      }
      if (!validIsoDate(birthDate) || !validIsoDate(targetDate) || !validTime(birthTime)) {
        return errBody(req, '날짜/시간 형식 오류')
      }
      if (gender !== 'male' && gender !== 'female') return errBody(req, 'gender는 male|female')
      if (!VALID_ACTIONS.includes(action as ScenarioAction)) {
        return errBody(req, `action은 ${VALID_ACTIONS.join(', ')} 중 하나`)
      }
      const altsRaw = body.alternatives
      const alternatives =
        Array.isArray(altsRaw) && altsRaw.length <= 10
          ? (altsRaw.filter((a): a is string => typeof a === 'string' && validIsoDate(a)) as string[])
          : undefined

      const input = {
        birthDate, birthTime,
        gender: gender as 'male' | 'female',
        action: action as ScenarioAction,
        targetDate, alternatives,
      }
      if (alternatives && alternatives.length > 0) {
        const result = compareScenarios(input)
        return NextResponse.json({ mode: 'compare', ...result })
      }
      const forecast = simulateScenario(input)
      return NextResponse.json({ mode: 'single', forecast })
    } catch (e) {
      logger.error('[Scenario] simulation failed', { error: e instanceof Error ? e.message : String(e) })
      return errBody(req, '시나리오 시뮬레이션 실패', 'INTERNAL_ERROR')
    }
  },
  createPublicStreamGuard({
    route: '/api/destiny-matrix/scenario',
    limit: 30,
    windowSeconds: 60,
  })
)
