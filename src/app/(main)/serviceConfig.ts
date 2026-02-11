// Service options constant (outside component to prevent recreation)
export const SERVICE_OPTIONS = [
  { key: 'destinyMap', labelKey: 'menu.destinyMap', icon: '🗺️', path: '/destiny-map' },
  { key: 'calendar', labelKey: 'menu.calendar', icon: '🗓️', path: '/calendar' },
  { key: 'compatibility', labelKey: 'menu.compatibility', icon: '💕', path: '/compatibility' },
  { key: 'destinyMatch', labelKey: 'menu.destinyMatch', icon: '💘', path: '/destiny-match' },
  { key: 'icpPersonality', labelKey: 'menu.icpPersonality', icon: '🎭', path: '/personality' },
  { key: 'tarot', labelKey: 'menu.tarot', icon: '🔮', path: '/tarot' },
] as const

// Zodiac signs constant
export const ZODIAC_SIGNS = [
  '♈',
  '♉',
  '♊',
  '♋',
  '♌',
  '♍',
  '♎',
  '♏',
  '♐',
  '♑',
  '♒',
  '♓',
] as const

// Derived types
export type ServiceOption = (typeof SERVICE_OPTIONS)[number]
export type ServiceKey = ServiceOption['key']
