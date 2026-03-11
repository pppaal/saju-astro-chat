import { describe, expect, it } from 'vitest'
import { normalizeCounselorResponse } from '@/lib/counselor/responseContract'

describe('normalizeCounselorResponse', () => {
  it('keeps content when all required ko headings exist', () => {
    const input = [
      '## í•œ ì¤„ ê²°ë¡ ',
      'ì§€ê¸ˆì€ ê²€í†  í›„ í™•ì •í•˜ëŠ” íë¦„ì´ ì¢‹ìŠµë‹ˆë‹¤.',
      '## ê·¼ê±°',
      '- ê·¼ê±° A',
      '## ì‹¤í–‰ ê³„íš',
      '- ì‹¤í–‰ A',
      '## ì£¼ì˜/ìž¬í™•ì¸',
      '- ì£¼ì˜ A',
    ].join('\n')

    expect(normalizeCounselorResponse(input, 'ko')).toBe(input)
  })

  it('converts plain ko text into required heading format', () => {
    const input = 'ì˜¤ëŠ˜ì€ ì¤‘ìš”í•œ ê²°ì •ì„ ì„œë‘ë¥´ì§€ ë§ê³  ê²€í† ë¥¼ ë¨¼ì € í•˜ì„¸ìš”.'
    const output = normalizeCounselorResponse(input, 'ko')

    expect(output).toContain('## í•œ ì¤„ ê²°ë¡ ')
    expect(output).toContain('## ê·¼ê±°')
    expect(output).toContain('## ì‹¤í–‰ ê³„íš')
    expect(output).toContain('## ì£¼ì˜/ìž¬í™•ì¸')
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
