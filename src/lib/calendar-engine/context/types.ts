import type { Chart, NatalInput, PlanetBase } from '@/lib/astrology/foundation/types'
import type { SajuPillars, FiveElement, ShinsalHit, RelationHit, DayMaster } from '@/lib/saju/types'
import type { AdvancedAnalysisResult } from '@/app/api/saju/services/advancedAnalysis'

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
}
