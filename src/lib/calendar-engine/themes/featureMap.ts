import type { AstroThemeKey } from '@/lib/astrology/themes/types'
import type { FiveElement, SibsinKind } from '@/lib/saju/types'

/**
 * 점성술 행성/하우스/아라빅파츠 → 5대 테마 정적 매핑.
 *
 * 옛 18테마(family, business, study, reputation, legal, crisis, personality,
 * social, spirituality, karma, creativity, travel)는 모두 love/career/money/
 * health/growth 안으로 흡수됨. 행성·하우스 풀은 합쳐서 dedupe.
 */
export const ASTRO_THEME_MAP: Record<
  AstroThemeKey,
  {
    planets: string[]
    houses: number[]
    arabicLots?: string[]
  }
> = {
  // love — 정통 점성에서 연애·관계 핵심: Venus(사랑·가치), Mars(욕망),
  // Moon(정서·돌봄). 옛 매핑에 있던 Sun·Jupiter는 자기·확장이라
  // 너무 broad — love 점수를 인플레이트시켜 narrative와 어긋남.
  // 10궁(사회·공적)도 love 핵심이 아니라 career — 제거.
  love: {
    planets: ['Venus', 'Mars', 'Moon'],
    houses: [4, 5, 7, 8],
    arabicLots: ['Eros'],
  },
  // money ← money + business
  money: {
    planets: ['Venus', 'Jupiter', 'Saturn', 'Uranus'],
    houses: [2, 8, 10, 11],
    arabicLots: ['Fortune', 'Necessity'],
  },
  // career ← career + study + reputation + legal
  career: {
    planets: ['Sun', 'Saturn', 'Mercury', 'Jupiter'],
    houses: [3, 6, 7, 8, 9, 10],
    arabicLots: ['Spirit', 'Victory'],
  },
  // health ← health + crisis
  health: {
    planets: ['Mars', 'Saturn', 'Pluto'],
    houses: [1, 6, 8, 12],
  },
  // growth ← personality + creativity + spirituality + social + karma + travel
  growth: {
    planets: ['Sun', 'Mercury', 'Venus', 'Jupiter', 'Neptune', 'NorthNode', 'SouthNode', 'Saturn'],
    houses: [1, 3, 5, 7, 9, 11, 12],
  },
}

/**
 * 행성 → 테마 기여 가중 (primary 1.0 / secondary~tertiary 차등).
 *
 * ASTRO_THEME_MAP.planets 와 같은 (행성,테마) 쌍을 커버하되, 멤버십만 주던
 * 것을 "얼마나 그 테마의 본령인가"로 가중. 느린 행성(Jupiter/Saturn)이 큰
 * polarity 를 여러 테마에 똑같이 흘려보내 비-health 테마들이 동률로 수렴하던
 * 문제(시뮬: 4테마 std 4.8) 해소. tagger 가 이 가중을 signal.themeWeights 로
 * 부여, themeScore·themeBreakdown 이 곱해 씀. 멤버십(themes)은 불변.
 */
export const PLANET_THEME_WEIGHT: Record<string, Partial<Record<AstroThemeKey, number>>> = {
  Venus: { love: 1.0, money: 0.6, growth: 0.4 }, // 사랑·가치·미
  Mars: { love: 0.7, health: 0.7, career: 0.4 }, // 욕망·추진·외과/염증
  Moon: { love: 1.0, health: 0.4, growth: 0.4 }, // 정서·돌봄·심신리듬
  Jupiter: { career: 1.0, growth: 0.7, money: 0.6, love: 0.3, health: 0.3 }, // 확장·행운·학문
  Saturn: { career: 1.0, health: 0.6, money: 0.5, growth: 0.4 }, // 구조·책임·만성
  Uranus: { money: 1.0, growth: 0.6, career: 0.5, love: 0.3 }, // 혁신·돌변
  Sun: { career: 1.0, growth: 0.6, health: 0.4 }, // 자아·권위·생명력
  Mercury: { career: 1.0, growth: 0.5, money: 0.3 }, // 지성·소통·거래
  Pluto: { health: 1.0, growth: 0.6, money: 0.3, career: 0.4, love: 0.3 }, // 변용·생사·권력
  Neptune: { growth: 1.0, love: 0.4, health: 0.3 }, // 영성·환상·예술
  NorthNode: { growth: 1.0, career: 0.3 }, // 카르마 발달 방향
  SouthNode: { growth: 1.0, health: 0.3 }, // 과거습성·해소
  Chiron: { health: 1.0, growth: 0.6, love: 0.4 }, // 상처와 치유
  Lilith: { love: 0.8, growth: 0.6, career: 0.3, health: 0.3 }, // 원초적 욕망·금기
}

