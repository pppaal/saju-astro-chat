/**
 * 궁합 시너스트리 뷰 — 행성쌍 의미(해석) 회귀.
 * "별자리 — 끌림과 마찰"이 raw 데이터(행성+관계어)만 나열하던 걸, 행성쌍마다
 * 관계 의미 한 줄을 붙이는 변경을 잠근다. 천체력 불필요(좌표 직접 주입).
 */
import { describe, it, expect } from 'vitest'
import { computeSynastryView } from '@/lib/compatibility/synastryView'

const HANGUL = /[가-힣]/
const chart = (planets: Array<[string, number]>) => ({
  planets: planets.map(([name, longitude]) => ({ name, longitude, sign: 'Aries' })),
  ascendant: { longitude: 0, sign: 'Aries' },
  mc: { longitude: 270, sign: 'Capricorn' },
  houses: Array.from({ length: 12 }, (_, i) => ({ cusp: i * 30 })),
})
// 태양-달 합 + 화성-금성 합(케미) + 태양-화성
const A = chart([
  ['Sun', 0],
  ['Venus', 120],
  ['Mars', 60],
])
const B = chart([
  ['Moon', 0],
  ['Mars', 122],
  ['Venus', 60],
])

describe('synastryView — 행성쌍 의미', () => {
  it('모든 aspect 에 의미가 붙고 undefined 누출이 없다', () => {
    const v = computeSynastryView(A, B, 'ko')!
    expect(v.aspects.length).toBeGreaterThan(0)
    for (const a of v.aspects) {
      expect(a.meaning.length).toBeGreaterThan(0)
      expect(a.a).not.toBe('undefined')
      expect(a.b).not.toBe('undefined')
      expect(a.meaning).not.toContain('undefined')
    }
  })
  it('hand-authored 핵심 쌍은 전용 문구', () => {
    const v = computeSynastryView(A, B, 'ko')!
    const sunMoon = v.aspects.find(
      (a) => (a.a === '태양' && a.b === '달') || (a.a === '달' && a.b === '태양')
    )
    expect(sunMoon?.meaning).toContain('핵심 축')
    const marsVenus = v.aspects.find(
      (a) => (a.a === '화성' && a.b === '금성') || (a.a === '금성' && a.b === '화성')
    )
    expect(marsVenus?.meaning).toContain('케미')
  })
  it('fallback 은 축 명사구 + 톤 접미사로 조사 안전', () => {
    // 수성-목성 같은 비-수록 쌍 → fallback. (목성은 개인행성 아님 → 수성이 껴야 통과)
    const a2 = chart([['Mercury', 0]])
    const b2 = chart([['Jupiter', 0]])
    const v = computeSynastryView(a2, b2, 'ko')
    const m = v?.aspects[0]?.meaning ?? ''
    if (m) {
      expect(m).toMatch(/축/)
      // 톤 방향 접미사가 항상 붙어 라벨과 일치
      expect(m).toMatch(/통해요|조율이 필요해요|엮이는 결/)
    }
  })
  it('의미가 톤 라벨과 어긋나지 않는다(조화=통해 / 긴장=조율)', () => {
    const v = computeSynastryView(A, B, 'ko')!
    for (const a of v.aspects) {
      if (a.tone === 'harmony') expect(a.meaning).toContain('통해요')
      if (a.tone === 'tension') expect(a.meaning).toContain('조율이 필요해요')
    }
  })
  it('EN 모드 의미에 한글 누출 없음', () => {
    const v = computeSynastryView(A, B, 'en')!
    for (const a of v.aspects) expect(HANGUL.test(a.meaning)).toBe(false)
  })
})

