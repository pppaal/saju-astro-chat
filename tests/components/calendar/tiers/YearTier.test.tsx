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

// ── real dumps ───────────────────────────────────────────────────────────────
const SCRATCH =
  '/tmp/claude-0/-home-user-saju-astro-chat/1d20fb2f-d849-5d3d-9e88-c2bd904a0a34/scratchpad'

const yearDump = JSON.parse(
  readFileSync(resolve(SCRATCH, 'audit-year.json'), 'utf-8')
) as unknown as DestinyYear

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

  it('surfaces the profection house "8" and its theme', () => {
    render(<YearTier user={userDump} year={yearDump} onDive={noop} onRise={noop} />)
    expect(screen.getAllByText('8').length).toBeGreaterThan(0)
    expect(screen.getByText('변환 · 깊이 · 재구성')).toBeInTheDocument()
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
    expect(screen.getByText('Transformation · Depth · Rebuild')).toBeInTheDocument()
  })
})
