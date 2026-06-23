import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// useI18n is consumed (locale only) by LifetimeTier. It throws without a real
// provider, so mock it with a mutable locale we flip per test. The mock also
// stubs I18nProvider so the wrap below resolves to a passthrough.
let mockLocale: 'ko' | 'en' = 'ko'
vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({ locale: mockLocale }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import { I18nProvider } from '@/i18n/I18nProvider'
import { LifetimeTier, type LifetimeTierProps } from '@/components/calendar/tiers/LifetimeTier'
import type { DestinyLifetime } from '@/types/calendar'

// ── real dumps ───────────────────────────────────────────────────────────────
const SCRATCH =
  '/tmp/claude-0/-home-user-saju-astro-chat/1d20fb2f-d849-5d3d-9e88-c2bd904a0a34/scratchpad'

const lifetime = JSON.parse(
  readFileSync(resolve(SCRATCH, 'audit-lifetime.json'), 'utf-8')
) as unknown as DestinyLifetime

const user = (
  JSON.parse(readFileSync(resolve(SCRATCH, 'audit-user.json'), 'utf-8')) as { user: unknown }
).user as unknown as LifetimeTierProps['user']

const noop = () => {}

function renderTier() {
  return render(
    <I18nProvider>
      <LifetimeTier user={user} lifetime={lifetime} onDive={noop} />
    </I18nProvider>
  )
}

beforeEach(() => {
  mockLocale = 'ko'
})

describe('LifetimeTier (인생 전체 · LIGHT)', () => {
  it('renders without throwing on real dump data', () => {
    expect(() => renderTier()).not.toThrow()
  })

  it('surfaces the ilgan hanja 辛 in the identity header', () => {
    renderTier()
    expect(screen.getAllByText('辛').length).toBeGreaterThan(0)
  })

  it('surfaces the lifePattern name 대기만성형', () => {
    renderTier()
    // appears in the header title + the verdict term-tag.
    expect(screen.getAllByText('대기만성형').length).toBeGreaterThan(0)
  })

  it('renders the current decade ganzhi 甲戌 in the timeline', () => {
    renderTier()
    expect(screen.getByText('甲戌')).toBeInTheDocument()
  })

  it('flags the current decade with the "지금 여기" treatment', () => {
    renderTier()
    expect(screen.getByText('지금 여기')).toBeInTheDocument()
  })

  it('renders the decade-timeline section header', () => {
    renderTier()
    expect(screen.getByText('대운 10년 흐름')).toBeInTheDocument()
  })

  it('renders English identity when locale=en (pattern in EN, hanja still raw)', () => {
    mockLocale = 'en'
    renderTier()
    expect(screen.getAllByText('Late bloomer').length).toBeGreaterThan(0)
    expect(screen.getAllByText('辛').length).toBeGreaterThan(0)
    expect(screen.getByText('甲戌')).toBeInTheDocument()
  })
})
