/**
 * partialJsonParse — 스트리밍 중 누적 버퍼에서 overall / cards[].interpretation 을
 * progressive 하게 뽑는 부분 JSON 파서. 순수 함수(문자열 in/out)라 결정론적.
 *
 * 이전 버그(값 텍스트 안의 토큰에 latch, raw \uXXXX 누수, 미완 escape)들을
 * 회귀로 고정한다.
 */
import { extractPartialOverall, extractPartialCardTexts } from '@/lib/tarot/partialJsonParse'

describe('extractPartialOverall', () => {
  it('extracts a completed overall value', () => {
    expect(extractPartialOverall('{"overall":"hello world"}')).toBe('hello world')
  })

  it('decodes standard escapes (\\n \\t \\" \\\\ \\/)', () => {
    const buf = '{"overall":"a\\nb\\tc\\"d\\\\e\\/f"}'
    expect(extractPartialOverall(buf)).toBe('a\nb\tc"d\\e/f')
  })

  it('decodes \\r and \\uXXXX unicode escapes', () => {
    expect(extractPartialOverall('{"overall":"x\\ry"}')).toBe('x\ry')
    expect(extractPartialOverall('{"overall":"caf\\u00e9"}')).toBe('café')
  })

  it('preserves an unknown escape literally', () => {
    expect(extractPartialOverall('{"overall":"a\\xb"}')).toBe('axb')
  })

  it('returns the partial value when the closing quote has not arrived', () => {
    expect(extractPartialOverall('{"overall":"streaming text so far')).toBe('streaming text so far')
  })

  it('stops cleanly on a truncated unicode escape mid-stream', () => {
    expect(extractPartialOverall('{"overall":"ab\\u00e')).toBe('ab')
  })

  it('stops cleanly on a trailing lone backslash', () => {
    expect(extractPartialOverall('{"overall":"ab\\')).toBe('ab')
  })

  it('returns null when the overall key is absent', () => {
    expect(extractPartialOverall('{"cards":[]}')).toBeNull()
  })

  it('returns null when no colon/value has streamed yet', () => {
    expect(extractPartialOverall('{"overall"')).toBeNull()
    expect(extractPartialOverall('{"overall":')).toBeNull()
  })

  it('anchors on the key position, not a token inside an earlier value', () => {
    // The word "overall" appears (escaped) inside the title value first; the
    // parser must skip it and latch onto the real key that follows.
    const buf = '{"title":"the \\"overall\\" theme","overall":"real summary"}'
    expect(extractPartialOverall(buf)).toBe('real summary')
  })
})

describe('extractPartialCardTexts', () => {
  it('extracts all completed card interpretations in order', () => {
    const buf = '{"cards":[{"interpretation":"one"},{"interpretation":"two"}]}'
    expect(extractPartialCardTexts(buf)).toEqual(['one', 'two'])
  })

  it('includes the in-progress last card (no closing quote yet)', () => {
    const buf = '{"cards":[{"interpretation":"done"},{"interpretation":"partial mid'
    expect(extractPartialCardTexts(buf)).toEqual(['done', 'partial mid'])
  })

  it('returns [] before the cards array has opened', () => {
    expect(extractPartialCardTexts('{"overall":"x"}')).toEqual([])
    expect(extractPartialCardTexts('{"cards"')).toEqual([]) // key present, no "["
  })

  it('returns [] for an empty cards array', () => {
    expect(extractPartialCardTexts('{"cards":[]}')).toEqual([])
  })

  it('stops at a card whose value quote has not streamed', () => {
    expect(extractPartialCardTexts('{"cards":[{"interpretation":')).toEqual([])
  })
})
