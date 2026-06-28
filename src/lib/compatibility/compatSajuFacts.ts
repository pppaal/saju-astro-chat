// src/lib/compatibility/compatSajuFacts.ts
//
// 궁합 "재료 준비실 (사주편)" — 두 사람의 사주 raw 를 한 번에 모아
// 정제된 facts 객체로. 운명 상담사의 sajuFacts 와 동일 패턴 (raw → facts
// → 포매팅) 을 궁합에도 적용한 것.
//
// 옛 코드는 route.ts 안에서 raw 사주 객체 (`effectivePerson*Saju`) 를
// 직접 캐스트해 `formatSajuSynastry` / `formatPersonalShinsal` 입력으로
// 변형했다. 그 변형 로직이 라우트에 흩어져 (a) 타입 안전성 0, (b) 두
// 함수가 raw shape 변경에 묶임. 본 모듈이 변형을 흡수.
//
// 본 모듈은 **포매팅 0**. locale 무관. text 0. JSON-able 객체만 반환.

import { collectSajuFacts, type SajuFacts, type SajuPillarFact } from '@/lib/destiny/sajuFacts'
import { getShinsalHits, toSajuPillarsLike } from '@/lib/saju/shinsal'
import { logger } from '@/lib/logger'

export interface CompatPersonSeed {
  birthDate: string // 'YYYY-MM-DD' (solar)
  birthTime: string // 'HH:MM'
  gender: 'male' | 'female'
  timezone: string
  longitude: number
}

/** formatSajuSynastry 가 요구하는 1개 기둥 형태. */
export interface SynastryPillar {
  stem: string
  branch: string
}

export interface PersonCompatSajuFacts {
  /** 운명 상담사와 공유하는 표준 사주 facts (일간/오행/대운 등 풀세트). */
  base: SajuFacts
  /** [년·월·일·시] 4기둥 평면 — formatSajuSynastry input 그대로 매핑. */
  synastryPillars: SynastryPillar[]
  /** 현재 대운 (synastry cross 용). 출생연도 없으면 null. */
  currentDaeun: { stem: string; branch: string; age?: number } | null
  /** formatPersonalShinsal 이 받는 신살 배열. 계산 실패 시 빈 배열. */
  shinsal: unknown[]
}

export interface CompatSajuFacts {
  a: PersonCompatSajuFacts
  b: PersonCompatSajuFacts
}

/**
 * 두 사람 사주 raw 한 번씩 계산 + 정제된 facts 페어 반환.
 * collectSajuFacts (운명 상담사 SSOT) 에 위임한다. 주의: 이 경로엔 결과 캐시가
 * 없어 매 호출 풀계산이다(점성 짝 collectCompatAstroFacts 는 Redis 캐시인데
 * 사주는 비대칭). 향후 본명 사주 캐시 도입 시 여기에 래퍼를 건다.
 */
export function collectCompatSajuFacts(
  seedA: CompatPersonSeed,
  seedB: CompatPersonSeed
): CompatSajuFacts {
  return {
    a: collectOne(seedA),
    b: collectOne(seedB),
  }
}

function collectOne(seed: CompatPersonSeed): PersonCompatSajuFacts {
  const base = collectSajuFacts({
    birthDate: seed.birthDate,
    birthTime: seed.birthTime,
    gender: seed.gender,
    timezone: seed.timezone,
    longitude: seed.longitude,
  })

  const synastryPillars: SynastryPillar[] = (['year', 'month', 'day', 'time'] as const).map(
    (k) => ({
      stem: base.pillars[k].stem,
      branch: base.pillars[k].branch,
    })
  )

  const cur = base.daeun.current
  const currentDaeun = cur
    ? { stem: cur.heavenlyStem, branch: cur.earthlyBranch, age: cur.age }
    : null

  // 개별 신살 — [개별 신살 (self)] 블록이 쓰는 유일한 enrichment.
  // 옛 routeSupport 의 동적 import + raw saju 캐스트 패턴을 facts 기반으로
  // 평탄화. element 는 facts.pillars 에 이미 평탄화돼 있어 raw 의존 0.
  let shinsal: unknown[] = []
  try {
    const pillarsLike = toSajuPillarsLike({
      yearPillar: factPillarToShinsalInput(base.pillars.year),
      monthPillar: factPillarToShinsalInput(base.pillars.month),
      dayPillar: factPillarToShinsalInput(base.pillars.day),
      timePillar: factPillarToShinsalInput(base.pillars.time),
    })
    shinsal = getShinsalHits(pillarsLike, {
      includeGeneralShinsal: true,
      includeLuckyDetails: true,
    }) as unknown[]
  } catch (err) {
    logger.warn('[compatSajuFacts] shinsal compute failed (non-fatal)', { err })
    shinsal = []
  }

  return { base, synastryPillars, currentDaeun, shinsal }
}

function factPillarToShinsalInput(p: SajuPillarFact) {
  return {
    heavenlyStem: { name: p.stem, element: p.stemElement as never },
    earthlyBranch: { name: p.branch, element: p.branchElement as never },
  }
}
