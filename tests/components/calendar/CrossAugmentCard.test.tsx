// tests/components/calendar/CrossAugmentCard.test.tsx
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import CrossAugmentCard from '@/components/calendar/CrossAugmentCard'
import type { CalendarCrossAugment } from '@/lib/destiny-map/destinyCalendar'

let currentLocale: 'en' | 'ko' = 'ko'

vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({ locale: currentLocale }),
}))

function makeAugment(overrides: Partial<CalendarCrossAugment> = {}): CalendarCrossAugment {
  return {
    themes: [
      { id: 'theme.bugwi', meaning: '부귀쌍전', narrative: '관인상생 + 식신생재 동시 활성' },
    ],
    domains: [
      {
        domain: 'self',
        tone: 'positive',
        topConfirms: [{ meaning: '자아 강화', intensity: 'strong' }],
        dualSignals: [],
        hasConflict: false,
      },
      {
        domain: 'love',
        tone: 'mixed',
        topConfirms: [],
        dualSignals: [
          { meaning: '감정 양면', intensity: 'moderate', narrative: '안정과 변화 공존' },
        ],
        hasConflict: true,
      },
      {
        domain: 'money',
        tone: 'neutral',
        topConfirms: [],
        dualSignals: [],
        hasConflict: false,
      },
      {
        domain: 'career',
        tone: 'negative',
        topConfirms: [{ meaning: '직업 압박', intensity: 'weak' }],
        dualSignals: [],
        hasConflict: false,
      },
      {
        domain: 'health',
        tone: 'neutral',
        topConfirms: [],
        dualSignals: [],
        hasConflict: false,
      },
      {
        domain: 'family',
        tone: 'positive',
        topConfirms: [{ meaning: '가족 화목', intensity: 'moderate' }],
        dualSignals: [],
        hasConflict: false,
      },
    ],
    context: {
      ageYears: 30,
      lifeStage: 'young-adult',
      daeun: {
        index: 3,
        yearsIntoCurrent: 9.2,
        yearsToNext: 0.8,
        previousSibsin: '正官',
        nextSibsin: '偏財',
        transitionImminent: true,
      },
    },
    ...overrides,
  }
}

