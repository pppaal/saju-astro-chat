import { ENABLED_SERVICES } from '@/config/enabledServices'

export type ServiceKey = (typeof ENABLED_SERVICES)[number]['id']

export type ServiceOption = {
  key: ServiceKey
  labelKey: string
  icon: string
  path: string
}

// Service options used by home search and about page
export const SERVICE_OPTIONS: readonly ServiceOption[] = ENABLED_SERVICES.map((service) => ({
  key: service.id,
  labelKey: service.menuKey,
  icon: service.icon,
  path: service.href,
}))

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
