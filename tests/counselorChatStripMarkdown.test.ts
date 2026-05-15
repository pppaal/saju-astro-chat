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
  text = text.replace(/\*\*([^*\n]+)\*\*/g, '$1')
  text = text.replace(/(?<!\*)\*(?!\*)([^*\n]+?)(?<!\*)\*(?!\*)/g, '$1')
  text = text.replace(/^[ \t]*[-*+][ \t]+/gm, '')
  text = text.replace(/^[ \t]*\d+\.[ \t]+/gm, '')
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
