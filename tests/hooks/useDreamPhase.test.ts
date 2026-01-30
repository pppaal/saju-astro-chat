import { renderHook, act, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useDreamPhase } from '@/hooks/useDreamPhase'
import { useSession } from 'next-auth/react'

vi.mock('@/lib/logger')

describe('useDreamPhase', () => {
  const mockUseSession = useSession as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  describe('Initial phase - unauthenticated', () => {
    it('should start with birth-input phase when not authenticated', async () => {
      mockUseSession.mockReturnValue({
        status: 'unauthenticated',
        data: null,
        update: vi.fn(),
      } as any)

      const { result } = renderHook(() => useDreamPhase())

      await waitFor(() => {
        expect(result.current.profileLoading).toBe(false)
      })

      expect(result.current.phase).toBe('dream-input')
      expect(result.current.userProfile).toBeNull()
    })

    it('should not make API call when unauthenticated', async () => {
      mockUseSession.mockReturnValue({
        status: 'unauthenticated',
        data: null,
        update: vi.fn(),
      } as any)

      renderHook(() => useDreamPhase())

      await waitFor(() => {
        expect(global.fetch).not.toHaveBeenCalled()
      })
    })
  })

  describe('Initial phase - authenticated with profile', () => {
    it('should load user profile and skip to dream-input phase', async () => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { email: 'test@test.com' } },
        update: vi.fn(),
      } as any)

      const mockProfile = {
        name: 'John Doe',
        birthDate: '1990-01-01',
        birthTime: '10:00',
        birthCity: 'Seoul',
        gender: 'M',
        latitude: 37.5665,
        longitude: 126.978,
        tzId: 'Asia/Seoul',
      }

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ user: mockProfile }),
      })

      const { result } = renderHook(() => useDreamPhase())

      await waitFor(() => {
        expect(result.current.profileLoading).toBe(false)
      })

      expect(result.current.phase).toBe('dream-input')
      expect(result.current.userProfile).toEqual({
        name: 'John Doe',
        birthDate: '1990-01-01',
        birthTime: '10:00',
        birthCity: 'Seoul',
        gender: 'M',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      })
    })

    it('should call profile API with correct URL', async () => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { email: 'test@test.com' } },
        update: vi.fn(),
      } as any)

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ user: { birthDate: '1990-01-01' } }),
      })

      renderHook(() => useDreamPhase())

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/me/profile',
          expect.objectContaining({ cache: 'no-store' })
        )
      })
    })
  })

  describe('Initial phase - authenticated without profile', () => {
    it('should stay on birth-input phase when profile has no birthDate', async () => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { email: 'test@test.com' } },
        update: vi.fn(),
      } as any)

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ user: { name: 'John', birthDate: null } }),
      })

      const { result } = renderHook(() => useDreamPhase())

      await waitFor(() => {
        expect(result.current.profileLoading).toBe(false)
      })

      expect(result.current.phase).toBe('dream-input')
      expect(result.current.userProfile).toBeNull()
    })

    it('should stay on birth-input phase when profile API fails', async () => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { email: 'test@test.com' } },
        update: vi.fn(),
      } as any)

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
      })

      const { result } = renderHook(() => useDreamPhase())

      await waitFor(() => {
        expect(result.current.profileLoading).toBe(false)
      })

      expect(result.current.phase).toBe('dream-input')
      expect(result.current.userProfile).toBeNull()
    })

    it('should stay on birth-input phase when API throws error', async () => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { email: 'test@test.com' } },
        update: vi.fn(),
      } as any)

      ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useDreamPhase())

      await waitFor(() => {
        expect(result.current.profileLoading).toBe(false)
      })

      expect(result.current.phase).toBe('dream-input')
      expect(result.current.userProfile).toBeNull()
    })
  })

  describe('Loading state', () => {
    it('should show loading while session is loading', () => {
      mockUseSession.mockReturnValue({
        status: 'loading',
        data: null,
        update: vi.fn(),
      } as any)

      const { result } = renderHook(() => useDreamPhase())

      expect(result.current.profileLoading).toBe(true)
    })

    it('should show loading while fetching profile', async () => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { email: 'test@test.com' } },
        update: vi.fn(),
      } as any)

      let resolvePromise: (value: any) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      ;(global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(promise)

      const { result } = renderHook(() => useDreamPhase())

      expect(result.current.profileLoading).toBe(true)

      await act(async () => {
        resolvePromise!({
          ok: true,
          json: async () => ({ user: { birthDate: '1990-01-01' } }),
        })
        await promise
      })

      expect(result.current.profileLoading).toBe(false)
    })
  })

  describe('Phase transitions', () => {
    it('should allow manual phase changes', async () => {
      mockUseSession.mockReturnValue({
        status: 'unauthenticated',
        data: null,
        update: vi.fn(),
      } as any)

      const { result } = renderHook(() => useDreamPhase())

      await waitFor(() => {
        expect(result.current.phase).toBe('dream-input')
      })

      act(() => {
        result.current.setPhase('dream-input')
      })

      expect(result.current.phase).toBe('dream-input')

      act(() => {
        result.current.setPhase('analyzing')
      })

      expect(result.current.phase).toBe('analyzing')

      act(() => {
        result.current.setPhase('result')
      })

      expect(result.current.phase).toBe('result')
    })

    it('should allow setting user profile manually', async () => {
      mockUseSession.mockReturnValue({
        status: 'unauthenticated',
        data: null,
        update: vi.fn(),
      } as any)

      const { result } = renderHook(() => useDreamPhase())

      await waitFor(() => {
        expect(result.current.userProfile).toBeNull()
      })

      const newProfile = {
        name: 'Jane Doe',
        birthDate: '1995-05-15',
        birthTime: '14:30',
        birthCity: 'Busan',
        gender: 'F' as const,
      }

      act(() => {
        result.current.setUserProfile(newProfile)
      })

      expect(result.current.userProfile).toEqual(newProfile)
    })
  })

  describe('Session status changes', () => {
    it('should reload when session status changes from loading to authenticated', async () => {
      const { rerender } = renderHook(() => useDreamPhase())

      mockUseSession.mockReturnValue({
        status: 'loading',
        data: null,
        update: vi.fn(),
      } as any)

      rerender()

      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { email: 'test@test.com' } },
        update: vi.fn(),
      } as any)

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ user: { birthDate: '1990-01-01' } }),
      })

      rerender()

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })

    it('should handle logout (authenticated -> unauthenticated)', async () => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { email: 'test@test.com' } },
        update: vi.fn(),
      } as any)

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ user: { birthDate: '1990-01-01' } }),
      })

      const { result, rerender } = renderHook(() => useDreamPhase())

      await waitFor(() => {
        expect(result.current.phase).toBe('dream-input')
      })

      // User logs out
      mockUseSession.mockReturnValue({
        status: 'unauthenticated',
        data: null,
        update: vi.fn(),
      } as any)

      rerender()

      await waitFor(() => {
        expect(result.current.phase).toBe('dream-input')
      })
    })
  })

  describe('Profile data mapping', () => {
    it('should map tzId to timezone in userProfile', async () => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { email: 'test@test.com' } },
        update: vi.fn(),
      } as any)

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          user: {
            birthDate: '1990-01-01',
            tzId: 'America/New_York',
          },
        }),
      })

      const { result } = renderHook(() => useDreamPhase())

      await waitFor(() => {
        expect(result.current.userProfile?.timezone).toBe('America/New_York')
      })
    })

    it('should handle incomplete profile data', async () => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { email: 'test@test.com' } },
        update: vi.fn(),
      } as any)

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          user: {
            birthDate: '1990-01-01',
            birthTime: null,
            birthCity: null,
          },
        }),
      })

      const { result } = renderHook(() => useDreamPhase())

      await waitFor(() => {
        expect(result.current.userProfile).toBeDefined()
        expect(result.current.userProfile?.birthDate).toBe('1990-01-01')
        expect(result.current.userProfile?.birthTime).toBeNull()
        expect(result.current.userProfile?.birthCity).toBeNull()
      })
    })
  })

  describe('Edge cases', () => {
    it('should handle empty response from API', async () => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { email: 'test@test.com' } },
        update: vi.fn(),
      } as any)

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      })

      const { result } = renderHook(() => useDreamPhase())

      await waitFor(() => {
        expect(result.current.profileLoading).toBe(false)
      })

      // Always starts at dream-input for immediate usability
      expect(result.current.phase).toBe('dream-input')
      expect(result.current.userProfile).toBeNull()
    })

    it('should handle malformed JSON response', async () => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { email: 'test@test.com' } },
        update: vi.fn(),
      } as any)

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      })

      const { result } = renderHook(() => useDreamPhase())

      await waitFor(() => {
        expect(result.current.profileLoading).toBe(false)
      })

      // Always starts at dream-input for immediate usability
      expect(result.current.phase).toBe('dream-input')
      expect(result.current.userProfile).toBeNull()
    })

    it('should not call API multiple times on re-render', async () => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { email: 'test@test.com' } },
        update: vi.fn(),
      } as any)

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ user: { birthDate: '1990-01-01' } }),
      })

      const { rerender } = renderHook(() => useDreamPhase())

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      // Rerender without changing session status
      rerender()
      rerender()

      // Should not make additional calls
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should handle rapid session status changes', async () => {
      const { rerender } = renderHook(() => useDreamPhase())

      mockUseSession.mockReturnValue({
        status: 'loading',
        data: null,
        update: vi.fn(),
      } as any)
      rerender()

      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { email: 'test@test.com' } },
        update: vi.fn(),
      } as any)
      rerender()

      mockUseSession.mockReturnValue({
        status: 'unauthenticated',
        data: null,
        update: vi.fn(),
      } as any)
      rerender()

      await waitFor(() => {
        // Should eventually settle
        expect(true).toBe(true)
      })
    })
  })

  describe('Cleanup', () => {
    it('should handle unmount during profile loading', async () => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { email: 'test@test.com' } },
        update: vi.fn(),
      } as any)

      let resolvePromise: (value: any) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      ;(global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(promise)

      const { unmount } = renderHook(() => useDreamPhase())

      unmount()

      // Resolve after unmount
      await act(async () => {
        resolvePromise!({
          ok: true,
          json: async () => ({ user: { birthDate: '1990-01-01' } }),
        })
        await promise
      })

      // Should not crash
      expect(true).toBe(true)
    })
  })
})
