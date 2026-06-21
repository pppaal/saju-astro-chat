// @vitest-environment node
/**
 * buildCompatReport — 궁합 차트 리포트 빌더. 밴드 점수(eastern_hap/chung,
 * elements_match, synastry_harmonic/tension), missing-astro/사주 폴백,
 * spouseStars 정렬·slice, pillarRelations 패스스루, crossVerdict 톤 arm,
 * ko/en 을 결정적 좌표/간지로 잠근다.
 *
 * 점성 fixture 는 좌표 직접 주입(천체력 불필요), 사주 fixture 는 hanja 간지
 * (STEM_HAP/STEM_EL 키와 일치)로 bond/clash/오행을 통제한다.
 *
 * 오행: 甲乙=목 丙丁=화 戊己=토 庚辛=금 壬癸=수.
 * 지지 오행: 子=수 丑辰未戌=토 寅卯=목 巳午=화 申酉=금 亥=수.
 */
import { describe, it, expect } from 'vitest'
import { buildCompatReport } from '@/lib/compatibility/compatReport'
import type { SajuPillarInput } from '@/lib/compatibility/sajuSynastryFormatter'

const HANGUL = /[가-힣]/
const P = (stem: string, branch: string): SajuPillarInput => ({ stem, branch })

type Loose = Record<string, unknown>
const houses = (): Loose[] => Array.from({ length: 12 }, (_, i) => ({ index: i + 1, cusp: i * 30 }))
const planet = (name: string, longitude: number): Loose => ({
  name,
  longitude,
  sign: 'Aries',
  degree: 0,
  minute: 0,
  formatted: '',
  house: 1,
})
const astro = (planets: Loose[], ascLon = 0, mcLon = 270): Loose => ({
  planets,
  ascendant: planet('Ascendant', ascLon),
  mc: planet('MC', mcLon),
  houses: houses(),
})

describe('buildCompatReport — 사주 없음(astro만)', () => {
  // astro 만 → sajuFacts null → dayMaster/spouseStars/pillarRelations 폴백.
  const astroA = astro([planet('Sun', 0), planet('Venus', 120)])
  const astroB = astro([planet('Moon', 0), planet('Mars', 120)])
  const r = buildCompatReport({ astroA, astroB, pillarsA: null, pillarsB: null, lang: 'ko' })

  it('dayMaster null, spouseStars/pillarRelations 빈 배열', () => {
    expect(r.dayMaster).toBeNull()
    expect(r.spouseStars).toEqual([])
    expect(r.pillarRelations).toEqual([])
  })
  it('synView 는 계산됨 (개인행성 cross 존재)', () => {
    expect(r.synView).not.toBeNull()
    expect(r.synView!.aspects.length).toBeGreaterThan(0)
  })
  it('band 에는 synastry_* 만, eastern_* 는 없음', () => {
    expect(r.band).toBeDefined()
    expect(r.band!.synastry_harmonic).toBeDefined()
    expect(r.band!.synastry_tension).toBeDefined()
    expect(r.band!.eastern_hap).toBeUndefined()
    expect(r.band!.elements_match).toBeUndefined()
  })
})

describe('buildCompatReport — astro 없음(사주만)', () => {
  // pillarsA/B 있고 astro 는 잘못된 형태 → synView null.
  // A 일간 甲(목) ↔ B 일간 己(토): 甲己 천간합(bond) + 목극토.
  const pillarsA = [P('甲', '寅'), P('乙', '卯'), P('甲', '子'), P('乙', '丑')]
  const pillarsB = [P('己', '未'), P('戊', '辰'), P('己', '巳'), P('戊', '午')]
  const r = buildCompatReport({
    astroA: null,
    astroB: null,
    pillarsA,
    pillarsB,
    lang: 'ko',
  })

  it('synView null (astro 데이터 없음)', () => {
    expect(r.synView).toBeNull()
  })
  it('dayMaster 가 계산됨 (甲↔己, aControlsB 목극토)', () => {
    expect(r.dayMaster).not.toBeNull()
    expect(r.dayMaster!.aStem).toBe('甲')
    expect(r.dayMaster!.bStem).toBe('己')
    expect(r.dayMaster!.relation).toBe('aControlsB')
  })
  it('band 에 eastern_* 가 있고 synastry_* 는 없음', () => {
    expect(r.band).toBeDefined()
    expect(r.band!.eastern_hap).toBeDefined()
    expect(r.band!.eastern_chung).toBeDefined()
    expect(r.band!.synastry_harmonic).toBeUndefined()
    expect(r.band!.synastry_tension).toBeUndefined()
  })
})

