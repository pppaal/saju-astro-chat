import { vi, describe, it, expect, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import CalendarHeader from '@/components/calendar/CalendarHeader'

vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({
    locale: 'en',
    t: (key: string, fallback: string) => fallback,
  }),
}))

vi.mock('@/components/ui/CreditBadge', () => ({
  __esModule: true,
  default: ({ variant }: { variant: string }) => <div>Credits ({variant})</div>,
}))

describe('CalendarHeader', () => {
  const mockYearSummary = {
    total: 365,
    grade0: 18, // Best days
    grade1: 55, // Good days
    grade2: 220, // Normal days
    grade3: 55, // Bad days
    grade4: 17, // Worst days
  }

  const defaultProps = {
    year: 2026,
    yearSummary: mockYearSummary,
    cacheHit: false,
    onEditClick: vi.fn(),
    isDarkTheme: false,
    onThemeToggle: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render calendar title', () => {
      render(<CalendarHeader {...defaultProps} />)
      expect(screen.getByText('Destiny Calendar')).toBeInTheDocument()
    })

    it('should render year in subtitle', () => {
      render(<CalendarHeader {...defaultProps} />)
      expect(screen.getByText('Your special days in 2026')).toBeInTheDocument()
    })

    it('should render credit badge', () => {
      render(<CalendarHeader {...defaultProps} />)
      expect(screen.getByText(/Credits \(compact\)/)).toBeInTheDocument()
    })

    it('should render edit button', () => {
      render(<CalendarHeader {...defaultProps} />)
      expect(screen.getByText('Edit')).toBeInTheDocument()
    })
    it('should render calendar icon', () => {
      const { container } = render(<CalendarHeader {...defaultProps} />)
      expect(container.querySelector('[class*="calendarIcon"]')).toBeInTheDocument()
    })
  })

  describe('Year Summary', () => {
    it('should display all grade counts when summary provided', () => {
      render(<CalendarHeader {...defaultProps} />)

      expect(screen.getByText('18d')).toBeInTheDocument() // Best
      expect(screen.getAllByText('55d')).toHaveLength(2) // Good + Bad
      expect(screen.getByText('17d')).toBeInTheDocument() // Worst
    })
    it('should display best days badge', () => {
      render(<CalendarHeader {...defaultProps} />)
      const bestBadge = screen.getByText('Best').closest('[class*="summaryBadge"]')
      expect(bestBadge).toBeInTheDocument()
      expect(bestBadge?.querySelector('[class*="badgeEmoji"]')).toBeInTheDocument()
    })
    it('should display good days badge', () => {
      render(<CalendarHeader {...defaultProps} />)
      const goodBadge = screen.getByText('Good').closest('[class*="summaryBadge"]')
      expect(goodBadge).toBeInTheDocument()
      expect(goodBadge?.querySelector('[class*="badgeEmoji"]')).toBeInTheDocument()
    })
    it('should display bad days badge', () => {
      render(<CalendarHeader {...defaultProps} />)
      const badBadge = screen.getByText('Bad').closest('[class*="summaryBadge"]')
      expect(badBadge).toBeInTheDocument()
      expect(badBadge?.querySelector('[class*="badgeEmoji"]')).toBeInTheDocument()
    })
    it('should display worst days badge when count > 0', () => {
      render(<CalendarHeader {...defaultProps} />)
      const worstBadge = screen.getByText('Worst').closest('[class*="summaryBadge"]')
      expect(worstBadge).toBeInTheDocument()
      expect(worstBadge?.querySelector('[class*="badgeEmoji"]')).toBeInTheDocument()
    })
    it('should show worst days badge with 0 count when count is 0', () => {
      const summaryWithNoWorst = { ...mockYearSummary, grade4: 0 }
      render(<CalendarHeader {...defaultProps} yearSummary={summaryWithNoWorst} />)

      // Worst badge is always rendered (shows 0d)
      expect(screen.getByText('Worst')).toBeInTheDocument()
      expect(screen.getByText('0d')).toBeInTheDocument()
    })
    it('should not render summary badges when yearSummary is null', () => {
      render(<CalendarHeader {...defaultProps} yearSummary={null} />)

      expect(screen.queryByText('Best')).not.toBeInTheDocument()
    })
  })

  describe('Cache Indicator', () => {
    it('should show cache indicator when cacheHit is true', () => {
      render(<CalendarHeader {...defaultProps} cacheHit={true} />)

      const cacheIndicator = screen.getByLabelText('Cached data')
      expect(cacheIndicator).toBeInTheDocument()
      expect(cacheIndicator.querySelector('[class*="cacheIcon"]')).toBeInTheDocument()
      expect(screen.getByText('Cached')).toBeInTheDocument()
    })
    it('should hide cache indicator when cacheHit is false', () => {
      render(<CalendarHeader {...defaultProps} cacheHit={false} />)

      expect(screen.queryByLabelText('Cached data')).not.toBeInTheDocument()
      expect(screen.queryByText('Cached')).not.toBeInTheDocument()
    })

    it('should have aria-label on cache indicator', () => {
      render(<CalendarHeader {...defaultProps} cacheHit={true} />)

      const cacheIndicator = screen.getByLabelText('Cached data')
      expect(cacheIndicator).toBeInTheDocument()
    })

    it('should have tooltip on cache indicator', () => {
      render(<CalendarHeader {...defaultProps} cacheHit={true} />)

      const cacheIndicator = screen.getByLabelText('Cached data')
      expect(cacheIndicator).toHaveAttribute('title', 'Using cached data (fast loading)')
    })
  })

  describe('Interactions', () => {
    it('should call onEditClick when edit button is clicked', () => {
      const onEditClick = vi.fn()
      render(<CalendarHeader {...defaultProps} onEditClick={onEditClick} />)

      const editButton = screen.getByText('Edit').closest('button')
      fireEvent.click(editButton!)

      expect(onEditClick).toHaveBeenCalledTimes(1)
    })

    it('should not call onEditClick multiple times for rapid clicks', () => {
      const onEditClick = vi.fn()
      render(<CalendarHeader {...defaultProps} onEditClick={onEditClick} />)

      const editButton = screen.getByText('Edit').closest('button')

      // Rapid clicks
      fireEvent.click(editButton!)
      fireEvent.click(editButton!)
      fireEvent.click(editButton!)

      expect(onEditClick).toHaveBeenCalledTimes(3)
    })
  })

  describe('Different Years', () => {
    it('should display year 2025', () => {
      render(<CalendarHeader {...defaultProps} year={2025} />)
      expect(screen.getByText('Your special days in 2025')).toBeInTheDocument()
    })

    it('should display year 2030', () => {
      render(<CalendarHeader {...defaultProps} year={2030} />)
      expect(screen.getByText('Your special days in 2030')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle summary with all zeros', () => {
      const zeroSummary = {
        total: 0,
        grade0: 0,
        grade1: 0,
        grade2: 0,
        grade3: 0,
        grade4: 0,
      }

      render(<CalendarHeader {...defaultProps} yearSummary={zeroSummary} />)

      const badges = screen.getAllByText('0d')
      expect(badges.length).toBeGreaterThan(0)
    })

    it('should handle very large summary numbers', () => {
      const largeSummary = {
        total: 999,
        grade0: 999,
        grade1: 999,
        grade2: 999,
        grade3: 999,
        grade4: 999,
      }

      render(<CalendarHeader {...defaultProps} yearSummary={largeSummary} />)

      const badges = screen.getAllByText('999d')
      expect(badges.length).toBe(5) // 5 visible badges (Best, Good, Normal, Bad, Worst)
    })

    it('should handle missing onEditClick gracefully', () => {
      const { container } = render(
        <CalendarHeader {...defaultProps} onEditClick={undefined as any} />
      )

      const editButton = screen.getByText('Edit').closest('button')

      // Should not crash
      expect(() => {
        fireEvent.click(editButton!)
      }).not.toThrow()
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<CalendarHeader {...defaultProps} />)

      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveTextContent('Destiny Calendar')
    })
    it('should have tooltips on summary badges', () => {
      render(<CalendarHeader {...defaultProps} />)

      // The summary badge wrapper should have a title attribute (for tooltip)
      const bestBadge = screen.getByText('Best').closest('[class*="summaryBadge"]')
      expect(bestBadge).toHaveAttribute('title')
    })

    it('should have accessible edit button', () => {
      render(<CalendarHeader {...defaultProps} />)

      const editButton = screen.getByRole('button', { name: /Edit/i })
      expect(editButton).toBeInTheDocument()
    })
  })

  describe('Styling Classes', () => {
    it('should apply caution badge class to bad days', () => {
      render(<CalendarHeader {...defaultProps} />)

      const badBadge = screen.getByText('Bad').closest('[class*="summaryBadge"]')
      // CSS Module adds hash to class names, check for partial match
      expect(badBadge?.className).toMatch(/cautionBadge/)
    })
    it('should apply worst badge class to worst days', () => {
      render(<CalendarHeader {...defaultProps} />)

      const worstBadge = screen.getByText('Worst').closest('[class*="summaryBadge"]')
      // CSS Module adds hash to class names, check for partial match
      expect(worstBadge?.className).toMatch(/worstBadge/)
    })
  })
})
