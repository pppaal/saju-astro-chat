import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SajuChart } from '@/components/report/SajuChart'

// 실제 한자 — chart-dictionary(hanja-rich) 에 존재하는 값이라 readingOf/imageOf/
// HanjaBubble 의 사전 조회 경로가 실제로 동작한다.
const cell = (name: string, element: string, sibsin?: string) => ({ name, element, sibsin })

// year/month/day/time 각 기둥에 천간(甲=갑/목) + 지지(子=자/수) 채움.
const makePillar = (sibsin?: string) => ({
  heavenlyStem: cell('甲', '목', sibsin),
  earthlyBranch: cell('子', '수'),
})

const fullSaju = {
  yearPillar: makePillar(),
  monthPillar: makePillar(),
  dayPillar: makePillar('비견'),
  timePillar: makePillar(),
}

describe('SajuChart', () => {
  describe('empty state', () => {
    it('shows ko empty message when saju is undefined', () => {
      render(<SajuChart saju={undefined} />)
      expect(screen.getByText('사주 정보가 아직 계산되지 않았습니다.')).toBeInTheDocument()
    })

    it('shows en empty message when saju is undefined', () => {
      render(<SajuChart saju={undefined} lang="en" />)
      expect(screen.getByText('Saju data is not ready yet.')).toBeInTheDocument()
    })

    it('shows empty message when pillars are incomplete (missing time)', () => {
      const incomplete = {
        yearPillar: makePillar(),
        monthPillar: makePillar(),
        dayPillar: makePillar(),
        // no time / hour pillar
      }
      render(<SajuChart saju={incomplete} />)
      expect(screen.getByText('사주 정보가 아직 계산되지 않았습니다.')).toBeInTheDocument()
    })
  })

  describe('pillar source resolution', () => {
    it('renders from legacy *Pillar fields', () => {
      const { container } = render(<SajuChart saju={fullSaju} />)
      // four columns of cells → at least one grid present
      expect(container.querySelector('.grid')).not.toBeNull()
      // header 기둥 한자 라벨
      expect(screen.getByText('時')).toBeInTheDocument()
      expect(screen.getByText('日')).toBeInTheDocument()
      expect(screen.getByText('月')).toBeInTheDocument()
      expect(screen.getByText('年')).toBeInTheDocument()
    })

    it('renders from pillars.* nested shape', () => {
      const nested = {
        pillars: {
          year: makePillar(),
          month: makePillar(),
          day: makePillar(),
          time: makePillar(),
        },
      }
      render(<SajuChart saju={nested} />)
      expect(screen.getByText('日')).toBeInTheDocument()
    })

    it('uses hourPillar as the time fallback', () => {
      const withHour = {
        yearPillar: makePillar(),
        monthPillar: makePillar(),
        dayPillar: makePillar(),
        hourPillar: makePillar(),
      }
      render(<SajuChart saju={withHour} />)
      expect(screen.getByText('時')).toBeInTheDocument()
    })
  })

  describe('position labels', () => {
    it('renders ko position labels', () => {
      render(<SajuChart saju={fullSaju} />)
      expect(screen.getByText('말년·자녀')).toBeInTheDocument()
      expect(screen.getByText('나')).toBeInTheDocument()
      expect(screen.getByText('청년·직업')).toBeInTheDocument()
      expect(screen.getByText('초년·조상')).toBeInTheDocument()
    })

    it('renders en position labels and hides hanja pillar labels', () => {
      render(<SajuChart saju={fullSaju} lang="en" />)
      expect(screen.getByText('Future')).toBeInTheDocument()
      expect(screen.getByText('Me')).toBeInTheDocument()
      expect(screen.getByText('Career')).toBeInTheDocument()
      expect(screen.getByText('Early')).toBeInTheDocument()
      // 한자 기둥 라벨(時/日...) 은 KO 모드에서만 — EN 에선 없음
      expect(screen.queryByText('時')).not.toBeInTheDocument()
    })
  })

  describe('cell content (ko)', () => {
    it('renders the hanja glyphs', () => {
      const { container } = render(<SajuChart saju={fullSaju} />)
      const text = container.textContent || ''
      expect(text).toContain('甲')
      expect(text).toContain('子')
    })

    it('renders korean reading + element ("갑·목" / "자·수")', () => {
      const { container } = render(<SajuChart saju={fullSaju} />)
      const text = container.textContent || ''
      expect(text).toContain('갑·목')
      expect(text).toContain('자·수')
    })

    it('renders the row guide labels in ko (天干 / 地支)', () => {
      const { container } = render(<SajuChart saju={fullSaju} />)
      const text = container.textContent || ''
      expect(text).toContain('천간(天干) · 드러난 결')
      expect(text).toContain('지지(地支) · 안에 품은 결')
    })
  })

  describe('cell content (en)', () => {
    it('does not render korean reading text in en mode', () => {
      const { container } = render(<SajuChart saju={fullSaju} lang="en" />)
      const text = container.textContent || ''
      expect(text).toContain('甲')
      expect(text).not.toContain('갑·목')
      // guide labels are KO-only
      expect(text).not.toContain('천간(天干) · 드러난 결')
    })
  })

  describe('sibsin chip', () => {
    it('renders the sibsin chip and its short label when present', () => {
      const { container } = render(<SajuChart saju={fullSaju} />)
      const text = container.textContent || ''
      expect(text).toContain('비견')
      // SIBSIN_SHORT['비견'] === '자존·동료'
      expect(text).toContain('자존·동료')
    })
  })

  describe('missing cell handling', () => {
    it('renders a dot placeholder when a cell name is missing', () => {
      const sparse = {
        yearPillar: { heavenlyStem: undefined, earthlyBranch: cell('子', '수') },
        monthPillar: makePillar(),
        dayPillar: makePillar(),
        timePillar: makePillar(),
      }
      const { container } = render(<SajuChart saju={sparse} />)
      const text = container.textContent || ''
      expect(text).toContain('·')
    })
  })

  describe('theme', () => {
    it('renders dark theme container', () => {
      const { container } = render(<SajuChart saju={fullSaju} theme="dark" />)
      expect(container.firstChild).not.toBeNull()
    })

    it('renders light theme container (default)', () => {
      const { container } = render(<SajuChart saju={fullSaju} theme="light" />)
      expect(container.firstChild).not.toBeNull()
    })

    it('dark empty state still shows empty message', () => {
      render(<SajuChart saju={undefined} theme="dark" />)
      expect(screen.getByText('사주 정보가 아직 계산되지 않았습니다.')).toBeInTheDocument()
    })
  })

  describe('onPillarClick interaction', () => {
    it('calls onPillarClick when a clickable cell is clicked', () => {
      const onPillarClick = vi.fn()
      render(<SajuChart saju={fullSaju} onPillarClick={onPillarClick} />)
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
      fireEvent.click(buttons[0])
      expect(onPillarClick).toHaveBeenCalledTimes(1)
      // first column is 'time'
      expect(onPillarClick).toHaveBeenCalledWith('time')
    })

    it('fires onPillarClick on Enter key', () => {
      const onPillarClick = vi.fn()
      render(<SajuChart saju={fullSaju} onPillarClick={onPillarClick} />)
      const buttons = screen.getAllByRole('button')
      fireEvent.keyDown(buttons[1], { key: 'Enter' })
      expect(onPillarClick).toHaveBeenCalledWith('day')
    })

    it('fires onPillarClick on Space key', () => {
      const onPillarClick = vi.fn()
      render(<SajuChart saju={fullSaju} onPillarClick={onPillarClick} />)
      const buttons = screen.getAllByRole('button')
      fireEvent.keyDown(buttons[2], { key: ' ' })
      expect(onPillarClick).toHaveBeenCalledWith('month')
    })

    it('ignores other keys', () => {
      const onPillarClick = vi.fn()
      render(<SajuChart saju={fullSaju} onPillarClick={onPillarClick} />)
      const buttons = screen.getAllByRole('button')
      fireEvent.keyDown(buttons[0], { key: 'a' })
      expect(onPillarClick).not.toHaveBeenCalled()
    })

    it('does not expose role=button when onPillarClick is absent', () => {
      render(<SajuChart saju={fullSaju} />)
      expect(screen.queryAllByRole('button')).toHaveLength(0)
    })
  })
})
