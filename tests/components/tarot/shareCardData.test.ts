/**
 * 공유 카드 한 줄 메시지 빌더 — pickKeyMessage 회귀 테스트
 *
 * SNS 공유 이미지에 사용자 실명이 새어 나가지 않게 앞머리 호명("OOO님,")을
 * 떼는 로직(개인정보 보호)을 잠근다. 이 동작이 깨지면 공유 이미지에 실명이
 * 박히는 사고로 직결되므로 회귀를 막는다.
 */

import { describe, it, expect } from 'vitest'
import { pickKeyMessage, stripMarkdown } from '@/components/tarot/shareCardData'

describe('stripMarkdown — 공유 이미지엔 순수 텍스트만', () => {
  it('강조/코드/취소선 마커(*, _, `, ~)를 제거한다', () => {
    expect(stripMarkdown('이건 *강한* 신호고 _확실_ 합니다')).toBe('이건 강한 신호고 확실 합니다')
    expect(stripMarkdown('`코드` 와 ~취소~ 도 제거')).toBe('코드 와 취소 도 제거')
  })
  it('줄머리 헤더(#)를 제거한다', () => {
    expect(stripMarkdown('## 오늘의 핵심')).toBe('오늘의 핵심')
  })
  it('null/undefined 안전', () => {
    expect(stripMarkdown(undefined)).toBe('')
    expect(stripMarkdown(null)).toBe('')
  })
})

describe('pickKeyMessage — 마크다운 마커 제거', () => {
  it('첫 문장의 *별표* 강조가 이미지에 그대로 박히지 않는다', () => {
    const out = pickKeyMessage('먼저 연락 오는 쪽은 *상대* 예요. 2-3주 안에 움직임이 옵니다.')
    expect(out).toBe('먼저 연락 오는 쪽은 상대 예요.')
    expect(out).not.toContain('*')
  })
})

describe('pickKeyMessage — 공유 이미지 한 줄 메시지', () => {
  it('앞머리 호명("OOO님,")을 제거해 실명이 새지 않게 한다', () => {
    const out = pickKeyMessage('이준영님, 오늘은 새로운 시작에 좋은 흐름입니다.')
    expect(out).toBe('오늘은 새로운 시작에 좋은 흐름입니다.')
    expect(out).not.toContain('이준영')
    expect(out).not.toContain('님')
  })

  it('"이름 님께서" 변형(공백 + 조사)도 제거한다', () => {
    const out = pickKeyMessage('김민지 님께서 곧 좋은 소식을 듣게 됩니다.')
    expect(out).toBe('곧 좋은 소식을 듣게 됩니다.')
    expect(out).not.toContain('김민지')
  })

  it('"OOO님은/이" 등 다른 조사 호명도 제거한다', () => {
    expect(pickKeyMessage('박서준님은 변화의 기로에 서 있습니다.')).toBe(
      '변화의 기로에 서 있습니다.'
    )
  })

  it('호명이 없으면 첫 문장을 그대로 쓴다', () => {
    expect(pickKeyMessage('좋은 변화가 다가오고 있어요. 두 번째 문장은 버린다.')).toBe(
      '좋은 변화가 다가오고 있어요.'
    )
  })

  it('빈 값/널/언디파인드는 빈 문자열', () => {
    expect(pickKeyMessage('')).toBe('')
    expect(pickKeyMessage(null)).toBe('')
    expect(pickKeyMessage(undefined)).toBe('')
  })

  it('문장 종결부호가 없으면 통째로 쓰되 최대 길이로 자른다', () => {
    const out = pickKeyMessage('가'.repeat(100))
    expect(out.length).toBe(58) // 57자 + '…'
    expect(out.endsWith('…')).toBe(true)
  })

  it('max 인자로 길이 한도를 조절할 수 있다', () => {
    const out = pickKeyMessage('나'.repeat(100), 20)
    expect(out.length).toBe(20)
    expect(out.endsWith('…')).toBe(true)
  })

  it('호명만 있고 본문이 없으면 빈 문자열(실명 노출 방지)', () => {
    // "OOO님," 만 들어와도 실명이 결과에 남지 않아야 한다.
    const out = pickKeyMessage('홍길동님, ')
    expect(out).not.toContain('홍길동')
  })

  // --- 영어 호명(영미권 타겟): 'Hi {Name},' 형식 실명 제거 ---

  it('영어 "Hi NAME," 호명을 제거하고 첫 글자를 대문자로 보정한다', () => {
    const out = pickKeyMessage('Hi Jun, a new chapter is opening for you.')
    expect(out).toBe('A new chapter is opening for you.')
    expect(out).not.toContain('Jun')
  })

  it('"Hello First Last," 처럼 이름이 두 단어여도 제거한다', () => {
    const out = pickKeyMessage('Hello Sarah Kim, your path is clear.')
    expect(out).toBe('Your path is clear.')
    expect(out).not.toContain('Sarah')
    expect(out).not.toContain('Kim')
  })

  it('"Hey NAME!" 처럼 느낌표 호명도 제거', () => {
    const out = pickKeyMessage('Hey Mike! Trust the timing here.')
    expect(out).not.toContain('Mike')
    expect(out.startsWith('Trust')).toBe(true)
  })

  it('정상 문장 첫머리("Today,", "Finally,")는 오삭제하지 않는다', () => {
    expect(pickKeyMessage('Today, momentum returns. Next.')).toBe('Today, momentum returns.')
    expect(pickKeyMessage('Finally, clarity arrives.')).toBe('Finally, clarity arrives.')
  })
})
