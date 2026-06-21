/**
 * computeSynastryView (src/app/compatibility/counselor/computeSynastry.ts)
 *
 * 클라용 시너스트리 뷰 빌더 — calculateSynastry 엔진을 감싸 차트 렌더용
 * 구조(aspects/overlays/harmony/tension)로 reshape 한다.
 *
 * 커버:
 *  - toChartLike 가드: null/비객체/planets 없음/longitude 없음 → null
 *  - 정상 계산: 실제 계산값(라벨·tone·orb·strength·overlay·harmony/tension) 검증
 *  - 어스펙트 필터링: orb>5 제외, 개인행성 미포함 제외, 최대 8개 slice
 *  - strength 분기: 강하게/또렷이/은은히 (ko) · strong/clear/faint (en)
 *  - 언어 분기: ko vs en (행성명·라벨·하우스 의미)
 *  - overlay 필터: PERSONAL_OVERLAY 만 노출
 */

import { describe, it, expect } from 'vitest'
import { computeSynastryView } from '@/app/compatibility/counselor/computeSynastry'

type Loose = Record<string, unknown>

function planet(name: string, longitude: number): Loose {
  return {
    name,
    longitude,
    sign: 'Aries',
    degree: 0,
    minute: 0,
    formatted: '',
    house: 1,
  }
}

function houses(): Loose[] {
  return Array.from({ length: 12 }, (_, i) => ({
    index: i + 1,
    cusp: i * 30,
    sign: 'Aries',
    formatted: '',
  }))
}

// 결정적 fixture: 두 natal(chartData) 형태. 경도를 직접 통제해 어스펙트가
// 정확히 예측 가능하도록 함 (orb 0/1/5 등).
function makeNatalA(): Loose {
  return {
    planets: [planet('Sun', 10), planet('Moon', 70), planet('Venus', 130)],
    ascendant: planet('Ascendant', 0),
    mc: planet('MC', 270),
    houses: houses(),
  }
}

function makeNatalB(): Loose {
  return {
    planets: [planet('Sun', 11), planet('Mars', 100), planet('Venus', 190)],
    ascendant: planet('Ascendant', 5),
    mc: planet('MC', 275),
    houses: houses(),
  }
}

describe('computeSynastryView — 입력 가드 (toChartLike)', () => {
  it('astroA 가 null 이면 null', () => {
    expect(computeSynastryView(null, makeNatalB())).toBeNull()
  })

  it('astroB 가 null 이면 null', () => {
    expect(computeSynastryView(makeNatalA(), null)).toBeNull()
  })

  it('객체가 아니면 null', () => {
    expect(computeSynastryView('not-an-object', makeNatalB())).toBeNull()
    expect(computeSynastryView(42, makeNatalB())).toBeNull()
  })

  it('planets 가 배열이 아니면 null', () => {
    expect(computeSynastryView({ planets: 'nope' }, makeNatalB())).toBeNull()
  })

  it('planets 가 빈 배열이면 null', () => {
    expect(computeSynastryView({ planets: [] }, makeNatalB())).toBeNull()
  })

  it('planets 에 longitude(숫자)가 하나도 없으면 null', () => {
    const noLon = { planets: [{ name: 'Sun' }, { name: 'Moon' }] }
    expect(computeSynastryView(noLon, makeNatalB())).toBeNull()
  })

  it('houses 가 없거나 배열이 아니면 빈 배열로 대체 — 계산 자체는 진행', () => {
    // houses 누락 시 getHouseForLongitude 가 빈 배열을 받지만 toChartLike 는
    // houses 를 [] 로 채워 Chart 를 만든다. overlay 계산이 빈 houses 를 타면
    // 엔진이 throw → computeSynastryView 가 catch 해 null 반환.
    const noHouses = {
      planets: [planet('Sun', 10), planet('Venus', 130)],
      ascendant: planet('Ascendant', 0),
      mc: planet('MC', 270),
    }
    const result = computeSynastryView(noHouses, makeNatalB())
    expect(result).toBeNull()
  })
})

