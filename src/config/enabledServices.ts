export type EnabledServiceId =
  | 'destinyMap'
  | 'tarot'
  | 'report'
  | 'calendar'
  | 'compatibility'
  | 'personality'
  | 'icp'

export type EnabledService = {
  id: EnabledServiceId
  href: string
  icon: string
  menuKey: string
  descriptionKey: string
  label: {
    en: string
    ko: string
  }
  description: {
    en: string
    ko: string
  }
}

export const ENABLED_SERVICES: readonly EnabledService[] = [
  {
    id: 'destinyMap',
    href: '/destiny-map',
    icon: '🗺️',
    menuKey: 'menu.destinyMap',
    descriptionKey: 'services.destinyMap.desc',
    label: { en: 'Destiny Map', ko: '운명 지도' },
    description: { en: 'AI Fortune Analysis', ko: 'AI 운세 분석' },
  },
  {
    id: 'tarot',
    href: '/tarot',
    icon: '🔮',
    menuKey: 'menu.tarot',
    descriptionKey: 'services.tarot.desc',
    label: { en: 'Tarot', ko: '타로' },
    description: { en: 'Tarot Card Reading', ko: '타로 카드 리딩' },
  },
  {
    id: 'report',
    href: '/report',
    icon: '📜',
    menuKey: 'menu.report',
    descriptionKey: 'services.report.desc',
    label: { en: 'Report', ko: '리포트' },
    description: { en: 'Premium AI Reports', ko: '프리미엄 AI 리포트' },
  },
  {
    id: 'calendar',
    href: '/calendar',
    icon: '🗓️',
    menuKey: 'menu.calendar',
    descriptionKey: 'services.calendar.desc',
    label: { en: 'Calendar', ko: '캘린더' },
    description: { en: 'Important Timing Guide', ko: '중요한 타이밍 가이드' },
  },
  {
    id: 'compatibility',
    href: '/compatibility',
    icon: '💕',
    menuKey: 'menu.compatibility',
    descriptionKey: 'services.compatibility.desc',
    label: { en: 'Compatibility', ko: '궁합' },
    description: { en: 'Relationship Analysis', ko: '관계 궁합 분석' },
  },
  {
    id: 'personality',
    href: '/personality',
    icon: '🧠',
    menuKey: 'menu.personality',
    descriptionKey: 'services.personalityDesc',
    label: { en: 'Personality', ko: '성격분석' },
    description: { en: 'Personality Insights', ko: '성격 인사이트' },
  },
  {
    id: 'icp',
    href: '/icp',
    icon: '🎭',
    menuKey: 'menu.icp',
    descriptionKey: 'services.icpDesc',
    label: { en: 'ICP', ko: '대인관계 스타일' },
    description: { en: 'Interpersonal Circumplex Profile', ko: '대인관계 스타일 테스트' },
  },
] as const

export const REMOVED_PUBLIC_SERVICE_PREFIXES: readonly string[] = [
  '/astrology',
  '/saju',
  '/numerology',
  '/dream',
  '/iching',
  '/past-life',
  '/destiny-match',
  '/life-prediction',
] as const
