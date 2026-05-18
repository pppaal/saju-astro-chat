import type { AstroThemeKey } from '@/lib/astrology/themes/types'
import type { FiveElement, SibsinKind } from '@/lib/saju/types'

/**
 * 점성술 행성/하우스/아라빅파츠 → 5대 테마 정적 매핑.
 *
 * 옛 18테마(family, business, study, reputation, legal, crisis, personality,
 * social, spirituality, karma, creativity, travel)는 모두 love/career/money/
 * health/growth 안으로 흡수됨. 행성·하우스 풀은 합쳐서 dedupe.
 */
export const ASTRO_THEME_MAP: Record<AstroThemeKey, {
  planets: string[]
  houses: number[]
  arabicLots?: string[]
}> = {
  // love ← love + family + children + parents
  love:    {
    planets: ['Venus', 'Mars', 'Moon', 'Sun', 'Jupiter'],
    houses: [4, 5, 7, 8, 10],
    arabicLots: ['Eros'],
  },
  // money ← money + business
  money:   {
    planets: ['Venus', 'Jupiter', 'Saturn', 'Uranus'],
    houses: [2, 8, 10, 11],
    arabicLots: ['Fortune', 'Necessity'],
  },
  // career ← career + study + reputation + legal
  career:  {
    planets: ['Sun', 'Saturn', 'Mercury', 'Jupiter'],
    houses: [3, 6, 7, 8, 9, 10],
    arabicLots: ['Spirit', 'Victory'],
  },
  // health ← health + crisis
  health:  {
    planets: ['Mars', 'Saturn', 'Pluto'],
    houses: [1, 6, 8, 12],
  },
  // growth ← personality + creativity + spirituality + social + karma + travel
  growth:  {
    planets: ['Sun', 'Mercury', 'Venus', 'Jupiter', 'Neptune', 'NorthNode', 'SouthNode', 'Saturn'],
    houses: [1, 3, 5, 7, 9, 11, 12],
  },
}

/**
 * 사주 십신 → 테마 매핑.
 * pillar-sibsin 신호가 어떤 십신을 띄웠는지에 따라 테마 부여.
 */
export const SIBSIN_THEME_MAP: Record<SibsinKind, AstroThemeKey[]> = {
  '비견': ['growth'],                     // social, personality → growth
  '겁재': ['money', 'health', 'growth'],  // money + crisis(→health) + social(→growth)
  '식신': ['growth', 'health', 'love'],   // creativity(→growth) + health + children(→love)
  '상관': ['growth', 'career'],           // creativity(→growth) + reputation(→career) + study(→career)
  '편재': ['money'],                      // money + business(→money)
  '정재': ['money', 'love'],              // money + family(→love)
  '편관': ['career', 'health'],           // career + crisis(→health)
  '정관': ['career'],                     // career + reputation(→career) + legal(→career)
  '편인': ['career', 'growth'],           // study(→career) + spirituality(→growth)
  '정인': ['career', 'love'],             // study(→career) + family(→love) + reputation(→career)
}

/**
 * 사주 신살 → 테마 매핑.
 * 신살명을 키로 사용 (한글 그대로).
 * 자주 등장하는 핵심 신살 위주 — 누락된 건 'growth'로 폴백.
 */
export const SHINSAL_THEME_MAP: Record<string, AstroThemeKey[]> = {
  // ─── 12신살 ───
  장성:  ['career'],                     장성살: ['career'],
  반안:  ['love', 'growth'],             반안살: ['love', 'growth'],
  역마:  ['growth', 'career'],           역마살: ['growth', 'career'],
  육해:  ['health'],                     육해살: ['health'],
  화개:  ['growth', 'career'],           화개살: ['growth', 'career'],
  겁살:  ['health', 'money'],
  재살:  ['health', 'career'],
  천살:  ['health'],
  월살:  ['money', 'health'],
  망신:  ['career', 'health'],           망신살: ['career', 'health'],
  지살:  ['growth', 'money'],
  년살:  ['love', 'growth'],

  // ─── 길성 ───
  천을귀인: ['career', 'health'],         천을: ['career', 'health'],
  태극귀인: ['growth', 'career'],
  천덕귀인: ['health', 'love'],           천덕: ['health', 'love'],
  월덕귀인: ['health', 'love'],           월덕: ['health', 'love'],
  천주귀인: ['love', 'money'],
  암록:     ['money', 'career'],
  금여성:   ['love', 'money'],            금여: ['love', 'money'],
  천의성:   ['health', 'career'],
  천문성:   ['career', 'growth'],
  문창:     ['career'],                   문창귀인: ['career'],
  문곡:     ['career', 'growth'],
  학당귀인: ['career'],                   학당: ['career'],
  관귀학관: ['career'],
  건록:     ['career', 'money'],
  제왕:     ['career'],
  길성:     ['growth'],

  // ─── 도화·홍염 (애정·매력) ───
  도화:   ['love', 'growth'],             도화살: ['love', 'growth'],
  홍염:   ['love'],                       홍염살: ['love'],

  // ─── 흉살 ───
  현침:   ['health'],                     현침살: ['health'],
  고신:   ['growth', 'health'],           고신살: ['growth', 'health'],
  과숙:   ['love', 'health'],             과숙살: ['love', 'health'],
  괴강:   ['career', 'health'],           괴강살: ['career', 'health'],
  양인:   ['career', 'health'],           양인살: ['career', 'health'],
  백호:   ['health'],                     백호살: ['health'],
  공망:   ['health', 'growth'],
  귀문관: ['health', 'growth'],           귀문: ['health', 'growth'],
  귀문관살: ['health', 'growth'],
  원진:   ['love', 'health'],
  천라지망: ['health', 'career'],
  삼재:   ['health'],
  화해:   ['love', 'health'],             화해살: ['love', 'health'],
  괘살:   ['health'],
  흉성:   ['health'],
}

/**
 * 오행 → 테마 매핑 (timingScore.ts의 elementThemes와 정합).
 * 신호의 evidence.element가 있으면 보강 테마로 추가.
 */
export const ELEMENT_THEME_MAP: Record<FiveElement, AstroThemeKey[]> = {
  '목': ['career', 'growth'],            // study, creativity → career, growth
  '화': ['career', 'love', 'growth'],    // reputation(→career), creativity(→growth), love
  '토': ['love', 'health', 'growth'],    // family(→love), social(→growth), health
  '금': ['career', 'money'],             // career, legal(→career), money
  '수': ['career', 'growth', 'money'],   // study(→career), spirituality(→growth), business(→money)
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
