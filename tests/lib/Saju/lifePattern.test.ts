/**
 * deriveLifePattern — 대운 흐름을 신강약 억부 논리로 읽어 생애 시나리오 라벨을 도출.
 *
 * Pure function (saju input only); the file had 0% coverage. These tests pin
 * the category mapping, the favor signs per strength, and every pattern-label
 * branch by constructing deterministic 대운 sequences.
 *
 * Doctrine used here (day master 甲 = 목):
 *   - weak 일간: 비겁(목)/인성(수) 운이 우호(+), 식상/재성/관성은 불리(−)
 *   - 丙午 = 식상(화) 두 글자 → weak 기준 favor −2
 *   - 壬子 = 인성(수) 두 글자 → weak 기준 favor +2
 */
import { deriveLifePattern } from '@/lib/calendar-engine/derivers/lifePattern'

const FAV = { stem: '壬', branch: '子' } // 인성(수)+인성(수) → weak: +2
const UNFAV = { stem: '丙', branch: '午' } // 식상(화)+식상(화) → weak: −2

function daeun(specs: Array<{ at: number; fav: boolean }>) {
  return specs.map((s) => ({
    ...(s.fav ? FAV : UNFAV),
    startAge: s.at,
  }))
}

function weakSaju(d: ReturnType<typeof daeun>) {
  return { dayMaster: { name: '甲' }, strength: 'weak', daeun: d }
}