describe('computeSynastryView — 정상 계산 (ko)', () => {
  const view = computeSynastryView(makeNatalA(), makeNatalB(), 'ko')!

  it('null 이 아니다', () => {
    expect(view).not.toBeNull()
  })

  it('harmony/tension 은 엔진 raw score 와 동일 (5.9 / 2.9)', () => {
    expect(view.harmony).toBe(5.9)
    expect(view.tension).toBe(2.9)
  })

  it('어스펙트는 최대 8개로 잘린다', () => {
    expect(view.aspects.length).toBeLessThanOrEqual(8)
    expect(view.aspects.length).toBe(8)
  })

  it('첫 어스펙트는 score 가장 높은 Sun-Mars square (긴장, orb 0, 강하게)', () => {
    const first = view.aspects[0]
    expect(first.a).toBe('태양')
    expect(first.b).toBe('화성')
    expect(first.label).toBe('긴장')
    expect(first.tone).toBe('tension')
    expect(first.orb).toBe(0)
    expect(first.strength).toBe('강하게')
  })

  it('harmony tone 어스펙트 라벨/한글 행성명 검증 (달-금성 조화)', () => {
    const moonVenus = view.aspects.find((a) => a.a === '달' && a.b === '금성')
    expect(moonVenus).toBeDefined()
    expect(moonVenus!.label).toBe('조화')
    expect(moonVenus!.tone).toBe('harmony')
  })

  it('opposition 은 tension, 라벨 "팽팽함"', () => {
    const opp = view.aspects.find((a) => a.label === '팽팽함')
    expect(opp).toBeDefined()
    expect(opp!.tone).toBe('tension')
  })

  it('sextile 은 harmony, 라벨 "받쳐줌"', () => {
    const sextile = view.aspects.find((a) => a.label === '받쳐줌')
    expect(sextile).toBeDefined()
    expect(sextile!.tone).toBe('harmony')
  })

  it('orb 5° 인 어스펙트도 포함되며 strength 는 "은은히"', () => {
    const faint = view.aspects.find((a) => a.orb === 5)
    expect(faint).toBeDefined()
    expect(faint!.strength).toBe('은은히')
  })

  it('모든 어스펙트는 orb<=5 이고 개인행성을 하나 이상 포함', () => {
    const PERSONAL_KO = new Set(['태양', '달', '수성', '금성', '화성', '상승점'])
    for (const a of view.aspects) {
      expect(a.orb).toBeLessThanOrEqual(5)
      expect(PERSONAL_KO.has(a.a) || PERSONAL_KO.has(a.b)).toBe(true)
    }
  })

  it('overlaysAtoB 는 개인행성만, 하우스 의미가 한글로 매핑된다', () => {
    expect(view.overlaysAtoB).toEqual([
      { planet: '태양', house: 1, meaning: '자아·인상' },
      { planet: '달', house: 3, meaning: '소통·일상' },
      { planet: '금성', house: 5, meaning: '연애·즐거움' },
    ])
  })

  it('overlaysBtoA 도 개인행성만 (Mars 4하우스 = 가정·뿌리)', () => {
    expect(view.overlaysBtoA).toEqual([
      { planet: '태양', house: 1, meaning: '자아·인상' },
      { planet: '화성', house: 4, meaning: '가정·뿌리' },
      { planet: '금성', house: 7, meaning: '동반자·결혼' },
    ])
  })
})

describe('computeSynastryView — 영어 (en)', () => {
  const view = computeSynastryView(makeNatalA(), makeNatalB(), 'en')!

  it('행성명이 영어 원문 그대로', () => {
    const first = view.aspects[0]
    expect(first.a).toBe('Sun')
    expect(first.b).toBe('Mars')
  })

  it('라벨이 영어 (square → tension)', () => {
    expect(view.aspects[0].label).toBe('tension')
  })

  it('strength 가 영어 (strong / faint)', () => {
    expect(view.aspects[0].strength).toBe('strong')
    const faint = view.aspects.find((a) => a.orb === 5)
    expect(faint!.strength).toBe('faint')
  })

  it('overlay 하우스 의미가 영어로 매핑', () => {
    expect(view.overlaysAtoB[0]).toEqual({ planet: 'Sun', house: 1, meaning: 'self·image' })
  })

  it('harmony/tension score 는 언어와 무관하게 동일', () => {
    expect(view.harmony).toBe(5.9)
    expect(view.tension).toBe(2.9)
  })
})

