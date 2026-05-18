/**
 * Accessibility Tests for GlobalHeader Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { axe } from './axe-helper'
import React from 'react'

// Mock next-auth
vi.mock('next-auth/react', () => {
  return {
    useSession: vi.fn(() => ({
      data: null,
      status: 'unauthenticated',
    })),
    signOut: vi.fn(),
  }
})

// Mock next/navigation
vi.mock('next/navigation', () => {
  return {
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
    }),
    usePathname: () => '/test',
  }
})

// Mock I18n
vi.mock('@/i18n/I18nProvider', () => {
  return {
    useI18n: () => ({
      t: (key: string) => key,
      locale: 'ko',
    }),
  }
})

// Import after mocks
import GlobalHeader from '@/components/ui/GlobalHeader'
import { useSession } from 'next-auth/react'

describe('Accessibility: GlobalHeader', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe('Unauthenticated state', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<GlobalHeader />)

      const results = await axe(container)
      expect(results.violations).toHaveLength(0)
    })

    it('should have proper banner role', () => {
      const { getByRole } = render(<GlobalHeader />)
      expect(getByRole('banner')).toBeInTheDocument()
    })

    it('should have accessible locale toggle button', () => {
      const { getByRole } = render(<GlobalHeader />)
      // Locale toggle is rendered in the header nav with an explicit aria-label
      const localeToggle = getByRole('button', { name: /switch to english/i })
      expect(localeToggle).toBeInTheDocument()
    })
  })

  describe('Authenticated state', () => {
    beforeEach(() => {
      vi.mocked(useSession).mockReturnValue({
        data: {
          user: { name: 'Test User', email: 'test@example.com' },
          expires: '2099-01-01',
        },
        status: 'authenticated',
        update: vi.fn(),
      })
    })

    it('should have no accessibility violations when logged in', async () => {
      const { container } = render(<GlobalHeader />)

      const results = await axe(container)
      expect(results.violations).toHaveLength(0)
    })

    it('should have accessible hamburger menu button', () => {
      const { getByRole } = render(<GlobalHeader />)

      // Account / user menu now lives inside the hamburger drawer.
      // The drawer toggle is the entry point we expose at header level.
      const hamburgerButton = getByRole('button', { name: /메뉴 열기|open menu/i })
      expect(hamburgerButton).toBeInTheDocument()
    })
  })

  describe('Keyboard navigation', () => {
    beforeEach(() => {
      vi.mocked(useSession).mockReturnValue({
        data: {
          user: { name: 'Test User', email: 'test@example.com' },
          expires: '2099-01-01',
        },
        status: 'authenticated',
        update: vi.fn(),
      })
    })

    it('should have focusable buttons', () => {
      const { getAllByRole } = render(<GlobalHeader />)
      const buttons = getAllByRole('button')

      buttons.forEach((button) => {
        expect(button).not.toHaveAttribute('tabindex', '-1')
      })
    })
  })
})