describe('deriveLifePattern', () => {
  it('returns null without a day master or 대운', () => {
    expect(deriveLifePattern({ daeun: [{ stem: '甲', branch: '子', startAge: 5 }] })).toBeNull()
    expect(deriveLifePattern({ dayMaster: { name: '甲' }, daeun: [] })).toBeNull()
    expect(deriveLifePattern({ dayMaster: { name: '甲' } })).toBeNull()
  })

  it('classifies a late-blooming curve (unfavorable early, favorable late)', () => {
    const saju = weakSaju(
      daeun([
        { at: 15, fav: false },
        { at: 25, fav: false },
        { at: 35, fav: false },
        { at: 45, fav: true },
        { at: 55, fav: true },
        { at: 65, fav: true },
        { at: 75, fav: true },
        { at: 85, fav: true },
      ])
    )
    const p = deriveLifePattern(saju)
    expect(p?.key).toBe('late-bloomer')
    expect(p?.ko).toBe('대기만성형')
    expect(p?.daeun).toHaveLength(8)
  })

  it('classifies an early-peak curve (favorable early, unfavorable late)', () => {
    const saju = weakSaju(
      daeun([
        { at: 15, fav: true },
        { at: 25, fav: true },
        { at: 35, fav: true },
        { at: 45, fav: false },
        { at: 55, fav: false },
        { at: 65, fav: false },
        { at: 75, fav: false },
      ])
    )
    expect(deriveLifePattern(saju)?.key).toBe('early-peak')
  })

  it('classifies a midlife-peak curve (favorable only in 40s–50s)', () => {
    const saju = weakSaju(
      daeun([
        { at: 15, fav: false },
        { at: 25, fav: false },
        { at: 45, fav: true },
        { at: 55, fav: true },
        { at: 65, fav: false },
        { at: 75, fav: false },
      ])
    )
    expect(deriveLifePattern(saju)?.key).toBe('midlife-peak')
  })

  it('classifies an all-favorable life as smooth', () => {
    const saju = weakSaju(
      daeun([
        { at: 15, fav: true },
        { at: 25, fav: true },
        { at: 45, fav: true },
        { at: 55, fav: true },
        { at: 65, fav: true },
        { at: 75, fav: true },
      ])
    )
    expect(deriveLifePattern(saju)?.key).toBe('smooth')
  })

  it('classifies an all-unfavorable life as hard', () => {
    const saju = weakSaju(
      daeun([
        { at: 15, fav: false },
        { at: 25, fav: false },
        { at: 45, fav: false },
        { at: 55, fav: false },
        { at: 65, fav: false },
        { at: 75, fav: false },
      ])
    )
    expect(deriveLifePattern(saju)?.key).toBe('hard')
  })

  it('classifies a dip-in-the-middle curve as undulating', () => {
    const saju = weakSaju(
      daeun([
        { at: 15, fav: true }, // early +2
        { at: 25, fav: true },
        { at: 45, fav: false }, // mid −2
        { at: 55, fav: false },
        { at: 65, fav: true }, // late +2
        { at: 75, fav: true },
      ])
    )
    expect(deriveLifePattern(saju)?.key).toBe('undulating')
  })

  it('scores a neutral element as 0 under 중화 strength', () => {
    // yong=수, avoid=화; a 목 pillar (甲寅) is neither → favor 0
    const saju = {
      dayMaster: { name: '甲' },
      strength: 'medium',
      yongsin: { primary: '수', avoid: ['화'] },
      daeun: [
        { stem: '甲', branch: '寅', startAge: 15 }, // 목 both → 0
        { stem: '甲', branch: '寅', startAge: 45 },
        { stem: '甲', branch: '寅', startAge: 65 },
      ],
    }
    const p = deriveLifePattern(saju)
    expect(p?.daeun.every((x) => x.favor === 0)).toBe(true)
  })

  it('honors strong-strength favor (식상/재성/관성 become positive)', () => {
    // strong 일간: 丙午(식상) is favorable, 壬子(인성) is unfavorable — the signs
    // flip vs the weak cases, so an all-식상 chart reads as smooth.
    const saju = {
      dayMaster: { name: '甲' },
      strength: 'strong',
      daeun: daeun([
        { at: 15, fav: false }, // 丙午 식상 → strong: +2
        { at: 25, fav: false },
        { at: 45, fav: false },
        { at: 55, fav: false },
        { at: 65, fav: false },
        { at: 75, fav: false },
      ]),
    }
    expect(deriveLifePattern(saju)?.key).toBe('smooth')
  })

  it('classifies a gentle monotone climb (decent start, climbs) as steady-rise', () => {
    // 초년이 이미 양(+)이라 대기만성(반전, early≤0.1)은 아니고, 단조 비감소로 오르는 흐름.
    // FAV=+2, MIX(甲子=비겁목+인성수, weak)=+2... → MIX 대신 한 글자만 우호인 대운으로
    // 초년을 +0.5 쯤으로 만든다. 甲午: 비겁(목)+식상(화) → weak: +1−1 = 0... 은 안 됨.
    // 壬午: 인성(수)+식상(화) → weak: +1−1 = 0. 壬寅: 인성(수)+비겁(목) → +1+1 = +2.
    // 한 글자 우호(+1)만 내려면 stem 우호/branch 불리 조합: 壬午 = 0, 안 됨.
    // 대신 초년 두 칸을 +2/−1 평균 +0.5 로: 壬子(+2), 庚午? 庚=관성(금)... 복잡 → 직접 favor 구성.
    // 간단히: 초년 두 대운 평균이 +0.5 가 되도록 壬子(+2) 와 丙申(식상화 −1 + 재성금 −1 = −1) 사용.
    const climbing = {
      dayMaster: { name: '甲' },
      strength: 'weak',
      daeun: [
        { ...FAV, startAge: 15 }, // 壬子 +2
        { ...FAV, startAge: 25 }, // 壬子 +2
        { ...UNFAV, startAge: 35 }, // 丙午 −2 → early avg (2+2−2)/3 = +0.67 (>0.1, 반전 아님)
        { ...FAV, startAge: 45 }, // +2
        { ...FAV, startAge: 55 }, // +2 → mid +2
        { ...FAV, startAge: 65 }, // +2 → late +2
        { ...FAV, startAge: 75 },
      ],
    }
    const p = deriveLifePattern(climbing)
    expect(p?.key).toBe('steady-rise')
    expect(p?.ko).toBe('점진상승형')
  })

  it('personalizes line per chart — same pattern key, different sentence', () => {
    // 같은 late-bloomer 라도 정점 대운(연도·간지·십신)이 달라 line 이 갈린다.
    const a = {
      dayMaster: { name: '甲' },
      strength: 'weak',
      daeun: [
        { ...UNFAV, startAge: 15 },
        { ...UNFAV, startAge: 25 },
        { ...FAV, startAge: 45, startYear: 2030 }, // 정점 후보 (수=인성)
        { ...FAV, startAge: 55, startYear: 2040 },
        { ...FAV, startAge: 65, startYear: 2050 },
      ],
    }
    const b = {
      dayMaster: { name: '甲' },
      strength: 'weak',
      daeun: [
        { ...UNFAV, startAge: 15 },
        { ...UNFAV, startAge: 25 },
        { stem: '甲', branch: '子', startAge: 45, startYear: 1999 }, // 비겁(목)+인성(수)
        { ...FAV, startAge: 55, startYear: 2009 },
        { ...FAV, startAge: 65, startYear: 2019 },
      ],
    }
    const pa = deriveLifePattern(a)
    const pb = deriveLifePattern(b)
    expect(pa?.key).toBe('late-bloomer')
    expect(pb?.key).toBe('late-bloomer')
    // 같은 키, 다른 line/lineEn (개인화 발화).
    expect(pa?.line).not.toBe(pb?.line)
    expect(pa?.lineEn).not.toBe(pb?.lineEn)
    // 공통 템플릿(PATTERN_KO 베이스)은 둘 다 머리에 깔려 있다.
    expect(pa?.line.startsWith('젊을 때는 좀 고생해도')).toBe(true)
    expect(pb?.line.startsWith('젊을 때는 좀 고생해도')).toBe(true)
    // 정점 연도가 line 에 실린다(연도 데이터가 있을 때).
    expect(pa?.line).toContain('2030')
    expect(pb?.line).toContain('1999')
  })

  it('uses 용신/기신 elements for medium (중화) strength', () => {
    // medium strength routes through yong/avoid sets rather than 억부 signs.
    const saju = {
      dayMaster: { name: '甲' },
      strength: 'medium',
      yongsin: { primary: '수', avoid: ['화'] },
      daeun: daeun([
        { at: 15, fav: false }, // 丙午 (화) → avoid → −2
        { at: 25, fav: false },
        { at: 45, fav: false },
        { at: 65, fav: true }, // 壬子 (수) → yong → +2
        { at: 75, fav: true },
        { at: 85, fav: true },
      ]),
    }
    const p = deriveLifePattern(saju)
    expect(p?.key).toBe('late-bloomer')
    // verify the 중화 favor path actually scored via 용신
    expect(p?.daeun.find((x) => x.startAge === 65)?.favor).toBe(2)
    expect(p?.daeun.find((x) => x.startAge === 15)?.favor).toBe(-2)
  })
})
