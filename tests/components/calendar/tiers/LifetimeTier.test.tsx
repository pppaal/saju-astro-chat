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

// 새 블록(세운·대운 교차)이 담긴 lifetime 변형 — /destiny 경량 경로가 채우는 필드.
function renderTierWith(extra: Partial<DestinyLifetime>) {
  return render(
    <I18nProvider>
      <LifetimeTier user={user} lifetime={{ ...lifetime, ...extra }} onDive={noop} />
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

  it('shows the current decade as a readable 갑술 label, 甲戌 only on hover', () => {
    renderTier()
    // novice 기본뷰: 읽을 수 있는 한글 음만 보인다(raw 한자 0).
    expect(screen.getByText('갑술')).toBeInTheDocument()
    // raw 간지 한자(甲戌)는 hover title 로 보존.
    expect(screen.getByTitle('갑술 (甲戌)')).toBeInTheDocument()
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

  it('renders English identity when locale=en (pattern in EN; 干支 hanja folded/hover only)', () => {
    mockLocale = 'en'
    renderTier()
    // novice hero in EN: '{pattern} type'. Real dump = Ups and downs.
    expect(screen.getByText('Ups and downs type')).toBeInTheDocument()
    // 일간 辛 lives inside the (DOM-present) identity fold.
    expect(screen.getAllByText('辛').length).toBeGreaterThan(0)
    // EN 타임라인은 로마자 음(gapsul)을 보여준다 — 한글 음(갑술)이나 raw 甲戌 아님
    // (감사 G1: 옛 코드는 EN 에도 한글 음을 노출해 영문 사용자가 외계문자를 봤다).
    expect(screen.getByText('gapsul')).toBeInTheDocument()
    expect(screen.queryByText('갑술')).not.toBeInTheDocument()
    // raw 甲戌 은 hover title 로만.
    expect(screen.getByTitle('gapsul (甲戌)')).toBeInTheDocument()
  })

  // ── 새 블록 — /destiny 경량 경로가 채우는 세운·대운 교차 ──
  it('대운층 사주×점성 교차 블록 — 페어·뜻·방향 표시', () => {
    renderTierWith({
      decadeCross: [
        {
          saju: '정재',
          sajuEn: 'Wealth',
          astro: '토성',
          astroEn: 'Saturn',
          meaning: '서두르지 않고 쌓을수록 단단해지는 결이에요.',
          meaningEn: 'What you build slowly holds.',
          polarity: 1,
        },
      ],
    })
    expect(screen.getByText('이 10년의 겹침')).toBeInTheDocument()
    // 교차 페어(정재 × 토성)가 한 span 안에 렌더 — 노드 분리 대신 컨테이너 텍스트로.
    const meaning = screen.getByText('서두르지 않고 쌓을수록 단단해지는 결이에요.')
    expect(meaning).toBeInTheDocument()
    const row = meaning.closest('div')!
    expect(row.textContent).toContain('정재')
    expect(row.textContent).toContain('토성')
    // 신뢰 카피 — "같은 방향을 가리킬 때만".
    expect(screen.getByText(/같은 방향을 가리킬 때만/)).toBeInTheDocument()
  })

  it('교차가 없으면 블록 자체가 렌더되지 않는다', () => {
    renderTierWith({ decadeCross: [] })
    expect(screen.queryByText('이 10년의 겹침')).not.toBeInTheDocument()
  })

  it('세운 한 줄 + 캘린더 퍼널 CTA', () => {
    renderTierWith({
      thisYear: { gz: '丙午', sibsin: '정관', area: '일·책임', areaEn: 'duty & standing' },
    })
    expect(screen.getByText('이 흐름에서, 올해')).toBeInTheDocument()
    expect(screen.getByText('丙午')).toBeInTheDocument()
    // CTA 는 캘린더로 내려보낸다.
    expect(screen.getByRole('button', { name: /운흐름 캘린더/ })).toBeInTheDocument()
  })
})
