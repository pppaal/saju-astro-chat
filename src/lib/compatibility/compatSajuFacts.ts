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
  /** 출생시각 미상 — 그 사람은 삼주(년·월·일)로 판정(CONVENTIONS §5). */
  timeUnknown?: boolean
  gender: 'male' | 'female'
  timezone: string
  longitude: number
}

/** formatSajuSynastry 가 요구하는 1개 기둥 형태. */
interface SynastryPillar {
  stem: string
  branch: string
}

interface PersonCompatSajuFacts {
  /** 운명 상담사와 공유하는 표준 사주 facts (일간/오행/대운 등 풀세트). */
  base: SajuFacts
  /** [년·월·일·시] 4기둥 평면 — formatSajuSynastry input 그대로 매핑. 시간 미상이면 3기둥. */
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
  seedB: CompatPersonSeed,
  // 주입된 "지금" — 현재 대운(만 나이)의 기준. 한 순간이면 두 사람 공통, { a, b } 면 사람별
  // 기준 순간(궁합 상담사: 상담사 '오늘' D 의 각자 출생 tz 정오 — counselorDayAnchor, 운명상담사와
  // 같은 규칙). 미지정 시 호출 시점(collectSajuFacts 폴백).
  now?: Date | { a: Date; b: Date }
): CompatSajuFacts {
  const [nowA, nowB] = now instanceof Date || now == null ? [now, now] : [now.a, now.b]
  return {
    a: collectOne(seedA, nowA),
    b: collectOne(seedB, nowB),
  }
}

function collectOne(seed: CompatPersonSeed, now?: Date): PersonCompatSajuFacts {
  const base = collectSajuFacts({
    birthDate: seed.birthDate,
    birthTime: seed.birthTime,
    birthTimeUnknown: seed.timeUnknown,
    gender: seed.gender,
    timezone: seed.timezone,
    longitude: seed.longitude,
    now,
  })

  // 시간 미상이면 시주가 null — 시나스트리 기둥도 년·월·일 3개만.
  const synastryPillars: SynastryPillar[] = [
    base.pillars.year,
    base.pillars.month,
    base.pillars.day,
    base.pillars.time,
  ]
    .filter((p): p is SajuPillarFact => !!p)
    .map((p) => ({ stem: p.stem, branch: p.branch }))

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
      timePillar: base.pillars.time ? factPillarToShinsalInput(base.pillars.time) : null,
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
