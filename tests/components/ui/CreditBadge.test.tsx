import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import CreditBadge, { triggerCreditUpdate } from '@/components/ui/CreditBadge'
import { useSession } from 'next-auth/react'

vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common.login': 'Login',
      }
      return translations[key] || key
    },
  }),
}))
vi.mock('@/lib/auth/signInUrl', () => ({
  buildSignInUrl: () => '/api/auth/signin',
}))

describe('CreditBadge', () => {
  const mockUseSession = useSession as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
    localStorage.clear()
  })

  describe('Session loading state', () => {
    it('should show loading spinner when session is loading', () => {
      mockUseSession.mockReturnValue({
        status: 'loading',
        data: null,
        update: vi.fn(),
      } as any)

      const { container } = render(<CreditBadge />)
      expect(container.querySelector('[class*="spinner"]')).toBeInTheDocument()
    })

    it('should return null for minimal variant when loading', () => {
      mockUseSession.mockReturnValue({
        status: 'loading',
        data: null,
        update: vi.fn(),
      } as any)

      const { container } = render(<CreditBadge variant="minimal" />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('Not logged in state', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        status: 'unauthenticated',
        data: null,
        update: vi.fn(),
      } as any)
    })

    it('should render nothing when not authenticated', () => {
      // 로그아웃 상태에선 좌상단 햄버거 드로어가 로그인 진입을 제공하므로
      // 코너 배지는 아무것도 렌더하지 않는다.
      const { container } = render(<CreditBadge />)
      expect(container.firstChild).toBeNull()
    })

    it('should return null for minimal variant when not logged in', () => {
      const { container } = render(<CreditBadge variant="minimal" />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('Logged in with credits', () => {
    const mockCreditData = {
      isLoggedIn: true,
      plan: 'premium',
      credits: {
        monthly: 100,
        used: 30,
        bonus: 20,
        remaining: 90,
        total: 120,
      },
    }

    beforeEach(() => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { email: 'test@test.com' } },
        update: vi.fn(),
      } as any)

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockCreditData,
      })
    })

    it('should fetch and display credits', async () => {
      render(<CreditBadge />)

      await waitFor(() => {
        expect(screen.getByText('90')).toBeInTheDocument()
        expect(screen.getByText('120')).toBeInTheDocument()
      })
    })

    it('should call credits API with correct endpoint', async () => {
      render(<CreditBadge />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/me/credits')
      })
    })
  })

  describe('Variants', () => {
    const mockCreditData = {
      isLoggedIn: true,
      plan: 'free',
      credits: {
        monthly: 10,
        used: 3,
        bonus: 0,
        remaining: 7,
        total: 10,
      },
    }

    beforeEach(() => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { email: 'test@test.com' } },
        update: vi.fn(),
      } as any)

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockCreditData,
      })
    })

    it('should display default variant correctly', async () => {
      render(<CreditBadge variant="default" />)

      await waitFor(() => {
        expect(screen.getByText('7')).toBeInTheDocument()
        expect(screen.getByText('10')).toBeInTheDocument()
      })
    })

    it('should display compact variant correctly', async () => {
      const { container } = render(<CreditBadge variant="compact" />)

      await waitFor(() => {
        expect(screen.getByText('7/10')).toBeInTheDocument()
        expect(container.querySelector('[class*="compact"]')).toBeInTheDocument()
      })
    })

    it('should display minimal variant correctly', async () => {
      const { container } = render(<CreditBadge variant="minimal" />)

      await waitFor(() => {
        expect(screen.getByText('7')).toBeInTheDocument()
        expect(container.querySelector('[class*="badgeMinimal"]')).toBeInTheDocument()
      })
    })
  })

  describe('Color coding based on credits', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { email: 'test@test.com' } },
        update: vi.fn(),
      } as any)
    })

    it('should show good color when credits > 50%', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          plan: 'free',
          credits: { monthly: 100, used: 40, bonus: 0, remaining: 60, total: 100 },
        }),
      })

      const { container } = render(<CreditBadge />)

      await waitFor(() => {
        expect(container.querySelector('[class*="good"]')).toBeInTheDocument()
      })
    })

    it('should show warning color when credits 20-50%', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          plan: 'free',
          credits: { monthly: 100, used: 70, bonus: 0, remaining: 30, total: 100 },
        }),
      })

      const { container } = render(<CreditBadge />)

      await waitFor(() => {
        expect(container.querySelector('[class*="warning"]')).toBeInTheDocument()
      })
    })

    it('should show low color when credits < 20%', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          plan: 'free',
          credits: { monthly: 100, used: 95, bonus: 0, remaining: 5, total: 100 },
        }),
      })

      const { container } = render(<CreditBadge />)

      await waitFor(() => {
        expect(container.querySelector('[class*="low"]')).toBeInTheDocument()
      })
    })
  })

  describe('Error handling', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { email: 'test@test.com' } },
        update: vi.fn(),
      } as any)
    })

    it('should render nothing when API fails', async () => {
      // 에러 시 혼란스러운 경고 아이콘 대신 아무것도 렌더하지 않는다.
      ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))

      const { container } = render(<CreditBadge />)

      await waitFor(() => {
        expect(container.firstChild).toBeNull()
      })
    })

    it('should render nothing when API returns not ok', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
      })

      const { container } = render(<CreditBadge />)

      await waitFor(() => {
        expect(container.firstChild).toBeNull()
      })
    })
  })

  describe('Credit update event', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { email: 'test@test.com' } },
        update: vi.fn(),
      } as any)

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          plan: 'free',
          credits: { monthly: 10, used: 5, bonus: 0, remaining: 5, total: 10 },
        }),
      })
    })

    it('should refetch credits on credit-update event', async () => {
      render(<CreditBadge />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      // Change mock to return different data
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          plan: 'free',
          credits: { monthly: 10, used: 7, bonus: 0, remaining: 3, total: 10 },
        }),
      })

      // Trigger update
      await act(async () => {
        triggerCreditUpdate()
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2)
      })
    })

    it('should cleanup event listener on unmount', async () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const { unmount } = render(<CreditBadge />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('credit-update', expect.any(Function))
    })
  })

  describe('Progress bar', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { email: 'test@test.com' } },
        update: vi.fn(),
      } as any)
    })

    it('should show progress bar in default variant', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          plan: 'free',
          credits: { monthly: 100, used: 40, bonus: 0, remaining: 60, total: 100 },
        }),
      })

      const { container } = render(<CreditBadge variant="default" />)

      await waitFor(() => {
        // CSS Module hashes class names, so use attribute selector
        const progressFill = container.querySelector('[class*="progressFill"]') as HTMLElement
        expect(progressFill).toBeInTheDocument()
        expect(progressFill.style.width).toBe('60%')
      })
    })

    it('should calculate percentage correctly with bonus credits', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          plan: 'premium',
          credits: { monthly: 100, used: 40, bonus: 20, remaining: 80, total: 120 },
        }),
      })

      const { container } = render(<CreditBadge variant="default" />)

      await waitFor(() => {
        // CSS Module hashes class names, so use attribute selector
        const progressFill = container.querySelector('[class*="progressFill"]') as HTMLElement
        expect(progressFill).toBeInTheDocument()
        // 80/120 = 66.66666666666666...%
        expect(progressFill.style.width).toMatch(/^66\.666/)
      })
    })

    it('should handle zero total credits', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          plan: 'free',
          credits: { monthly: 0, used: 0, bonus: 0, remaining: 0, total: 0 },
        }),
      })

      const { container } = render(<CreditBadge variant="default" />)

      await waitFor(() => {
        // CSS Module hashes class names, so use attribute selector
        const progressFill = container.querySelector('[class*="progressFill"]') as HTMLElement
        expect(progressFill).toBeInTheDocument()
        expect(progressFill.style.width).toBe('0%')
      })
    })
  })

  describe('Pricing page navigation', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { email: 'test@test.com' } },
        update: vi.fn(),
      } as any)

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          plan: 'free',
          credits: { monthly: 10, used: 5, bonus: 0, remaining: 5, total: 10 },
        }),
      })

      // Mock window.location
      delete (window as any).location
      ;(window as any).location = { pathname: '/dream' }
    })

    it('should save return URL when clicking badge', async () => {
      render(<CreditBadge />)

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument()
      })

      const link = screen.getByRole('link')
      fireEvent.click(link)

      expect(localStorage.getItem('checkout_return_url')).toBe('/dream')
    })

    it('should not save return URL when on pricing page', async () => {
      ;(window as any).location = { pathname: '/pricing' }

      render(<CreditBadge />)

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument()
      })

      const link = screen.getByRole('link')
      fireEvent.click(link)

      expect(localStorage.getItem('checkout_return_url')).toBeNull()
    })

    it('should link to pricing page', async () => {
      render(<CreditBadge />)

      await waitFor(() => {
        const link = screen.getByRole('link')
        expect(link).toHaveAttribute('href', '/pricing')
      })
    })
  })

  describe('Fallback total calculation', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { email: 'test@test.com' } },
        update: vi.fn(),
      } as any)
    })

    it('should use total field when provided', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          plan: 'premium',
          credits: { monthly: 100, used: 20, bonus: 50, remaining: 130, total: 150 },
        }),
      })

      render(<CreditBadge />)

      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument() // Uses total field
      })
    })

    it('should fallback to monthly + bonus when total is not provided', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          plan: 'premium',
          credits: { monthly: 100, used: 20, bonus: 50, remaining: 130 }, // No total field
        }),
      })

      render(<CreditBadge />)

      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument() // 100 + 50
      })
    })
  })

  describe('Custom className', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        status: 'authenticated',
        data: { user: { email: 'test@test.com' } },
        update: vi.fn(),
      } as any)

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          plan: 'free',
          credits: { monthly: 10, used: 5, bonus: 0, remaining: 5, total: 10 },
        }),
      })
    })

    it('should apply custom className', async () => {
      const { container } = render(<CreditBadge className="custom-class" />)

      await waitFor(() => {
        expect(container.querySelector('.custom-class')).toBeInTheDocument()
      })
    })
  })

  describe('triggerCreditUpdate helper', () => {
    it('should dispatch credit-update event', () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent')

      triggerCreditUpdate()

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'credit-update',
        })
      )
    })

    it('should handle undefined window gracefully', () => {
      const originalWindow = global.window
      delete (global as any).window

      expect(() => {
        triggerCreditUpdate()
      }).not.toThrow()

      ;(global as any).window = originalWindow
    })
  })
})
