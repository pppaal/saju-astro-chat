// tests/components/v9/CrossCheckRow.test.tsx
//
// 교차 행 — 타이밍 마크는 up(▲)·down(▼)일 때만, 없으면 마크 없음(합의를 지어내지 않는다).
// dark/light, trait 판정 라벨 ko/en, 범례(XLegend) 한 줄.

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import CrossCheckRow, { CrossCheckList } from '@/components/v9/CrossCheckRow'
import XLegend from '@/components/v9/XLegend'

const SAJU = { hanja: '正官', text: 'Direct Officer' }
const STARS = { glyph: 'saturn' as const, text: 'Saturn', sub: 'Saturn return · 9° Aries · 2026' }

const row = (c: HTMLElement) => c.querySelector('[data-kind]') as HTMLElement

describe('CrossCheckRow timing', () => {
  it('mark up → ▲ (유리) 하나', () => {
    const { container } = render(
      <CrossCheckRow kind="timing" saju={SAJU} stars={STARS} mark="up" locale="en" />
    )
    const r = row(container)
    expect(r.getAttribute('data-mark')).toBe('up')
    const marks = r.querySelectorAll('path[d="M6 1 L11.5 11 L0.5 11 Z"]')
    expect(marks).toHaveLength(1)
    expect(r.textContent).toContain('Favorable')
  })

  it('mark down → ▼ (불리) 하나', () => {
    const { container } = render(
      <CrossCheckRow kind="timing" saju={SAJU} stars={STARS} mark="down" locale="ko" />
    )
    const r = row(container)
    expect(r.getAttribute('data-mark')).toBe('down')
    expect(r.querySelectorAll('path[d="M0.5 1 L11.5 1 L6 11 Z"]')).toHaveLength(1)
    expect(r.textContent).toContain('불리')
  })

  it('mark 가 없으면 마크도, 방향 단어도 없다', () => {
    const { container } = render(
      <CrossCheckRow kind="timing" saju={SAJU} stars={STARS} locale="en" />
    )
    const r = row(container)
    expect(r.getAttribute('data-mark')).toBe('none')
    expect(r.querySelectorAll('path[d^="M6 1"], path[d^="M0.5 1"]')).toHaveLength(0)
    expect(r.textContent).not.toMatch(/Favorable|Adverse/)
  })

  it('SAJU 칸 = 한자 + 값, STARS 칸 = 기호 + 값 + sub', () => {
    const { container } = render(
      <CrossCheckRow
        kind="timing"
        saju={SAJU}
        stars={STARS}
        mark="up"
        note="Responsibility firms up."
        locale="en"
      />
    )
    const saju = container.querySelector('[data-cell="saju"]') as HTMLElement
    expect(saju.textContent).toBe('Saju正官Direct Officer')
    const stars = container.querySelector('[data-cell="stars"]') as HTMLElement
    expect(stars.querySelector('[data-glyph="saturn"]')).not.toBeNull()
    expect(stars.textContent).toBe('StarsSaturnSaturn return · 9° Aries · 2026')
    expect(container.textContent).toContain('Responsibility firms up.')
  })

  it('dark / light 테마 — 같은 마크업, 테마 클래스만 다르다', () => {
    const light = row(
      render(<CrossCheckRow kind="timing" saju={SAJU} stars={STARS} mark="up" locale="en" />)
        .container
    )
    const dark = row(
      render(
        <CrossCheckRow kind="timing" saju={SAJU} stars={STARS} mark="up" theme="dark" locale="en" />
      ).container
    )
    expect(dark.className).not.toBe(light.className)
    expect(dark.className.split(/\s+/).length).toBe(light.className.split(/\s+/).length + 1)
    expect(dark.textContent).toBe(light.textContent)
  })
})

describe('CrossCheckRow trait', () => {
  const cases = [
    ['resonant', 'same', 'Same', '같음'],
    ['complement', 'supportive', 'Supportive', '서로 도움'],
    ['tension', 'twoPulls', 'Two pulls', '두 결'],
    ['neutral', 'unrelated', 'Unrelated', '무관'],
  ] as const

  it.each(cases)('%s → 판정 %s (en %s · ko %s)', (tone, key, en, ko) => {
    const e = row(
      render(
        <CrossCheckRow
          kind="trait"
          axis="Identity"
          verdict={tone}
          saju={{ text: 'Water', w: 'fluid and permeating' }}
          stars={{ text: 'Fire', w: 'expressive and fiery' }}
          locale="en"
        />
      ).container
    )
    expect(e.getAttribute('data-verdict')).toBe(key)
    expect(e.textContent).toContain(en)
    const k = row(
      render(<CrossCheckRow kind="trait" axis="정체성" verdict={tone} phrase="한 줄" locale="ko" />)
        .container
    )
    expect(k.textContent).toContain(ko)
    expect(k.textContent).toContain('한 줄')
  })

  it('trait 행엔 방향 마크가 없다', () => {
    const r = row(
      render(
        <CrossCheckRow kind="trait" axis="Fortune" verdict="resonant" phrase="both" locale="en" />
      ).container
    )
    expect(r.querySelectorAll('path[d^="M6 1"], path[d^="M0.5 1"]')).toHaveLength(0)
  })
})

describe('XLegend + CrossCheckList', () => {
  it('범례 한 줄 — 문장 + ▲ Favorable ▼ Adverse (ko 짝)', () => {
    const en = render(<XLegend locale="en" />).container
    expect(en.textContent).toBe(
      'Timing signals appear only when both systems agreeFavorableAdverse'
    )
    expect(en.querySelectorAll('svg')).toHaveLength(2)
    const ko = render(<XLegend locale="ko" theme="dark" />).container
    expect(ko.textContent).toBe('타이밍 신호는 두 체계가 같은 쪽을 가리킬 때만 보여요유리불리')
  })

  it('묶음은 행을 감싼다', () => {
    const { container } = render(
      <CrossCheckList theme="dark">
        <CrossCheckRow
          kind="timing"
          first
          saju={SAJU}
          stars={STARS}
          mark="up"
          theme="dark"
          locale="en"
        />
        <CrossCheckRow kind="timing" saju={SAJU} stars={STARS} theme="dark" locale="en" />
      </CrossCheckList>
    )
    expect(container.querySelectorAll('[data-kind="timing"]')).toHaveLength(2)
  })
})
