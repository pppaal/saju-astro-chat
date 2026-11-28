import { describe, it, expect } from 'vitest'
import { splitReadableText } from '@/lib/tarot/splitReadableText'

describe('splitReadableText', () => {
  it('빈 문자열/공백만 있는 입력은 빈 배열을 반환한다', () => {
    expect(splitReadableText('')).toEqual([])
    expect(splitReadableText('   \n\n  ')).toEqual([])
  })

  it('빈 줄(\\n\\n)이 있으면 그 단락 구조를 최우선으로 존중한다', () => {
    const text = '첫 번째 단락입니다.\n\n두 번째 단락입니다.\n\n세 번째 단락입니다.'
    expect(splitReadableText(text)).toEqual([
      '첫 번째 단락입니다.',
      '두 번째 단락입니다.',
      '세 번째 단락입니다.',
    ])
  })

  it('빈 줄 3개 이상 연속도 단락 하나의 경계로 처리한다', () => {
    expect(splitReadableText('A.\n\n\n\nB.')).toEqual(['A.', 'B.'])
  })

  it('빈 줄 없이 단일 \\n 으로만 나뉜 경우 그 줄 구조를 존중한다', () => {
    const text = '첫 줄 단락. 이어지는 문장.\n둘째 줄 단락.'
    expect(splitReadableText(text)).toEqual(['첫 줄 단락. 이어지는 문장.', '둘째 줄 단락.'])
  })

  it('CRLF 입력을 LF 로 정규화해 동일하게 처리한다', () => {
    expect(splitReadableText('단락 하나.\r\n\r\n단락 둘.')).toEqual(['단락 하나.', '단락 둘.'])
  })

  it('줄바꿈 없는 짧은 텍스트(문장 4개 미만)는 단일 단락으로 유지한다', () => {
    const text = '하나입니다. 둘입니다. 셋입니다.'
    expect(splitReadableText(text)).toEqual([text])
  })

  it('줄바꿈 없는 긴 텍스트(문장 4개 이상)는 두 문장씩 묶는다', () => {
    const text = '하나입니다. 둘입니다. 셋입니다. 넷입니다.'
    expect(splitReadableText(text)).toEqual(['하나입니다. 둘입니다.', '셋입니다. 넷입니다.'])
  })

  it('홀수 개 문장이면 마지막 그룹은 한 문장이다', () => {
    const text = 'A1. B2. C3. D4. E5.'
    expect(splitReadableText(text)).toEqual(['A1. B2.', 'C3. D4.', 'E5.'])
  })

  it('전각 문장부호(。！？)도 문장 경계로 인식한다', () => {
    const text = '一です。二です。三です。四です。'
    expect(splitReadableText(text)).toEqual(['一です。 二です。', '三です。 四です。'])
  })

  it('단락 양끝 공백은 trim 된다', () => {
    expect(splitReadableText('  단락 하나.  \n\n  단락 둘.  ')).toEqual(['단락 하나.', '단락 둘.'])
  })

  it('순수 함수: 같은 입력은 항상 같은 출력', () => {
    const text = '하나입니다. 둘입니다. 셋입니다. 넷입니다.'
    expect(splitReadableText(text)).toEqual(splitReadableText(text))
  })
})