/**
 * 점성 하우스 1~12 → 테마 가중 (앵귤러 1·4·7·10 + 각 하우스 본령 의미).
 * 기존 tagger 의 "ASTRO_THEME_MAP.houses 멤버십 → 고정 0.6"을 대체 — 하우스별
 * 실제 본령을 반영(5궁=연애 1.0, 10궁=직업 1.0, 6궁=건강 0.9 등).
 */
export const HOUSE_THEME_WEIGHT: Record<number, Partial<Record<AstroThemeKey, number>>> = {
  1: { growth: 1.0, health: 0.6, career: 0.4, love: 0.3 }, // 자아·체질·외모
  2: { money: 1.0, career: 0.3 }, // 소유·수입·가치
  3: { growth: 0.6, career: 0.5, love: 0.3 }, // 학습·형제·이동
  4: { love: 0.8, money: 0.4, growth: 0.4, health: 0.3 }, // 가정·부동산·뿌리
  5: { love: 1.0, growth: 0.6 }, // 연애·자녀·창작
  6: { health: 0.9, career: 0.7, money: 0.3 }, // 일상노동·질병
  7: { love: 1.0, career: 0.4, growth: 0.4 }, // 결혼·동업·계약
  8: { health: 0.7, money: 0.6, growth: 0.6, love: 0.4 }, // 공동재산·생사·상속
  9: { growth: 1.0, career: 0.6 }, // 고등학문·해외·철학
  10: { career: 1.0, money: 0.5, growth: 0.4 }, // 직업·명예·지위
  11: { money: 0.6, growth: 0.6, career: 0.4, love: 0.3 }, // 동료·희망·이익
  12: { growth: 0.8, health: 0.7, love: 0.3 }, // 무의식·은둔·요양
}

/**
 * 사주 십신 → 테마 명시 가중표 (0~1). 생극(生剋) 관계 기반 자평·궁통 통설.
 * 배열+RANK_WEIGHT(1.0/0.5) 거친 가중을 십신별 본령 가중으로 승격.
 * love(배우자성)는 성별 종속(남=재성/여=관성)이라 여기서 빼고 tagger가 부여.
 */
// 본령 분산 — 한 테마(career/growth)에 1.0이 몰리면 그 테마가 매일 1등으로 도배됨.
// 십신별 진짜 본령으로 1.0을 흩뿌려 5테마 변별 확보.
export const SIBSIN_THEME_WEIGHT: Record<SibsinKind, Partial<Record<AstroThemeKey, number>>> = {
  비견: { career: 0.6, growth: 0.5, money: 0.3 }, // 자립·동료·경쟁 (확산형, 1.0 없음)
  겁재: { money: 0.8, health: 0.5, career: 0.4, growth: 0.3 }, // 분탈·투기(money 흉방향)
  식신: { health: 1.0, growth: 0.6, money: 0.3 }, // 식록·장수·표현
  상관: { career: 0.8, growth: 0.7, money: 0.4 }, // 창의·재능발산(관 극→직업변동)
  편재: { money: 1.0, career: 0.5, growth: 0.3 }, // 큰돈·유동자산·기회
  정재: { money: 1.0, career: 0.4 }, // 안정수입·고정자산
  편관: { career: 0.9, health: 0.7, growth: 0.3 }, // 권력·압박·관재·수술/사고
  정관: { career: 1.0, growth: 0.3 }, // 직위·명예·질서
  편인: { growth: 1.0, health: 0.4, career: 0.4 }, // 편학·영성·의약(도식→건강주의)
  정인: { career: 0.8, growth: 0.5, health: 0.4, love: 0.3 }, // 학문·문서·모친·명예
}

/**
 * 사주 신살 → 테마 매핑.
 * extractor가 실제로 emit하는 hit.kind 이름만. 누락된 신살은
 * tagger가 'growth'로 폴백.
 */
