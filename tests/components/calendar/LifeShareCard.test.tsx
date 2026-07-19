/**
 * LifeShareCard — /destiny 인생유형 캡처 카드(1080×1080)의 렌더 계약.
 * 핵심: 유형 배지가 주인공으로 보이고, 곡선은 외부 fetch 없는 data-URI SVG 로
 * 박히며(캡처 시 CORS/타이밍 이슈 방지), 이미지 공유엔 링크가 없으니 복귀
 * 경로(도메인)가 항상 찍혀야 한다.
 */

import React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { LifeShareCard, LIFE_CARD_SIZE } from '@/components/calendar/LifeShareCard'
import type { LifeShareData } from '@/components/calendar/ShareLifeButton'

const BASE: LifeShareData = {
  isKo: true,
  typeName: '대기만성형',
  rangeLabel: '1990–2070',
  headline: '40대부터 크게 피는 흐름',
  subline: '초년 고생, 중년 이후 상승',
  curve: [42, 48, 55, 61, 70, 78, 74, 66],
  axisLabels: ['10대', '30대', '50대', '70대'],
  markerIndex: 3,
  peakIndex: 5,
}

afterEach(cleanup)

describe('LifeShareCard', () => {
  it('유형 배지·헤드라인·구간 라벨을 렌더한다', () => {
    render(<LifeShareCard data={BASE} />)
    expect(screen.getByText('대기만성형')).toBeTruthy()
    expect(screen.getByText('40대부터 크게 피는 흐름')).toBeTruthy()
    expect(screen.getByText('1990–2070')).toBeTruthy()
    expect(screen.getByText('사주 × 별자리 · 인생유형')).toBeTruthy()
  })

  it('곡선을 data-URI SVG <img> 로 박는다 (외부 fetch 없음)', () => {
    const { container } = render(<LifeShareCard data={BASE} />)
    const curveImg = Array.from(container.querySelectorAll('img')).find((img) =>
      (img.getAttribute('src') ?? '').startsWith('data:image/svg+xml')
    )
    expect(curveImg).toBeTruthy()
    const src = decodeURIComponent(curveImg!.getAttribute('src') ?? '')
    // 마커(세로 점선)와 점들이 실제로 그려졌는지 — 순수 buildCurveSvg 결과.
    expect(src).toContain('<svg')
    expect(src).toContain('stroke-dasharray')
    expect(src).toContain('<circle')
  })

  it('축 라벨(최대 4개)을 곡선 아래에 렌더한다', () => {
    render(<LifeShareCard data={BASE} />)
    for (const a of BASE.axisLabels!) expect(screen.getByText(a)).toBeTruthy()
  })

  it('복귀 경로(도메인)와 브랜드를 항상 찍는다', () => {
    render(<LifeShareCard data={BASE} />)
    expect(screen.getByText('DestinyPal')).toBeTruthy()
    // 컴포넌트와 같은 규칙으로 기대 도메인 계산(env 유무 모두 커버).
    const domain = (process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com')
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
    expect(screen.getByText(domain)).toBeTruthy()
  })

  it('typeName 없으면(레거시) 헤드라인이 주인공 — 배지 없이도 렌더된다', () => {
    const { typeName: _omit, ...rest } = BASE
    render(<LifeShareCard data={{ ...rest, isKo: false }} />)
    expect(screen.getByText('40대부터 크게 피는 흐름')).toBeTruthy()
    expect(screen.getByText('Korean Astrology × Zodiac · Life type')).toBeTruthy()
  })

  it('곡선 점수 2개 미만이면 곡선 없이 렌더된다 (throw 금지)', () => {
    const { container } = render(<LifeShareCard data={{ ...BASE, curve: [50] }} />)
    const curveImg = Array.from(container.querySelectorAll('img')).find((img) =>
      (img.getAttribute('src') ?? '').startsWith('data:image/svg+xml')
    )
    expect(curveImg).toBeFalsy()
  })

  it('카드 크기 상수는 1080 (인스타 정사각)', () => {
    expect(LIFE_CARD_SIZE).toBe(1080)
  })
})
