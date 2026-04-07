import { describe, expect, it } from 'vitest'
import { sanitizeCounselorFreeText } from '@/lib/destiny-matrix/counselorEvidenceSanitizer'
import { normalizeNarrativeCoreText } from '@/lib/destiny-matrix/ai-report/reportTextHelpers'

describe('user-facing text polish', () => {
  it('polishes counselor stock phrases into calmer Korean', () => {
    const value = sanitizeCounselorFreeText(
      '핵심 근거가 현재 흐름을 계속 지지할 것. 실제 타이밍은 지금 구간을 먼저 보면 됩니다. 실행 속도를 올려도 됩니다.',
      'ko'
    )

    expect(value).toContain('핵심 근거가 계속 살아 있어야 합니다.')
    expect(value).toContain('우선은 지금 구간의 반응을 먼저 보는 게 맞습니다.')
    expect(value).toContain('그때는 속도를 높여도 됩니다.')
  })

  it('polishes report branch phrasing away from raw engine wording', () => {
    const value = normalizeNarrativeCoreText(
      '첫 단계 뒤에도 현재 상승 흐름이 유지될 것. 지금은 검토하는 편이 맞습니다.',
      'ko'
    )

    expect(value).toContain('첫 단계 이후에도 흐름이 꺾이지 않는지 확인해야 합니다.')
    expect(value).toContain('지금은 검토하는 쪽이 유리합니다.')
  })
})
