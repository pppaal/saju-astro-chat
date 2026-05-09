// astrology/timing/hourly.ts
// Planetary Hour 해석 wrapper. 사주 시진(時辰) 해석과 mirror.
// 행성시 raw 계산은 별도 함수에서 받아 해석만 함 (timing/ 이전 후 raw 함수 이동 예정).

import type { AstroTimingAnalysis, AstroTimingHighlight, AstroTimingTone } from './types'

export type PlanetaryHourPlanet =
  | 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn'

export interface PlanetaryHourInput {
  isoDateTime: string
  planet: PlanetaryHourPlanet
  isDay: boolean              // 주간/야간 행성시
}

const TONE_BY_PLANET: Record<PlanetaryHourPlanet, AstroTimingTone> = {
  Sun: 'positive',
  Jupiter: 'positive',
  Venus: 'positive',
  Moon: 'mixed',
  Mercury: 'neutral',
  Saturn: 'cautious',
  Mars: 'cautious',
}

const ACTIVITY_BY_PLANET: Record<PlanetaryHourPlanet, string> = {
  Sun: '리더십·승진·공식 업무·권위적 결정·명예·건강',
  Moon: '가정·육아·부동산·대중 접촉·직관·여행 시작',
  Mars: '운동·경쟁·외과수술·분쟁 해결·강한 추진',
  Mercury: '의사소통·계약·학습·글쓰기·여행·거래',
  Jupiter: '법률·교육·출판·확장·투자·종교·행운',
  Venus: '연애·예술·미용·사교·협상·금전 수령',
  Saturn: '부동산·농업·광업·장기 계획·규율·제한 수용',
}

export function analyzeHourlyAstro(input: PlanetaryHourInput): AstroTimingAnalysis {
  const { isoDateTime, planet, isDay } = input
  const tone = TONE_BY_PLANET[planet]

  const highlight: AstroTimingHighlight = {
    source: `${isDay ? '주간' : '야간'} 행성시: ${planet}`,
    meaning: `이 시간대 적합 활동: ${ACTIVITY_BY_PLANET[planet]}`,
    tone,
  }

  return {
    unit: 'hourly',
    periodLabel: `Hourly ${isoDateTime}`,
    highlights: [highlight],
    summary: `${planet} 행성시 (${tone}). 적합: ${ACTIVITY_BY_PLANET[planet]}`,
  }
}
