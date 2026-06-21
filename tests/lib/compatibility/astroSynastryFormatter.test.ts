// @vitest-environment node
/**
 * 점성 시너스트리 라인 포맷 (formatAstroSynastry) — 브랜치 회귀.
 *
 * 목적: astroSynastryFormatter 의 미커버 분기(아스펙트 티어 분류, owner-tag
 * 라벨, 하우스 오버레이 의미, ko/en 렌더, generational 묶음, South Node 분기,
 * expandChart try/catch, ASC 별자리 누출 방지)를 결정적 좌표로 잠근다.
 *
 * 천체력(Swiss Ephemeris) 의존을 피하려고 chart.meta.jdUT 를 *생략*하면
 * expandChart 는 ExtraPoints 계산을 건너뛴다(본체만 진행). jdUT 를 주면
 * extendChartWithExtraPoints 가 호출되는데, Sun/Moon 이 없으면 throw → catch
 * 분기를 결정적으로 탄다.
 *
 * ASC/MC 각도(A=19/20, B=48/49)는 본 테스트가 쓰는 모든 행성 경도(0~190)와
 * 서로에 대해 어떤 aspect 도 안 맺도록 brute-force 로 고른 값 — ASC/MC 노이즈
 * 라인이 안 끼어 "특정 cross 라인 유무" 단언이 안정적이다.
 */
import { describe, it, expect } from 'vitest'
import { formatAstroSynastry } from '@/lib/compatibility/astroSynastryFormatter'
import type { Chart, PlanetBase, ZodiacKo } from '@/lib/astrology/foundation/types'

const SIGNS: ZodiacKo[] = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
]

function planet(name: string, longitude: number): PlanetBase {
  const idx = Math.floor((((longitude % 360) + 360) % 360) / 30)
  const degree = Math.floor(longitude % 30)
  return {
    name,
    longitude,
    sign: SIGNS[idx],
    degree,
    minute: 0,
    formatted: `${SIGNS[idx]} ${degree}deg`,
    house: Math.floor((((longitude % 360) + 360) % 360) / 30) + 1,
    speed: 1,
    retrograde: false,
  }
}

function houses() {
  return Array.from({ length: 12 }, (_, i) => ({
    index: i + 1,
    cusp: i * 30,
    sign: SIGNS[i],
    formatted: `${SIGNS[i]} 0deg`,
  }))
}

function chartA(planets: PlanetBase[]): Chart {
  return {
    planets,
    ascendant: planet('Ascendant', 19),
    mc: planet('MC', 20),
    houses: houses(),
  } as unknown as Chart
}
function chartB(planets: PlanetBase[]): Chart {
  return {
    planets,
    ascendant: planet('Ascendant', 48),
    mc: planet('MC', 49),
    houses: houses(),
  } as unknown as Chart
}

const baseInput = {
  latA: 37.5,
  lonA: 127,
  latB: 37.5,
  lonB: 127,
}

describe('formatAstroSynastry — 입력 가드', () => {
  it('chartA 없으면 빈 문자열', () => {
    expect(
      formatAstroSynastry({
        ...baseInput,
        chartA: undefined as unknown as Chart,
        chartB: chartB([]),
      })
    ).toBe('')
  })
  it('chartB 없으면 빈 문자열', () => {
    expect(
      formatAstroSynastry({
        ...baseInput,
        chartA: chartA([]),
        chartB: undefined as unknown as Chart,
      })
    ).toBe('')
  })
})

describe('formatAstroSynastry — CRITICAL 티어 (개인행성 cross orb≤3°)', () => {
  // A Venus 0° vs B Mars 1° → conjunction orb 1, 둘 다 CRITICAL_POINTS → CRITICAL.
  const A = chartA([planet('Venus', 0)])
  const B = chartB([planet('Mars', 1)])

  it('ko: CRITICAL 헤더 + owner-tag 라인 (금성/화성)', () => {
    const out = formatAstroSynastry({ ...baseInput, chartA: A, chartB: B, lang: 'ko' })
    expect(out).toContain('[CRITICAL · 개인행성 cross orb≤3°]')
    expect(out).toMatch(/A 금성 \[결합\] B 화성 1\.0°/)
  })

  it('en: CRITICAL 헤더 영어 + 영어 관계어 [conjunction]', () => {
    const out = formatAstroSynastry({ ...baseInput, chartA: A, chartB: B, lang: 'en' })
    expect(out).toContain('[CRITICAL · personal-planet cross orb≤3°]')
    expect(out).toMatch(/A Venus \[conjunction\] B Mars 1\.0°/)
    expect(out).not.toContain('[결합]')
  })

  it('이름 주입 시 owner 라벨에 고정 A(이름)/B(이름)', () => {
    const out = formatAstroSynastry({
      ...baseInput,
      chartA: A,
      chartB: B,
      nameA: '철수',
      nameB: '영희',
      lang: 'ko',
    })
    expect(out).toContain('A = 철수 · B = 영희')
    expect(out).toMatch(/A\(철수\) 금성 \[결합\] B\(영희\) 화성/)
  })
})