describe('buildCompatReport — eastern_hap / eastern_chung 점수', () => {
  it('bond 1건 → eastern_hap=20, clash 0 → eastern_chung=100', () => {
    // 甲↔己 천간합 1건만 잡히게 나머지 stem/branch 는 무관계로.
    const pillarsA = [P('甲', '寅'), P('乙', '卯'), P('甲', '子'), P('乙', '丑')]
    const pillarsB = [P('己', '巳'), P('丙', '午'), P('己', '申'), P('丁', '酉')]
    const r = buildCompatReport({ astroA: null, astroB: null, pillarsA, pillarsB, lang: 'ko' })
    const bonds = r.pillarRelations.filter((x) => x.tone === 'bond').length
    const clashes = r.pillarRelations.filter((x) => x.tone === 'clash').length
    expect(r.band!.eastern_hap).toBe(Math.min(100, bonds * 20))
    expect(r.band!.eastern_chung).toBe(Math.max(0, 100 - clashes * 15))
  })

  it('clash 가 있으면 eastern_chung 이 100 미만', () => {
    // 甲↔庚 천간충(clash). A stem 甲 vs B stem 庚.
    const pillarsA = [P('甲', '寅'), P('甲', '卯'), P('甲', '子'), P('甲', '丑')]
    const pillarsB = [P('庚', '巳'), P('庚', '午'), P('庚', '申'), P('庚', '酉')]
    const r = buildCompatReport({ astroA: null, astroB: null, pillarsA, pillarsB, lang: 'ko' })
    const clashes = r.pillarRelations.filter((x) => x.tone === 'clash').length
    expect(clashes).toBeGreaterThan(0)
    expect(r.band!.eastern_chung).toBe(Math.max(0, 100 - clashes * 15))
    expect(r.band!.eastern_chung).toBeLessThan(100)
  })

  it('eastern_hap 은 100 으로 상한(cap)', () => {
    // 甲(A 전부) ↔ 己(B 전부): 4x4 천간합 → bond 16건 → 20*16=320 > 100 → 100.
    const pillarsA = [P('甲', '寅'), P('甲', '卯'), P('甲', '子'), P('甲', '丑')]
    const pillarsB = [P('己', '巳'), P('己', '午'), P('己', '申'), P('己', '酉')]
    const r = buildCompatReport({ astroA: null, astroB: null, pillarsA, pillarsB, lang: 'ko' })
    expect(r.band!.eastern_hap).toBe(100)
  })
})

describe('buildCompatReport — elements_match 점수', () => {
  it('한쪽이 부족한 오행을 상대가 채우면 가산', () => {
    // A: 목 과다(甲乙寅卯) · 금 0. B: 금 과다(庚辛申酉) · 목 0.
    const pillarsA = [P('甲', '寅'), P('乙', '卯'), P('甲', '寅'), P('乙', '卯')]
    const pillarsB = [P('庚', '申'), P('辛', '酉'), P('庚', '申'), P('辛', '酉')]
    const r = buildCompatReport({ astroA: null, astroB: null, pillarsA, pillarsB, lang: 'ko' })
    // elements_match 가 산출되고 0보다 큼 (서로 보완).
    expect(r.band!.elements_match).toBeDefined()
    expect(r.band!.elements_match!).toBeGreaterThan(0)
    expect(r.band!.elements_match!).toBeLessThanOrEqual(100)
  })
})

