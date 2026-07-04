import { render } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import StreakChip from '@/components/calendar/StreakChip'

/** 컴포넌트가 쓰는 것과 동일한 로컬 오늘 'YYYY-MM-DD'. */
function localToday(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const KEY = 'dp:calendar:streak'

describe('StreakChip', () => {
  beforeEach(() => localStorage.clear())

  it('오늘 기록 + count≥2 면 "N일째 확인 중" 을 보여준다', () => {
    // 오늘 날짜로 저장돼 있으면 computeStreak 가 count 를 유지 → 결정적.
    localStorage.setItem(KEY, JSON.stringify({ last: localToday(), count: 5 }))
    const { container } = render(<StreakChip ko={true} />)
    expect(container.textContent).toContain('5일째 확인 중')
  })

  it('영문 로케일은 "Day N streak"', () => {
    localStorage.setItem(KEY, JSON.stringify({ last: localToday(), count: 4 }))
    const { container } = render(<StreakChip ko={false} />)
    expect(container.textContent).toContain('Day 4 streak')
  })

  it('첫 방문(1일째)엔 아무것도 안 그린다', () => {
    const { container } = render(<StreakChip ko={true} />)
    expect(container.textContent).toBe('')
    // 그래도 방문은 기록된다(다음날 이어지도록).
    expect(localStorage.getItem(KEY)).toContain(localToday())
  })
})