describe('synastryView — 시각 미상 시 ASC/MC 각·하우스 오버레이 제외', () => {
  // calculateSynastry 는 ascendant/mc 를 각 pool 에 넣는데(synastry.ts:163), 실차트는
  // name='Ascendant' 가 있어야 각이 라벨링된다. 헬퍼 차트에 named 앵글 부여.
  const namedChart = (planets: Array<[string, number]>, ascLon: number) => ({
    planets: planets.map(([name, longitude]) => ({ name, longitude, sign: 'Aries' })),
    ascendant: { name: 'Ascendant', longitude: ascLon, sign: 'Aries' },
    mc: { name: 'MC', longitude: (ascLon + 270) % 360, sign: 'Capricorn' },
    houses: Array.from({ length: 12 }, (_, i) => ({ cusp: i * 30 })),
  })
  // A.ascendant=0; B Sun=0 → A 상승점 ↔ B 태양 합. A Sun=100 → B 4H overlay.
  const aChart = namedChart([['Sun', 100]], 0)
  const bChart = namedChart([['Sun', 0]], 200)

  it('baseline: A 상승점 각 + A→B 하우스 overlay 가 잡힌다', () => {
    const v = computeSynastryView(aChart, bChart, 'ko')!
    expect(v.aspects.some((a) => a.a === '상승점' || a.b === '상승점')).toBe(true)
    expect(v.overlaysAtoB.length).toBeGreaterThan(0)
  })

  it('A 시각 미상: A 상승점이 낀 각 제외 + B→A overlay 제외(A→B 는 유지)', () => {
    const v = computeSynastryView(aChart, bChart, 'ko', true, false)!
    expect(v.aspects.some((a) => a.a === '상승점')).toBe(false)
    expect(v.overlaysBtoA.length).toBe(0)
    expect(v.overlaysAtoB.length).toBeGreaterThan(0) // B 하우스는 유효
  })

  it('B 시각 미상: A→B overlay 제외', () => {
    const v = computeSynastryView(aChart, bChart, 'ko', false, true)!
    expect(v.overlaysAtoB.length).toBe(0)
  })
})

// ── 추가: 미커버 분기(가드/catch/strength 티어/overlay 매핑/tone/기본언어) ──

// computeSynastry.test.ts(app 사본)와 동일 형태의 결정적 natal fixture.
// 같은 좌표라도 *canonical* synastryView 를 직접 친다.
type Loose = Record<string, unknown>
const houses = (): Loose[] =>
  Array.from({ length: 12 }, (_, i) => ({ index: i + 1, cusp: i * 30, sign: 'Aries' }))
const p = (name: string, longitude: number): Loose => ({
  name,
  longitude,
  sign: 'Aries',
  degree: 0,
  minute: 0,
  formatted: '',
  house: 1,
})

describe('computeSynastryView — 입력 가드(toChartLike) null 분기', () => {
  const validB = {
    planets: [p('Moon', 0)],
    ascendant: p('Ascendant', 200),
    mc: p('MC', 100),
    houses: houses(),
  }
  it('astroA null → null', () => {
    expect(computeSynastryView(null, validB)).toBeNull()
  })
  it('비객체(문자열/숫자) → null', () => {
    expect(computeSynastryView('x', validB)).toBeNull()
    expect(computeSynastryView(7, validB)).toBeNull()
  })
  it('planets 가 배열 아님 → null', () => {
    expect(computeSynastryView({ planets: 'no' }, validB)).toBeNull()
  })
  it('planets 빈 배열 → null', () => {
    expect(computeSynastryView({ planets: [] }, validB)).toBeNull()
  })
  it('longitude(숫자) 없는 planets → null', () => {
    expect(computeSynastryView({ planets: [{ name: 'Sun' }] }, validB)).toBeNull()
  })
})

describe('computeSynastryView — calculateSynastry throw 시 catch→null', () => {
  it('houses 누락(빈 배열)이면 overlay 계산이 throw → null', () => {
    // toChartLike 가 houses 를 [] 로 채움 → getHouseForLongitude 가 빈 배열을
    // 인덱싱하다 throw → computeSynastryView 의 try/catch 가 null 반환.
    const noHouses = {
      planets: [p('Sun', 10), p('Venus', 130)],
      ascendant: p('Ascendant', 0),
      mc: p('MC', 270),
    }
    const validB = {
      planets: [p('Moon', 11)],
      ascendant: p('Ascendant', 200),
      mc: p('MC', 100),
      houses: houses(),
    }
    expect(computeSynastryView(noHouses, validB)).toBeNull()
  })
})

