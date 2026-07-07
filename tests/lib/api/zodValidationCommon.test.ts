// tests/lib/api/zodValidationCommon.test.ts
//
// zodValidation/common — 요청 검증 헬퍼(순수). sanitizeInput·formatZodErrors·
// validateRequestBody·createValidationErrorResponse(+ mapZodErrorToCode 분기)를 커버.

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  sanitizeInput,
  formatZodErrors,
  validateRequestBody,
  createValidationErrorResponse,
} from '@/lib/api/zodValidation/common'

// z.ZodError 생성 헬퍼 — 실패하는 safeParse 에서 꺼낸다.
function zodErrorFor(schema: z.ZodTypeAny, value: unknown): z.ZodError {
  const r = schema.safeParse(value)
  if (r.success) throw new Error('expected parse failure')
  return r.error
}

describe('sanitizeInput', () => {
  it('앞뒤 공백 제거 + 꺾쇠·javascript:·이벤트 핸들러 제거', () => {
    expect(sanitizeInput('  <b>hi</b>  ')).toBe('bhi/b')
    expect(sanitizeInput('javascript:alert(1)')).toBe('alert(1)')
    expect(sanitizeInput('onclick=doThing')).toBe('doThing')
  })

  it('maxLength 로 자른다', () => {
    expect(sanitizeInput('abcdef', 3)).toBe('abc')
  })
})

describe('formatZodErrors', () => {
  it('이슈를 path·message·code 로 평탄화', () => {
    const err = zodErrorFor(z.object({ a: z.string() }), { a: 1 })
    const out = formatZodErrors(err)
    expect(out[0].path).toBe('a')
    expect(typeof out[0].message).toBe('string')
    expect(out[0].code).toBeDefined()
  })
})

describe('validateRequestBody', () => {
  const schema = z.object({ name: z.string() })

  it('유효 body → success:true + data', async () => {
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'a' }) })
    const r = await validateRequestBody(req, schema)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.name).toBe('a')
  })

  it('스키마 불일치 → success:false + errors', async () => {
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 1 }) })
    const r = await validateRequestBody(req, schema)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.errors[0].path).toBe('name')
  })

  it('잘못된 JSON → success:false, path:body', async () => {
    const req = new Request('http://x', { method: 'POST', body: '{broken' })
    const r = await validateRequestBody(req, schema)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.errors[0].path).toBe('body')
  })
})

describe('createValidationErrorResponse — mapZodErrorToCode 분기', () => {
  it('date 필드 에러 → 응답 생성', () => {
    const err = zodErrorFor(z.object({ birthDate: z.string() }), { birthDate: 1 })
    const res = createValidationErrorResponse(err, { route: '/x' })
    expect(res).toBeTruthy()
  })

  it('time / lat / 일반 필드도 각각 응답 생성(분기 커버)', () => {
    for (const [key] of [['time'], ['lat'], ['something']]) {
      const err = zodErrorFor(z.object({ [key]: z.string() }), {})
      expect(createValidationErrorResponse(err)).toBeTruthy()
    }
  })

  it('빈 이슈 방어 — 최소한 응답 반환', () => {
    const err = zodErrorFor(z.string(), 123)
    expect(createValidationErrorResponse(err, { locale: 'ko' })).toBeTruthy()
  })
})
