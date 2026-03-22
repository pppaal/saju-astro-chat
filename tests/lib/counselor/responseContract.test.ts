import { describe, expect, it } from 'vitest'
import { normalizeCounselorResponse } from '@/lib/counselor/responseContract'

describe('normalizeCounselorResponse', () => {
  it('keeps required headings and reflows ko sections into readable bullets', () => {
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
    expect(output).toContain('## 한 줄 결론')
    expect(output).toContain('## 근거')
    expect(output).toContain('## 실행 계획')
    expect(output).toContain('## 주의/재확인')
    expect(output).toContain('- ')
  })

  it('normalizes compact ko headings without space/newline', () => {
    const input = [
      '##한줄결론지금은 검토 후 확정하는 흐름이 좋습니다.',
      '##근거- 근거 A',
      '##실행계획- 실행 A',
      '##주의/재확인- 주의 A',
    ].join('\n')

    const output = normalizeCounselorResponse(input, 'ko')
    expect(output).toContain('## 한 줄 결론')
    expect(output).toContain('## 근거')
    expect(output).toContain('## 실행 계획')
    expect(output).toContain('## 주의/재확인')
    expect(output).toContain('지금은 검토 후 확정하는 흐름이 좋습니다.')
  })

  it('converts plain en text into required heading format', () => {
    const input = 'Take one small action now and verify conditions before final decisions.'
    const output = normalizeCounselorResponse(input, 'en')

    expect(output).toContain('## Direct Answer')
    expect(output).toContain('## Evidence')
    expect(output).toContain('## Action Plan')
    expect(output).toContain('## Avoid / Recheck')
  })
})
