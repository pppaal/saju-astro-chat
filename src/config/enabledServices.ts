export type EnabledServiceId =
  | 'destinyMap'
  | 'tarot'
  | 'report'
  | 'calendar'
  | 'compatibility'
  | 'destinyMatch'

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
    label: { en: 'Cosmic Counselor', ko: '코스믹 상담사' },
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
    id: 'report',
    href: '/report',
    icon: '📜',
    menuKey: 'menu.report',
    descriptionKey: 'services.report.desc',
    label: { en: 'Report', ko: '리포트' },
    description: { en: 'AI Reports (Free/Premium)', ko: 'AI 리포트 (무료/프리미엄)' },
  },
  {
    id: 'calendar',
    href: '/calendar',
    icon: '🗓️',
    menuKey: 'menu.calendar',
    descriptionKey: 'services.calendar.desc',
    label: { en: 'Fortune Flow', ko: '운세 흐름표' },
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
  {
    id: 'destinyMatch',
    href: '/destiny-match',
    icon: '🪐',
    menuKey: 'menu.destinyMatch',
    descriptionKey: 'services.destinyMatch.desc',
    label: { en: 'Destiny Match', ko: '데스티니 매치' },
    description: { en: 'Destiny-based matching', ko: '운명 기반 매칭' },
  },
] as const

// destinyMatch is intentionally omitted — the page still exists at
// /destiny-match for direct deep-links, but it's not surfaced on the
// main page, services dropdown, or side drawer.
// report is temporarily omitted too (품질 개선 전까지 숨김) — /report 라우트는
// 직접 링크용으로 남겨두되 메인·햄버거·사이드드로어에는 노출하지 않는다.
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

export const REMOVED_PUBLIC_SERVICE_PREFIXES: readonly string[] = [
  '/astrology',
  '/saju',
  '/dream',
  '/iching',
  '/past-life',
  '/life-prediction',
  '/personality',
  '/icp',
  '/numerology',
  '/myjourney',
  '/destiny-pal',
] as const
