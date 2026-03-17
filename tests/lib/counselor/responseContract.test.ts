import { describe, expect, it } from 'vitest'
import { normalizeCounselorResponse } from '@/lib/counselor/responseContract'

describe('normalizeCounselorResponse', () => {
  it('keeps content when all required ko headings exist', () => {
    const input = [
      '## 한 줄 결론',
      '지금은 검토 후 확정하는 흐름이 좋습니다.',
      '## 근거',
      '- 근거 A',
      '## 실행 계획',
      '- 실행 A',
      '## 주의/재확인',
      '- 주의 A',
    ].join('\n')

    expect(normalizeCounselorResponse(input, 'ko')).toBe(input)
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
