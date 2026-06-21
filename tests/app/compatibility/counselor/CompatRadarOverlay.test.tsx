import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CompatRadarOverlay } from '@/app/compatibility/counselor/CompatRadarOverlay'

/**
 * 궁합 오행 비교 레이더 — 두 사람 오행을 한 오각형에 겹쳐 그린다.
 * deriveCounts(@/components/report/ElementRadar) 로 사주에서 오행 수를 뽑으므로
 * fiveElements shape 를 그대로 props 로 넘긴다 (실제 데이터 형태 재사용).
 */

// 목(wood)이 가장 강한 A / 화(fire)가 가장 강한 B
const sajuWoodDominant = { fiveElements: { wood: 5, fire: 1, earth: 1, metal: 1, water: 1 } }
const sajuFireDominant = { fiveElements: { wood: 1, fire: 5, earth: 1, metal: 1, water: 1 } }

describe('CompatRadarOverlay', () => {
  describe('empty / edge data', () => {
    it('shows ko empty message when both people have no element data', () => {
      render(<CompatRadarOverlay sajuA={undefined} sajuB={undefined} />)
      expect(screen.getByText('오행 정보가 아직 계산되지 않았습니다.')).toBeInTheDocument()
    })

    it('shows en empty message when both people have no element data', () => {
      render(<CompatRadarOverlay sajuA={undefined} sajuB={undefined} lang="en" />)
      expect(screen.getByText('Element data is not ready yet.')).toBeInTheDocument()
    })

    it('does not render an svg in the empty state', () => {
      const { container } = render(<CompatRadarOverlay sajuA={null} sajuB={null} />)
      expect(container.querySelector('svg')).toBeNull()
    })

    it('renders the chart when only one person has data', () => {
      const { container } = render(
        <CompatRadarOverlay sajuA={sajuWoodDominant} sajuB={undefined} />
      )
      expect(container.querySelector('svg')).not.toBeNull()
    })
  })

  describe('chart rendering', () => {
    it('renders an svg with grid rings and axis lines when both have data', () => {
      const { container } = render(
        <CompatRadarOverlay sajuA={sajuWoodDominant} sajuB={sajuFireDominant} />
      )
      const svg = container.querySelector('svg')
      expect(svg).not.toBeNull()
      // 4 ring polygons + 2 data polygons (A & B) = 6
      expect(container.querySelectorAll('polygon')).toHaveLength(6)
      // 5 axis lines
      expect(container.querySelectorAll('line')).toHaveLength(5)
    })

    it('omits a data polygon for a person with zero sum', () => {
      const { container } = render(
        <CompatRadarOverlay sajuA={sajuWoodDominant} sajuB={undefined} />
      )
      // 4 rings + 1 data polygon (only A) = 5
      expect(container.querySelectorAll('polygon')).toHaveLength(5)
    })

    it('renders all five ko axis labels', () => {
      const { container } = render(
        <CompatRadarOverlay sajuA={sajuWoodDominant} sajuB={sajuFireDominant} />
      )
      const text = container.textContent || ''
      expect(text).toContain('창의력')
      expect(text).toContain('추진력')
      expect(text).toContain('안정성')
      expect(text).toContain('결단력')
      expect(text).toContain('유연성')
    })

    it('renders en axis labels when lang=en', () => {
      const { container } = render(
        <CompatRadarOverlay sajuA={sajuWoodDominant} sajuB={sajuFireDominant} lang="en" />
      )
      const text = container.textContent || ''
      expect(text).toContain('Creativity')
      expect(text).toContain('Drive')
    })
  })

  describe('legend + names', () => {
    it('renders both names in the legend', () => {
      render(
        <CompatRadarOverlay
          sajuA={sajuWoodDominant}
          sajuB={sajuFireDominant}
          nameA="준영"
          nameB="민지"
        />
      )
      // 이름은 범례 + 하단 캡션에 두 번 등장
      expect(screen.getAllByText('준영').length).toBeGreaterThan(0)
      expect(screen.getAllByText('민지').length).toBeGreaterThan(0)
    })

    it('falls back to A / B names when none given', () => {
      render(<CompatRadarOverlay sajuA={sajuWoodDominant} sajuB={sajuFireDominant} />)
      expect(screen.getAllByText('A').length).toBeGreaterThan(0)
      expect(screen.getAllByText('B').length).toBeGreaterThan(0)
    })
  })

  describe('dominant element caption', () => {
    it('reports each person dominant element in ko', () => {
      const { container } = render(
        <CompatRadarOverlay
          sajuA={sajuWoodDominant}
          sajuB={sajuFireDominant}
          nameA="준영"
          nameB="민지"
        />
      )
      const text = container.textContent || ''
      // A 는 창의력(목), B 는 추진력(화) 가 두드러진다는 문장
      expect(text).toContain('가장 두드러져요')
      expect(text).toContain('창의력')
      expect(text).toContain('추진력')
    })

    it('reports dominant elements in en', () => {
      const { container } = render(
        <CompatRadarOverlay
          sajuA={sajuWoodDominant}
          sajuB={sajuFireDominant}
          nameA="A"
          nameB="B"
          lang="en"
        />
      )
      const text = container.textContent || ''
      expect(text).toContain('leans')
      expect(text).toContain('Creativity')
      expect(text).toContain('Drive')
    })
  })
})
