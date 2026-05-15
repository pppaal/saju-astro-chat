import { describe, expect, it } from 'vitest'
import { isCasualQuestion } from '@/lib/tarot/casualQuestion'

describe('isCasualQuestion', () => {
  it('returns false for empty / whitespace', () => {
    expect(isCasualQuestion('')).toBe(false)
    expect(isCasualQuestion('   ')).toBe(false)
  })

  it('treats short questions as casual (≤ 12 chars)', () => {
    expect(isCasualQuestion('낼 뭐먹어')).toBe(true)
    expect(isCasualQuestion('오늘 어디 가')).toBe(true)
    expect(isCasualQuestion('짧')).toBe(true)
  })

  it('treats medium questions with casual keyword as casual (≤ 25 chars)', () => {
    expect(isCasualQuestion('오늘 점심 뭐 먹을지 모르겠어')).toBe(true)
    expect(isCasualQuestion('주말에 어디 갈지 추천')).toBe(true)
  })

  it('treats long heavy questions as NOT casual', () => {
    expect(
      isCasualQuestion('이직을 한 달째 고민중인데 회사가 망해가는 거 같고 새로운 곳도 두려워'),
    ).toBe(false)
    expect(isCasualQuestion('인생의 방향을 잃은 것 같아요 어떻게 살아야 하나')).toBe(false)
  })

  it('treats medium-length serious decision questions as NOT casual', () => {
    // 13-25자 범위지만 캐주얼 키워드로 시작 안 함
    expect(isCasualQuestion('이직을 정말 해야할까 고민이 큽니다')).toBe(false)
    expect(isCasualQuestion('헤어진 사람과 다시 만나도 될까')).toBe(false)
  })

  // Regression — 우리 mismatch 사건의 핵심 질문
  it('"낼 뭐 먹어" should be casual (the original mismatch bug case)', () => {
    expect(isCasualQuestion('낼 뭐 먹어')).toBe(true)
    expect(isCasualQuestion('내일 뭐 먹지')).toBe(true)
  })
})
