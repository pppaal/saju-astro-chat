/**
 * destinypal adapters — barrel.
 *
 * 한 곳에서 본 adapter 모음을 import 하기 위한 re-export.
 * 신규 adapter 가 추가되면 이 파일에 export 한 줄 더하면 됨.
 */

export { toUser } from './toUser'
export type {
  DestinypalUser,
  DestinypalUserElements,
  DestinypalUserAstro,
  DestinypalUserSect,
  DestinypalUserAlmuten,
  DestinypalUserLot,
  ToUserOptions,
} from './toUser'

export { toLifeStages } from './toLifeStages'
export type {
  DestinypalLifeStage,
  DestinypalLifeStageDetail,
  ToLifeStagesOptions,
} from './toLifeStages'

export { toLifetime } from './toLifetime'
export type { ToLifetimeOptions } from './toLifetime'

export { toDaewoon } from './toDaewoon'
export type { DestinypalDaewoonEntry, ToDaewoonOptions } from './toDaewoon'

export { toMilestones } from './toMilestones'
export type { DestinypalMilestone } from './toMilestones'

export { toDecade } from './toDecade'
export type {
  DestinypalDecade,
  DestinypalDecadePillar,
  DestinypalDecadeYear,
  DestinypalDecadeNarrative,
  DestinypalDecadeAstroMark,
  DestinypalDecadeRelation,
  DestinypalDecadeCrossActivation,
  ToDecadeOptions,
} from './toDecade'

export { toYear } from './toYear'
export type {
  DestinypalYear,
  DestinypalYearProfection,
  DestinypalYearZRChapter,
  ToYearOptions,
} from './toYear'

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
