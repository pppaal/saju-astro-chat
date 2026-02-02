// Service options constant (outside component to prevent recreation)
export const SERVICE_OPTIONS = [
  { key: 'destinyMap', labelKey: 'menu.destinyMap', icon: '🗺️', path: '/destiny-map' },
  { key: 'aiReports', labelKey: 'menu.aiReports', icon: '🤖', path: '/premium-reports' },
  { key: 'lifePrediction', labelKey: 'menu.lifePrediction', icon: '📈', path: '/life-prediction' },
  { key: 'tarot', labelKey: 'menu.tarot', icon: '🔮', path: '/tarot' },
  { key: 'calendar', labelKey: 'menu.calendar', icon: '🗓️', path: '/calendar' },
  { key: 'dream', labelKey: 'menu.dream', icon: '🌙', path: '/dream' },
  { key: 'personality', labelKey: 'menu.personality', icon: '🌈', path: '/personality' },
  { key: 'icp', labelKey: 'menu.icp', icon: '🎭', path: '/icp' },
  { key: 'numerology', labelKey: 'menu.numerology', icon: '🔢', path: '/numerology' },
  { key: 'astrology', labelKey: 'menu.astrology', icon: '✨', path: '/astrology' },
  { key: 'saju', labelKey: 'menu.saju', icon: '☯️', path: '/saju' },
  { key: 'compatibility', labelKey: 'menu.compatibility', icon: '💕', path: '/compatibility' },
  { key: 'pastLife', labelKey: 'menu.pastLife', icon: '🔄', path: '/past-life' },
  { key: 'iching', labelKey: 'menu.iching', icon: '📜', path: '/iching' },
  { key: 'destinyMatch', labelKey: 'menu.destinyMatch', icon: '💘', path: '/destiny-match' },
] as const;

// Zodiac signs constant
export const ZODIAC_SIGNS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'] as const;

// Derived types
export type ServiceOption = (typeof SERVICE_OPTIONS)[number];
export type ServiceKey = ServiceOption['key'];
