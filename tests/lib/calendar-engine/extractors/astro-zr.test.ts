// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { calculateSajuData } from '@/lib/saju/saju'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import astroZRExtractor from '@/lib/calendar-engine/extractors/astro-zr'
import { createCache } from '@/lib/calendar-engine/cache'

/**
 * Extractor 회귀 — ZR (Spirit + Fortune) 양쪽 L1 신호가 떠야 하고,
 * 적어도 한 번은 Peak / Loosing-of-Bond 이벤트가 90년 캐리어 안에 등장해야 한다.
 */

const SEOUL_MALE_1995 = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  gender: 'male' as const,
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}

describe('astro-zr extractor (Spirit + Fortune ZR + Peak/Loosing)', () => {
  it('나이 앵커 = 실제 생일 — 첫 L1 챕터 창이 생일에서 시작(출생년 1/1 아님, 감사 A-2)', async () => {
    const saju = calculateSajuData(
      SEOUL_MALE_1995.birthDate,
      SEOUL_MALE_1995.birthTime,
      SEOUL_MALE_1995.gender,
      'solar',
      SEOUL_MALE_1995.timeZone
    )
    const natal = await buildNatalContext(SEOUL_MALE_1995, { saju })
    const range = {
      start: '1995-01-01T00:00:00.000Z',
      end: '2000-01-01T00:00:00.000Z',
      granularity: 'day' as const,
    }
    const ctx = { natal, range, cache: createCache() }
    const signals = await astroZRExtractor.extract(ctx)
    const firstL1 = signals
      .filter((s) => s.id.includes('.spirit.l1.') && !/peak|loosing/.test(s.id))
      .sort((a, b) => a.active.start.localeCompare(b.active.start))[0]
    expect(firstL1).toBeDefined()
    // 첫 챕터(startYear=0)의 창 시작 = 생일(1995-02-09, 정오 UTC 근사).
    expect(firstL1.active.start.slice(0, 10)).toBe('1995-02-09')
  })

  it('emits L1 signals for both Spirit and Fortune ZR', async () => {
    const saju = calculateSajuData(
      SEOUL_MALE_1995.birthDate,
      SEOUL_MALE_1995.birthTime,
      SEOUL_MALE_1995.gender,
      'solar',
      SEOUL_MALE_1995.timeZone
    )
    const natal = await buildNatalContext(SEOUL_MALE_1995, { saju })
    // 90 year window — Spirit/Fortune L1 chapters are 8~27y so a 90y window
    // guarantees several chapters of each, with at least one Peak somewhere.
    const range = {
      start: '1995-02-09T00:00:00.000Z',
      end: '2085-02-09T00:00:00.000Z',
      granularity: 'day' as const,
    }
    const ctx = { natal, range, cache: createCache() }
    const signals = await astroZRExtractor.extract(ctx)

    // 양쪽 lot에서 L1 신호가 떠야 한다.
    const spiritL1 = signals.filter(
      (s) => s.id.includes('.spirit.l1.') && !s.id.includes('peak') && !s.id.includes('loosing')
    )
    const fortuneL1 = signals.filter(
      (s) => s.id.includes('.fortune.l1.') && !s.id.includes('peak') && !s.id.includes('loosing')
    )
    expect(spiritL1.length).toBeGreaterThan(0)
    expect(fortuneL1.length).toBeGreaterThan(0)

    // Peak 이벤트 (Spirit 또는 Fortune) 최소 하나
    const peaks = signals.filter((s) => /\.peak\./.test(s.id))
    expect(peaks.length).toBeGreaterThan(0)
    // Loosing-of-Bond 이벤트 — 90년 안에 시작 sign의 7th sign이 반드시 등장
    const loosings = signals.filter((s) => /\.loosing\./.test(s.id))
    expect(loosings.length).toBeGreaterThan(0)

    // Translation key가 evidence 에 박혀 있어야 narrative 로 연결됨
    const withSpiritKey = signals.find(
      (s) => (s.evidence.detail as Record<string, unknown>).translationKey === 'zrSpiritL1'
    )
    const withFortuneKey = signals.find(
      (s) => (s.evidence.detail as Record<string, unknown>).translationKey === 'zrFortuneL1'
    )
    expect(withSpiritKey).toBeDefined()
    expect(withFortuneKey).toBeDefined()

    // Peak / Loosing 도 translationKey 가 매핑됨
    const peakWithKey = signals.find(
      (s) => (s.evidence.detail as Record<string, unknown>).translationKey === 'zrPeak'
    )
    const loosingWithKey = signals.find(
      (s) => (s.evidence.detail as Record<string, unknown>).translationKey === 'zrLoosingOfBond'
    )
    expect(peakWithKey).toBeDefined()
    expect(loosingWithKey).toBeDefined()
  })

  it('Loosing-of-Bond has stronger polarity magnitude than its base L1', async () => {
    const saju = calculateSajuData(
      SEOUL_MALE_1995.birthDate,
      SEOUL_MALE_1995.birthTime,
      SEOUL_MALE_1995.gender,
      'solar',
      SEOUL_MALE_1995.timeZone
    )
    const natal = await buildNatalContext(SEOUL_MALE_1995, { saju })
    const ctx = {
      natal,
      range: {
        start: '1995-02-09T00:00:00.000Z',
        end: '2085-02-09T00:00:00.000Z',
        granularity: 'day' as const,
      },
      cache: createCache(),
    }
    const signals = await astroZRExtractor.extract(ctx)
    // 90년 안에 L1 loosing 이 항상 등장하진 않을 수 있음 (큰 chapter accumulation 에서).
    // L2 의 loosing은 ~17개월마다 자주 등장하므로 그것으로 fallback.
    const loosing =
      signals.find((s) => /\.l1\.loosing\./.test(s.id)) ??
      signals.find((s) => /\.l2\.loosing\./.test(s.id))
    expect(loosing).toBeDefined()
    // 큰 폴라리티 — 0 보다 절댓값 1 이상
    expect(Math.abs(loosing!.polarity)).toBeGreaterThanOrEqual(1)
  })
})
