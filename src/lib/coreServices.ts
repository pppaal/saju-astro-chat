export const coreServiceKeys = [
  'destiny-map',
  'calendar',
  'tarot',
  'destiny-matrix',
  'icp-personality',
  'compatibility',
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
    labelFallback: 'Destiny Map',
    icon: '🗺️',
    path: '/destiny-map',
    coreKey: 'destiny-map',
  },
  {
    key: 'calendar',
    labelKey: 'menu.calendar',
    labelFallback: 'Destiny Calendar',
    icon: '🗓️',
    path: '/calendar',
    coreKey: 'calendar',
  },
  {
    key: 'tarot',
    labelKey: 'menu.tarot',
    labelFallback: 'Tarot',
    icon: '🔮',
    path: '/tarot',
    coreKey: 'tarot',
  },
  {
    key: 'destinyMatrix',
    labelKey: 'history.services.destinyMatrix.title',
    labelFallback: 'Destiny Matrix',
    icon: '🔷',
    path: '/destiny-map/matrix',
    coreKey: 'destiny-matrix',
  },
  {
    key: 'icpPersonality',
    labelKey: 'menu.icpPersonality',
    labelFallback: 'ICP + Personality',
    icon: '🎭',
    path: '/personality/select',
    coreKey: 'icp-personality',
  },
  {
    key: 'compatibility',
    labelKey: 'menu.compatibility',
    labelFallback: 'Compatibility',
    icon: '💕',
    path: '/compatibility',
    coreKey: 'compatibility',
  },
] as const

const MYJOURNEY_CORE_SERVICE_IDS = new Set([
  'destiny-map',
  'destiny-calendar',
  'tarot',
  'destiny-matrix',
  'personality-icp',
  'compatibility',
  // Legacy aliases seen in history payloads
  'destinyMap',
  'destinyCalendar',
  'destinyMatrix',
  'icp',
])

export function isMyJourneyCoreService(serviceId: string): boolean {
  return MYJOURNEY_CORE_SERVICE_IDS.has(serviceId)
}

export function filterMyJourneyCoreServices<T extends string>(serviceIds: readonly T[]): T[] {
  return serviceIds.filter((serviceId) => isMyJourneyCoreService(serviceId))
}
