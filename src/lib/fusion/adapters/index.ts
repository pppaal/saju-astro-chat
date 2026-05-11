// fusion/adapters — 서비스별 fusion 결과 가공.

export type {
  CalendarDay,
  CalendarMonth,
  CalendarDayDetail,
  CalendarYear,
  CalendarHourly,
  CalendarHourSlot,
  DayGrade,
} from './types'

export {
  buildCalendarMonth,
  buildCalendarDay,
  buildCalendarYear,
  buildCalendarHourly,
  type CalendarAdapterInput,
} from './forCalendar'
