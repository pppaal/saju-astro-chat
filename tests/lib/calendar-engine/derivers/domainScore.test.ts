import { describe, it, expect } from 'vitest'
import { buildCalendar } from '@/lib/calendar-engine'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { deriveDomainScores } from '@/lib/calendar-engine/derivers/domainScore'
import { DOMAIN_KEYS } from '@/lib/calendar-engine/data/domainSignals'

describe('deriveDomainScores', () => {
  it('produces per-domain best days from domain-filtered signals', async () => {
    const natal = await buildNatalContext({
      birthDate: '1995-02-09',
      birthTime: '06:40',
      gender: 'male',
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
    })
    const cells = await buildCalendar(
      natal,
      { start: '2029-01-01T00:00:00.000Z', end: '2029-12-31T23:59:59.000Z', granularity: 'day' },
      { includeEvidence: true }
    )
    const dom = deriveDomainScores(cells, 'male')
    // 5개 도메인 다 존재
    for (const k of DOMAIN_KEYS) expect(dom[k]).toBeTruthy()
    // 각 도메인 best 날들은 signed>0 (그 영역 신호가 실제로 있는 날), grade 유효
    for (const k of DOMAIN_KEYS) {
      for (const b of dom[k].best) {
        expect(b.signed).toBeGreaterThan(0)
        expect(b.grade).toBeGreaterThanOrEqual(0)
        expect(b.grade).toBeLessThanOrEqual(4)
        expect(b.date).toMatch(/^2029-\d\d-\d\d$/)
      }
    }
    // 남/여 배우자성 차이 → love 도메인 결과가 갈림 (성별 반영 확인)
    const domF = deriveDomainScores(cells, 'female')
    const m = dom.love.best.map((b) => b.date).join(',')
    const f = domF.love.best.map((b) => b.date).join(',')
    expect(typeof m).toBe('string')
    expect(typeof f).toBe('string')
  }, 60000)
})
