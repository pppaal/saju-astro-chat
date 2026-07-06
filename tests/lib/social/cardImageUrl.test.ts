import { describe, it, expect } from 'vitest'
import { socialCardImageUrl } from '@/lib/social/cardImageUrl'

describe('socialCardImageUrl', () => {
  it('버티컬·제목·후크·언어를 쿼리로 실은 /api/social/card 상대경로를 만든다', () => {
    const url = socialCardImageUrl({
      category: 'saju',
      title: '오늘의 일진 병인일',
      hook: '오늘은 불이 세게 붙는 날',
      locale: 'ko',
    })
    expect(url.startsWith('/api/social/card?')).toBe(true)
    const q = new URLSearchParams(url.split('?')[1])
    expect(q.get('v')).toBe('saju')
    expect(q.get('t')).toBe('오늘의 일진 병인일')
    expect(q.get('h')).toBe('오늘은 불이 세게 붙는 날')
    expect(q.get('lang')).toBe('ko')
  })

  it('제목·후크가 너무 길면 잘라 URL 폭주를 막는다', () => {
    const url = socialCardImageUrl({
      category: 'compatibility',
      title: 'ㄱ'.repeat(200),
      hook: 'ㅎ'.repeat(200),
      locale: 'en',
    })
    const q = new URLSearchParams(url.split('?')[1])
    expect(q.get('t')!.length).toBe(90)
    expect(q.get('h')!.length).toBe(140)
    expect(q.get('lang')).toBe('en')
  })
})
