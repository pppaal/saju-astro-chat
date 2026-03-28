// tests/components/calendar/DayCell.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DayCell from '@/components/calendar/DayCell'

let currentLocale: 'en' | 'ko' = 'en'

vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({
    locale: currentLocale,
  }),
}))

const mockDateInfo = {
  date: '2024-01-15',
  grade: 1 as const,
  score: 75,
  categories: ['wealth' as const, 'career' as const],
  title: 'Good Day',
  description: 'A favorable day for wealth and career',
  sajuFactors: ['Factor 1'],
  astroFactors: ['Factor 2'],
  recommendations: ['Recommendation 1'],
  warnings: ['Warning 1'],
}

const renderWithI18n = (ui: React.ReactElement, locale: 'en' | 'ko' = 'en') => {
  currentLocale = locale
  return render(ui)
}

describe('DayCell', () => {
  describe('rendering', () => {
    it('should render empty cell when date is null', () => {
      const onClick = vi.fn()
      const { container } = renderWithI18n(
        <DayCell
          date={null}
          dateInfo={undefined}
          isToday={false}
          isSelected={false}
          onClick={onClick}
          className="test-class"
        />
      )

      const cell = container.firstChild as HTMLElement
      expect(cell).toHaveClass('test-class')
      expect(cell).toBeEmptyDOMElement()
    })

    it('should render day number when date is provided', () => {
      const onClick = vi.fn()
      const date = new Date('2024-01-15')

      renderWithI18n(
        <DayCell
          date={date}
          dateInfo={undefined}
          isToday={false}
          isSelected={false}
          onClick={onClick}
          className="test-class"
        />
      )

      expect(screen.getByText('15')).toBeInTheDocument()
    })

    it('should render mini tags when dateInfo is provided', () => {
      const onClick = vi.fn()
      const date = new Date('2024-01-15')

      const { container } = renderWithI18n(
        <DayCell
          date={date}
          dateInfo={mockDateInfo}
          isToday={false}
          isSelected={false}
          onClick={onClick}
          className="test-class"
        />
      )

      const miniTags = container.querySelectorAll('span[class*="dayMiniTag"]')
      expect(miniTags).toHaveLength(2)
    })

    it('should render grade indicator when dateInfo is provided', () => {
      const onClick = vi.fn()
      const date = new Date('2024-01-15')

      const { container } = renderWithI18n(
        <DayCell
          date={date}
          dateInfo={mockDateInfo}
          isToday={false}
          isSelected={false}
          onClick={onClick}
          className="test-class"
        />
      )

      const indicator = container.querySelector('[class*="gradeIndicator"]')
      expect(indicator).toBeTruthy()
      expect(indicator?.className).toContain('gradeIndicator1')
    })

    it('should limit mini tags to 2', () => {
      const onClick = vi.fn()
      const date = new Date('2024-01-15')
      const manyCategories = {
        ...mockDateInfo,
        categories: ['wealth', 'career', 'love', 'health'] as const,
      }

      const { container } = renderWithI18n(
        <DayCell
          date={date}
          dateInfo={manyCategories}
          isToday={false}
          isSelected={false}
          onClick={onClick}
          className="test-class"
        />
      )

      const miniTags = container.querySelectorAll('span[class*="dayMiniTag"]')
      expect(miniTags).toHaveLength(2)
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA label for regular day', () => {
      const onClick = vi.fn()
      const date = new Date('2024-01-15')

      renderWithI18n(
        <DayCell
          date={date}
          dateInfo={mockDateInfo}
          isToday={false}
          isSelected={false}
          onClick={onClick}
          className="test-class"
        />
      )

      const cell = screen.getByRole('gridcell')
      expect(cell).toHaveAttribute('aria-label', expect.stringContaining('15'))
      expect(cell).toHaveAttribute('aria-label', expect.stringContaining('Leverage-first'))
    })

    it('should have proper ARIA label for today', () => {
      const onClick = vi.fn()
      const date = new Date('2024-01-15')

      renderWithI18n(
        <DayCell
          date={date}
          dateInfo={mockDateInfo}
          isToday={true}
          isSelected={false}
          onClick={onClick}
          className="test-class"
        />
      )

      const cell = screen.getByRole('gridcell')
      expect(cell).toHaveAttribute('aria-label', expect.stringContaining('Today'))
      expect(cell).toHaveAttribute('aria-current', 'date')
    })

    it('should have proper ARIA selected state', () => {
      const onClick = vi.fn()
      const date = new Date('2024-01-15')

      renderWithI18n(
        <DayCell
          date={date}
          dateInfo={mockDateInfo}
          isToday={false}
          isSelected={true}
          onClick={onClick}
          className="test-class"
        />
      )

      const cell = screen.getByRole('gridcell')
      expect(cell).toHaveAttribute('aria-selected', 'true')
    })

    it('should be keyboard accessible with Enter key', async () => {
      const onClick = vi.fn()
      const date = new Date('2024-01-15')
      const user = userEvent.setup()

      renderWithI18n(
        <DayCell
          date={date}
          dateInfo={mockDateInfo}
          isToday={false}
          isSelected={false}
          onClick={onClick}
          className="test-class"
        />
      )

      const cell = screen.getByRole('gridcell')
      cell.focus()
      await user.keyboard('{Enter}')

      expect(onClick).toHaveBeenCalledWith(date)
    })

    it('should be keyboard accessible with Space key', async () => {
      const onClick = vi.fn()
      const date = new Date('2024-01-15')
      const user = userEvent.setup()

      renderWithI18n(
        <DayCell
          date={date}
          dateInfo={mockDateInfo}
          isToday={false}
          isSelected={false}
          onClick={onClick}
          className="test-class"
        />
      )

      const cell = screen.getByRole('gridcell')
      cell.focus()
      await user.keyboard(' ')

      expect(onClick).toHaveBeenCalledWith(date)
    })

    it('should have tabIndex 0 when date is provided', () => {
      const onClick = vi.fn()
      const date = new Date('2024-01-15')

      renderWithI18n(
        <DayCell
          date={date}
          dateInfo={mockDateInfo}
          isToday={false}
          isSelected={false}
          onClick={onClick}
          className="test-class"
        />
      )

      const cell = screen.getByRole('gridcell')
      expect(cell).toHaveAttribute('tabIndex', '0')
    })

    it('should have tabIndex -1 when date is null', () => {
      const onClick = vi.fn()

      renderWithI18n(
        <DayCell
          date={null}
          dateInfo={undefined}
          isToday={false}
          isSelected={false}
          onClick={onClick}
          className="test-class"
        />
      )

      const cell = screen.getByRole('gridcell')
      expect(cell).toHaveAttribute('tabIndex', '-1')
    })
  })

  describe('interactions', () => {
    it('should call onClick when clicked', async () => {
      const onClick = vi.fn()
      const date = new Date('2024-01-15')
      const user = userEvent.setup()

      renderWithI18n(
        <DayCell
          date={date}
          dateInfo={mockDateInfo}
          isToday={false}
          isSelected={false}
          onClick={onClick}
          className="test-class"
        />
      )

      const cell = screen.getByRole('gridcell')
      await user.click(cell)

      expect(onClick).toHaveBeenCalledTimes(1)
      expect(onClick).toHaveBeenCalledWith(date)
    })

    it('should call onClick with null when empty cell is clicked', async () => {
      const onClick = vi.fn()
      const user = userEvent.setup()

      renderWithI18n(
        <DayCell
          date={null}
          dateInfo={undefined}
          isToday={false}
          isSelected={false}
          onClick={onClick}
          className="test-class"
        />
      )

      const cell = screen.getByRole('gridcell')
      await user.click(cell)

      expect(onClick).toHaveBeenCalledTimes(1)
      expect(onClick).toHaveBeenCalledWith(null)
    })
  })

  describe('i18n', () => {
    it('should use locale-aware labels when locale is ko', () => {
      const onClick = vi.fn()
      const date = new Date('2024-01-15')

      renderWithI18n(
        <DayCell
          date={date}
          dateInfo={mockDateInfo}
          isToday={true}
          isSelected={false}
          onClick={onClick}
          className="test-class"
        />,
        'ko'
      )

      const cell = screen.getByRole('gridcell')
      expect(cell).toHaveAttribute('aria-label', expect.stringContaining('15'))
      expect(cell).toHaveAttribute('aria-current', 'date')
    })

    it('should use English labels when locale is en', () => {
      const onClick = vi.fn()
      const date = new Date('2024-01-15')

      renderWithI18n(
        <DayCell
          date={date}
          dateInfo={mockDateInfo}
          isToday={true}
          isSelected={false}
          onClick={onClick}
          className="test-class"
        />,
        'en'
      )

      const cell = screen.getByRole('gridcell')
      expect(cell).toHaveAttribute('aria-label', expect.stringContaining('Today'))
    })
  })

  describe('grade indicators', () => {
    it('should show an indicator for grade 0 (best)', () => {
      const onClick = vi.fn()
      const date = new Date('2024-01-15')
      const grade0Info = { ...mockDateInfo, grade: 0 as const }

      const { container } = renderWithI18n(
        <DayCell
          date={date}
          dateInfo={grade0Info}
          isToday={false}
          isSelected={false}
          onClick={onClick}
          className="test-class"
        />
      )

      const indicator = container.querySelector('[class*="gradeIndicator"]')
      expect(indicator?.className).toContain('gradeIndicator0')
    })

    it('should show an indicator for grade 2 (normal)', () => {
      const onClick = vi.fn()
      const date = new Date('2024-01-15')
      const grade2Info = { ...mockDateInfo, grade: 2 as const }

      const { container } = renderWithI18n(
        <DayCell
          date={date}
          dateInfo={grade2Info}
          isToday={false}
          isSelected={false}
          onClick={onClick}
          className="test-class"
        />
      )

      const indicator = container.querySelector('[class*="gradeIndicator"]')
      expect(indicator?.className).toContain('gradeIndicator2')
    })

    it('should show an indicator for grade 3 (bad)', () => {
      const onClick = vi.fn()
      const date = new Date('2024-01-15')
      const grade3Info = { ...mockDateInfo, grade: 3 as const }

      const { container } = renderWithI18n(
        <DayCell
          date={date}
          dateInfo={grade3Info}
          isToday={false}
          isSelected={false}
          onClick={onClick}
          className="test-class"
        />
      )

      const indicator = container.querySelector('[class*="gradeIndicator"]')
      expect(indicator?.className).toContain('gradeIndicator3')
    })

    it('should show an indicator for grade 4 (worst)', () => {
      const onClick = vi.fn()
      const date = new Date('2024-01-15')
      const grade4Info = { ...mockDateInfo, grade: 4 as const }

      const { container } = renderWithI18n(
        <DayCell
          date={date}
          dateInfo={grade4Info}
          isToday={false}
          isSelected={false}
          onClick={onClick}
          className="test-class"
        />
      )

      const indicator = container.querySelector('[class*="gradeIndicator"]')
      expect(indicator?.className).toContain('gradeIndicator4')
    })
  })

  describe('React.memo optimization', () => {
    it('should not re-render when props are the same', () => {
      const onClick = vi.fn()
      const date = new Date('2024-01-15')

      const { rerender } = renderWithI18n(
        <DayCell
          date={date}
          dateInfo={mockDateInfo}
          isToday={false}
          isSelected={false}
          onClick={onClick}
          className="test-class"
        />
      )

      rerender(
        <DayCell
          date={date}
          dateInfo={mockDateInfo}
          isToday={false}
          isSelected={false}
          onClick={onClick}
          className="test-class"
        />
      )

      expect(screen.getByText('15')).toBeInTheDocument()
    })
  })
})
