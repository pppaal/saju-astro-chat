import { describe, expect, it } from 'vitest'

import { normalizeUserFacingGuidance } from '@/lib/destiny-matrix/guidanceLanguage'

describe('normalizeUserFacingGuidance', () => {
  it('softens internal recheck phrasing in Korean', () => {
    expect(
      normalizeUserFacingGuidance('경로 재확인 우선, 속도 조절과 조건 확인이 필요합니다.', 'ko')
    ).toBe('경로 비교 우선, 간격 조정과 조건 점검이 필요합니다.')
  })

  it('normalizes repetitive verification phrasing in Korean', () => {
    expect(
      normalizeUserFacingGuidance(
        '재확인 슬롯을 두고 한 줄 요약 재확인과 단계적 검증을 넣으세요.',
        'ko'
      )
    ).toBe('점검 슬롯을 두고 한 줄 요약 확인과 단계적 점검을 넣으세요.')
  })

  it('normalizes English recheck phrasing', () => {
    expect(normalizeUserFacingGuidance('Recheck the route and slow down.', 'en')).toBe(
      'Compare route options and avoid rushing.'
    )
  })

  it('normalizes English recheck-slot phrasing', () => {
    expect(
      normalizeUserFacingGuidance(
        'Move non-urgent items into a 24h recheck slot and use staged commitment.',
        'en'
      )
    ).toBe('Move non-urgent items into a 24h review slot and use phased commitment.')
  })
})
