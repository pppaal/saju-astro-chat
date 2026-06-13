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