describe('CrossAugmentCard', () => {
  describe('ko locale', () => {
    beforeEach(() => { currentLocale = 'ko' })

    it('renders themes section with meaning + narrative', () => {
      render(<CrossAugmentCard augment={makeAugment()} />)
      expect(screen.getByText('통합 테마')).toBeInTheDocument()
      expect(screen.getByText('부귀쌍전')).toBeInTheDocument()
      expect(screen.getByText('관인상생 + 식신생재 동시 활성')).toBeInTheDocument()
    })

    it('renders 6 domain names', () => {
      render(<CrossAugmentCard augment={makeAugment()} />)
      expect(screen.getByText('자아')).toBeInTheDocument()
      expect(screen.getByText('사랑')).toBeInTheDocument()
      expect(screen.getByText('재물')).toBeInTheDocument()
      expect(screen.getByText('직업')).toBeInTheDocument()
      expect(screen.getByText('건강')).toBeInTheDocument()
      expect(screen.getByText('가정')).toBeInTheDocument()
    })

    it('renders tone badges in Korean', () => {
      render(<CrossAugmentCard augment={makeAugment()} />)
      expect(screen.getAllByText('긍정').length).toBeGreaterThan(0)
      expect(screen.getByText('주의')).toBeInTheDocument()
      expect(screen.getByText('양면')).toBeInTheDocument()
      expect(screen.getAllByText('평이').length).toBe(2) // money + health
    })

    it('renders confirm vs dual signal labels distinctly', () => {
      render(<CrossAugmentCard augment={makeAugment()} />)
      expect(screen.getAllByText('양쪽 동의').length).toBeGreaterThan(0)
      expect(screen.getByText('양면성')).toBeInTheDocument()
    })

    it('shows empty text on domains without any signals', () => {
      render(<CrossAugmentCard augment={makeAugment()} />)
      expect(screen.getAllByText('이 영역에는 동시 신호 없음').length).toBe(2)
    })

    it('renders imminent badge when daeun transition is near', () => {
      render(<CrossAugmentCard augment={makeAugment()} />)
      expect(screen.getByText('대운 전환 임박')).toBeInTheDocument()
    })

    it('renders footer context (age, lifeStage, daeun)', () => {
      render(<CrossAugmentCard augment={makeAugment()} />)
      expect(screen.getByText('만 30세')).toBeInTheDocument()
      expect(screen.getByText('청년기')).toBeInTheDocument()
      expect(screen.getByText(/대운 正官 → 偏財/)).toBeInTheDocument()
      expect(screen.getByText(/0\.8년 후 전환/)).toBeInTheDocument()
    })

    it('uses provided scopeLabel over default scope label', () => {
      render(
        <CrossAugmentCard
          augment={makeAugment()}
          scope="daily"
          scopeLabel="2026-04-28 일진 흐름"
        />
      )
      expect(screen.getByText('2026-04-28 일진 흐름')).toBeInTheDocument()
    })

    it('falls back to default scope label when scopeLabel not provided', () => {
      const { rerender } = render(<CrossAugmentCard augment={makeAugment()} scope="monthly" />)
      expect(screen.getByText('이번 달 큰 흐름')).toBeInTheDocument()
      rerender(<CrossAugmentCard augment={makeAugment()} scope="weekly" />)
      expect(screen.getByText('이번 주 흐름')).toBeInTheDocument()
      rerender(<CrossAugmentCard augment={makeAugment()} scope="daily" />)
      expect(screen.getByText('오늘 흐름')).toBeInTheDocument()
    })

    it('hides imminent badge when daeun transition is not near', () => {
      const a = makeAugment()
      a.context!.daeun!.transitionImminent = false
      render(<CrossAugmentCard augment={a} />)
      expect(screen.queryByText('대운 전환 임박')).not.toBeInTheDocument()
    })

    it('omits themes section when no themes', () => {
      const a = makeAugment({ themes: [] })
      render(<CrossAugmentCard augment={a} />)
      expect(screen.queryByText('통합 테마')).not.toBeInTheDocument()
    })

    it('renders dual signal narratives without crashing', () => {
      render(<CrossAugmentCard augment={makeAugment()} />)
      expect(screen.getByText('감정 양면')).toBeInTheDocument()
    })
  })

  describe('en locale', () => {
    beforeEach(() => { currentLocale = 'en' })

    it('renders English domain names', () => {
      render(<CrossAugmentCard augment={makeAugment()} />)
      expect(screen.getByText('Self')).toBeInTheDocument()
      expect(screen.getByText('Love')).toBeInTheDocument()
      expect(screen.getByText('Wealth')).toBeInTheDocument()
      expect(screen.getByText('Career')).toBeInTheDocument()
      expect(screen.getByText('Health')).toBeInTheDocument()
      expect(screen.getByText('Family')).toBeInTheDocument()
    })

    it('renders English tone labels', () => {
      render(<CrossAugmentCard augment={makeAugment()} />)
      expect(screen.getAllByText('Positive').length).toBeGreaterThan(0)
      expect(screen.getByText('Caution')).toBeInTheDocument()
      expect(screen.getByText('Dual')).toBeInTheDocument()
    })

    it('renders English section + signal labels', () => {
      render(<CrossAugmentCard augment={makeAugment()} />)
      expect(screen.getByText('Themes')).toBeInTheDocument()
      expect(screen.getByText('By Domain')).toBeInTheDocument()
      expect(screen.getAllByText('Both Agree').length).toBeGreaterThan(0)
      expect(screen.getByText('Dual Signals')).toBeInTheDocument()
    })

    it('renders English footer + imminent badge', () => {
      render(<CrossAugmentCard augment={makeAugment()} />)
      expect(screen.getByText('Daeun Transition Near')).toBeInTheDocument()
      expect(screen.getByText('Age 30')).toBeInTheDocument()
      expect(screen.getByText('Young Adult')).toBeInTheDocument()
      expect(screen.getByText(/Daeun 正官 → 偏財/)).toBeInTheDocument()
      expect(screen.getByText(/0\.8y to next/)).toBeInTheDocument()
    })

    it('renders English default scope labels', () => {
      const { rerender } = render(<CrossAugmentCard augment={makeAugment()} scope="monthly" />)
      expect(screen.getByText('This Month')).toBeInTheDocument()
      rerender(<CrossAugmentCard augment={makeAugment()} scope="weekly" />)
      expect(screen.getByText('This Week')).toBeInTheDocument()
      rerender(<CrossAugmentCard augment={makeAugment()} scope="daily" />)
      expect(screen.getByText('Today')).toBeInTheDocument()
    })
  })
})
