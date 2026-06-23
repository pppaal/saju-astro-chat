import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

let mockLocale: 'ko' | 'en' = 'ko'
vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({ locale: mockLocale }),
}))

import { YearTier } from '@/components/calendar/tiers/YearTier'
import type { DestinyYear, DestinyUserSummary } from '@/types/calendar'
import { getHouseRich, type HouseNumber } from '@/lib/chart-dictionary'

// ── real dumps ───────────────────────────────────────────────────────────────
const SCRATCH = process.cwd() + '/tests/fixtures/calendar'

const yearDump = JSON.parse(
  readFileSync(resolve(SCRATCH, 'audit-year.json'), 'utf-8')
) as unknown as DestinyYear

// 어댑터(toYear)가 production 에서 붙이는 리치 하우스 풀이를 dump 에도 동일하게 주입
// (정적 dump 는 이 필드 추가 이전에 떠진 것이라 누락 → 어댑터와 동일 룩업으로 보강).
if (yearDump.profection) {
  const h = yearDump.profection.house
  ;(yearDump.profection as { houseMeaning?: string; houseMeaningEn?: string }).houseMeaning =
    getHouseRich(h as HouseNumber, 'ko')?.meaning ?? ''
  ;(yearDump.profection as { houseMeaning?: string; houseMeaningEn?: string }).houseMeaningEn =
    getHouseRich(h as HouseNumber, 'en')?.meaning ?? ''
}

const userDump = (
  JSON.parse(readFileSync(resolve(SCRATCH, 'audit-user.json'), 'utf-8')) as { user: unknown }
).user as unknown as DestinyUserSummary

const noop = () => {}

beforeEach(() => {
  mockLocale = 'ko'
})

describe('YearTier (올해의 모양 · LIGHT)', () => {
  it('renders without throwing on real dump data', () => {
    expect(() =>
      render(<YearTier user={userDump} year={yearDump} onDive={noop} onRise={noop} />)
    ).not.toThrow()
  })

  it('surfaces the sewoon ganzhi hanja 丙午 on the main surface', () => {
    render(<YearTier user={userDump} year={yearDump} onDive={noop} onRise={noop} />)
    expect(screen.getAllByText('丙午').length).toBeGreaterThan(0)
  })

  it('surfaces the profection house "8" and its theme (theme now a small tag)', () => {
    render(<YearTier user={userDump} year={yearDump} onDive={noop} onRise={noop} />)
    expect(screen.getAllByText('8').length).toBeGreaterThan(0)
    // 2단어 테마는 작은 태그로 남는다(hero 보조줄은 리치 하우스 풀이로 대체됨).
    expect(screen.getAllByText('변환 · 깊이 · 재구성').length).toBeGreaterThan(0)
  })

  it('hero supporting line surfaces the rich house-8 meaning (not the cryptic 2-word tag)', () => {
    render(<YearTier user={userDump} year={yearDump} onDive={noop} onRise={noop} />)
    // astro-house-rich.json house 8 `meaning` 의 평이한 문단이 hero 보조줄로 노출.
    expect(
      screen.getByText(/공동 재산, 배우자의 돈, 빚·세금·유산/, { exact: false })
    ).toBeInTheDocument()
  })

  it('shows the yearly eyebrow with the year (Cinzel)', () => {
    render(<YearTier user={userDump} year={yearDump} onDive={noop} onRise={noop} />)
    expect(screen.getByText('1년 · YEARLY · 2026')).toBeInTheDocument()
  })

  it('renders the sewoon sibsin (정관) and a 12-month strip', () => {
    const { container } = render(
      <YearTier user={userDump} year={yearDump} onDive={noop} onRise={noop} />
    )
    expect(screen.getAllByText('정관').length).toBeGreaterThan(0)
    const strip = container.querySelector('[class*="strip"]')
    expect(strip).toBeTruthy()
  })

  it('fires onRise (zoom out to lifetime) and onDive (zoom in to month)', () => {
    const onRise = vi.fn()
    const onDive = vi.fn()
    render(<YearTier user={userDump} year={yearDump} onDive={onDive} onRise={onRise} />)
    fireEvent.click(screen.getByRole('button', { name: /인생으로 줌아웃/ }))
    expect(onRise).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: /이번 달로 줌인/ }))
    expect(onDive).toHaveBeenCalledTimes(1)
  })

  it('renders English surface when locale=en (English profection theme, ganzhi still raw)', () => {
    mockLocale = 'en'
    render(<YearTier user={userDump} year={yearDump} onDive={noop} onRise={noop} />)
    expect(screen.getAllByText('丙午').length).toBeGreaterThan(0)
    // 영문 테마는 작은 태그 + 무대 풀이에 노출되어 2회 이상 등장.
    expect(screen.getAllByText('Transformation · Depth · Rebuild').length).toBeGreaterThan(0)
    // 영문 hero 보조줄 = 리치 하우스 풀이(8하우스 meaning).
    expect(
      screen.getByText(/joint accounts, a partner's money/, { exact: false })
    ).toBeInTheDocument()
  })
})
