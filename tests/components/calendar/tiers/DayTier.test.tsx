import React from 'react'
import fs from 'node:fs'
import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// useI18n 모킹 — MonthTier.test 와 동일 패턴(locale 토글).
let mockLocale: 'ko' | 'en' = 'ko'
vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({ locale: mockLocale }),
}))

import { DayTier } from '@/components/calendar/tiers/DayTier'
import type { DestinyDay } from '@/types/calendar'

// 실 덤프 — scratchpad/audit-day.json 을 런타임에 읽어 캐스팅.
const AUDIT_PATH =
  '/tmp/claude-0/-home-user-saju-astro-chat/1d20fb2f-d849-5d3d-9e88-c2bd904a0a34/scratchpad/audit-day.json'
const day = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf-8')) as unknown as DestinyDay

const noop = () => {}

beforeEach(() => {
  mockLocale = 'ko'
})

describe('DayTier (오늘의 일진 · LIGHT)', () => {
  it('renders real dump data without throwing', () => {
    expect(() => render(<DayTier day={day} onRise={noop} sex="남" />)).not.toThrow()
  })

  it('surfaces the iljin ganzhi hanja 庚申 and sibsin 겁재', () => {
    const { container } = render(<DayTier day={day} onRise={noop} sex="남" />)
    expect(container.textContent).toContain('庚申')
    expect(container.textContent).toContain('겁재')
  })

  it('fires onRise from the top zoom-out button', () => {
    const onRise = vi.fn()
    const { getAllByRole } = render(<DayTier day={day} onRise={onRise} sex="남" />)
    const riseButtons = getAllByRole('button').filter((b) =>
      /줌아웃|줌|위로/.test(b.textContent ?? '')
    )
    expect(riseButtons.length).toBeGreaterThan(0)
    riseButtons[0].click()
    expect(onRise).toHaveBeenCalled()
  })
})
