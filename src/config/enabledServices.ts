export type EnabledServiceId = 'destinyMap' | 'tarot' | 'calendar' | 'compatibility'

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

const ALL_SERVICES: readonly EnabledService[] = [
  {
    id: 'destinyMap',
    href: '/destiny-counselor',
    icon: '🗺️',
    menuKey: 'menu.destinyMap',
    descriptionKey: 'services.destinyMap.desc',
    label: { en: 'East-West Astrology', ko: '동서 점성 상담사' },
    description: { en: 'AI Counseling', ko: 'AI 운명 상담' },
  },
  {
    id: 'tarot',
    href: '/tarot',
    icon: '🔮',
    menuKey: 'menu.tarot',
    descriptionKey: 'services.tarot.desc',
    label: { en: 'Tarot Counselor', ko: '타로 상담사' },
    description: { en: 'Tarot Card Reading', ko: '타로 카드 리딩' },
  },
  {
    id: 'calendar',
    href: '/calendar',
    icon: '🗓️',
    menuKey: 'menu.calendar',
    descriptionKey: 'services.calendar.desc',
    label: { en: 'Yearly/Monthly/Daily Fortune', ko: '일·월·년 운세' },
    description: { en: 'Important Timing Guide', ko: '중요한 타이밍 가이드' },
  },
  {
    id: 'compatibility',
    href: '/compatibility',
    icon: '💕',
    menuKey: 'menu.compatibility',
    descriptionKey: 'services.compatibility.desc',
    label: { en: 'Compatibility Counselor', ko: '궁합 상담사' },
    description: { en: 'Relationship Analysis', ko: '관계 궁합 분석' },
  },
] as const

const ACTIVE_PUBLIC_SERVICE_IDS: readonly EnabledServiceId[] = [
  'destinyMap',
  'tarot',
  'compatibility',
  'calendar',
] as const

const ACTIVE_SERVICE_SET = new Set<EnabledServiceId>(ACTIVE_PUBLIC_SERVICE_IDS)

export const ENABLED_SERVICES: readonly EnabledService[] = ALL_SERVICES.filter((service) =>
  ACTIVE_SERVICE_SET.has(service.id)
)

// 옛 서비스 경로 — 라우트 폴더 자체는 삭제됨 (Next.js 가 자동 404). 사용자가
// 옛 URL 을 직접 방문할 때 redirect 또는 안내가 필요하면 middleware/next.config
// 에서 이 prefix 리스트를 사용한다.
export const REMOVED_PUBLIC_SERVICE_PREFIXES: readonly string[] = [
  '/report',
  '/destiny-match',
  '/personality',
  '/icp',
  '/astrology',
  '/saju',
  '/dream',
  '/iching',
  '/past-life',
  '/life-prediction',
  '/numerology',
  '/myjourney',
  '/destiny-pal',
] as const
