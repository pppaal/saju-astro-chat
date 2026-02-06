/**
 * Tests for useConsultationHistory hook
 * src/hooks/useConsultationHistory.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useConsultationHistory } from '@/hooks/useConsultationHistory'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('useConsultationHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('should return correct initial values', () => {
      const { result } = renderHook(() => useConsultationHistory())

      expect(result.current.consultations).toEqual([])
      expect(result.current.pagination).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.isPremiumRequired).toBe(false)
    })
  })

  describe('fetchHistory', () => {
    it('should fetch consultations successfully', async () => {
      const mockConsultations = [
        {
          id: '1',
          theme: 'today',
          summary: 'Daily fortune',
          createdAt: '2024-01-01',
          locale: 'en',
        },
        { id: '2', theme: 'love', summary: 'Love reading', createdAt: '2024-01-02', locale: 'en' },
      ]
      const mockPagination = { total: 2, limit: 20, offset: 0, hasMore: false }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: mockConsultations, pagination: mockPagination }),
      })

      const { result } = renderHook(() => useConsultationHistory())

      await act(async () => {
        await result.current.fetchHistory()
      })

      expect(result.current.consultations).toEqual(mockConsultations)
      expect(result.current.pagination).toEqual(mockPagination)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should set loading state during fetch', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {}))

      const { result } = renderHook(() => useConsultationHistory())

      act(() => {
        result.current.fetchHistory()
      })

      expect(result.current.loading).toBe(true)
    })

    it('should fetch with theme filter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [], pagination: null }),
      })

      const { result } = renderHook(() => useConsultationHistory())

      await act(async () => {
        await result.current.fetchHistory('love')
      })

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('theme=love'))
    })

    it('should fetch with offset for pagination', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [], pagination: null }),
      })

      const { result } = renderHook(() => useConsultationHistory())

      await act(async () => {
        await result.current.fetchHistory(undefined, 20)
      })

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('offset=20'))
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('limit=20'))
    })

    it('should append data when offset > 0', async () => {
      const firstPage = [
        { id: '1', theme: 'today', summary: 'First', createdAt: '2024-01-01', locale: 'en' },
      ]
      const secondPage = [
        { id: '2', theme: 'today', summary: 'Second', createdAt: '2024-01-02', locale: 'en' },
      ]

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: firstPage, pagination: { hasMore: true } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: secondPage, pagination: { hasMore: false } }),
        })

      const { result } = renderHook(() => useConsultationHistory())

      await act(async () => {
        await result.current.fetchHistory()
      })

      expect(result.current.consultations).toEqual(firstPage)

      await act(async () => {
        await result.current.fetchHistory(undefined, 20)
      })

      expect(result.current.consultations).toEqual([...firstPage, ...secondPage])
    })

    it('should handle premium required (402)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 402,
        json: async () => ({ error: 'Premium required' }),
      })

      const { result } = renderHook(() => useConsultationHistory())

      await act(async () => {
        await result.current.fetchHistory()
      })

      expect(result.current.isPremiumRequired).toBe(true)
      expect(result.current.consultations).toEqual([])
    })

    it('should handle API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      })

      const { result } = renderHook(() => useConsultationHistory())

      await act(async () => {
        await result.current.fetchHistory()
      })

      expect(result.current.error).toBe('Server error')
    })

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failed'))

      const { result } = renderHook(() => useConsultationHistory())

      await act(async () => {
        await result.current.fetchHistory()
      })

      expect(result.current.error).toBe('Network failed')
    })

    it('should reset error and premiumRequired on new fetch', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Server error' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: [], pagination: null }),
        })

      const { result } = renderHook(() => useConsultationHistory())

      await act(async () => {
        await result.current.fetchHistory()
      })

      expect(result.current.error).toBe('Server error')

      await act(async () => {
        await result.current.fetchHistory()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('fetchDetail', () => {
    it('should fetch consultation detail successfully', async () => {
      const mockDetail = {
        id: '1',
        theme: 'today',
        summary: 'Daily fortune',
        fullReport: 'Full detailed report...',
        createdAt: '2024-01-01',
        locale: 'en',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: mockDetail }),
      })

      const { result } = renderHook(() => useConsultationHistory())

      let detail: unknown
      await act(async () => {
        detail = await result.current.fetchDetail('1')
      })

      expect(detail).toEqual(mockDetail)
      expect(mockFetch).toHaveBeenCalledWith('/api/consultation/1')
    })

    it('should return null and set premium required on 402', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 402,
        json: async () => ({ error: 'Premium required' }),
      })

      const { result } = renderHook(() => useConsultationHistory())

      let detail: unknown
      await act(async () => {
        detail = await result.current.fetchDetail('1')
      })

      expect(detail).toBeNull()
      expect(result.current.isPremiumRequired).toBe(true)
    })

    it('should handle API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      })

      const { result } = renderHook(() => useConsultationHistory())

      let detail: unknown
      await act(async () => {
        detail = await result.current.fetchDetail('1')
      })

      expect(detail).toBeNull()
      expect(result.current.error).toBe('Server error')
    })

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failed'))

      const { result } = renderHook(() => useConsultationHistory())

      let detail: unknown
      await act(async () => {
        detail = await result.current.fetchDetail('1')
      })

      expect(detail).toBeNull()
      expect(result.current.error).toBe('Network failed')
    })
  })

  describe('deleteConsultation', () => {
    it('should delete consultation successfully', async () => {
      const mockConsultations = [
        { id: '1', theme: 'today', summary: 'First', createdAt: '2024-01-01', locale: 'en' },
        { id: '2', theme: 'love', summary: 'Second', createdAt: '2024-01-02', locale: 'en' },
      ]

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: mockConsultations, pagination: null }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        })

      const { result } = renderHook(() => useConsultationHistory())

      await act(async () => {
        await result.current.fetchHistory()
      })

      expect(result.current.consultations).toHaveLength(2)

      let success: boolean = false
      await act(async () => {
        success = await result.current.deleteConsultation('1')
      })

      expect(success).toBe(true)
      expect(result.current.consultations).toHaveLength(1)
      expect(result.current.consultations[0].id).toBe('2')
    })

    it('should call DELETE with correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      })

      const { result } = renderHook(() => useConsultationHistory())

      await act(async () => {
        await result.current.deleteConsultation('123')
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/consultation/123', { method: 'DELETE' })
    })

    it('should handle delete error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Delete failed' }),
      })

      const { result } = renderHook(() => useConsultationHistory())

      let success: boolean = false
      await act(async () => {
        success = await result.current.deleteConsultation('1')
      })

      expect(success).toBe(false)
      expect(result.current.error).toBe('Delete failed')
    })

    it('should handle network error on delete', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failed'))

      const { result } = renderHook(() => useConsultationHistory())

      let success: boolean = false
      await act(async () => {
        success = await result.current.deleteConsultation('1')
      })

      expect(success).toBe(false)
      expect(result.current.error).toBe('Network failed')
    })
  })

  describe('useCallback stability', () => {
    it('should maintain stable function references', () => {
      const { result, rerender } = renderHook(() => useConsultationHistory())

      const initialFetchHistory = result.current.fetchHistory
      const initialFetchDetail = result.current.fetchDetail
      const initialDeleteConsultation = result.current.deleteConsultation

      rerender()

      expect(result.current.fetchHistory).toBe(initialFetchHistory)
      expect(result.current.fetchDetail).toBe(initialFetchDetail)
      expect(result.current.deleteConsultation).toBe(initialDeleteConsultation)
    })
  })
})