describe('buildCompatReport — synastry_harmonic / tension 점수', () => {
  it('harmony 1건 → synastry_harmonic=20', () => {
    // A Sun 0 vs B Moon 120 → trine(harmony, orb 0). 개인행성 1쌍.
    const astroA = astro([planet('Sun', 0)], 200, 100)
    const astroB = astro([planet('Moon', 120)], 210, 110)
    const r = buildCompatReport({
      astroA,
      astroB,
      pillarsA: null,
      pillarsB: null,
      lang: 'ko',
    })
    const harm = r.synView!.aspects.filter((a) => a.tone === 'harmony').length
    const tens = r.synView!.aspects.filter((a) => a.tone === 'tension').length
    expect(r.band!.synastry_harmonic).toBe(Math.min(100, harm * 20))
    expect(r.band!.synastry_tension).toBe(Math.max(0, 100 - tens * 20))
  })

  it('tension 어스펙트가 있으면 synastry_tension 이 100 미만', () => {
    // A Sun 0 vs B Moon 90 → square(tension).
    const astroA = astro([planet('Sun', 0)], 200, 100)
    const astroB = astro([planet('Moon', 90)], 210, 110)
    const r = buildCompatReport({ astroA, astroB, pillarsA: null, pillarsB: null, lang: 'ko' })
    const tens = r.synView!.aspects.filter((a) => a.tone === 'tension').length
    expect(tens).toBeGreaterThan(0)
    expect(r.band!.synastry_tension).toBe(Math.max(0, 100 - tens * 20))
    expect(r.band!.synastry_tension).toBeLessThan(100)
  })
})

describe('buildCompatReport — spouseStars 정렬(일주 우선) + 상위 4', () => {
  it('isDayPillar=true 가 앞으로 정렬되고 최대 4개', () => {
    // 정/편재·정/편관(배우자성)이 여러 기둥에 잡히도록 구성.
    // A 일간 甲(목): 정관=금(庚辛/申酉), 편관=금. 정재=토(戊己/丑辰未戌), 편재=토.
    const pillarsA = [P('甲', '辰'), P('甲', '戌'), P('甲', '申'), P('甲', '丑')]
    const pillarsB = [P('庚', '申'), P('辛', '酉'), P('戊', '辰'), P('己', '未')]
    const r = buildCompatReport({ astroA: null, astroB: null, pillarsA, pillarsB, lang: 'ko' })
    expect(r.spouseStars.length).toBeLessThanOrEqual(4)
    if (r.spouseStars.length > 1) {
      // 정렬 안정성: 앞쪽 isDayPillar 가 뒤쪽보다 먼저(>=).
      for (let i = 1; i < r.spouseStars.length; i++) {
        const prev = Number(r.spouseStars[i - 1].isDayPillar)
        const cur = Number(r.spouseStars[i].isDayPillar)
        expect(prev).toBeGreaterThanOrEqual(cur)
      }
    }
  })
})

