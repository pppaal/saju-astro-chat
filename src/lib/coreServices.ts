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
  labelFallback: string
  icon: string
  path: string
  coreKey: CoreServiceKey
}

export const HOME_CORE_SERVICE_OPTIONS: readonly HomeCoreServiceOption[] = [
  {
    key: 'destinyMap',
    labelKey: 'menu.destinyMap',
    labelFallback: 'Destiny Counselor',
    icon: '\u{1F5FA}\uFE0F',
    path: '/destiny-counselor',
    coreKey: 'destiny-map',
  },
  {
    key: 'calendar',
    labelKey: 'menu.calendar',
    labelFallback: 'Destiny Calendar',
    icon: '\u{1F4C5}',
    path: '/calendar',
    coreKey: 'calendar',
  },
  {
    key: 'tarot',
    labelKey: 'menu.tarot',
    labelFallback: 'Tarot',
    icon: '\u{1F52E}',
    path: '/tarot',
    coreKey: 'tarot',
  },
  {
    key: 'destinyMatrix',
    labelKey: 'history.services.destinyMatrix.title',
    labelFallback: 'Destiny Matrix',
    icon: '\u2728',
    path: '/destiny-map/matrix',
    coreKey: 'destiny-matrix',
  },
  {
    key: 'compatibility',
    labelKey: 'menu.compatibility',
    labelFallback: 'Compatibility',
    icon: '\u{1F495}',
    path: '/compatibility',
    coreKey: 'compatibility',
  },
  {
    key: 'report',
    labelKey: 'menu.report',
    labelFallback: 'Report',
    icon: '\u{1F4DC}',
    path: '/report',
    coreKey: 'report',
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
