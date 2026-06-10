// src/lib/saju/johuYongsin.ts
// 궁통보감(窮通寶鑑) 기반 조후용신 — 조회/평가/조화 로직.
// 데이터 테이블(120케이스 DB, 월지 기후 매핑)은 johuYongsinData.ts 에 분리.

import { FiveElement } from './types'
import { JOHU_YONGSIN_DB } from './johuYongsinData'

export { MONTH_CLIMATE, JOHU_YONGSIN_DB } from './johuYongsinData'
export type { JohuYongsinInfo } from './johuYongsinData'
import type { JohuYongsinInfo } from './johuYongsinData'

/**
 * 궁통보감 조후용신 조회 함수
 */
export function getJohuYongsin(daymaster: string, monthBranch: string): JohuYongsinInfo | null {
  return (
    JOHU_YONGSIN_DB.find((info) => info.daymaster === daymaster && info.month === monthBranch) ||
    null
  )
}

/**
 * 조후 필요도 평가 함수
 */
export function evaluateJohuNeed(
  daymaster: string,
  monthBranch: string
): {
  rating: number
  description: string
  description_en: string
  urgent: boolean
} {
  const info = getJohuYongsin(daymaster, monthBranch)
  if (!info) {
    return {
      rating: 0,
      description: '조후 정보 없음',
      description_en: 'No climate-balance information available.',
      urgent: false,
    }
  }

  const ratingDesc: Record<number, string> = {
    1: '조후 필요 낮음 - 기후 온화',
    2: '조후 필요 보통 - 약간의 조절 유리',
    3: '조후 필요 중간 - 조후용신 있으면 좋음',
    4: '조후 필요 높음 - 조후용신 중요',
    5: '조후 필요 급함 - 조후용신 필수',
  }

  const ratingDescEn: Record<number, string> = {
    1: 'Climate-balance need is low — the climate is mild.',
    2: 'Climate-balance need is moderate — a small adjustment would help.',
    3: 'Climate-balance need is medium — a balancing element is good to have.',
    4: 'Climate-balance need is high — a balancing element matters here.',
    5: 'Climate-balance need is urgent — a balancing element is essential.',
  }

  return {
    rating: info.rating,
    description: ratingDesc[info.rating] || '',
    description_en: ratingDescEn[info.rating] || '',
    urgent: info.rating >= 4,
  }
}

/**
 * 조후용신과 억부용신 조화 판단
 */
export function harmonizeYongsin(
  johuYongsin: FiveElement,
  eokbuYongsin: FiveElement,
  johuRating: number
): {
  primary: FiveElement
  secondary: FiveElement
  harmony: 'excellent' | 'good' | 'conflict'
  recommendation: string
  recommendation_en: string
} {
  // 같으면 최상
  if (johuYongsin === eokbuYongsin) {
    return {
      primary: johuYongsin,
      secondary: johuYongsin,
      harmony: 'excellent',
      recommendation: '조후용신과 억부용신이 일치하여 최상의 조합',
      recommendation_en:
        'The climate-balancing and strength-balancing elements line up — the best possible match.',
    }
  }

  // 조후 필요도가 높으면 조후 우선
  if (johuRating >= 4) {
    return {
      primary: johuYongsin,
      secondary: eokbuYongsin,
      harmony: 'good',
      recommendation: '조후가 급하므로 조후용신 우선, 억부용신 보조',
      recommendation_en:
        'Climate balance is urgent, so prioritize the climate-balancing element with the strength-balancing one as support.',
    }
  }

  // 조후 필요도가 낮으면 억부 우선
  return {
    primary: eokbuYongsin,
    secondary: johuYongsin,
    harmony: 'good',
    recommendation: '조후 필요가 낮으므로 억부용신 우선, 조후용신 보조',
    recommendation_en:
      'The climate-balance need is low, so prioritize the strength-balancing element with the climate-balancing one as support.',
  }
}
