// tests/components/v9/SixtyDial.test.tsx
//
// 60갑자 다이얼 SVG — 가운데 丙午 · '2026 · 43 / 60', 바늘·LED, 같은 입력이면 같은 SVG 문자열.

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import SixtyDial from '@/components/v9/SixtyDial'
import { dialModel } from '@/lib/v9/sixtyDial'

const NOW = new Date('2026-11-19T12:00:00+09:00')
const model = () =>
  dialModel({ nowDate: NOW, timeZone: 'Asia/Seoul', bornYear: 1997, turn: { year: 2032 } })

describe('SixtyDial', () => {
  it('2026-11-19 → 丙午 · 2026 · 43 / 60 · 접근성 이름', () => {
    const { container } = render(<SixtyDial model={model()} />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('role')).toBe('img')
    expect(svg.getAttribute('aria-label')).toContain('丙午 2026 (43 of 60)')
    const texts = [...container.querySelectorAll('text')].map((t) => t.textContent)
    expect(texts).toContain('丙午')
    expect(texts).toContain('2026 · 43 / 60')
    expect(texts).toContain('BORN · 丁丑 1997')
    expect(texts).toContain('LIFE TURN')
  })

  it('입춘 경계: 2027-02-03 丙午 · 2027-02-05 丁未', () => {
    const before = render(
      <SixtyDial
        model={dialModel({
          nowDate: new Date('2027-02-03T12:00:00+09:00'),
          timeZone: 'Asia/Seoul',
        })}
      />
    )
    expect(before.container.textContent).toContain('丙午')
    const after = render(
      <SixtyDial
        model={dialModel({
          nowDate: new Date('2027-02-05T12:00:00+09:00'),
          timeZone: 'Asia/Seoul',
        })}
      />
    )
    expect(after.container.textContent).toContain('丁未')
    expect(after.container.textContent).toContain('2027 · 44 / 60')
  })

  it('눈금 58개 + 바늘 + 인생 전환 바늘, LED 원 하나', () => {
    const { container } = render(<SixtyDial model={model()} />)
    expect(container.querySelectorAll('line')).toHaveLength(58 + 1 + 1)
    expect(container.querySelectorAll('rect')).toHaveLength(1)
    // 바깥 테 + LED + 태어난 해
    expect(container.querySelectorAll('circle')).toHaveLength(3)
  })

  it('같은 입력이면 같은 SVG 문자열 (결정적 · 시계 무관)', () => {
    const a = renderToStaticMarkup(<SixtyDial model={model()} />)
    const b = renderToStaticMarkup(<SixtyDial model={model()} />)
    expect(a).toBe(b)
    expect(a).toContain('viewBox="0 0 300 300"')
  })

  it('light 테마도 같은 기하', () => {
    const dark = renderToStaticMarkup(<SixtyDial model={model()} />)
    const light = renderToStaticMarkup(<SixtyDial model={model()} theme="light" />)
    const geom = (html: string) => html.replace(/class="[^"]*"/g, '')
    expect(geom(light)).toBe(geom(dark))
  })
})
