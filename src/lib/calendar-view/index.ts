/**
 * calendar-view — 캘린더 엔진 결과(CalendarCell·NatalContext) → 화면용 뷰모델 adapter 모음(barrel).
 *
 * 순수 함수만 둔다(React·'use client'·I/O 없음). 서버 어셈블러(app/calendar/assemble*)와
 * lib(push/keyDay)가 함께 쓰므로 components 가 아닌 lib 에 산다 — components/app import 금지.
 * 신규 adapter 가 추가되면 이 파일에 export 한 줄 더하면 됨.
 */

export { toUser } from './toUser'
export type { DestinypalUser, DestinypalUserElements, ToUserOptions } from './toUser'

export type {
  DestinypalLifeStage,
  DestinypalLifeStageDetail,
  ToLifeStagesOptions,
} from './toLifeStages'

export { toLifetime } from './toLifetime'
export type { ToLifetimeOptions } from './toLifetime'

export type { DestinypalDaewoonEntry, ToDaewoonOptions } from './toDaewoon'

export type { DestinypalMilestone } from './toMilestones'

export { toMonth } from './toMonth'
export type {
  DestinypalMonth,
  DestinypalMonthNarrativeItem,
  DestinypalMonthConvergence,
  DestinypalCalendarDay,
  ToMonthOptions,
} from './toMonth'

export { toDay } from './toDay'
export type {
  DestinypalDay,
  DestinypalDaySignal,
  DestinypalDayTransit,
  DestinypalDayAppliedPattern,
  DestinypalDayCrossActivation,
  DestinypalDayGongmang,
  DestinypalDayJijangganLayer,
  ToDayOptions,
} from './toDay'

export type { Ganji } from './shared'
