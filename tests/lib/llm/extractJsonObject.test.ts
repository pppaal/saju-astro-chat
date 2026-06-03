/**
 * extractJsonObject — robust JSON extraction used by callClaudeJson.
 *
 * Guards against the old greedy `text.match(/\{[\s\S]*\}/)` which grabbed the
 * outermost braces and could capture the wrong span when prose contained
 * `{...}` before the real object, or when a stray trailing `{}` followed it.
 */

import { describe, it, expect } from 'vitest'

import { extractJsonObject } from '@/lib/llm/claude'

describe('extractJsonObject', () => {
  it('parses a clean JSON object (fast path)', () => {
    expect(extractJsonObject('{"a":1,"b":"hi"}')).toEqual({ a: 1, b: 'hi' })
  })

  it('parses clean JSON with surrounding whitespace/newlines', () => {
    expect(extractJsonObject('\n  {"ok":true}\n')).toEqual({ ok: true })
  })

  it('extracts JSON when prose precedes it', () => {
    const text = 'Here is the result you asked for:\n{"score":42}'
    expect(extractJsonObject(text)).toEqual({ score: 42 })
  })

  it('extracts JSON when prose follows it', () => {
    const text = '{"score":42}\nHope that helps!'
    expect(extractJsonObject(text)).toEqual({ score: 42 })
  })

  it('extracts JSON with prose on both sides', () => {
    const text = 'Sure thing.\n{"value":"x"}\nLet me know if you need more.'
    expect(extractJsonObject(text)).toEqual({ value: 'x' })
  })

  it('handles nested braces', () => {
    const text = 'result: {"outer":{"inner":{"deep":1}},"list":[{"k":2}]}'
    expect(extractJsonObject(text)).toEqual({
      outer: { inner: { deep: 1 } },
      list: [{ k: 2 }],
    })
  })

  it('respects braces inside string values', () => {
    const text = '{"a":"} {"}'
    expect(extractJsonObject(text)).toEqual({ a: '} {' })
  })

  it('respects escaped quotes inside string values', () => {
    const text = '{"a":"say \\"} {\\" please"}'
    expect(extractJsonObject(text)).toEqual({ a: 'say "} {" please' })
  })

  it('ignores a trailing empty {} after the real object', () => {
    const text = '{"real":true} {}'
    expect(extractJsonObject(text)).toEqual({ real: true })
  })

  it('skips a leading non-JSON brace span and finds the real object', () => {
    // First `{` belongs to prose that is not valid JSON; scanner must advance.
    const text = 'note {not json here} then {"real":1}'
    expect(extractJsonObject(text)).toEqual({ real: 1 })
  })

  it('returns null when there is no JSON object', () => {
    expect(extractJsonObject('no json at all')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(extractJsonObject('')).toBeNull()
  })

  it('returns null for an unterminated object', () => {
    expect(extractJsonObject('{"a":1')).toBeNull()
  })

  it('does not over-capture across a trailing object (old greedy bug)', () => {
    // Greedy regex would have grabbed `{"a":1} ... {"b":2}` as one span and
    // failed to parse. Balanced scan returns the first valid object.
    const text = '{"a":1} and then some prose {"b":2}'
    expect(extractJsonObject(text)).toEqual({ a: 1 })
  })
})