export const SHINSAL_THEME_WEIGHT: Record<string, Partial<Record<AstroThemeKey, number>>> = {
  // ─── 12신살 ───
  장성: { career: 1.0 },
  반안: { love: 0.7, growth: 0.5 },
  역마: { growth: 0.7, career: 0.6, money: 0.3 },
  육해: { health: 1.0 },
  화개: { growth: 0.8, career: 0.4 },
  겁살: { health: 0.7, money: 0.5 },
  재살: { health: 0.7, career: 0.5 },
  천살: { health: 1.0 },
  월살: { money: 0.6, health: 0.5 },
  망신: { career: 0.6, health: 0.5 },
  지살: { growth: 0.7, money: 0.4 },
  년살: { love: 0.8, growth: 0.4 },

  // ─── 길성 ───
  천을귀인: { career: 0.7, health: 0.6, growth: 0.3 },
  태극귀인: { growth: 0.8, career: 0.4 },
  천덕귀인: { health: 0.8, love: 0.4 },
  월덕귀인: { health: 0.8, love: 0.4 },
  천주귀인: { love: 0.7, money: 0.5 },
  암록: { money: 0.8, career: 0.4 },
  금여성: { love: 1.0, money: 0.4 }, // 배우자복·재물 (연애 핵심 신호)
  천의성: { health: 1.0, career: 0.4 },
  천문성: { career: 0.7, growth: 0.5 },
  문창: { career: 0.8, growth: 0.4 },
  문곡: { career: 0.7, growth: 0.5 },
  학당귀인: { career: 0.8, growth: 0.4 },
  건록: { career: 0.8, money: 0.5 },
  제왕: { career: 1.0 },

  // ─── 도화·홍염 (애정·매력 핵심 신호) ───
  도화: { love: 1.0, growth: 0.4 },
  홍염살: { love: 1.0 },

  // ─── 흉살 ───
  현침: { health: 1.0 },
  고신: { health: 0.7, growth: 0.4 },
  과숙: { love: 0.7, health: 0.5 },
  괴강: { career: 0.7, health: 0.6 },
  양인: { career: 0.7, health: 0.6, money: 0.3 },
  백호: { health: 1.0, career: 0.3 },
  공망: { health: 0.6, growth: 0.5 },
  귀문관: { health: 0.7, growth: 0.4 },
  원진: { love: 0.6, health: 0.6 },
  천라지망: { health: 0.7, career: 0.4 },
  삼재: { health: 1.0 },
}

/**
 * 오행 → 테마 매핑 (timingScore.ts의 elementThemes와 정합).
 * 신호의 evidence.element가 있으면 보강 테마로 추가.
 */
// 오행 자체는 테마 직결이 약해 모두 보조(<0.6). career 도배(전 오행이 career 포함)
// 해소 — 각 오행 본령으로: 목=성장, 화=예/정, 토=중재/신체, 금=결실/재물, 수=지혜/유통.
export const ELEMENT_THEME_WEIGHT: Record<FiveElement, Partial<Record<AstroThemeKey, number>>> = {
  목: { growth: 0.5, career: 0.5, health: 0.3, love: 0.2 },
  화: { love: 0.5, career: 0.5, growth: 0.4, health: 0.3 },
  토: { health: 0.5, love: 0.4, growth: 0.4, money: 0.3 },
  금: { money: 0.5, career: 0.5, health: 0.3 },
  수: { growth: 0.5, money: 0.5, career: 0.4, love: 0.3, health: 0.3 },
}

/**
 * 어스펙트 종류별 polarity 기본값.
 * 추출기가 specific하게 override 가능하지만, 기본 톤 제공.
 */
export const ASPECT_POLARITY: Record<string, -1 | 0 | 1> = {
  conjunction: 0, // 행성 조합에 따라 다름 — 추출기가 결정
  trine: 1,
  sextile: 1,
  square: -1,
  opposition: -1,
  quincunx: -1,
  semisextile: 0,
}

/**
 * 행성별 기본 길흉 (전통 분류).
 * conjunction 등 중립 어스펙트에서 polarity 결정에 사용.
 */
export const PLANET_BENEFIC_MALEFIC: Record<string, 'benefic' | 'malefic' | 'neutral'> = {
  Jupiter: 'benefic',
  Venus: 'benefic',
  Sun: 'neutral',
  Moon: 'neutral',
  Mercury: 'neutral',
  Mars: 'malefic',
  Saturn: 'malefic',
  Uranus: 'neutral',
  Neptune: 'neutral',
  Pluto: 'malefic',
  Chiron: 'neutral',
}