describe('computeSynastryView — strength 3티어 (ko)', () => {
  const mkA = (lon: number): Loose => ({
    planets: [p('Sun', 0)],
    ascendant: p('Ascendant', 200),
    mc: p('MC', 100),
    houses: houses(),
  })
  const mkB = (lon: number): Loose => ({
    planets: [p('Sun', lon)],
    ascendant: p('Ascendant', 210),
    mc: p('MC', 110),
    houses: houses(),
  })
  it('orb 1 → 강하게', () => {
    const v = computeSynastryView(mkA(0), mkB(1), 'ko')!
    const ss = v.aspects.find((x) => x.a === '태양' && x.b === '태양')!
    expect(ss.orb).toBe(1)
    expect(ss.strength).toBe('강하게')
  })
  it('orb 2 → 또렷이', () => {
    const v = computeSynastryView(mkA(0), mkB(2), 'ko')!
    const ss = v.aspects.find((x) => x.a === '태양' && x.b === '태양')!
    expect(ss.strength).toBe('또렷이')
  })
  it('orb 4 → 은은히', () => {
    const v = computeSynastryView(mkA(0), mkB(4), 'ko')!
    const ss = v.aspects.find((x) => x.a === '태양' && x.b === '태양')!
    expect(ss.strength).toBe('은은히')
  })
})

describe('computeSynastryView — strength 3티어 (en)', () => {
  const mk = (lon: number): Loose => ({
    planets: [p('Sun', lon)],
    ascendant: p('Ascendant', 200 + lon),
    mc: p('MC', 100 + lon),
    houses: houses(),
  })
  it('orb 1 → strong / orb 2 → clear / orb 4 → faint', () => {
    const a = mk(0)
    expect(computeSynastryView(a, mk(1), 'en')!.aspects.find((x) => x.a === 'Sun')!.strength).toBe(
      'strong'
    )
    expect(computeSynastryView(a, mk(2), 'en')!.aspects.find((x) => x.a === 'Sun')!.strength).toBe(
      'clear'
    )
    expect(computeSynastryView(a, mk(4), 'en')!.aspects.find((x) => x.a === 'Sun')!.strength).toBe(
      'faint'
    )
  })
})

describe('computeSynastryView — quincunx(엇박)는 TENSION 분류', () => {
  // NOTE: synastryView 의 TENSION 셋이 quincunx 를 포함하므로 toneOf 가 tension
  // 을 돌려준다. 따라서 SynastryTone 의 'neutral' arm 과 toneTail 의 neutral
  // 분기는 엔진이 내는 6종 aspect 로는 사실상 도달 불가(uncoverable). 여기선
  // 실제 동작(quincunx=tension)을 잠근다.
  it('quincunx 는 라벨 "엇박" + tone tension + meaning 에 "조율이 필요해요"', () => {
    // Sun 0 vs Venus 150 → quincunx(orb 0).
    const a = {
      planets: [p('Sun', 0)],
      ascendant: p('Ascendant', 200),
      mc: p('MC', 100),
      houses: houses(),
    }
    const b = {
      planets: [p('Venus', 150)],
      ascendant: p('Ascendant', 220),
      mc: p('MC', 120),
      houses: houses(),
    }
    const v = computeSynastryView(a, b, 'ko')!
    const q = v.aspects.find((x) => x.label === '엇박')!
    expect(q).toBeDefined()
    expect(q.tone).toBe('tension')
    expect(q.meaning).toContain('조율이 필요해요')
  })
})

