/**
 * 운명상담사 컨텍스트 — whole-sign 프로펙션은 ASC 사인에서 세므로, 출생시각·출생지 미상
 * (placeUnreliable)이면 astroFacts 가 활성 하우스·연주를 null 로 비우고 상담사는 프로펙션
 * 줄을 내지 않는다(F5, OD-5). 예전엔 'H{n} 활성' 을 그대로 냈다.
 */
import { describe, it, expect } from 'vitest'
import { buildDestinyContext } from '@/lib/destiny/counselorContext'

const NOW = new Date(Date.UTC(2026, 10, 25, 12))
const BIRTH = {
  birthDate: '1990-05-15',
  birthTime: '14:30',
  gender: 'male' as const,
  timezone: 'Asia/Seoul',
  latitude: 37.5665,
  longitude: 126.978,
}
const ASTRO_ONLY = { saju: false, astro: true }

describe('buildDestinyContext — 프로펙션 줄', () => {
  it.each([
    ['출생시각 미상', { birthTime: '12:00', birthTimeUnknown: true }],
    ['출생지 미상', { birthCityUnknown: true }],
  ])('%s → 프로펙션 줄 없음 (ko·en)', async (_l, over) => {
    for (const locale of ['ko', 'en'] as const) {
      const { daily } = await buildDestinyContext(
        { ...BIRTH, ...over },
        NOW,
        locale,
        undefined,
        ASTRO_ONLY
      )
      expect(daily).not.toMatch(/프로펙션|Profection/)
    }
  })

  it('시각·출생지를 알면 프로펙션 줄이 있다(대조군)', async () => {
    const { daily } = await buildDestinyContext(BIRTH, NOW, 'en', undefined, ASTRO_ONLY)
    expect(daily).toMatch(/Profection \(age 36 basis\): H1 active/)
  })
})
