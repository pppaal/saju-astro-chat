// tests/lib/share/curveSvg.test.ts
//
// buildCurveSvg — OG 공유 카드용 운 흐름 곡선 SVG 문자열 생성기.
// 순수·결정론(같은 입력 → 같은 문자열), 안전한 SVG, 밴드별 점 색.

import { describe, it, expect } from 'vitest'
import { buildCurveSvg, curveSvgDataUri } from '@/lib/share/curveSvg'

const THEME = {
  stroke: '#ffd24d',
  fill: '#ffd24d',
  dotGood: '#22c55e',
  dotMid: '#9ca3af',
  dotLow: '#ff6b8a',
  marker: '#ffffff',
}

describe('buildCurveSvg', () => {
  it('점수 2개 미만이면 빈 문자열', () => {
    expect(buildCurveSvg({ scores: [], theme: THEME })).toBe('')
    expect(buildCurveSvg({ scores: [50], theme: THEME })).toBe('')
  })

  it('완결된 <svg> 를 만들고 width/height/viewBox 를 박는다', () => {
    const svg = buildCurveSvg({ scores: [40, 60, 80], width: 600, height: 200, theme: THEME })
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg.endsWith('</svg>')).toBe(true)
    expect(svg).toContain('width="600"')
    expect(svg).toContain('height="200"')
    expect(svg).toContain('viewBox="0 0 600 200"')
    // 곡선 선 + 면적 path.
    expect(svg).toContain(`stroke="${THEME.stroke}"`)
    expect((svg.match(/<path /g) ?? []).length).toBe(2)
    // 점 3개.
    expect((svg.match(/<circle /g) ?? []).length).toBe(3)
  })

  it('결정론 — 같은 입력은 같은 문자열', () => {
    const a = buildCurveSvg({ scores: [10, 90, 30, 70], markerIndex: 1, theme: THEME })
    const b = buildCurveSvg({ scores: [10, 90, 30, 70], markerIndex: 1, theme: THEME })
    expect(a).toBe(b)
    expect(a).not.toContain('NaN')
  })

  it('밴드 임계로 점 색을 고른다(good/mid/low)', () => {
    const svg = buildCurveSvg({
      scores: [80, 50, 20],
      bands: { good: 60, caution: 40 },
      theme: THEME,
    })
    expect(svg).toContain(`fill="${THEME.dotGood}"`) // 80 → good
    expect(svg).toContain(`fill="${THEME.dotMid}"`) // 50 → mid
    expect(svg).toContain(`fill="${THEME.dotLow}"`) // 20 → low
  })

  it('markerIndex 가 있으면 마커 선 + 링을 추가한다', () => {
    const withMarker = buildCurveSvg({ scores: [40, 60, 80], markerIndex: 2, theme: THEME })
    const without = buildCurveSvg({ scores: [40, 60, 80], markerIndex: -1, theme: THEME })
    expect(withMarker).toContain('stroke-dasharray')
    expect(without).not.toContain('stroke-dasharray')
  })

  it('curveSvgDataUri 는 base64 data-URI 로 감싼다', () => {
    const svg = buildCurveSvg({ scores: [40, 60, 80], theme: THEME })
    const uri = curveSvgDataUri(svg)
    expect(uri.startsWith('data:image/svg+xml;base64,')).toBe(true)
    const decoded = Buffer.from(uri.split(',')[1], 'base64').toString('utf8')
    expect(decoded).toBe(svg)
  })
})
