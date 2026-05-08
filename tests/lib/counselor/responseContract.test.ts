import { describe, expect, it } from 'vitest'
import { normalizeCounselorResponse } from '@/lib/counselor/responseContract'

describe('normalizeCounselorResponse', () => {
  it('strips heading scaffolding so the reply renders as flowing prose', () => {
    const input = [
      '## 한 줄 결론',
      '지금은 검토 후 확정하는 흐름이 좋습니다.',
      '## 근거',
      '리듬이 빠르지만 확정 전에 한 번 더 확인할 필요가 있습니다.',
      '## 실행 계획',
      '금액과 기한을 먼저 정리하고 최종 결정을 내리세요.',
      '## 주의/재확인',
      '서명 전에 조건을 다시 확인하세요.',
    ].join('\n')

    const output = normalizeCounselorResponse(input, 'ko')
    expect(output).not.toContain('## ')
    expect(output).toContain('지금은 검토 후 확정하는 흐름이 좋습니다.')
    expect(output).toContain('리듬이 빠르지만 확정 전에 한 번 더 확인할 필요가 있습니다.')
    expect(output).toContain('금액과 기한을 먼저 정리하고 최종 결정을 내리세요.')
    expect(output).toContain('서명 전에 조건을 다시 확인하세요.')
  })

  it('strips compact ko headings without space/newline', () => {
    const input = [
      '##한줄결론지금은 검토 후 확정하는 흐름이 좋습니다.',
      '##근거리듬이 빠릅니다.',
      '##실행계획계약 전에 점검하세요.',
      '##주의/재확인서명 전에 다시 확인하세요.',
    ].join('\n')

    const output = normalizeCounselorResponse(input, 'ko')
    expect(output).not.toContain('## ')
    expect(output).not.toContain('##한')
    expect(output).toContain('지금은 검토 후 확정하는 흐름이 좋습니다.')
  })

  it('passes short conversational replies through without forcing sections', () => {
    const input = '그게 무거우시겠어요. 어느 쪽이 더 마음에 걸리세요?'
    const output = normalizeCounselorResponse(input, 'ko')

    expect(output).toBe(input)
    expect(output).not.toContain('## 한 줄 결론')
    expect(output).not.toContain('입력 요약')
  })

  it('passes plain en text through without injecting headings', () => {
    const input = 'Take one small action now and verify before final decisions.'
    const output = normalizeCounselorResponse(input, 'en')

    expect(output).toBe(input)
    expect(output).not.toContain('## Direct Answer')
    expect(output).not.toContain('Input summary')
  })

  it('returns empty string when input is empty', () => {
    expect(normalizeCounselorResponse('', 'ko')).toBe('')
    expect(normalizeCounselorResponse('   ', 'en')).toBe('')
  })
})