describe('formatAstroSynastry — IMPORTANT 티어 (orb≤5, 비-critical)', () => {
  // Mercury(개인행성이지만 CRITICAL_POINTS 아님)–Mercury conjunction orb 2 → IMPORTANT.
  const A = chartA([planet('Mercury', 0)])
  const B = chartB([planet('Mercury', 2)])

  it('IMPORTANT 헤더 + 라인, CRITICAL 헤더는 없음', () => {
    const out = formatAstroSynastry({ ...baseInput, chartA: A, chartB: B, lang: 'ko' })
    expect(out).toContain('[IMPORTANT · orb≤5°]')
    expect(out).not.toContain('[CRITICAL · 개인행성 cross orb≤3°]')
    expect(out).toMatch(/A 수성 \[결합\] B 수성 2\.0°/)
  })

  it('CRITICAL_POINT 라도 orb>3 이면 IMPORTANT 로 강등', () => {
    // Sun(CRITICAL) vs Sun, orb 4 → critical 조건(orb≤3) 미충족 → IMPORTANT.
    const a2 = chartA([planet('Sun', 0)])
    const b2 = chartB([planet('Sun', 4)])
    const out = formatAstroSynastry({ ...baseInput, chartA: a2, chartB: b2, lang: 'ko' })
    expect(out).toContain('[IMPORTANT · orb≤5°]')
    expect(out).not.toContain('[CRITICAL · 개인행성 cross orb≤3°]')
    expect(out).toMatch(/A 태양 \[결합\] B 태양 4\.0°/)
  })
})

describe('formatAstroSynastry — 아스펙트 관계어 전 종류 (ko/en)', () => {
  // Sun 기준점으로 각 아스펙트 한 종류씩. orb 0 + CRITICAL 이라 CRITICAL 에 표기.
  const cases: Array<{ lon: number; ko: string; en: string }> = [
    { lon: 0, ko: '[결합]', en: '[conjunction]' },
    { lon: 180, ko: '[대립]', en: '[opposition]' },
    { lon: 120, ko: '[조화]', en: '[trine]' },
    { lon: 90, ko: '[긴장]', en: '[square]' },
    { lon: 60, ko: '[협력]', en: '[sextile]' },
    { lon: 150, ko: '[미세조정]', en: '[quincunx]' },
  ]
  for (const c of cases) {
    it(`ko: ${c.ko} (각도 ${c.lon})`, () => {
      const out = formatAstroSynastry({
        ...baseInput,
        chartA: chartA([planet('Sun', 0)]),
        chartB: chartB([planet('Venus', c.lon)]),
        lang: 'ko',
      })
      expect(out).toContain(c.ko)
    })
    it(`en: ${c.en} (각도 ${c.lon})`, () => {
      const out = formatAstroSynastry({
        ...baseInput,
        chartA: chartA([planet('Sun', 0)]),
        chartB: chartB([planet('Venus', c.lon)]),
        lang: 'en',
      })
      expect(out).toContain(c.en)
    })
  }
})

describe('formatAstroSynastry — orb>5° drop', () => {
  it('orb 6° 어스펙트는 cross 섹션을 만들지 않는다', () => {
    // Sun 0 vs Venus 6 → conjunction orb 6 > 5 → drop.
    const out = formatAstroSynastry({
      ...baseInput,
      chartA: chartA([planet('Sun', 0)]),
      chartB: chartB([planet('Venus', 6)]),
      lang: 'ko',
    })
    expect(out).not.toContain('[CRITICAL · 개인행성 cross orb≤3°]')
    expect(out).not.toContain('[IMPORTANT · orb≤5°]')
  })
})