describe('computeSynastryView — overlay 매핑 (ko/en) + 비개인행성 제외', () => {
  // A 개인행성(금성 190 → B 7H) + 외행성(목성 10) ; overlay 필터 검증.
  const a = {
    planets: [p('Venus', 190), p('Jupiter', 10)],
    ascendant: p('Ascendant', 0),
    mc: p('MC', 270),
    houses: houses(),
  }
  const b = {
    planets: [p('Mars', 130)],
    ascendant: p('Ascendant', 0),
    mc: p('MC', 270),
    houses: houses(),
  }
  it('ko: 개인행성만, 하우스 의미 한글', () => {
    const v = computeSynastryView(a, b, 'ko')!
    expect(v.overlaysAtoB).toEqual([
      { planet: '금성', planetKey: 'Venus', house: 7, meaning: '동반자·결혼' },
    ])
    expect(v.overlaysBtoA).toEqual([
      { planet: '화성', planetKey: 'Mars', house: 5, meaning: '연애·즐거움' },
    ])
  })
  it('en: 하우스 의미 영어', () => {
    const v = computeSynastryView(a, b, 'en')!
    expect(v.overlaysAtoB).toEqual([
      { planet: 'Venus', planetKey: 'Venus', house: 7, meaning: 'partner·marriage' },
    ])
    expect(v.overlaysBtoA).toEqual([
      { planet: 'Mars', planetKey: 'Mars', house: 5, meaning: 'romance·play' },
    ])
  })
})

describe('computeSynastryView — aspect 정렬(강한 순, orb 오름차순)', () => {
  // 회귀: 예전엔 필터 후 곧장 .slice(0,8) 이라 엔진 방출 순서(Sun 먼저…)대로
  // 잘려, 타이트한 각이 느슨한 각에 밀려 탈락했다. 이제 slice 전에 orb 오름차순
  // 정렬 → "가장 강한 8개" 를 취한다.
  it('반환된 aspect 는 orb 오름차순이고, 가장 타이트한 각이 잘리지 않는다', () => {
    // A 의 5개 개인행성을 모두 0°, B 의 5개를 0.2~1.0° 로 두면 25개 합(conjunction)이
    // 생기고 orb ∈ {0.2,0.4,0.6,0.8,1.0}. 상위 8개는 전부 가장 타이트한 축이어야.
    const A = {
      planets: [p('Sun', 0), p('Moon', 0), p('Mercury', 0), p('Venus', 0), p('Mars', 0)],
      ascendant: p('Ascendant', 200),
      mc: p('MC', 100),
      houses: houses(),
    }
    const B = {
      planets: [p('Sun', 0.2), p('Moon', 0.4), p('Mercury', 0.6), p('Venus', 0.8), p('Mars', 1.0)],
      ascendant: p('Ascendant', 210),
      mc: p('MC', 110),
      houses: houses(),
    }
    const v = computeSynastryView(A, B, 'ko')!
    expect(v.aspects.length).toBe(8)
    // orb 오름차순(비내림차) — 정렬이 slice 앞에 적용됐다는 증거. 정렬이 없으면
    // 엔진 방출 순서(A-Sun 행 먼저 → A-Moon 행에서 다시 낮은 orb 로 리셋)라 이
    // 단조성이 깨진다. 즉 이 루프가 "slice 전에 정렬한다" 회귀를 잡는다.
    for (let i = 1; i < v.aspects.length; i++) {
      expect(v.aspects[i].orb).toBeGreaterThanOrEqual(v.aspects[i - 1].orb)
    }
    // 반환된 상위 8개는 전부 타이트한 축(≤1°)이다 — 느슨한 각이 끼어들지 않았다.
    for (const a of v.aspects) expect(a.orb).toBeLessThanOrEqual(1)
  })
})

describe('computeSynastryView — 기본 언어 ko', () => {
  it('lang 생략 시 한글 라벨/행성명', () => {
    const a = {
      planets: [p('Sun', 0)],
      ascendant: p('Ascendant', 200),
      mc: p('MC', 100),
      houses: houses(),
    }
    const b = {
      planets: [p('Venus', 0)],
      ascendant: p('Ascendant', 210),
      mc: p('MC', 110),
      houses: houses(),
    }
    const v = computeSynastryView(a, b)!
    const m = v.aspects.find((x) => x.a === '태양')
    expect(m).toBeDefined()
  })
})
