export const coreServiceKeys = [
  'destiny-map',
  'calendar',
  'tarot',
  'destiny-matrix',
  'compatibility',
  'report',
] as const

export type CoreServiceKey = (typeof coreServiceKeys)[number]

export type HomeCoreServiceOption = {
  key: string
  labelKey: string
  labelFallback: {
    ko: string
    en: string
  }
  icon: string
  path: string
  coreKey: CoreServiceKey
}

export const HOME_CORE_SERVICE_OPTIONS: readonly HomeCoreServiceOption[] = [
  {
    key: 'destinyMap',
    labelKey: 'landing.homeServiceDestinyCounselor',
    labelFallback: {
      ko: 'AI 상담사',
      en: 'AI Counselor',
    },
    icon: '\u{1F5FA}\uFE0F',
    path: '/destiny-counselor',
    coreKey: 'destiny-map',
  },
  {
    key: 'tarot',
    labelKey: 'menu.tarot',
    labelFallback: {
      ko: '타로',
      en: 'Tarot',
    },
    icon: '\u{1F52E}',
    path: '/tarot',
    coreKey: 'tarot',
  },
  {
    key: 'report',
    labelKey: 'menu.report',
    labelFallback: {
      ko: '리포트',
      en: 'Report',
    },
    icon: '\u{1F4DC}',
    path: '/report',
    coreKey: 'report',
  },
  {
    key: 'calendar',
    labelKey: 'menu.calendar',
    labelFallback: {
      ko: '운세 캘린더',
      en: 'Fortune Calendar',
    },
    icon: '\u{1F4C5}',
    path: '/calendar',
    coreKey: 'calendar',
  },
] as const

const MYJOURNEY_CORE_SERVICE_IDS = new Set([
  'destiny-map',
  'destiny-calendar',
  'tarot',
  'destiny-matrix',
  'compatibility',
  'premium-reports',
  // Legacy aliases seen in history payloads
  'destinyMap',
  'destinyCalendar',
  'destinyMatrix',
  'report',
])

export function isMyJourneyCoreService(serviceId: string): boolean {
  return MYJOURNEY_CORE_SERVICE_IDS.has(serviceId)
}

export function filterMyJourneyCoreServices<T extends string>(serviceIds: readonly T[]): T[] {
  return serviceIds.filter((serviceId) => isMyJourneyCoreService(serviceId))
}