describe('formatAstroSynastry — generational 외행성 컨정션 묶음', () => {
  // Jupiter–Saturn conjunction (둘 다 비개인행성) → generational 요약 1줄.
  it('ko: [참고] 외행성 동세대 N건 요약', () => {
    const out = formatAstroSynastry({
      ...baseInput,
      chartA: chartA([planet('Jupiter', 0)]),
      chartB: chartB([planet('Saturn', 1)]),
      lang: 'ko',
    })
    expect(out).toMatch(/\[참고\] 외행성 동세대 1건/)
    expect(out).toContain('목성')
    expect(out).toContain('토성')
  })
  it('en: [NOTE] outer-planet generational N', () => {
    const out = formatAstroSynastry({
      ...baseInput,
      chartA: chartA([planet('Jupiter', 0)]),
      chartB: chartB([planet('Saturn', 1)]),
      lang: 'en',
    })
    expect(out).toMatch(/\[NOTE\] outer-planet generational 1/)
    expect(out).toContain('Jupiter')
    expect(out).toContain('Saturn')
  })
})

describe('formatAstroSynastry — 하우스 오버레이 + ASC 라인', () => {
  // houses cusp = i*30, 7H = 180..210, 5H = 120..150.
  const A = chartA([planet('Venus', 190)]) // B 의 7H (180~210)
  const B = chartB([planet('Mars', 130)]) // A 의 5H (120~150)

  it('ko: House overlay 헤더 + 하우스 의미(동반자·결혼 / 연애·즐거움)', () => {
    const out = formatAstroSynastry({ ...baseInput, chartA: A, chartB: B, lang: 'ko' })
    expect(out).toContain('[CRITICAL · House overlay]')
    expect(out).toMatch(/A 금성 → B 7H \(동반자·결혼\)/)
    expect(out).toMatch(/B 화성 → A 5H \(연애·즐거움\)/)
    expect(out).toMatch(/상승점 A .+ \/ B/)
  })

  it('en: House overlay 영어 의미 (partner·marriage / romance·pleasure) + ASC', () => {
    const out = formatAstroSynastry({ ...baseInput, chartA: A, chartB: B, lang: 'en' })
    expect(out).toMatch(/A Venus → B 7H \(partner·marriage\)/)
    expect(out).toMatch(/B Mars → A 5H \(romance·pleasure\)/)
    expect(out).toMatch(/ASC A .+ \/ B/)
  })

  it('외행성 오버레이는 카운트만 (omitted N generational outer-planet overlays)', () => {
    // A 에 개인행성 1 + 외행성 1 → outerDiffCount>0 분기.
    const a2 = chartA([planet('Venus', 190), planet('Jupiter', 10)])
    const b2 = chartB([planet('Mars', 130)])
    const outKo = formatAstroSynastry({ ...baseInput, chartA: a2, chartB: b2, lang: 'ko' })
    expect(outKo).toMatch(/외행성 1건 동세대 공통 생략/)
    const outEn = formatAstroSynastry({ ...baseInput, chartA: a2, chartB: b2, lang: 'en' })
    expect(outEn).toMatch(/omitted 1 generational outer-planet overlays/)
  })
})

describe('formatAstroSynastry — 시각 미상 시 ASC/MC/하우스 제외', () => {
  // A Venus 190 → B 7H ; B Mars 130 → A 5H ; ASC A=Aries(19) / B=Taurus(48).
  const A = chartA([planet('Venus', 190)])
  const B = chartB([planet('Mars', 130)])

  it('A 시각 미상: A 하우스로의 overlay(B→A) 제외 + ASC A=미상, A→B overlay 는 유지', () => {
    const out = formatAstroSynastry({ ...baseInput, chartA: A, chartB: B, timeUnknownA: true })
    // B 화성 → A 5H 는 A 하우스가 필요 → 제외
    expect(out).not.toMatch(/B 화성 → A 5H/)
    // A 금성 → B 7H 는 B 하우스 기반 → 유지
    expect(out).toMatch(/A 금성 → B 7H/)
    // ASC A 는 미상 표기, B 는 별자리 유지
    expect(out).toMatch(/상승점 A 미상 \/ B /)
  })

  it('B 시각 미상: B 하우스로의 overlay(A→B) 제외 + ASC B=미상', () => {
    const out = formatAstroSynastry({ ...baseInput, chartA: A, chartB: B, timeUnknownB: true })
    expect(out).not.toMatch(/A 금성 → B 7H/)
    expect(out).toMatch(/B 화성 → A 5H/)
    expect(out).toMatch(/상승점 A .+ \/ B 미상/)
  })

  it('앵글(ASC/MC) 이 낀 aspect 는 미상 쪽에서 제외된다', () => {
    // A ASC(19) ↔ B Venus(19) = conjunction. timeUnknownA 면 사라져야 한다.
    const a2 = chartA([planet('Sun', 200)])
    const b2 = chartB([planet('Venus', 19)])
    const base2 = formatAstroSynastry({ ...baseInput, chartA: a2, chartB: b2 })
    expect(base2).toMatch(/A 상승점 \[결합\] B 금성/)
    const unknown = formatAstroSynastry({
      ...baseInput,
      chartA: a2,
      chartB: b2,
      timeUnknownA: true,
    })
    expect(unknown).not.toMatch(/A 상승점 \[결합\] B 금성/)
  })
})