describe('computeSynastryView — strength 중간 분기 (또렷이 / clear)', () => {
  // orb 가 1.5 < orb <= 3 인 어스펙트를 만들기 위해 Sun-Sun 합 orb=2 구성.
  function aOrb2(): Loose {
    return {
      planets: [planet('Sun', 10)],
      ascendant: planet('Ascendant', 0),
      mc: planet('MC', 270),
      houses: houses(),
    }
  }
  function bOrb2(): Loose {
    return {
      planets: [planet('Sun', 12)], // Sun-Sun conjunction orb=2
      ascendant: planet('Ascendant', 200),
      mc: planet('MC', 100),
      houses: houses(),
    }
  }

  it('ko: orb 2° → "또렷이"', () => {
    const view = computeSynastryView(aOrb2(), bOrb2(), 'ko')!
    const sunSun = view.aspects.find((a) => a.a === '태양' && a.b === '태양')
    expect(sunSun).toBeDefined()
    expect(sunSun!.orb).toBe(2)
    expect(sunSun!.strength).toBe('또렷이')
  })

  it('en: orb 2° → "clear"', () => {
    const view = computeSynastryView(aOrb2(), bOrb2(), 'en')!
    const sunSun = view.aspects.find((a) => a.a === 'Sun' && a.b === 'Sun')
    expect(sunSun!.strength).toBe('clear')
  })
})

describe('computeSynastryView — 어스펙트 8개 초과 시 slice', () => {
  // 개인행성을 많이 배치해 orb<=5 인 어스펙트가 8개를 넘게 만든다.
  it('9개 이상 후보가 나와도 최대 8개', () => {
    const many = (offset: number): Loose => ({
      planets: [
        planet('Sun', 0 + offset),
        planet('Moon', 60 + offset),
        planet('Mercury', 120 + offset),
        planet('Venus', 180 + offset),
        planet('Mars', 240 + offset),
      ],
      ascendant: planet('Ascendant', 300 + offset),
      mc: planet('MC', 330 + offset),
      houses: houses(),
    })
    const view = computeSynastryView(many(0), many(0), 'ko')!
    expect(view.aspects.length).toBe(8)
  })
})

describe('computeSynastryView — 기본 언어는 ko', () => {
  it('lang 인자 생략 시 한글 라벨', () => {
    const view = computeSynastryView(makeNatalA(), makeNatalB())!
    expect(view.aspects[0].a).toBe('태양')
  })
})

describe('computeSynastryView — 개인행성 미포함 어스펙트는 제외', () => {
  // Jupiter-Saturn(둘 다 비개인행성) 합만 있는 차트 → 어스펙트 0개.
  it('외행성끼리의 어스펙트는 aspects 에 안 들어간다', () => {
    const a: Loose = {
      planets: [planet('Jupiter', 10)],
      ascendant: planet('Ascendant', 200),
      mc: planet('MC', 100),
      houses: houses(),
    }
    const b: Loose = {
      planets: [planet('Saturn', 11)],
      ascendant: planet('Ascendant', 250),
      mc: planet('MC', 150),
      houses: houses(),
    }
    const view = computeSynastryView(a, b, 'ko')!
    expect(view).not.toBeNull()
    // Jupiter-Saturn 합은 개인행성 미포함이라 필터됨. ASC/MC 는 PERSONAL 에
    // Ascendant 만 있고 MC 는 없음 → 개인행성 포함 어스펙트만 남는다.
    const hasNonPersonal = view.aspects.some((asp) => asp.a === '목성' && asp.b === '토성')
    expect(hasNonPersonal).toBe(false)
  })
})
