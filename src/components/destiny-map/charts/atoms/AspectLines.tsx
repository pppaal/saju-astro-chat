'use client'

import React from 'react'
import { getAspectMeaning } from '@/lib/chart-dictionary'

/**
 * 점성 차트 휠 안쪽에 행성 간 aspect (각도) 라인을 그리는 SVG 컴포넌트.
 *
 * 부모 (NatalChart 등) 가 그린 휠 위에 absolute 로 겹쳐 그리며,
 * pointer-events-none default 로 부모의 interactivity 를 막지 않는다.
 */

interface AspectInput {
  p1: string
  p2: string
  type: string
  orb?: number
}

interface PlanetInput {
  name: string
  longitude: number
}

interface AspectLinesProps {
  /** /api/astrology 응답의 aspects array */
  aspects: AspectInput[]
  /** 행성 위치 (각도 0-360) — 라인 endpoint 계산용 */
  planets: PlanetInput[]
  /** SVG viewport (이미 부모가 휠 그리고 있을 때 wrapping) */
  size: number
  /** 휠 중심에서 라인 끝까지 비율 (행성 위치보다 안쪽) — default 0.85 */
  radiusRatio?: number
  lang?: 'ko' | 'en'
  /** line 위 hover 시 aspect 의미 tooltip 표시 — default false */
  showTooltips?: boolean
}

interface AspectStyle {
  stroke: string
  strokeWidth: number
  strokeDasharray?: string
  opacity?: number
  isMajor: boolean
}

const MAJOR_ASPECTS = new Set([
  'conjunction',
  'sextile',
  'square',
  'trine',
  'opposition',
])

function aspectStyle(type: string): AspectStyle {
  switch (type) {
    case 'conjunction':
      return { stroke: '#f87171', strokeWidth: 1.5, isMajor: true }
    case 'sextile':
      return { stroke: '#60a5fa', strokeWidth: 1, isMajor: true }
    case 'square':
      return {
        stroke: '#f87171',
        strokeWidth: 1.5,
        strokeDasharray: '3 3',
        isMajor: true,
      }
    case 'trine':
      return { stroke: '#34d399', strokeWidth: 1.2, isMajor: true }
    case 'opposition':
      return { stroke: '#a78bfa', strokeWidth: 1.5, isMajor: true }
    case 'quincunx':
      return {
        stroke: '#fbbf24',
        strokeWidth: 0.8,
        strokeDasharray: '2 3',
        isMajor: false,
      }
    default:
      // semi-sextile, sesqui, quintile, semi-square 등 기타 마이너
      return {
        stroke: '#64748b',
        strokeWidth: 0.6,
        opacity: 0.5,
        isMajor: false,
      }
  }
}

/**
 * 행성의 황도 longitude (0-360) → SVG 좌표.
 * 점성 차트는 ASC (Ascendant) 가 9시 방향 (= SVG x 음의 방향) 이며
 * 황도는 시계 반대로 진행. longitude = 0 (Aries 0°) 이 ASC 라 가정한
 * 표준 wheel 배치를 따른다.
 */
function pointFromLongitude(lon: number, size: number, radius: number) {
  const cx = size / 2
  const cy = size / 2
  const angle = ((180 - lon) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(angle),
    y: cy - radius * Math.sin(angle),
  }
}

export function AspectLines({
  aspects,
  planets,
  size,
  radiusRatio = 0.85,
  lang = 'ko',
  showTooltips = false,
}: AspectLinesProps) {
  const radius = (size / 2) * radiusRatio

  // 너무 많은 aspect (30+) 일 때 가독성 — minor 는 opacity 더 낮춤
  const heavyChart = aspects.length >= 30

  // 행성 위치를 미리 Map 으로 (O(1) lookup)
  const planetMap = new Map<string, PlanetInput>()
  for (const p of planets) planetMap.set(p.name, p)

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
    >
      {aspects.map((asp, i) => {
        const p1 = planetMap.get(asp.p1)
        const p2 = planetMap.get(asp.p2)
        if (!p1 || !p2) return null

        const point1 = pointFromLongitude(p1.longitude, size, radius)
        const point2 = pointFromLongitude(p2.longitude, size, radius)
        const style = aspectStyle(asp.type)

        // heavy chart 시 minor 더 흐리게
        const opacity =
          style.opacity !== undefined
            ? heavyChart
              ? style.opacity * 0.6
              : style.opacity
            : heavyChart && !style.isMajor
              ? 0.4
              : 1

        const lineProps: React.SVGProps<SVGLineElement> = {
          x1: point1.x,
          y1: point1.y,
          x2: point2.x,
          y2: point2.y,
          stroke: style.stroke,
          strokeWidth: style.strokeWidth,
          strokeLinecap: 'round',
          opacity,
        }
        if (style.strokeDasharray) {
          lineProps.strokeDasharray = style.strokeDasharray
        }
        if (showTooltips) {
          lineProps.style = { pointerEvents: 'stroke' }
        }

        if (showTooltips) {
          const meaning = getAspectMeaning(asp.type, lang)
          const orbStr =
            typeof asp.orb === 'number' ? ` · orb ${asp.orb.toFixed(1)}°` : ''
          const title = meaning
            ? `${meaning.label} (${meaning.angle}°) · ${asp.p1} ↔ ${asp.p2}${orbStr}\n${meaning.meaning}`
            : `${asp.p1} ${asp.type} ${asp.p2}${orbStr}`
          return (
            <line key={`${asp.p1}-${asp.p2}-${asp.type}-${i}`} {...lineProps}>
              <title>{title}</title>
            </line>
          )
        }

        return (
          <line key={`${asp.p1}-${asp.p2}-${asp.type}-${i}`} {...lineProps} />
        )
      })}
    </svg>
  )
}

export default AspectLines