describe('formatAstroSynastry — ASC 별자리 EN 변환', () => {
  it('한글 별자리 ASC 가 en 모드에서 영어로', () => {
    const A = chartA([planet('Sun', 0)])
    ;(A.ascendant as { sign: string }).sign = '물병자리'
    const B = chartB([planet('Venus', 90)]) // square (cross 생기지만 ASC 라인 검증이 목적)
    ;(B.ascendant as { sign: string }).sign = '양자리'
    const out = formatAstroSynastry({ ...baseInput, chartA: A, chartB: B, lang: 'en' })
    expect(out).toMatch(/ASC A Aquarius \/ B Aries/)
  })
  it('ko 모드에서 영어 별자리 ASC 가 한글로', () => {
    const A = chartA([planet('Sun', 0)])
    ;(A.ascendant as { sign: string }).sign = 'Aquarius'
    const B = chartB([planet('Venus', 90)])
    const out = formatAstroSynastry({ ...baseInput, chartA: A, chartB: B, lang: 'ko' })
    expect(out).toContain('물병자리')
  })
})

describe('formatAstroSynastry — South Node 분기 (True Node + 180)', () => {
  it('True Node 있으면 South Node 가 계산돼 cross 에 잡힌다', () => {
    // South Node 분기는 expandChart 가 jdUT!=null 일 때만 돈다. jdUT 주입 시
    // extendChartWithExtraPoints 는 Sun/Moon 없어 throw→catch 되지만, 그와
    // 무관하게 South Node(= True Node + 180°)는 추가된다.
    // A True Node 0° → South Node 180°. B Sun 180° → South Node 와 conjunction.
    const A = chartA([planet('True Node', 0)])
    ;(A as unknown as { meta: { jdUT: number } }).meta = { jdUT: 2451545 }
    const B = chartB([planet('Sun', 180)])
    const out = formatAstroSynastry({ ...baseInput, chartA: A, chartB: B, lang: 'ko' })
    expect(out).toContain('남교점')
  })
})

describe('formatAstroSynastry — expandChart catch (jdUT 있으나 Sun/Moon 없음)', () => {
  it('ExtraPoints throw 해도 본체로 진행 (예외 안 남)', () => {
    // meta.jdUT 주입 → extendChartWithExtraPoints 호출. Sun/Moon 없음 → throw →
    // expandChart 의 catch 가 삼킴. 결과는 정상 문자열.
    const A = chartA([planet('Venus', 0)])
    ;(A as unknown as { meta: { jdUT: number } }).meta = { jdUT: 2451545 }
    const B = chartB([planet('Mars', 1)])
    ;(B as unknown as { meta: { jdUT: number } }).meta = { jdUT: 2451545 }
    let out = ''
    expect(() => {
      out = formatAstroSynastry({ ...baseInput, chartA: A, chartB: B, lang: 'ko' })
    }).not.toThrow()
    expect(out).toMatch(/A 금성 \[결합\] B 화성/)
  })
})

describe('formatAstroSynastry — 행성 없는 차트 (헤더 + 고정안내만)', () => {
  it('cross/overlay 섹션 없이 헤더만', () => {
    // ASC/MC 가 서로 aspect 안 맺는 각도라 개인행성 cross/overlay 없음.
    const out = formatAstroSynastry({
      ...baseInput,
      chartA: chartA([]),
      chartB: chartB([]),
      lang: 'ko',
    })
    expect(out).toContain('== 시너스트리 (점성 cross) ==')
    expect(out).toContain('[고정]')
    expect(out).not.toContain('[CRITICAL · 개인행성 cross orb≤3°]')
    expect(out).not.toContain('[IMPORTANT · orb≤5°]')
  })
})
