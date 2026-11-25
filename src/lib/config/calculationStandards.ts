import type { HouseSystem } from '@/lib/astrology/foundation/types'

export type AstrologyNodeType = 'true' | 'mean'
export type DaeunRoundingPolicy = 'round' | 'ceil' | 'floor'

export const CALCULATION_STANDARDS = {
  saju: {
    // 사주 입력에 쓸 수 있는 timezone 이 없을 때(누락·잘못된 IANA 이름) 계산이 기대는
    // 기준 존. calculateSajuData·collectSajuFacts·캘린더 saju-hour 추출기가 읽는다.
    // 경도도 없으면 이 존의 기준 경도(서울 126.978)로 시주를 정한다(CONVENTIONS §1, OD-2).
    baseTimezone: 'Asia/Seoul',
    // 대운수 = days/3 의 내림(최소 1). daeunAge.daysToDaeunAge 가 읽는다(CONVENTIONS §13).
    daeunRounding: 'floor' as DaeunRoundingPolicy,
    // 월운 경계를 12절기로 전환(입춘=寅월 … 소한=丑월). 도큐트린(saju/CONVENTIONS.md
    // §3 월주 전환)이 절기 기반을 정본으로 규정하고, 양력월 그대로 쓰는 방식은
    // "지원하지 않는 옵션"으로 명시돼 있다. 절기 모드에선 소한(1월)이 다음 사주년에
    // 속해 year+1 로, 각 월에 절입일(solarTermStart/End)이 채워진다.
    useSolarTermsForMonthlyCycles: true,
  },
  astrology: {
    houseSystem: 'Placidus' as HouseSystem,
    nodeType: 'true' as AstrologyNodeType,
  },
} as const
