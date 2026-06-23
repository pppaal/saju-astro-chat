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
const SCRATCH = process.cwd() + '/tests/fixtures/calendar'

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

  it('keeps the ilgan hanja 辛 in the DOM (now inside the expert fold)', () => {
    renderTier()
    // moved into the <details> expert fold, but still rendered in the DOM.
    expect(screen.getAllByText('辛').length).toBeGreaterThan(0)
  })

  it('surfaces the lifePattern name as the novice hero "{pattern} 타입"', () => {
    renderTier()
    // novice-default hero: lifePattern.ko + ' 타입'. Real dump = 굴곡형.
    expect(screen.getByText('굴곡형 타입')).toBeInTheDocument()
    // raw pattern name also appears as the verdict term-tag.
    expect(screen.getAllByText('굴곡형').length).toBeGreaterThan(0)
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

  it('surfaces a "지금 여기 → 다음 마디" connecting one-liner', () => {
    renderTier()
    // nowAge = 2026 - 1995 = 31; current season = 청년기; next milestone age = 35.
    expect(
      screen.getByText(/지금 31세, ‘청년기’를 살고 있어요\. 다음 큰 마디는 35세예요\./)
    ).toBeInTheDocument()
  })

  it('shows the decade "weather" concept primer (not a bare Latin tag)', () => {
    renderTier()
    expect(screen.getByText(/10년마다 바뀌는 인생의 ‘날씨’/)).toBeInTheDocument()
  })

  it('leads timeline cells with the plain life-area gloss + Korean reading 갑술', () => {
    renderTier()
    // 甲戌 = 정재 → sibsinArea gloss should be present as the cell headline,
    // and the Korean reading 갑술 (gz.kr) is surfaced as a secondary.
    expect(screen.getByText('갑술')).toBeInTheDocument()
  })

  it('wires geokguk-rich into the identity fold (personality prose)', () => {
    renderTier()
    // 정인격 personality from geokguk-rich.json.
    expect(screen.getByText(/어머니의 품처럼 따뜻하고/)).toBeInTheDocument()
    expect(screen.getByText('배움과 따뜻함으로 사람을 품는 사색가')).toBeInTheDocument()
  })

  it('wires sibsin-category (dominant 재성) into the identity fold', () => {
    renderTier()
    // 재성 dominant title from sibsin-category.json.
    expect(screen.getByText('돈·사업·이성 면')).toBeInTheDocument()
  })

  it('wires the ilju-60 archetype character onto the novice surface', () => {
    renderTier()
    expect(screen.getByText(/양털 위 보석/)).toBeInTheDocument()
  })

  it('milestone titles lead with the plain meaning, not raw hanja/astro', () => {
    renderTier()
    // 甲戌 대운 milestone → plain meaning is the title; raw 간지 name is a tag.
    expect(screen.getByText('정재 대운이 열려요 — 차근차근 쌓는 안정의 10년')).toBeInTheDocument()
    // the Pluto milestone leads with plain meaning, not "명왕성 사각".
    expect(
      screen.getByText('정체성과 내면 깊은 곳이 강하게 재구성되는 시기예요.')
    ).toBeInTheDocument()
  })

  it('renders English identity when locale=en (pattern in EN, hanja still raw)', () => {
    mockLocale = 'en'
    renderTier()
    // novice hero in EN: '{pattern} type'. Real dump = Ups and downs.
    expect(screen.getByText('Ups and downs type')).toBeInTheDocument()
    expect(screen.getAllByText('辛').length).toBeGreaterThan(0)
    expect(screen.getByText('甲戌')).toBeInTheDocument()
  })
})
