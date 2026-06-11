import { describe, it, expect } from 'vitest'
import {
  repairMojibakeText,
  normalizeMojibakePayload,
  repairMojibakeDeep,
} from '@/lib/text/mojibake'

/** UTF-8 → latin1 재해석으로 실제 mojibake 문자열을 만든다 (이중 인코딩 재현). */
function mojibakeOf(text: string): string {
  return Buffer.from(text, 'utf8').toString('latin1')
}

describe('repairMojibakeText', () => {
  it('빈 문자열은 그대로 반환한다', () => {
    expect(repairMojibakeText('')).toBe('')
  })

  it('깨지지 않은 한국어/영어 텍스트는 변경하지 않는다', () => {
    expect(repairMojibakeText('안녕하세요')).toBe('안녕하세요')
    expect(repairMojibakeText('Hello, world!')).toBe('Hello, world!')
    expect(repairMojibakeText('운세 분석 결과 (2026년)')).toBe('운세 분석 결과 (2026년)')
  })

  it('UTF-8 이중 인코딩으로 깨진 한국어를 복원한다', () => {
    const original = '안녕하세요'
    const broken = mojibakeOf(original)
    expect(broken).not.toBe(original)
    expect(repairMojibakeText(broken)).toBe(original)
  })

  it('깨진 한국어 문장(공백 포함)을 복원한다', () => {
    const original = '오늘의 타로 카드 해석'
    expect(repairMojibakeText(mojibakeOf(original))).toBe(original)
  })

  it('CP1252 스마트 따옴표 mojibake 를 복원한다', () => {
    const original = '“hello”'
    expect(repairMojibakeText(mojibakeOf(original))).toBe(original)
  })

  it('이모지 mojibake 를 복원한다', () => {
    const original = '\u{1f300} 운세'
    expect(repairMojibakeText(mojibakeOf(original))).toBe(original)
  })

  it('정상 텍스트와 섞여 있어도 깨진 구간만 복원한다', () => {
    const broken = `Hello ${mojibakeOf('세계')}!`
    expect(repairMojibakeText(broken)).toBe('Hello 세계!')
  })

  it('짝 없는 high surrogate 는 U+FFFD 로 치환한다', () => {
    expect(repairMojibakeText('ab\uD800cd')).toBe('ab�cd')
  })

  it('짝 없는 low surrogate 도 U+FFFD 로 치환한다', () => {
    expect(repairMojibakeText('ab\uDC00cd')).toBe('ab�cd')
  })

  it('유효한 surrogate pair (이모지) 는 보존한다', () => {
    expect(repairMojibakeText('운세 \u{1f600} 좋음')).toBe('운세 \u{1f600} 좋음')
  })

  it('복원이 의미를 더하지 않으면 원문을 유지한다 (단독 ì 등)', () => {
    // 디코딩해도 한글/이모지 이득이 없는 단독 의심 문자는 그대로 둔다.
    const value = 'café'
    expect(repairMojibakeText(value)).toBe('café')
  })

  it('복원 결과는 멱등이다 (한 번 고친 텍스트를 다시 넣어도 동일)', () => {
    const repaired = repairMojibakeText(mojibakeOf('안녕하세요'))
    expect(repairMojibakeText(repaired)).toBe(repaired)
  })
})

describe('normalizeMojibakePayload', () => {
  it('문자열 leaf 를 복원한다', () => {
    expect(normalizeMojibakePayload(mojibakeOf('안녕'))).toBe('안녕')
  })

  it('중첩 객체/배열을 재귀적으로 복원한다', () => {
    const input = {
      title: mojibakeOf('타로'),
      items: [mojibakeOf('카드'), 'plain'],
      nested: { msg: mojibakeOf('해석') },
    }
    expect(normalizeMojibakePayload(input)).toEqual({
      title: '타로',
      items: ['카드', 'plain'],
      nested: { msg: '해석' },
    })
  })

  it('문자열이 아닌 값(숫자/불리언/null)은 그대로 통과시킨다', () => {
    expect(normalizeMojibakePayload(42)).toBe(42)
    expect(normalizeMojibakePayload(true)).toBe(true)
    expect(normalizeMojibakePayload(null)).toBeNull()
    expect(normalizeMojibakePayload(undefined)).toBeUndefined()
  })

  it('빈 배열/객체도 안전하게 처리한다', () => {
    expect(normalizeMojibakePayload([])).toEqual([])
    expect(normalizeMojibakePayload({})).toEqual({})
  })

  it('repairMojibakeDeep 은 normalizeMojibakePayload 의 alias 다', () => {
    expect(repairMojibakeDeep).toBe(normalizeMojibakePayload)
  })
})
