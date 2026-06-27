/**
 * 어댑터 입력(source) shape — adapter.ts 가 NatalContext(buildReportContext /
 * buildNatalContext 결과)에서 *실제로 읽는* 필드만 기술한 read-side DTO.
 *
 * 왜 별도 타입인가:
 *   buildReportContext 는 NatalContext + 보조 필드(twelveStages·rooted·gongmang
 *   ·johuYongsin 등)를 `as unknown as` 로 흘려보낸다. 어댑터가 정본 NatalContext
 *   타입에 강결합하면 그 보조 필드를 못 읽고, 반대로 강결합을 풀려고 `any` 를
 *   열면 오타·필드 드리프트를 컴파일러가 못 잡는다. 그래서 "어댑터가 소비하는
 *   계약" 만 따로 선언해 둘 다 피한다(경계 어댑터의 입력 계약 = 이 파일).
 *
 * 규칙: 전부 optional·방어적. 상위 엔진 shape 가 흔들려도 어댑터는 ?? 폴백으로
 *   견디므로, 여기서도 누락 가능성을 타입에 반영한다.
 */
import type { PillarData } from '@/lib/saju/types'

/** 오행 5개 카운트(목화토금수). 엔진은 항상 5키를 채워 보낸다.
 *  index signature 를 두어 `Record<string, number>` 를 받는 eval·synthesize 함수에
 *  캐스트 없이 흘려보낼 수 있게 한다(인터페이스는 암묵적 index sig 가 없어서 필요). */
export interface FiveElementCounts {
  wood: number
  fire: number
  earth: number
  metal: number
  water: number
  [element: string]: number
}

// ─── 사주(source.saju) ───────────────────────────────────────────────────

/** 신살 1건 — annotateShinsal().hits 의 읽기 계약. */
export interface ShinsalHitSource {
  kind?: string
  name?: string
  /** 걸린 기둥 키(year/month/day/time). 첫 값만 라벨로 사용. */
  pillars?: string[]
  sub?: string
  /** 길흉 polarity(없으면 SHINSAL_POLARITY 룩업). */
  polarity?: number
}

/** 형충회합 관계 1건 — sajuFacts.relations 의 읽기 계약. */
export interface RelationHitSource {
  kind?: string
  type?: string
  detail?: string
  basis?: string
  pillars?: string[]
}

/** 대운 1주 — buildReportContext 의 daeunList 항목. */
export interface DaeunHitSource {
  startAge?: number
  age?: number
  stem?: string
  branch?: string
  sibsin?: string
  current?: boolean
}

/** 십신/격국/용신 등 사후 분석(performAnalyses) 중 어댑터가 읽는 부분. */
export interface SajuAnalysesSource {
  geokguk?: {
    primary?: string
    confidence?: string
    fallback?: boolean
  }
  sibsin?: {
    categoryCount?: Record<string, number>
  }
  yongsin?: {
    daymasterStrength?: string
  }
  gongmang?: {
    gongmangBranches?: string[]
  }
}

export interface YongsinSource {
  primary?: string
  secondary?: string
  avoid?: Array<string | null | undefined>
}

export interface JohuYongsinSource {
  primaryYongsin?: string
  rating?: number
  climate?: string
  climate_en?: string
}

/** 사주 4주 컨테이너 — 정본 PillarData 를 재사용하되 누락 가능성 반영. */
export interface SajuPillarsSource {
  year?: PillarData
  month?: PillarData
  day?: PillarData
  time?: PillarData
}

export interface SajuSource {
  pillars?: SajuPillarsSource
  dayMaster?: { name?: string; element?: string }
  strength?: string
  geokguk?: string
  yongsin?: YongsinSource
  analyses?: SajuAnalysesSource
  twelveStages?: Record<string, string>
  natalShinsal?: ShinsalHitSource[]
  natalRelations?: RelationHitSource[]
  daeun?: DaeunHitSource[]
  fiveElements?: FiveElementCounts
  rooted?: boolean
  gongmang?: string[]
  johuYongsin?: JohuYongsinSource | null
  gwansalHonjap?: boolean
}

// ─── 점성(source.astro) ──────────────────────────────────────────────────

/** 행성 1개 — _chart.planets / facts 행성의 읽기 계약. */
export interface PlanetSource {
  name?: string
  longitude?: number
  lon?: number
  sign?: string
  house?: number
  speed?: number
  retrograde?: boolean
}

/** 보조점(Chiron·Lilith·교점 등). */
export interface ExtraPointSource {
  name?: string
  longitude?: number
  lon?: number
  sign?: string
  house?: number
}

export interface HouseSource {
  index?: number
  i?: number
  cusp?: number
  sign?: string
}

/** 각도(aspect) 1건 — from/to(객체) 또는 a/b(문자열) 양식 모두 허용. */
export interface AspectSource {
  from?: { name?: string }
  to?: { name?: string }
  a?: string
  b?: string
  type?: string
  orb?: number
  applying?: boolean
}

/** 5-tier dignity 1건 — facts.hellenistic.dignities. */
export interface DignitySource {
  planet?: string
  sign?: string
  tiers?: {
    domicile?: boolean
    exaltation?: boolean
    triplicity?: boolean
    term?: boolean
    face?: boolean
    detriment?: boolean
    fall?: boolean
  }
  score?: number
}

export interface LotSource {
  name?: string
  sign?: string
  longitude?: number
  house?: number
}

export interface AlmutenSource {
  winner?: string | null
  winners?: string[]
  scores?: Record<string, number>
}

export interface SignPointSource {
  longitude?: number
  lon?: number
  sign?: string
}

export interface AstroSource {
  chart?: {
    planets?: PlanetSource[]
    houses?: HouseSource[]
    ascendant?: SignPointSource
    mc?: SignPointSource
  }
  planets?: PlanetSource[]
  houses?: HouseSource[]
  ascendant?: SignPointSource
  mc?: SignPointSource
  /** 출생시각/출생지 미상 — ASC/MC/하우스 의존 값 차단. */
  placeUnreliable?: boolean
  sect?: string
  houseSystem?: string
  extraPoints?: ExtraPointSource[]
  natalAspects?: AspectSource[]
  aspects?: AspectSource[]
  dignities?: DignitySource[]
  lots?: LotSource[]
  almutenFiguris?: AlmutenSource
}

// ─── 입력(source.input) ──────────────────────────────────────────────────

export interface InputSource {
  name?: string
  gender?: string
  year?: number
  month?: number
  date?: number
  hour?: number
  minute?: number
  latitude?: number
  longitude?: number
  timeZone?: string
  place?: string
  isoUTC?: string
  birthTimeUnknown?: boolean
}

/** 어댑터 입력 컨텍스트 — natalToReportData / buildCrossRows 가 받는 shape. */
export interface ReportSourceCtx {
  input?: InputSource
  saju?: SajuSource
  astro?: AstroSource
}