describe('buildCompatReport — crossVerdict 톤 arm', () => {
  // sajuNet = bond - clash, astroNet = harmony - tension.
  // ASC/MC 각도(A 19/20, B 48/49)는 서로·테스트 행성과 aspect 안 맺는 값 →
  // 의도한 Sun-Moon aspect 만 남는다. 사주는 동일 간지 반복으로 stem 관계만
  // 깨끗이 잡히게(branch 寅/酉 무관계).
  // 甲(A 전부) + 己(B 전부) → 천간합 16건(순수 bond). 甲 + 庚 → 천간충(순수 clash).
  const bondA = [P('甲', '寅'), P('甲', '寅'), P('甲', '寅'), P('甲', '寅')]
  const bondB = [P('己', '酉'), P('己', '酉'), P('己', '酉'), P('己', '酉')]
  const clashB = [P('庚', '酉'), P('庚', '酉'), P('庚', '酉'), P('庚', '酉')]

  it('aligned: 사주 bond + 별자리 harmony', () => {
    // Sun 0 trine Moon 120(harmony).
    const astroA = astro([planet('Sun', 0)], 19, 20)
    const astroB = astro([planet('Moon', 120)], 48, 49)
    const r = buildCompatReport({ astroA, astroB, pillarsA: bondA, pillarsB: bondB, lang: 'ko' })
    expect(r.crossVerdict!.tone).toBe('aligned')
    expect(r.crossVerdict!.text).toContain('한목소리')
  })

  it('tension: 사주 clash + 별자리 tension', () => {
    // Sun 0 square Moon 90(tension).
    const astroA = astro([planet('Sun', 0)], 19, 20)
    const astroB = astro([planet('Moon', 90)], 48, 49)
    const r = buildCompatReport({ astroA, astroB, pillarsA: bondA, pillarsB: clashB, lang: 'ko' })
    expect(r.crossVerdict!.tone).toBe('tension')
    expect(r.crossVerdict!.text).toContain('단련')
  })

  it('mixed: 사주 bond + 별자리 tension', () => {
    const astroA = astro([planet('Sun', 0)], 19, 20)
    const astroB = astro([planet('Moon', 90)], 48, 49) // square → tension
    const r = buildCompatReport({ astroA, astroB, pillarsA: bondA, pillarsB: bondB, lang: 'ko' })
    expect(r.crossVerdict!.tone).toBe('mixed')
    expect(r.crossVerdict!.text).toContain('입체')
  })

  it('neutral: 사주 net 0 + 별자리 net 0 (상쇄)', () => {
    // 사주: 甲(A)/甲(B) → 천간 무관계(bond 0 clash 0). 별자리: harmony 2 + tension 2
    // → astroNet 0. 둘 다 net 0 이라 어느 arm 도 안 잡힘 → neutral.
    const neutralA = [P('甲', '寅'), P('甲', '寅'), P('甲', '寅'), P('甲', '寅')]
    const neutralB = [P('甲', '酉'), P('甲', '酉'), P('甲', '酉'), P('甲', '酉')]
    const astroA = astro([planet('Sun', 0), planet('Venus', 0)], 19, 20)
    // Sun-Moon trine(harmony), Sun-Mars square(tension), Venus-Moon trine, Venus-Mars square.
    const astroB = astro([planet('Moon', 120), planet('Mars', 90)], 48, 49)
    const r = buildCompatReport({
      astroA,
      astroB,
      pillarsA: neutralA,
      pillarsB: neutralB,
      lang: 'ko',
    })
    expect(r.crossVerdict!.tone).toBe('neutral')
    expect(r.crossVerdict!.text).toContain('균형형')
  })

  it('데이터 둘 다 없으면 crossVerdict undefined', () => {
    const r = buildCompatReport({ astroA: null, astroB: null, pillarsA: null, pillarsB: null })
    expect(r.crossVerdict).toBeUndefined()
    expect(r.band).toBeUndefined()
  })
})

describe('buildCompatReport — EN 누출 방지', () => {
  it('en 모드 crossVerdict 텍스트에 한글 없음', () => {
    const pillarsA = [P('甲', '寅'), P('乙', '卯'), P('甲', '子'), P('乙', '丑')]
    const pillarsB = [P('己', '巳'), P('丙', '午'), P('己', '申'), P('丁', '酉')]
    const astroA = astro([planet('Sun', 0)], 200, 100)
    const astroB = astro([planet('Moon', 120)], 210, 110)
    const r = buildCompatReport({ astroA, astroB, pillarsA, pillarsB, lang: 'en' })
    expect(HANGUL.test(r.crossVerdict?.text ?? '')).toBe(false)
  })
})
