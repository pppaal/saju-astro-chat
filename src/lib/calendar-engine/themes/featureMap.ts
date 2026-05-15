import type { AstroThemeKey } from '@/lib/astrology/themes/types'
import type { FiveElement, SibsinKind } from '@/lib/saju/types'

/**
 * 점성술 행성/하우스/아라빅파츠 → 테마 정적 매핑.
 * src/lib/astrology/themes/* 모듈에서 추출한 룰을 데이터 테이블화.
 * 신호의 evidence.planets / houses / arabicLot을 검사해 테마 부여.
 */
export const ASTRO_THEME_MAP: Record<AstroThemeKey, {
  planets: string[]
  houses: number[]
  arabicLots?: string[]
}> = {
  love:         { planets: ['Venus', 'Mars', 'Moon'],            houses: [5, 7, 8],   arabicLots: ['Eros'] },
  money:        { planets: ['Venus', 'Jupiter'],                 houses: [2, 8, 11],  arabicLots: ['Fortune', 'Necessity'] },
  career:       { planets: ['Sun', 'Saturn'],                    houses: [6, 10],     arabicLots: ['Spirit', 'Victory'] },
  family:       { planets: ['Moon', 'Sun'],                      houses: [4, 5, 10] },
  health:       { planets: ['Mars', 'Saturn'],                   houses: [1, 6, 12] },
  personality:  { planets: ['Sun'],                              houses: [1, 5, 9] },
  study:        { planets: ['Mercury', 'Jupiter'],               houses: [3, 9] },
  children:     { planets: ['Venus', 'Sun', 'Jupiter'],          houses: [5] },
  parents:      { planets: ['Moon', 'Sun', 'Saturn'],            houses: [4, 10] },
  travel:       { planets: ['Mercury', 'Jupiter'],               houses: [3, 9] },
  social:       { planets: ['Venus', 'Mercury'],                 houses: [3, 7, 11] },
  business:     { planets: ['Jupiter', 'Saturn', 'Uranus'],      houses: [2, 8, 10] },
  reputation:   { planets: ['Sun', 'Saturn'],                    houses: [10] },
  spirituality: { planets: ['Jupiter', 'Neptune'],               houses: [9, 12] },
  karma:        { planets: ['NorthNode', 'SouthNode', 'Saturn'], houses: [12] },
  crisis:       { planets: ['Pluto', 'Saturn', 'Mars'],          houses: [8, 12] },
  creativity:   { planets: ['Sun', 'Mercury', 'Venus'],          houses: [5, 9] },
  legal:        { planets: ['Saturn', 'Mercury'],                houses: [7, 8, 10] },
}

/**
 * 사주 십신 → 테마 매핑.
 * pillar-sibsin 신호가 어떤 십신을 띄웠는지에 따라 테마 부여.
 */
export const SIBSIN_THEME_MAP: Record<SibsinKind, AstroThemeKey[]> = {
  '비견': ['social', 'personality'],
  '겁재': ['money', 'crisis', 'social'],
  '식신': ['creativity', 'health', 'children'],
  '상관': ['creativity', 'reputation', 'study'],
  '편재': ['money', 'business'],
  '정재': ['money', 'family'],
  '편관': ['career', 'crisis'],
  '정관': ['career', 'reputation', 'legal'],
  '편인': ['study', 'spirituality'],
  '정인': ['study', 'family', 'reputation'],
}

/**
 * 사주 신살 → 테마 매핑.
 * 신살명을 키로 사용 (한글 그대로).
 * 자주 등장하는 핵심 신살 위주 — 누락된 건 'personality'로 폴백.
 */
export const SHINSAL_THEME_MAP: Record<string, AstroThemeKey[]> = {
  '천을귀인':   ['career', 'reputation', 'crisis'],
  '천덕귀인':   ['health', 'family'],
  '월덕귀인':   ['health', 'family'],
  '문창귀인':   ['study', 'reputation'],
  '학당귀인':   ['study'],
  '관귀학관':   ['study', 'career'],
  '도화':       ['love', 'creativity'],
  '도화살':     ['love', 'creativity'],
  '홍염':       ['love'],
  '홍염살':     ['love'],
  '역마':       ['travel', 'career'],
  '역마살':     ['travel', 'career'],
  '화개':       ['spirituality', 'study'],
  '화개살':     ['spirituality', 'study'],
  '장성':       ['career', 'reputation'],
  '장성살':     ['career', 'reputation'],
  '월공':       ['spirituality'],
  '백호':       ['crisis'],
  '백호살':     ['crisis'],
  '괴강':       ['career', 'crisis'],
  '괴강살':     ['career', 'crisis'],
  '양인':       ['career', 'crisis'],
  '양인살':     ['career', 'crisis'],
  '공망':       ['crisis', 'spirituality'],
  '원진':       ['family', 'crisis'],
  '귀문':       ['health', 'spirituality'],
  '귀문관살':   ['health', 'spirituality'],
}

/**
 * 오행 → 테마 매핑 (timingScore.ts의 elementThemes와 정합).
 * 신호의 evidence.element가 있으면 보강 테마로 추가.
 */
export const ELEMENT_THEME_MAP: Record<FiveElement, AstroThemeKey[]> = {
  '목': ['study', 'creativity'],
  '화': ['reputation', 'creativity', 'love'],
  '토': ['family', 'social', 'health'],
  '금': ['career', 'legal', 'money'],
  '수': ['study', 'spirituality', 'business'],
}

/**
 * 어스펙트 종류별 polarity 기본값.
 * 추출기가 specific하게 override 가능하지만, 기본 톤 제공.
 */
export const ASPECT_POLARITY: Record<string, -1 | 0 | 1> = {
  conjunction:  0,    // 행성 조합에 따라 다름 — 추출기가 결정
  trine:        1,
  sextile:      1,
  square:      -1,
  opposition:  -1,
  quincunx:    -1,
  semisextile:  0,
}

/**
 * 행성별 기본 길흉 (전통 분류).
 * conjunction 등 중립 어스펙트에서 polarity 결정에 사용.
 */
export const PLANET_BENEFIC_MALEFIC: Record<string, 'benefic' | 'malefic' | 'neutral'> = {
  Jupiter: 'benefic',
  Venus:   'benefic',
  Sun:     'neutral',
  Moon:    'neutral',
  Mercury: 'neutral',
  Mars:    'malefic',
  Saturn:  'malefic',
  Uranus:  'neutral',
  Neptune: 'neutral',
  Pluto:   'malefic',
  Chiron:  'neutral',
}
