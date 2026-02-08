/**
 * @file Tests for Request Validator (Zod-based)
 *
 * 테스트 대상: Zod 스키마 기반 요청 검증
 * - 필수 필드 검증
 * - 타입 변환 (string → number)
 * - 기본값 적용
 * - 상세 에러 메시지
 */

import { describe, it, expect, vi } from 'vitest'
import { validateRequest } from '@/app/api/destiny-map/chat-stream/handlers/requestValidator'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/api/requestParser', () => ({
  parseRequestBody: vi.fn(),
}))

import { parseRequestBody } from '@/lib/api/requestParser'

describe('Request Validator (Zod-based)', () => {
  describe('validateRequest', () => {
    it('should validate correct request', async () => {
      vi.mocked(parseRequestBody).mockResolvedValue({
        birthDate: '1990-01-01',
        birthTime: '12:00',
        gender: 'male',
        latitude: 37.5,
        longitude: 127.0,
        theme: 'chat',
        lang: 'ko',
        messages: [],
      })

      const req = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      })

      const result = await validateRequest(req)

      expect(result).toHaveProperty('data')
      if ('data' in result) {
        expect(result.data.birthDate).toBe('1990-01-01')
        expect(result.data.birthTime).toBe('12:00')
        expect(result.data.gender).toBe('male')
        expect(result.data.latitude).toBe(37.5)
        expect(result.data.longitude).toBe(127.0)
      }
    })

    it('should return error for invalid body', async () => {
      vi.mocked(parseRequestBody).mockResolvedValue(null)

      const req = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      })

      const result = await validateRequest(req)

      expect(result).toHaveProperty('error')
      if ('error' in result) {
        expect(result.error.error).toBe('Invalid JSON body')
        expect(result.error.status).toBe(400)
      }
    })

    it('should return error for missing birthDate', async () => {
      vi.mocked(parseRequestBody).mockResolvedValue({
        birthTime: '12:00',
        latitude: 37.5,
        longitude: 127.0,
      })

      const req = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      })

      const result = await validateRequest(req)

      expect(result).toHaveProperty('error')
      if ('error' in result) {
        expect(result.error.error).toContain('birthDate')
      }
    })

    it('should return error for missing birthTime', async () => {
      vi.mocked(parseRequestBody).mockResolvedValue({
        birthDate: '1990-01-01',
        latitude: 37.5,
        longitude: 127.0,
      })

      const req = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      })

      const result = await validateRequest(req)

      expect(result).toHaveProperty('error')
      if ('error' in result) {
        expect(result.error.error).toContain('birthTime')
      }
    })

    it('should return error for invalid latitude', async () => {
      vi.mocked(parseRequestBody).mockResolvedValue({
        birthDate: '1990-01-01',
        birthTime: '12:00',
        latitude: 100, // Invalid: must be between -90 and 90
        longitude: 127.0,
      })

      const req = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      })

      const result = await validateRequest(req)

      expect(result).toHaveProperty('error')
      if ('error' in result) {
        expect(result.error.error).toContain('latitude')
      }
    })

    it('should return error for invalid longitude', async () => {
      vi.mocked(parseRequestBody).mockResolvedValue({
        birthDate: '1990-01-01',
        birthTime: '12:00',
        latitude: 37.5,
        longitude: 200, // Invalid: must be between -180 and 180
      })

      const req = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      })

      const result = await validateRequest(req)

      expect(result).toHaveProperty('error')
      if ('error' in result) {
        expect(result.error.error).toContain('longitude')
      }
    })

    it('should handle optional name field', async () => {
      vi.mocked(parseRequestBody).mockResolvedValue({
        name: 'John Doe',
        birthDate: '1990-01-01',
        birthTime: '12:00',
        latitude: 37.5,
        longitude: 127.0,
        messages: [],
      })

      const req = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      })

      const result = await validateRequest(req)

      if ('data' in result) {
        expect(result.data.name).toBe('John Doe')
      }
    })

    it('should default gender to male if not provided', async () => {
      vi.mocked(parseRequestBody).mockResolvedValue({
        birthDate: '1990-01-01',
        birthTime: '12:00',
        latitude: 37.5,
        longitude: 127.0,
        messages: [],
      })

      const req = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      })

      const result = await validateRequest(req)

      if ('data' in result) {
        expect(result.data.gender).toBe('male')
      }
    })

    it('should accept female gender', async () => {
      vi.mocked(parseRequestBody).mockResolvedValue({
        birthDate: '1990-01-01',
        birthTime: '12:00',
        gender: 'female',
        latitude: 37.5,
        longitude: 127.0,
        messages: [],
      })

      const req = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      })

      const result = await validateRequest(req)

      if ('data' in result) {
        expect(result.data.gender).toBe('female')
      }
    })

    it('should default theme to chat if not provided', async () => {
      vi.mocked(parseRequestBody).mockResolvedValue({
        birthDate: '1990-01-01',
        birthTime: '12:00',
        latitude: 37.5,
        longitude: 127.0,
        messages: [],
      })

      const req = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      })

      const result = await validateRequest(req)

      if ('data' in result) {
        expect(result.data.theme).toBe('chat')
      }
    })

    it('should default lang to ko if not provided', async () => {
      vi.mocked(parseRequestBody).mockResolvedValue({
        birthDate: '1990-01-01',
        birthTime: '12:00',
        latitude: 37.5,
        longitude: 127.0,
        messages: [],
      })

      const req = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      })

      const result = await validateRequest(req)

      if ('data' in result) {
        expect(result.data.lang).toBe('ko')
      }
    })

    it('should handle messages array', async () => {
      vi.mocked(parseRequestBody).mockResolvedValue({
        birthDate: '1990-01-01',
        birthTime: '12:00',
        latitude: 37.5,
        longitude: 127.0,
        messages: [{ role: 'user', content: 'Hello' }],
      })

      const req = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      })

      const result = await validateRequest(req)

      if ('data' in result) {
        expect(result.data.messages).toHaveLength(1)
      }
    })

    it('should handle empty messages array', async () => {
      vi.mocked(parseRequestBody).mockResolvedValue({
        birthDate: '1990-01-01',
        birthTime: '12:00',
        latitude: 37.5,
        longitude: 127.0,
        messages: [],
      })

      const req = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      })

      const result = await validateRequest(req)

      if ('data' in result) {
        expect(result.data.messages).toEqual([])
      }
    })

    it('should handle optional saju field', async () => {
      const mockSaju = { pillars: {} }
      vi.mocked(parseRequestBody).mockResolvedValue({
        birthDate: '1990-01-01',
        birthTime: '12:00',
        latitude: 37.5,
        longitude: 127.0,
        saju: mockSaju,
        messages: [],
      })

      const req = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      })

      const result = await validateRequest(req)

      if ('data' in result) {
        expect(result.data.saju).toEqual(mockSaju)
      }
    })

    it('should handle optional astro field', async () => {
      const mockAstro = { sun: { sign: 'Aries' } }
      vi.mocked(parseRequestBody).mockResolvedValue({
        birthDate: '1990-01-01',
        birthTime: '12:00',
        latitude: 37.5,
        longitude: 127.0,
        astro: mockAstro,
        messages: [],
      })

      const req = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      })

      const result = await validateRequest(req)

      if ('data' in result) {
        expect(result.data.astro).toEqual(mockAstro)
      }
    })

    it('should handle numeric latitude as string (auto-coercion)', async () => {
      vi.mocked(parseRequestBody).mockResolvedValue({
        birthDate: '1990-01-01',
        birthTime: '12:00',
        latitude: '37.5',
        longitude: 127.0,
        messages: [],
      })

      const req = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      })

      const result = await validateRequest(req)

      if ('data' in result) {
        expect(result.data.latitude).toBe(37.5)
        expect(typeof result.data.latitude).toBe('number')
      }
    })

    it('should handle numeric longitude as string (auto-coercion)', async () => {
      vi.mocked(parseRequestBody).mockResolvedValue({
        birthDate: '1990-01-01',
        birthTime: '12:00',
        latitude: 37.5,
        longitude: '127.0',
        messages: [],
      })

      const req = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      })

      const result = await validateRequest(req)

      if ('data' in result) {
        expect(result.data.longitude).toBe(127.0)
        expect(typeof result.data.longitude).toBe('number')
      }
    })

    it('should return error for name exceeding max length', async () => {
      const longName = 'A'.repeat(200)
      vi.mocked(parseRequestBody).mockResolvedValue({
        name: longName,
        birthDate: '1990-01-01',
        birthTime: '12:00',
        latitude: 37.5,
        longitude: 127.0,
        messages: [],
      })

      const req = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      })

      const result = await validateRequest(req)

      // Zod는 max length 초과시 에러 반환
      expect(result).toHaveProperty('error')
    })

    it('should return error for theme exceeding max length', async () => {
      const longTheme = 'A'.repeat(100)
      vi.mocked(parseRequestBody).mockResolvedValue({
        birthDate: '1990-01-01',
        birthTime: '12:00',
        latitude: 37.5,
        longitude: 127.0,
        theme: longTheme,
        messages: [],
      })

      const req = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      })

      const result = await validateRequest(req)

      // Zod는 max length 초과시 에러 반환
      expect(result).toHaveProperty('error')
    })

    it('should include detailed error information', async () => {
      vi.mocked(parseRequestBody).mockResolvedValue({
        birthDate: 'invalid-date',
        birthTime: '12:00',
        latitude: 37.5,
        longitude: 127.0,
      })

      const req = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      })

      const result = await validateRequest(req)

      expect(result).toHaveProperty('error')
      if ('error' in result) {
        expect(result.error.details).toBeDefined()
        expect(Array.isArray(result.error.details)).toBe(true)
        expect(result.error.details![0]).toHaveProperty('field')
        expect(result.error.details![0]).toHaveProperty('message')
      }
    })

    it('should validate invalid time format', async () => {
      vi.mocked(parseRequestBody).mockResolvedValue({
        birthDate: '1990-01-01',
        birthTime: 'invalid-time',
        latitude: 37.5,
        longitude: 127.0,
      })

      const req = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      })

      const result = await validateRequest(req)

      expect(result).toHaveProperty('error')
      if ('error' in result) {
        expect(result.error.error).toContain('birthTime')
      }
    })

    it('should accept AM/PM time format', async () => {
      vi.mocked(parseRequestBody).mockResolvedValue({
        birthDate: '1990-01-01',
        birthTime: '12:00 PM',
        latitude: 37.5,
        longitude: 127.0,
        messages: [],
      })

      const req = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      })

      const result = await validateRequest(req)

      expect(result).toHaveProperty('data')
      if ('data' in result) {
        expect(result.data.birthTime).toBe('12:00 PM')
      }
    })

    it('should reject invalid gender value', async () => {
      vi.mocked(parseRequestBody).mockResolvedValue({
        birthDate: '1990-01-01',
        birthTime: '12:00',
        gender: 'invalid-gender',
        latitude: 37.5,
        longitude: 127.0,
      })

      const req = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      })

      const result = await validateRequest(req)

      expect(result).toHaveProperty('error')
    })

    it('should reject invalid lang value', async () => {
      vi.mocked(parseRequestBody).mockResolvedValue({
        birthDate: '1990-01-01',
        birthTime: '12:00',
        lang: 'fr', // Not in ['ko', 'en']
        latitude: 37.5,
        longitude: 127.0,
      })

      const req = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      })

      const result = await validateRequest(req)

      expect(result).toHaveProperty('error')
    })
  })
})
