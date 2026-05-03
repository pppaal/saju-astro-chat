import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createPublicStreamGuard, extractLocale, type ApiContext } from '@/lib/api/middleware'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { parseRequestBody } from '@/lib/api/requestParser'
import { logger } from '@/lib/logger'
import { analyzeThreeLayerCompatibility } from '@/lib/destiny-matrix/compatibility'

type Person = { birthDate?: string; birthTime?: string; gender?: string }
type ReqBody = { personA?: Person; personB?: Person }

function validIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime())
}
function validTime(s: string): boolean {
  return /^\d{2}:\d{2}$/.test(s)
}
function validatePerson(p: Person | undefined, name: string): string | null {
  if (!p || typeof p !== 'object') return `${name} 객체 필수`
  if (!p.birthDate || !p.birthTime || !p.gender) return `${name}.birthDate, birthTime, gender 필수`
  if (!validIsoDate(p.birthDate) || !validTime(p.birthTime)) return `${name} 날짜/시간 형식 오류`
  if (p.gender !== 'male' && p.gender !== 'female') return `${name}.gender는 male|female`
  return null
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
    route: 'destiny-matrix/compatibility-3layer',
  })

export const POST = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    try {
      const body = await parseRequestBody<ReqBody>(req, { context: 'Compat3Layer' })
      if (!body || typeof body !== 'object') return errBody(req, 'Body required')
      const errA = validatePerson(body.personA, 'personA')
      if (errA) return errBody(req, errA)
      const errB = validatePerson(body.personB, 'personB')
      if (errB) return errBody(req, errB)

      const personA = body.personA as Required<Person> & { gender: 'male' | 'female' }
      const personB = body.personB as Required<Person> & { gender: 'male' | 'female' }

      const result = analyzeThreeLayerCompatibility(personA, personB)
      return NextResponse.json(result)
    } catch (e) {
      logger.error('[Compat3Layer] failed', { error: e instanceof Error ? e.message : String(e) })
      return errBody(req, '궁합 분석 실패', 'INTERNAL_ERROR')
    }
  },
  createPublicStreamGuard({
    route: '/api/destiny-matrix/compatibility-3layer',
    limit: 20,
    windowSeconds: 60,
  })
)
