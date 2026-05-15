// Counselor chat: the LLM occasionally slips into report mode
// (markdown headings, bold, tables, numbered "1️⃣" labels). The chat
// bubble strips those before rendering so the message reads as one
// conversational flow. These tests pin the strip behavior so a future
// regression doesn't put the purple `## 근거` boxes back.

import { describe, it, expect } from 'vitest'

// The stripper is defined inside MessageRow.tsx (not exported). We
// reproduce the exact regex sequence here and assert on it; the
// component-level test would require RTL + jsdom which is overkill for
// a pure string transform.

const EMOJI_PATTERN =
  '[\\u2600-\\u27BF\\u{1F300}-\\u{1F9FF}\\u{1FA70}-\\u{1FAFF}]'

function stripReportMarkdown(input: string): string {
  let text = input
  text = text.replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '')
  text = text.replace(
    /^[ \t]*\|?[ \t]*:?-{2,}:?(?:[ \t]*\|[ \t]*:?-{2,}:?)+[ \t]*\|?[ \t]*$\n?/gm,
    ''
  )
  text = text.replace(/^[ \t]*\|(.+)\|[ \t]*$/gm, (_m, row: string) => {
    const cells = row
      .split('|')
      .map((cell) => cell.trim())
      .filter((cell) => cell.length > 0)
    return cells.join(' · ')
  })
  text = text.replace(
    new RegExp(`^[ \\t]*${EMOJI_PATTERN}[ \\t]+[^\\n]{1,60}$\\n?`, 'gmu'),
    ''
  )
  text = text.replace(/^[ \t]*【([^】\n]+)】[ \t]*$\n?/gm, '')
  text = text.replace(/【([^】\n]+)】/g, '$1')
  text = text.replace(/^[ \t]*(?:-{3,}|\*{3,}|_{3,})[ \t]*$\n?/gm, '')
  text = text.replace(
    /^([ \t]*)([^\n]{2,30})[ \t]*\n([ \t]*\n)/gm,
    (m, _indent: string, line: string, blank: string) => {
      const trimmed = line.trim()
      if (!trimmed) return m
      if (/[.?!~…」』》)]$/.test(trimmed)) return m
      if (/(다|요|까|죠|네|음|함|임)$/.test(trimmed)) return m
      if (/\?\s*$/.test(trimmed)) return m
      if (/[()+\/·=,*]/.test(trimmed)) return m
      return blank
    }
  )
  text = text.replace(/\*\*([^*\n]+)\*\*/g, '$1')
  text = text.replace(/(?<!\*)\*(?!\*)([^*\n]+?)(?<!\*)\*(?!\*)/g, '$1')
  text = text.replace(/^[ \t]*[-*+][ \t]+/gm, '')
  text = text.replace(/^[ \t]*\d+\.[ \t]+/gm, '')
  text = text.replace(/^[ \t]*[→▶●■▷▸▪◆※][ \t]+/gm, '')
  text = text.replace(/`([^`\n]+)`/g, '$1')
  text = text.replace(/\n{3,}/g, '\n\n')
  return text.trim()
}

describe('counselor chat: stripReportMarkdown', () => {
  it('drops `##` heading prefix but keeps the heading text', () => {
    const input = '## 당신은 어떤 사람인가요?\n프로필 본문'
    expect(stripReportMarkdown(input)).toBe('당신은 어떤 사람인가요?\n프로필 본문')
  })

  it('drops `#` and `###` too', () => {
    expect(stripReportMarkdown('# Title')).toBe('Title')
    expect(stripReportMarkdown('### sub')).toBe('sub')
  })

  it('strips **bold** markers, keeps the words', () => {
    const input = '당신은 **책임감 있는 어른**이지만, 지금은 흔들립니다.'
    expect(stripReportMarkdown(input)).toBe('당신은 책임감 있는 어른이지만, 지금은 흔들립니다.')
  })

  it('strips *italic* markers, keeps the words', () => {
    const input = '*아주 중요한* 신호입니다.'
    expect(stripReportMarkdown(input)).toBe('아주 중요한 신호입니다.')
  })

  it('drops the markdown table separator row', () => {
    const input = '| 영역 | 특징 |\n|------|------|\n| 강점 | 지적 |'
    expect(stripReportMarkdown(input)).toBe('영역 · 특징\n강점 · 지적')
  })

  it('flattens a multi-row table into prose-friendly lines', () => {
    const input = '| 영역 | 특징 |\n|---|---|\n| 강점 | 책임감 |\n| 약점 | 외면 |'
    expect(stripReportMarkdown(input)).toBe(
      '영역 · 특징\n강점 · 책임감\n약점 · 외면'
    )
  })

  it('removes leading dash/star/plus bullet markers', () => {
    const input = '- 첫째\n* 둘째\n+ 셋째'
    expect(stripReportMarkdown(input)).toBe('첫째\n둘째\n셋째')
  })

  it('removes leading "1." numbered list markers', () => {
    expect(stripReportMarkdown('1. 첫째\n2. 둘째')).toBe('첫째\n둘째')
  })

  it('strips inline backticks', () => {
    expect(stripReportMarkdown('`갑목` 일주')).toBe('갑목 일주')
  })

  it('collapses 3+ blank lines into 2', () => {
    expect(stripReportMarkdown('가\n\n\n\n나')).toBe('가\n\n나')
  })

  it('leaves natural prose untouched', () => {
    const prose =
      '기준이 또렷한 결인데, 지금은 그 또렷함이 본인을 좀 누르고 있는 것 같아요. 정인격이 안정의 축이긴 한데 乙亥 대운 들어가면서 평소 외면한 불안이 떠오르는 시기예요.'
    expect(stripReportMarkdown(prose)).toBe(prose)
  })

  it('drops emoji-heading lines (the LLM bypass)', () => {
    const input = '🎯 구조적 정체성\n사주 정인격 + 점성 MC/10궁 강조'
    expect(stripReportMarkdown(input)).toBe('사주 정인격 + 점성 MC/10궁 강조')
  })

  it('drops multiple emoji-heading sections', () => {
    const input = [
      '🎯 구조적 정체성',
      '사주 정인격 + 점성 MC/10궁 강조',
      '',
      '💫 현재 당신의 상태 (31세)',
      '운(세운 丙午)과 일진(辛未)이 다른 영역을 자극',
      '',
      '🌱 당신의 강점',
      '정서·자원 순환이 잘 됨',
      '',
      '🔮 지금 당신에게 필요한 것',
      '뿌리로의 회귀',
    ].join('\n')
    const output = stripReportMarkdown(input)
    expect(output).not.toMatch(/🎯|💫|🌱|🔮/)
    expect(output).not.toMatch(/구조적 정체성$/m)
    expect(output).not.toMatch(/현재 당신의 상태/)
    expect(output).toContain('사주 정인격')
    expect(output).toContain('뿌리로의 회귀')
  })

  it('drops standalone 【bracket】 label lines and unwraps inline brackets', () => {
    expect(
      stripReportMarkdown('【양쪽 동의 - 강】\n사주 정인격 + 점성 MC/10궁')
    ).toBe('사주 정인격 + 점성 MC/10궁')
    expect(stripReportMarkdown('답변은 【중요】한 흐름이다')).toBe(
      '답변은 중요한 흐름이다'
    )
  })

  it('drops leading arrow/triangle bullet markers (→ ▶ ● ■ ▷ ▸ ▪ ◆ ※)', () => {
    expect(stripReportMarkdown('→ 첫째\n▶ 둘째\n● 셋째')).toBe('첫째\n둘째\n셋째')
    expect(stripReportMarkdown('※ 주의\n◆ 핵심')).toBe('주의\n핵심')
  })

  it('drops markdown horizontal rule (---/***/___) on its own line', () => {
    expect(stripReportMarkdown('앞 단락이에요.\n\n---\n\n뒤 단락이에요.')).toBe(
      '앞 단락이에요.\n\n뒤 단락이에요.'
    )
    expect(stripReportMarkdown('가\n***\n나')).toBe('가\n나')
    expect(stripReportMarkdown('가\n___\n나')).toBe('가\n나')
  })

  it('drops standalone short label lines used as pseudo-headings', () => {
    // Short line + colon + no sentence ender, followed by paragraph
    const input = '현재 당신의 상태: 표면화되는 시기\n\n그 안에서 당신은 흔들리고 있어요. 표면으로 올라온 감정이 부담스럽고 익숙하지 않아서요.'
    const output = stripReportMarkdown(input)
    expect(output).not.toContain('현재 당신의 상태: 표면화되는 시기')
    expect(output).toContain('그 안에서 당신은 흔들리고')
  })

  it('drops "당신의 양면성" style standalone label', () => {
    const input = '당신의 양면성\n\n안정의 축은 또렷한데, 그 또렷함이 본인을 누르고 있어요.'
    const output = stripReportMarkdown(input)
    expect(output).not.toMatch(/^당신의 양면성$/m)
    expect(output).toContain('안정의 축')
  })

  it('keeps real sentence-ending lines (다/요/까/?) intact', () => {
    // These end in "다" / "요" / "?" — they are sentences, not labels.
    const input1 = '지금 당신은 흔들리고 있어요.\n\n이건 자연스러운 일이에요.'
    expect(stripReportMarkdown(input1)).toBe(input1)
    const input2 = '그게 어떤 느낌인가요?\n\n조금만 더 이야기해 줄래요?'
    expect(stripReportMarkdown(input2)).toBe(input2)
  })

  it('strips the user-reported failure mode end-to-end', () => {
    const input = [
      '## 당신은 어떤 사람인가요?',
      '당신은 정통의 길 위에서 내면의 약함을 직면하며 성장하는 사람입니다.',
      '',
      '## 근거',
      '1. 자아: 정격(정인격) + 1궁 스텔리움의 이중성',
      '',
      '| 영역 | 특징 |',
      '|------|------|',
      '| 강점 | 지적·책임감 |',
      '',
      '**당신은 "책임감 있는 어른"이지만**, 지금은 흔들립니다.',
    ].join('\n')

    const output = stripReportMarkdown(input)

    // No literal markdown syntax left over
    expect(output).not.toMatch(/##\s/)
    expect(output).not.toMatch(/\*\*/)
    expect(output).not.toMatch(/\|----+\|/)
    expect(output).not.toMatch(/^\s*\d+\.\s/m)
    // Content preserved
    expect(output).toContain('당신은 어떤 사람인가요?')
    expect(output).toContain('정인격')
    expect(output).toContain('영역 · 특징')
    expect(output).toContain('책임감 있는 어른')
  })
})
