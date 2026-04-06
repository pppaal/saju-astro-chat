import type { EventCategory } from './types'

export type SanitizedSlotType =
  | 'deepWork'
  | 'decision'
  | 'communication'
  | 'money'
  | 'relationship'
  | 'recovery'

export const SLOT_TYPE_LABELS_KO: Record<string, string> = {
  deepWork: '??',
  decision: '??',
  communication: '??',
  money: '??',
  relationship: '??',
  recovery: '??',
}

export const SLOT_TYPE_LABELS_EN: Record<string, string> = {
  deepWork: 'Deep Work',
  decision: 'Decision',
  communication: 'Communication',
  money: 'Money',
  relationship: 'Relationship',
  recovery: 'Recovery',
}

export const SLOT_TYPE_VALUES = [
  'deepWork',
  'decision',
  'communication',
  'money',
  'relationship',
  'recovery',
] as const satisfies ReadonlyArray<SanitizedSlotType>

const SLOT_TYPE_KEYS = new Set<SanitizedSlotType>(SLOT_TYPE_VALUES)

export const isSanitizedSlotType = (value: string): value is SanitizedSlotType =>
  SLOT_TYPE_KEYS.has(value as SanitizedSlotType)

export function normalizeTimelineSemanticKey(value: string): string {
  if (!value) return ''
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export const WHY_PATTERN_LABELS_KO: Record<string, string> = {
  speed_up_validation_down: '??? ???',
  risk_exposure_up: '??? ???',
  relationship_sensitivity_up: '?? ????',
  spending_impulse_up: '?? ???',
  recovery_need_up: '?? ???',
  signal_balance: '?? ??',
}

export const WHY_PATTERN_LABELS_EN: Record<string, string> = {
  speed_up_validation_down: 'speed up, validation down',
  risk_exposure_up: 'risk exposure up',
  relationship_sensitivity_up: 'relationship sensitivity up',
  spending_impulse_up: 'spending impulse up',
  recovery_need_up: 'recovery need up',
  signal_balance: 'signal balance',
}

export const CONFIDENCE_REASON_LABELS_KO: Record<string, string> = {
  'Evidence conflict': '?? ??',
  'Anchor shortage': '?? ??',
  'Low signal density': '?? ?? ??',
  'Risk window': '?? ??',
  'Low baseline confidence': '?? ??? ??',
  'Signals aligned': '?? ?? ??',
}

export const CONFIDENCE_REASON_LABELS_EN: Record<string, string> = {
  'Evidence conflict': 'Evidence conflict',
  'Anchor shortage': 'Anchor shortage',
  'Low signal density': 'Low signal density',
  'Risk window': 'Risk window',
  'Low baseline confidence': 'Low baseline confidence',
  'Signals aligned': 'Signals aligned',
}

export const DEFAULT_TODAY_KO = [
  '???? 3? ????',
  '??? ? 1? 25? ??',
  '?/?? ?? 10? ??',
]
export const DEFAULT_TODAY_EN = [
  'List your top 3 priorities',
  'Do one focused task for 25 minutes',
  'Reserve 10 minutes for recovery',
]

export const DEFAULT_WEEK_KO = [
  '?? ? ?? 1? ??',
  '?? ?? 1?? ???? ??',
  '?? ?? 1? ??',
  '??? 10? ??',
]
export const DEFAULT_WEEK_EN = [
  'Set one weekly goal',
  'Block one key schedule on the calendar',
  'Make one recovery slot',
  'Do a 10-minute review on the weekend',
]

export const CATEGORY_ACTIONS: Record<
  EventCategory,
  { day: { ko: string[]; en: string[] }; week: { ko: string[]; en: string[] } }
> = {
  wealth: {
    day: {
      ko: ['?? ?? ?? ? ??', '??/?? ?? ?? 1?', '?? ?? 1? ??'],
      en: ['Check spending limits and log', 'Make one income/transaction follow-up', 'Tidy one budget item'],
    },
    week: {
      ko: ['??/?? ?? 1?', '??/?? ?? 1? ??', '???? ??'],
      en: ['Review income/expenses once', 'Set one saving/investment goal', 'Organize cash flow'],
    },
  },
  career: {
    day: {
      ko: ['?? ?? 1? ???', '??/?? ?? ?? 1?', '?? ?? 1? ??'],
      en: ['Finish one core task', 'Share progress once', 'Define the next action'],
    },
    week: {
      ko: ['?? ??/??? 1?', '?? ??/?? 1? ??', '?? ?? 1? ??'],
      en: ['Share results/report once', 'Advance one key meeting/proposal', 'Apply one workflow improvement'],
    },
  },
  love: {
    day: {
      ko: ['??? ??? 1?', '?? 20? ??', '?? ?? 1??'],
      en: ['Send one warm message', 'Secure 20 minutes of conversation', 'Do one caring action'],
    },
    week: {
      ko: ['??/??? ?? ??', '?? ?? ?? 1?', '??/?? ?? 1?'],
      en: ['Confirm a date/meetup', 'Have one repair conversation', 'Express gratitude/compliment once'],
    },
  },
  health: {
    day: {
      ko: ['30? ??? ??', '?? ?? ??', '?/?? ??'],
      en: ['30-minute light workout', 'Check sleep routine', 'Hydration and diet care'],
    },
    week: {
      ko: ['?? 2-3? ??', '??/?? ????? ??', '????/?? ?? 1?'],
      en: ['Schedule 2-3 workouts', 'Review sleep/diet checklist', 'One stretch/recovery routine'],
    },
  },
  travel: {
    day: {
      ko: ['??/?? ??', '?? ??? ??', '??/?? ??'],
      en: ['Check route/movements', 'Verify essentials checklist', 'Confirm reservations/timing'],
    },
    week: {
      ko: ['??/?? ??', '??/?? ??', '?? ?? ??'],
      en: ['Finalize itinerary/routes', 'Organize reservations/budget', 'Prepare a backup plan'],
    },
  },
  study: {
    day: {
      ko: ['?? ?? 45?', '?? 20?', '??/?? ??'],
      en: ['45-minute focused study', '20-minute review', 'Organize notes/summary'],
    },
    week: {
      ko: ['?? ?? ?? ??', '???/?? 1?', '?? ?? ??'],
      en: ['Plan weekly study', 'Join one study/lecture', 'Log progress'],
    },
  },
  general: {
    day: {
      ko: ['???? ???', '?? ?? 1?', '?? ?? ??'],
      en: ['Reset priorities', 'Do one small cleanup', 'Secure recovery time'],
    },
    week: {
      ko: ['?? ?? 1? ??', '??/?? 1?', '?? ?? 1?'],
      en: ['Set one weekly goal', 'One organize/cleanup session', 'One weekly review'],
    },
  },
}

export const isEventCategory = (value: string): value is EventCategory =>
  Object.prototype.hasOwnProperty.call(CATEGORY_ACTIONS, value)

export const normalizeCategory = (value?: string | null): EventCategory =>
  value && isEventCategory(value) ? value : 'general'
