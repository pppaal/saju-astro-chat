import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'
import {
  HTTP_STATUS,
  formatValidationErrors,
  createValidationErrorResponse,
  validateAndParse,
  validateQueryParams,
  successResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
} from '@/lib/api/validation-wrapper'
import { logger } from '@/lib/logger'

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

function jsonRequest(body: unknown): Request {
  return new Request('http://test.local/api/x', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('validation-wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('HTTP_STATUS', () => {
    it('표준 HTTP 상태 코드를 노출한다', () => {
      expect(HTTP_STATUS.OK).toBe(200)
      expect(HTTP_STATUS.CREATED).toBe(201)
      expect(HTTP_STATUS.BAD_REQUEST).toBe(400)
      expect(HTTP_STATUS.UNAUTHORIZED).toBe(401)
      expect(HTTP_STATUS.FORBIDDEN).toBe(403)
      expect(HTTP_STATUS.NOT_FOUND).toBe(404)
      expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500)
      expect(HTTP_STATUS.SERVICE_UNAVAILABLE).toBe(503)
    })
  })

  describe('formatValidationErrors', () => {
    it('Zod issue 를 path(점 표기)/message 쌍으로 평탄화한다', () => {
      const schema = z.object({
        name: z.string(),
        nested: z.object({ age: z.number() }),
      })
      const result = schema.safeParse({ name: 1, nested: { age: 'x' } })
      expect(result.success).toBe(false)
      if (result.success) return

      const errors = formatValidationErrors(result.error)
      const paths = errors.map((e) => e.path).sort()
      expect(paths).toEqual(['name', 'nested.age'])
      for (const err of errors) {
        expect(typeof err.message).toBe('string')
        expect(err.message.length).toBeGreaterThan(0)
      }
    })

    it('루트 레벨 이슈는 빈 path 가 된다', () => {
      const schema = z.string()
      const result = schema.safeParse(42)
      if (result.success) throw new Error('should fail')
      const errors = formatValidationErrors(result.error)
      expect(errors[0].path).toBe('')
    })
  })

  describe('createValidationErrorResponse', () => {
    it('400 + { error: validation_failed, details } 응답을 만든다', async () => {
      const errors = [{ path: 'name', message: 'Required' }]
      const res = createValidationErrorResponse(errors)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body).toEqual({ error: 'validation_failed', details: errors })
    })

    it('route 가 주어지면 logger.warn 으로 기록한다', () => {
      const errors = [{ path: 'x', message: 'bad' }]
      createValidationErrorResponse(errors, 'api/test')
      expect(logger.warn).toHaveBeenCalledWith('[api/test] Validation failed', { errors })
    })

    it('route 가 없으면 로그를 남기지 않는다', () => {
      createValidationErrorResponse([{ path: 'x', message: 'bad' }])
      expect(logger.warn).not.toHaveBeenCalled()
    })
  })

  describe('validateAndParse', () => {
    const schema = z.object({
      name: z.string(),
      count: z.number().int().min(0),
    })

    it('유효한 body 는 success: true + 파싱된 data 를 반환한다', async () => {
      const result = await validateAndParse(jsonRequest({ name: 'a', count: 3 }), schema)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.data).toEqual({ name: 'a', count: 3 })
    })

    it('스키마에 없는 필드는 기본 Zod 동작대로 strip 된다', async () => {
      const result = await validateAndParse(
        jsonRequest({ name: 'a', count: 1, extra: 'x' }),
        schema
      )
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.data).toEqual({ name: 'a', count: 1 })
      expect('extra' in result.data).toBe(false)
    })

    it('스키마 위반 시 success: false + errors + 400 response 를 반환한다', async () => {
      const result = await validateAndParse(jsonRequest({ name: 1 }), schema, {
        route: 'api/demo',
      })
      expect(result.success).toBe(false)
      if (result.success) return
      const paths = result.errors.map((e) => e.path).sort()
      expect(paths).toEqual(['count', 'name'])
      expect(result.response.status).toBe(400)
      const body = await result.response.json()
      expect(body.error).toBe('validation_failed')
      expect(logger.warn).toHaveBeenCalledOnce()
    })

    it('JSON 파싱 불가 body 는 path: body 에러로 잡힌다 (throw 하지 않음)', async () => {
      const result = await validateAndParse(jsonRequest('not json {'), schema)
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].path).toBe('body')
      expect(result.response.status).toBe(400)
    })

    it('빈 body 도 JSON 에러로 처리된다', async () => {
      const request = new Request('http://test.local/api/x', { method: 'POST' })
      const result = await validateAndParse(request, schema)
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors[0].path).toBe('body')
    })
  })

  describe('validateQueryParams', () => {
    const schema = z.object({
      page: z.number(),
      q: z.string(),
    })

    it('숫자형 문자열 쿼리는 number 로 자동 변환된다', () => {
      const request = new Request('http://test.local/api/x?page=2&q=hello')
      const result = validateQueryParams(request, schema)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.data).toEqual({ page: 2, q: 'hello' })
    })

    it('빈 문자열 값은 숫자(0)로 오인 변환되지 않는다', () => {
      const schema2 = z.object({ q: z.string() })
      const request = new Request('http://test.local/api/x?q=')
      const result = validateQueryParams(request, schema2)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.data.q).toBe('')
    })

    it('숫자가 아닌 값이 number 필드에 오면 400 실패를 반환한다', () => {
      const request = new Request('http://test.local/api/x?page=abc&q=hi')
      const result = validateQueryParams(request, schema, { route: 'api/list' })
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.errors.some((e) => e.path === 'page')).toBe(true)
      expect(result.response.status).toBe(400)
      expect(logger.warn).toHaveBeenCalledOnce()
    })

    it('필수 파라미터 누락 시 실패한다', () => {
      const request = new Request('http://test.local/api/x')
      const result = validateQueryParams(request, schema)
      expect(result.success).toBe(false)
    })

    it('optional 스키마면 파라미터 없이도 성공한다', () => {
      const optionalSchema = z.object({ page: z.number().optional() })
      const request = new Request('http://test.local/api/x')
      const result = validateQueryParams(request, optionalSchema)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.data.page).toBeUndefined()
    })
  })

  describe('response helpers', () => {
    it('successResponse 는 기본 200 + 그대로의 data 를 직렬화한다', async () => {
      const res = successResponse({ ok: true, items: [1, 2] })
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ ok: true, items: [1, 2] })
    })

    it('successResponse 는 상태 코드 override 를 지원한다 (201)', () => {
      const res = successResponse({ id: 'x' }, HTTP_STATUS.CREATED)
      expect(res.status).toBe(201)
    })

    it('errorResponse 는 기본 500 + { error } 를 반환한다', async () => {
      const res = errorResponse('boom')
      expect(res.status).toBe(500)
      expect(await res.json()).toEqual({ error: 'boom' })
    })

    it('errorResponse 는 details 가 있을 때만 details 키를 포함한다', async () => {
      const withDetails = errorResponse('bad', HTTP_STATUS.BAD_REQUEST, { field: 'name' })
      expect(withDetails.status).toBe(400)
      expect(await withDetails.json()).toEqual({ error: 'bad', details: { field: 'name' } })

      const without = await errorResponse('bad', HTTP_STATUS.BAD_REQUEST).json()
      expect('details' in without).toBe(false)
    })

    it('notFoundResponse 는 404 + "<resource> not found" 를 반환한다', async () => {
      const res = notFoundResponse('Reading')
      expect(res.status).toBe(404)
      expect(await res.json()).toEqual({ error: 'Reading not found' })
    })

    it('unauthorizedResponse 는 401 + 기본 메시지를 반환한다', async () => {
      const res = unauthorizedResponse()
      expect(res.status).toBe(401)
      expect(await res.json()).toEqual({ error: 'Authentication required' })
    })

    it('unauthorizedResponse 는 커스텀 메시지를 지원한다', async () => {
      const res = unauthorizedResponse('Login first')
      expect(await res.json()).toEqual({ error: 'Login first' })
    })
  })
})
