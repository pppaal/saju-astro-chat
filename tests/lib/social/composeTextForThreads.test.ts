/**
 * composeTextForThreads — 쓰레드 발행 텍스트 조립.
 *
 * 쓰레드 규범에 맞춘 정규화를 잠근다:
 *  - 본문 URL 제거(외부 링크는 쓰레드 도달을 누른다)
 *  - 해시태그 1개로 제한(도배는 인스타 문법이라 쓰레드에선 스팸으로 보인다)
 *  - 500자 상한 초과 시 경계에서 자르고 말줄임
 * Instagram 용 composeText 는 태그를 그대로 유지(영향 없음)함도 함께 확인.
 */

import { describe, it, expect } from 'vitest'
import { composeText, composeTextForThreads } from '@/lib/social/publish/types'

describe('composeTextForThreads — 쓰레드 규범 정규화', () => {
  it('본문의 URL 을 제거한다(유도 화살표 이모지까지)', () => {
    const { text } = composeTextForThreads({
      caption: '오늘의 카드는 별.\n\n무료로 확인 👉 https://destinypal.com/free',
      hashtags: [],
    })
    expect(text).not.toContain('http')
    expect(text).not.toContain('👉')
    expect(text.startsWith('오늘의 카드는 별.')).toBe(true)
  })

  it('해시태그를 1개로 제한한다', () => {
    const { text, trimmed } = composeTextForThreads({
      caption: '짧은 캡션',
      hashtags: ['#타로', '#오늘의타로', '#연애운', '#사주'],
    })
    expect(text).toContain('#타로')
    expect(text).not.toContain('#오늘의타로')
    expect(trimmed).toBe(true)
  })

  it('URL 없고 태그 1개 이하면 그대로 둔다(trimmed:false)', () => {
    const { text, trimmed } = composeTextForThreads({
      caption: '오늘은 조용히 흘러가는 하루예요.',
      hashtags: ['#타로'],
    })
    expect(text).toBe('오늘은 조용히 흘러가는 하루예요.\n\n#타로')
    expect(trimmed).toBe(false)
  })

  it('500자 상한을 넘는 캡션은 경계에서 자르고 …', () => {
    const long = '문장 '.repeat(200)
    const { text } = composeTextForThreads({ caption: long, hashtags: [] })
    expect([...text].length).toBeLessThanOrEqual(480)
    expect(text.endsWith('…')).toBe(true)
  })

  it('composeText(Instagram)는 태그를 그대로 유지한다', () => {
    const text = composeText({ caption: 'IG 캡션', hashtags: ['#a', '#b', '#c', '#d', '#e'] })
    expect(text).toContain('#a #b #c #d #e')
  })
})
