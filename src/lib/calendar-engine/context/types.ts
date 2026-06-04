import type {
  AspectHit,
  Chart,
  NatalInput,
  PlanetBase,
  ZodiacKo,
} from '@/lib/astrology/foundation/types'
import type {
  ZRPeriod,
  ZRStartLot,
} from '@/lib/astrology/foundation/zodiacalReleasing'
import type { DignityTiers } from '@/lib/astrology/foundation/dignities'
import type { SajuPillars, FiveElement, ShinsalHit, RelationHit, DayMaster } from '@/lib/saju/types'
import type { AdvancedAnalysisResult } from '@/app/api/saju/services/advancedAnalysis'

/**
 * Per-lot Zodiacal Releasing cache shape — L1 periods are pre-computed up to
 * ~90 years from birth (foundation default). Sub-periods (L2/L3/L4) are NOT
 * cached because they explode in size (12 L2 × 12 L3 × 12 L4 = 1728 nodes per
 * L1) and the consumer (astro-zr extractor) only expands the few L1s that
 * overlap the requested range. Caching the L1 spine is cheap and removes the
 * Lot-of-Spirit / Lot-of-Fortune look-up + sign-walk on every request.
 */
export interface ZodiacalReleasingResult {
  spirit: {
    startSign: ZodiacKo
    periods: ZRPeriod[]
  } | null
  fortune: {
    startSign: ZodiacKo
    periods: ZRPeriod[]
  } | null
}

/**
 * Per-planet 5-tier dignity snapshot. `tiers` is the raw booleans from
 * dignityTiers(); `score` is the polarity-style numeric (Almuten-ish).
 * Used by astro-dignity extractor's natal-Almuten snapshot pass.
 */
export interface NatalDignityEntry {
  planet: string
  sign: ZodiacKo
  /** within-sign degree, 0..30 — required for term/face matching */
  degree: number
  tiers: DignityTiers
  score: number
}

export type DignityResult = NatalDignityEntry[]

// Re-export so consumers can import from one place.
export type { AspectHit, ZRPeriod, ZRStartLot, DignityTiers }

/**
 * 본명 컨텍스트 — 사용자별로 1회 계산 후 캐시.
 * 모든 extractor는 이 컨텍스트를 받아 시점별 활성 신호를 추출.
 */
export interface NatalContext {
  input: NatalInput
  saju: NatalSajuContext
  astro: NatalAstroContext
}

export interface NatalSajuContext {
  pillars: SajuPillars
  dayMaster: DayMaster
  yongsin: {
    primary: FiveElement
    secondary?: FiveElement
    avoid: FiveElement[] // 기신·구신
  }
  geokguk?: string // 격국명 (있으면)
  strength: 'strong' | 'medium' | 'weak'
  natalShinsal: ShinsalHit[]
  natalRelations: RelationHit[]
  /** 대운 리스트 (10년 단위 시작 나이 + 간지) */
  daeun: Array<{
    startAge: number
    startYear: number
    stem: string
    branch: string
  }>
  /**
   * 오행 분포 — 사주 8글자가 가진 wood/fire/earth/metal/water 개수.
   * 운명/궁합 차트의 ElementRadar + PersonaCard 부족 오행 진단의 source.
   * 사주 raw에서 그대로 (별도 계산 X) — buildNatalContext가 sajuResult.fiveElements 직패스.
   */
  fiveElements: {
    wood: number
    fire: number
    earth: number
    metal: number
    water: number
  }
  /**
   * 격국·용신·통근·득령·조후·십신 종합·건강·직업·점수·해석 등 12 영역 분석.
   * /api/saju 의 응답 advancedAnalysis 와 동일 shape — 차트 PersonaCard/InsightStrip
   * 가 이 필드에서 격국/신강약/십성카운트 추출.
   * performAdvancedAnalysis() 는 pure compute (Swiss Ephemeris 호출 없음) 라
   * 캐시된 결과 그대로 클라이언트에 반환해도 안전.
   */
  advancedAnalysis: AdvancedAnalysisResult
}

export interface NatalAstroContext {
  chart: Chart
  /** 본명 추가 천체(카이런·릴리스 등) — 트랜짓이 본명 점으로 참조. 차트 planets를
   *  오염시키지 않으려 별도 보관(dignity 등 다른 extractor엔 안 들어감). */
  extraPoints?: PlanetBase[]
  /** 섹트 (낮/밤 출생) — 헬레니즘 계산에 필요 */
  sect: 'day' | 'night'
  /** 사용자 정착 — Solar Return 등 일부 계산은 latitude/longitude 필요 */
  location: {
    latitude: number
    longitude: number
    timeZone: string
  }
  /**
   * 본명 행성 간 aspects (major + minor) — extractor 가 매번 재계산 하지 않게
   * 캐시. findNatalAspects() 기본 설정(major only, +3° natal-orb, maxResults=100)
   * 으로 ~30-50 hits per chart. 차트 자체가 dependency 이므로 chart 빌드 직후
   * 한 번만 계산.
   */
  natalAspects: AspectHit[]
  /**
   * Zodiacal Releasing L1 시퀀스 — Spirit / Fortune 각각 ~90년치 sign-walk.
   * Lot 계산 + sign-walk + ruler-years 합산이 의외로 핫(요청당 두 번씩). L1 만
   * 캐시; L2/L3/L4 는 astro-zr extractor 가 range 와 겹치는 L1 만 on-demand
   * 펼친다 (1728-node 폭발 회피).
   */
  zodiacalReleasing: ZodiacalReleasingResult
  /**
   * 행성별 dignity (도밀시리·익절테이션·트리플리시티·텀·페이스) + almuten 점수.
   * dignityTiers() 는 pure-table look-up 이라 그 자체는 싸지만, astro-dignity
   * extractor 가 본명 10행성에 매번 부른다 — 캐시하면 본명 Almuten 스냅샷
   * 신호를 위한 보일러플레이트가 사라진다.
   */
  dignities: DignityResult
}
