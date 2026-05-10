// fusion/adapters — 서비스별 fusion 결과 가공.

export type {
  CalendarDay,
  CalendarMonth,
  CalendarDayDetail,
} from './types'

export {
  buildCalendarMonth,
  buildCalendarDay,
  type CalendarAdapterInput,
} from './forCalendar'
