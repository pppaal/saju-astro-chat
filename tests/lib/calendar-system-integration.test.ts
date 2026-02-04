// tests/integration/calendar-system.test.ts
import { describe, it, expect } from 'vitest'

describe('Calendar System Integration', () => {
  describe('Reducer', () => {
    it('should export calendar reducer and initial state', async () => {
      const { calendarReducer, initialCalendarState } = await import('@/reducers/calendarReducer')

      expect(typeof calendarReducer).toBe('function')
      expect(initialCalendarState).toBeDefined()
      expect(initialCalendarState.loading).toBe(false)
      expect(initialCalendarState.data).toBeNull()
      expect(initialCalendarState.error).toBeNull()
      expect(initialCalendarState.cacheHit).toBe(false)
      expect(initialCalendarState.hasBirthInfo).toBe(false)
    })

    it('should handle LOAD_START action', async () => {
      const { calendarReducer, initialCalendarState } = await import('@/reducers/calendarReducer')

      const newState = calendarReducer(initialCalendarState, { type: 'LOAD_START' })

      expect(newState.loading).toBe(true)
      expect(newState.error).toBeNull()
    })

    it('should handle LOAD_SUCCESS action', async () => {
      const { calendarReducer, initialCalendarState } = await import('@/reducers/calendarReducer')

      const mockData = {
        success: true,
        year: 2024,
        allDates: [],
      }

      const newState = calendarReducer(initialCalendarState, {
        type: 'LOAD_SUCCESS',
        payload: { data: mockData, cached: false },
      })

      expect(newState.loading).toBe(false)
      expect(newState.data).toEqual(mockData)
      expect(newState.cacheHit).toBe(false)
    })

    it('should handle TOGGLE_THEME action', async () => {
      const { calendarReducer, initialCalendarState } = await import('@/reducers/calendarReducer')

      const initialTheme = initialCalendarState.isDarkTheme
      const newState = calendarReducer(initialCalendarState, { type: 'TOGGLE_THEME' })

      expect(newState.isDarkTheme).toBe(!initialTheme)
    })
  })

  describe('Hooks', () => {
    it('should export useCalendarData hook', async () => {
      const { useCalendarData } = await import('@/hooks/calendar/useCalendarData')

      expect(typeof useCalendarData).toBe('function')
    })

    it('should export useSavedDates hook', async () => {
      const { useSavedDates } = await import('@/hooks/calendar/useSavedDates')

      expect(typeof useSavedDates).toBe('function')
    })

    it('should export useCitySearch hook', async () => {
      const { useCitySearch } = await import('@/hooks/calendar/useCitySearch')

      expect(typeof useCitySearch).toBe('function')
    })

    it('should export useProfileLoader hook', async () => {
      const { useProfileLoader } = await import('@/hooks/calendar/useProfileLoader')

      expect(typeof useProfileLoader).toBe('function')
    })

    it('should export useMonthNavigation hook', async () => {
      const { useMonthNavigation } = await import('@/hooks/calendar/useMonthNavigation')

      expect(typeof useMonthNavigation).toBe('function')
    })

    it('should export useParticleAnimation hook', async () => {
      const { useParticleAnimation } = await import('@/hooks/calendar/useParticleAnimation')

      expect(typeof useParticleAnimation).toBe('function')
    })
  })

  describe('Context', () => {
    it('should import context module', async () => {
      const module = await import('@/contexts/CalendarContext')

      expect(module).toBeDefined()
      // Context exists, basic check passed
    })
  })

  describe('Components', () => {
    it('should export BirthInfoForm', async () => {
      const BirthInfoForm = (await import('@/components/calendar/BirthInfoForm')).default

      expect(BirthInfoForm).toBeDefined()
      expect(typeof BirthInfoForm).toBe('function')
    }, 30000) // Increased timeout for complex component

    it('should export ParticleBackground', async () => {
      const ParticleBackground = (await import('@/components/calendar/ParticleBackground')).default

      expect(ParticleBackground).toBeDefined()
      expect(typeof ParticleBackground).toBe('function')
    })

    it('should export CalendarHeader', async () => {
      const CalendarHeader = (await import('@/components/calendar/CalendarHeader')).default

      expect(CalendarHeader).toBeDefined()
      expect(typeof CalendarHeader).toBe('function')
    })

    it('should export DayCell', async () => {
      const module = await import('@/components/calendar/DayCell')

      expect(module).toBeDefined()
      expect(module.default).toBeDefined()
    })

    it('should export CalendarGrid', async () => {
      const CalendarGrid = (await import('@/components/calendar/CalendarGrid')).default

      expect(CalendarGrid).toBeDefined()
      expect(typeof CalendarGrid).toBe('function')
    })

    it('should export FortuneGraph', async () => {
      const FortuneGraph = (await import('@/components/calendar/FortuneGraph')).default

      expect(FortuneGraph).toBeDefined()
      expect(typeof FortuneGraph).toBe('function')
    })

    it('should export SelectedDatePanel', async () => {
      const SelectedDatePanel = (await import('@/components/calendar/SelectedDatePanel')).default

      expect(SelectedDatePanel).toBeDefined()
      expect(typeof SelectedDatePanel).toMatch(/function|object/)
    })

    it('should export MonthNavigation', async () => {
      const MonthNavigation = (await import('@/components/calendar/MonthNavigation')).default

      expect(MonthNavigation).toBeDefined()
      expect(typeof MonthNavigation).toBe('function')
    })

    it('should export CategoryFilter', async () => {
      const CategoryFilter = (await import('@/components/calendar/CategoryFilter')).default

      expect(CategoryFilter).toBeDefined()
      expect(typeof CategoryFilter).toBe('function')
    })
  })

  describe('Module Structure', () => {
    it('should have all Week 3 refactored modules', async () => {
      // Check that all modules can be imported without errors
      const modules = await Promise.all([
        import('@/reducers/calendarReducer'),
        import('@/contexts/CalendarContext'),
        import('@/hooks/calendar/useCalendarData'),
        import('@/hooks/calendar/useSavedDates'),
        import('@/hooks/calendar/useCitySearch'),
        import('@/hooks/calendar/useProfileLoader'),
        import('@/hooks/calendar/useMonthNavigation'),
        import('@/hooks/calendar/useParticleAnimation'),
        import('@/components/calendar/BirthInfoForm'),
        import('@/components/calendar/ParticleBackground'),
        import('@/components/calendar/CalendarHeader'),
        import('@/components/calendar/DayCell'),
        import('@/components/calendar/CalendarGrid'),
        import('@/components/calendar/FortuneGraph'),
        import('@/components/calendar/SelectedDatePanel'),
        import('@/components/calendar/MonthNavigation'),
        import('@/components/calendar/CategoryFilter'),
      ])

      expect(modules.length).toBe(17)
      modules.forEach((module) => {
        expect(module).toBeDefined()
      })
    })

    it('should have all Week 2 refactored modules', async () => {
      const modules = await Promise.all([
        import('@/lib/destiny-map/calendar/scoring-factory'),
        import('@/lib/destiny-map/calendar/scoring-factory-config'),
        import('@/lib/destiny-map/calendar/scoring'),
      ])

      expect(modules.length).toBe(3)
      modules.forEach((module) => {
        expect(module).toBeDefined()
      })
    })

    it('should have all Week 4 modules', async () => {
      const modules = await Promise.all([
        import('@/lib/destiny-map/type-guards'),
        import('@/lib/validation/calendar-schema'),
      ])

      expect(modules.length).toBe(2)
      modules.forEach((module) => {
        expect(module).toBeDefined()
      })
    })
  })
})
