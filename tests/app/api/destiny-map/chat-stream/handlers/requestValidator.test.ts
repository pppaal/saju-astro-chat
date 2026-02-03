/**
 * @file Tests for Request Validator
 */

import { describe, it, expect, vi } from 'vitest'
import { validateRequest } from '@/app/api/destiny-map/chat-stream/handlers/requestValidator'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/api/requestParser', () => ({
  parseRequestBody: vi.fn(),
}))

vi.mock('@/lib/validation', () => ({
  isValidDate: vi.fn((date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date)),
  isValidTime: vi.fn((time: string) => /^\d{2}:\d{2}$/.test(time)),
  isValidLatitude: vi.fn((lat: number) => lat >= -90 && lat <= 90),
  isValidLongitude: vi.fn((lon: number) => lon >= -180 && lon <= 180),
  LIMITS: { NAME: 100, THEME: 50 },
}))

import { parseRequestBody } from '@/lib/api/requestParser'

describe('Request Validator', () => {
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
        expect(result.error.error).toBe('invalid_body')
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
    })

    it('should return error for invalid latitude', async () => {
      vi.mocked(parseRequestBody).mockResolvedValue({
        birthDate: '1990-01-01',
        birthTime: '12:00',
        latitude: 100, // Invalid
        longitude: 127.0,
      })

      const req = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      })

      const result = await validateRequest(req)

      expect(result).toHaveProperty('error')
    })

    it('should return error for invalid longitude', async () => {
      vi.mocked(parseRequestBody).mockResolvedValue({
        birthDate: '1990-01-01',
        birthTime: '12:00',
        latitude: 37.5,
        longitude: 200, // Invalid
      })

      const req = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      })

      const result = await validateRequest(req)

      expect(result).toHaveProperty('error')
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

    it('should trim whitespace from strings', async () => {
      vi.mocked(parseRequestBody).mockResolvedValue({
        name: '  John Doe  ',
        birthDate: '  1990-01-01  ',
        birthTime: '  12:00  ',
        theme: '  chat  ',
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
        expect(result.data.birthDate).toBe('1990-01-01')
        expect(result.data.birthTime).toBe('12:00')
        expect(result.data.theme).toBe('chat')
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

    it('should handle numeric latitude as string', async () => {
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
      }
    })

    it('should handle numeric longitude as string', async () => {
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
      }
    })

    it('should limit name length', async () => {
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

      if ('data' in result) {
        expect(result.data.name?.length).toBeLessThanOrEqual(100)
      }
    })

    it('should limit theme length', async () => {
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

      if ('data' in result) {
        expect(result.data.theme.length).toBeLessThanOrEqual(50)
      }
    })
  })
})
