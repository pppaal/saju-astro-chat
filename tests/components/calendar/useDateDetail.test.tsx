import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useDateDetail } from '@/components/calendar/useDateDetail'
import type { BirthInfo } from '@/components/calendar/types'

const mockApiFetch = vi.fn()
vi.mock('@/lib/api/ApiClient', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}))
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

const sampleBirth: BirthInfo = {
  birthDate: '1995-02-09',
  birthTime: '14:30',
  birthPlace: 'Seoul',
  gender: 'Male',
}

const sampleDetail = {
  date: '2026-04-13',
  grade: 3,
  score: 33,
  ganzhi: '丁丑',
  categories: ['career'],
  transitSunSign: 'Aries',
  crossVerified: false,
  sajuFactorKeys: ['stemGwansal'],
  astroFactorKeys: ['retrogradeJupiter'],
  recommendationKeys: [],
  warningKeys: [],
}

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  } as unknown as Response
}

describe('useDateDetail', () => {
  beforeEach(() => {
    mockApiFetch.mockReset()
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('does not fetch when birthInfo is missing', () => {
    const { result } = renderHook(() =>
      useDateDetail({ birthInfo: undefined, selectedDay: new Date('2026-04-13') })
    )
    expect(result.current.status).toBe('idle')
    expect(result.current.detail).toBeNull()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })

  it('does not fetch when selectedDay is null', () => {
    const { result } = renderHook(() =>
      useDateDetail({ birthInfo: sampleBirth, selectedDay: null })
    )
    expect(result.current.status).toBe('idle')
    expect(mockApiFetch).not.toHaveBeenCalled()
  })

  it('fetches /api/calendar/date-detail with the right query params', async () => {
    mockApiFetch.mockResolvedValue(jsonResponse({ success: true, data: sampleDetail }))
    const { result } = renderHook(() =>
      useDateDetail({ birthInfo: sampleBirth, selectedDay: new Date('2026-04-13T00:00:00') })
    )
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(mockApiFetch).toHaveBeenCalled()
    const [url] = mockApiFetch.mock.calls[0] as [string]
    expect(url).toContain('birthDate=1995-02-09')
    expect(url).toContain('birthTime=14%3A30')
    expect(url).toContain('gender=male')
    expect(url).toContain('date=2026-04-13')
    expect(result.current.detail).toEqual(sampleDetail)
  })

  it('caches per (birth × date) and skips refetch on remount with same key', async () => {
    mockApiFetch.mockResolvedValue(jsonResponse({ success: true, data: sampleDetail }))
    const { result, rerender } = renderHook(
      ({ day }: { day: Date | null }) =>
        useDateDetail({ birthInfo: sampleBirth, selectedDay: day }),
      { initialProps: { day: new Date('2026-04-13T00:00:00') as Date | null } }
    )
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(mockApiFetch).toHaveBeenCalledTimes(1)

    // 같은 날짜로 다시 렌더 — 캐시 적중, 추가 fetch 없음
    rerender({ day: new Date('2026-04-13T00:00:00') })
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(mockApiFetch).toHaveBeenCalledTimes(1)
  })

  it('refetches when selectedDay changes', async () => {
    mockApiFetch.mockResolvedValue(jsonResponse({ success: true, data: sampleDetail }))
    const { result, rerender } = renderHook(
      ({ day }: { day: Date | null }) =>
        useDateDetail({ birthInfo: sampleBirth, selectedDay: day }),
      { initialProps: { day: new Date('2026-04-13T00:00:00') as Date | null } }
    )
    await waitFor(() => expect(result.current.status).toBe('ready'))

    rerender({ day: new Date('2026-06-15T00:00:00') })
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(2))
    expect(mockApiFetch.mock.calls[1][0]).toContain('date=2026-06-15')
  })

  it('sets status=error when the response is not ok', async () => {
    mockApiFetch.mockResolvedValue(jsonResponse({}, false))
    const { result } = renderHook(() =>
      useDateDetail({ birthInfo: sampleBirth, selectedDay: new Date('2026-04-13T00:00:00') })
    )
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.detail).toBeNull()
  })

  it('does not invoke the network when enabled=false', () => {
    renderHook(() =>
      useDateDetail({
        birthInfo: sampleBirth,
        selectedDay: new Date('2026-04-13T00:00:00'),
        enabled: false,
      })
    )
    expect(mockApiFetch).not.toHaveBeenCalled()
  })
})
