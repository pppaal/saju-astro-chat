/**
 * 캘린더 뷰 — 섹트 미상(NatalContext.astro.sect = null, 출생시각 미상 등)이면 프로필 카드의
 * 섹트도 null 이다. 정오 앵커로 'day' 를 지어내지 않는다(F5, OD-5). (lot 칩은 옛 LifetimeTier 와
 * 함께 사용자 요약에서 빠졌다 — 섹트 미상 lot 비움은 astroFacts/build 쪽 테스트가 본다.)
 */
import { describe, it, expect } from 'vitest'
import { toUser } from '@/lib/calendar-view/toUser'
import { makeNatal } from './_fixtures'

const LOTS = [{ name: 'Fortune', sign: '사자자리', degreeInSign: 10, longitude: 130, house: 2 }]

describe('toUser — 섹트', () => {
  it('섹트 미상이면 sectKind null', () => {
    const natal = makeNatal({ lots: LOTS })
    natal.astro.sect = null
    const u = toUser(natal)
    expect(u.sectKind).toBeNull()
    expect(u).not.toHaveProperty('lotsFull')
  })

  it('섹트를 알면 그대로(대조군)', () => {
    const u = toUser(makeNatal({ sect: 'night', lots: LOTS }))
    expect(u.sectKind).toBe('night')
  })
})
