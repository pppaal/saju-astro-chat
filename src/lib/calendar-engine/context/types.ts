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
import type { ArabicLot } from '@/lib/astrology/foundation/arabicParts'
import type { AlmutenFigurisResult } from '@/lib/astrology/foundation/almutenFiguris'
import type { ZRCurrent } from '@/lib/calendar-engine/derivers/zrCurrentChapter'
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

/**
 * 일주(日柱) 지지의 지장간 3층 (정기/중기/여기). 본명 일주에서 한 번만 결정되는
 * 정적 속성이라 컨텍스트에 캐시. destinypal Persona 카드 3층 일주 표시 + 일진·세운
 * extractor 가 본명 일지 지장간을 cross 할 때 같은 데이터를 매번 JIJANGGAN[branch]
 * 로 꺼내지 않도록 buildNatalContext 가 미리 펴 둔다.
 *
 * 子·卯·午·酉 (왕지) 등 일부 지지는 정기만 있고 중기/여기는 비어 있을 수 있다.
 */
export interface NatalDayJijanggan {
  /** 정기 (본기) 천간 — 항상 존재. 예: 未 → '己'. */
  jeonggi: string
  /** 중기 천간 — 일부 지지에서 부재. 예: 未 → '乙'. */
  junggi?: string
  /** 여기 (餘氣, 초기 잔기) 천간 — 일부 지지에서 부재. 예: 未 → '丁'. */
  yeogi?: string
}

/**
 * 본명 ArabicLot + house 매핑.
 * ArabicLot 자체는 sign + degreeInSign + longitude 만 들고 있고, house 는 chart
 * cusp 룩업으로 채워지므로 컨텍스트 레이어에서 합성한다. UNKNOWN_HOUSE(0) 이면
 * cusp 결손 / 이상치 — UI 는 미표시.
 */
export interface NatalArabicLot extends ArabicLot {
  /** 1-12 house — 0 이면 cusp 룩업 실패 sentinel. */
  house: number
}

// Re-export so consumers can import from one place.
export type {
  AspectHit,
  ZRPeriod,
  ZRStartLot,
  DignityTiers,
  ArabicLot,
  AlmutenFigurisResult,
  ZRCurrent,
}

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
  /**
   * 본명 일주(日柱) 지지의 지장간 3층 — destinypal Persona 카드의 "일주 3층"
   * 표시가 매번 JIJANGGAN[branch] 룩업을 다시 하지 않도록 컨텍스트에 캐시.
   * 정기는 항상 존재, 중기/여기는 지지에 따라 부재 (子·卯·午·酉 왕지 등).
   * NB: pillars.day.jijanggan 에도 동일 정보가 PillarData 형태로 들어있으나,
   * 이쪽은 *천간 글자만* 미리 추출한 평면 형태 (UI 가 한 번에 소비).
   */
  dayJijanggan: NatalDayJijanggan
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
  /**
   * 7대 Arabic Parts (Fortune / Spirit / Eros / Necessity / Courage / Victory /
   * Nemesis) — Hellenistic 산술점. 각 lot 의 sign · within-sign degree · house
   * 가 destinypal 본명 차트의 lots 패널 + ZR 시작점 (Spirit/Fortune) 으로 직접
   * 소비된다. 낮/밤 sect 공식 반영 후 미리 계산해 두면 ZR L1 chapter 갱신, lot-
   * 트랜짓 신호 둘 다 같은 source 를 보게 된다.
   *
   * 차트 결손 (행성 missing) 으로 부분 실패 시 빈 배열. 단일 lot 만 빠지는
   * 패턴은 없음 — 모두 ASC + 두 천체의 산술이라 한 행성이라도 빠지면 전 lot 실패.
   */
  lots: NatalArabicLot[]
  /**
   * Almuten Figuris — 4 hyleg points (Sun · Moon · ASC · Fortune) 각각에서
   * 5 essential dignity tier (Domicile 5, Exalt 4, Triplicity 3, Bound 2, Face 1)
   * 별 점수를 누적해 최고점 행성. 정통 Bonatti/Ibn Ezra 의 "삶 전체의 지배자".
   *
   * 결과 shape (foundation/almutenFiguris.ts SSOT):
   *   - winner: 최고점 행성 (동점이면 winners[0])
   *   - winners: 동점 행성 list (tie-aware)
   *   - scores: 행성별 누적 점수
   *   - points: point 별 ruler breakdown (감사용)
   *
   * Prenatal Lunation 은 swe_sol_eclipse iteration 비용이 커 modern Holden-식
   * 4-point 로 시작; 정밀도가 더 필요해지면 5번째 point 만 추가하면 score 자동 보강.
   *
   * 차트 결손 또는 dignity 매칭 실패 시 null — UI 가 fallback 처리.
   */
  almutenFiguris: AlmutenFigurisResult | null
  /**
   * ZR 현재 활성 챕터 — Spirit / Fortune 각각의 L1 + L2 sub-period 를 *현재 만 나이*
   * 기준으로 골라 둔 viewmodel.
   *
   * buildNatalContext 가 currentManAge() 로 viewer 의 만 나이를 계산해 deriveZRCurrent
   * 를 호출한다. 본 필드는 *그 시점의 ZR 챕터* 이라 destinypal Timeline ZR-bar 가
   * 매번 90년 sequence 를 훑지 않아도 된다. 컨텍스트 캐시 TTL 이 하루 이상이면
   * 다음날 챕터 경계를 지나는 사용자에서 ±1 챕터 스킵 가능성 있으니, 캐시 TTL
   * 은 24시간 이하로 유지.
   *
   * spirit/fortune 둘 다 null 가능 — 차트 결손으로 zodiacalReleasing.spirit /
   * fortune 자체가 null 일 때.
   */
  zrCurrent: ZRCurrent | null
}
