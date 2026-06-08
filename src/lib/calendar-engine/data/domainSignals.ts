/**
 * 도메인(생활 영역) → 신호 버킷.
 *
 * 테마 "태깅 시스템"(featureMap/tagger)은 표시용이라 제거됐지만, "어떤 십신/행성/
 * 신살이 어느 영역이냐"는 명리·점성 지식은 사전에 그대로다. 여기 한 곳에 모아
 * deriveDomainScores 가 신호를 영역별로 골라 같은 signed-surprise 로 점수낸다.
 *
 * 매칭 키 출처(ActiveSignal.evidence):
 *  - sibsin: 십신명 (정재/편관 …)
 *  - shinsalName: 신살명 (도화/천을귀인 …)
 *  - planets[0]: 트랜짓 행성 영문 (Venus …)
 */
export type DomainKey = 'wealth' | 'love' | 'career' | 'study' | 'health'

export interface DomainBucket {
  ko: string
  sibsin: string[]
  planet: string[]
  shinsal: string[]
}

/** 배우자성은 성별 의존(남: 재성=처 / 여: 관성=부) — love 버킷에 가산. */
export const SPOUSE_STAR: Record<'male' | 'female', string[]> = {
  male: ['정재', '편재', '재성'],
  female: ['정관', '편관', '관성'],
}

export const DOMAIN_BUCKETS: Record<DomainKey, DomainBucket> = {
  wealth: {
    ko: '재물',
    sibsin: ['정재', '편재', '재성'],
    planet: ['Venus', 'Jupiter'],
    shinsal: ['금여성', '암록', '건록'],
  },
  love: {
    ko: '애정',
    sibsin: [], // 배우자성은 성별별로 가산(SPOUSE_STAR)
    planet: ['Venus'],
    shinsal: ['도화', '홍염살', '홍염'],
  },
  career: {
    ko: '직업',
    sibsin: ['정관', '편관', '관성'],
    planet: ['Saturn', 'Mars', 'Sun'],
    shinsal: ['장성', '괴강', '천을귀인'],
  },
  study: {
    ko: '학업',
    sibsin: ['정인', '편인', '인성'],
    planet: ['Mercury', 'Jupiter'],
    shinsal: ['문창', '문곡', '학당귀인'],
  },
  health: {
    ko: '건강',
    sibsin: ['식신'],
    planet: [],
    shinsal: ['천의성', '백호', '양인'],
  },
}

export const DOMAIN_KEYS = Object.keys(DOMAIN_BUCKETS) as DomainKey[]
