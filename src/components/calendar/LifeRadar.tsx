'use client'

/**
 * LifeRadar — "타고난 능력치" 오각형 레이더. 순수 SVG(의존성 0 — recharts 안 씀,
 * 앱의 곡선 SVG 와 같은 결). 값은 buildSibsinRadar 가 사주 십성 분포에서 정직하게
 * 뽑은 것(가짜 점수 아님). axes 가 null 이면(근거 없음) 아무것도 안 그린다 —
 * 호출부에서 가드.
 */

import type { RadarAxis } from '@/lib/report/sibsinRadar'

const SIZE = 240
const CX = SIZE / 2
const CY = SIZE / 2
const R = 84 // 최대 반지름(값 100)

// 앱 /destiny 따뜻한 팔레트(골드/앰버).
const STROKE = '#c8863a'
const FILL = 'rgba(200,134,58,0.16)'
const GRID = 'rgba(120,100,70,0.18)'
const AXIS = 'rgba(120,100,70,0.28)'
const DOT = '#b06a2a'
const LABEL = '#6b5a44'
const VALUE = '#a9683b'

/** i번째 축(위=재물, 시계방향)의 단위 벡터. */
function angleFor(i: number, n: number): { dx: number; dy: number } {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
  return { dx: Math.cos(a), dy: Math.sin(a) }
}

function point(i: number, n: number, ratio: number): [number, number] {
  const { dx, dy } = angleFor(i, n)
  return [CX + dx * R * ratio, CY + dy * R * ratio]
}

export function LifeRadar({ axes, ko }: { axes: RadarAxis[]; ko: boolean }) {
  const n = axes.length
  // 그리드 링(25/50/75/100%).
  const rings = [0.25, 0.5, 0.75, 1].map((ratio) =>
    axes
      .map((_, i) => {
        const [x, y] = point(i, n, ratio)
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  )
  // 값 폴리곤.
  const valuePts = axes
    .map((ax, i) => {
      const [x, y] = point(i, n, Math.max(0, Math.min(100, ax.value)) / 100)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width="100%"
      style={{ maxWidth: SIZE, display: 'block', margin: '0 auto' }}
      role="img"
      aria-label={ko ? '타고난 능력치 레이더' : 'Natural strengths radar'}
    >
      {/* 그리드 링 */}
      {rings.map((pts, i) => (
        <polygon
          key={`ring-${i}`}
          points={pts}
          fill="none"
          stroke={GRID}
          strokeWidth={i === rings.length - 1 ? 1.4 : 1}
        />
      ))}
      {/* 축선 */}
      {axes.map((_, i) => {
        const [x, y] = point(i, n, 1)
        return (
          <line key={`axis-${i}`} x1={CX} y1={CY} x2={x} y2={y} stroke={AXIS} strokeWidth={1} />
        )
      })}
      {/* 값 영역 */}
      <polygon
        points={valuePts}
        fill={FILL}
        stroke={STROKE}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {/* 값 꼭짓점 */}
      {axes.map((ax, i) => {
        const [x, y] = point(i, n, Math.max(0, Math.min(100, ax.value)) / 100)
        return (
          <circle
            key={`dot-${i}`}
            cx={x}
            cy={y}
            r={3.2}
            fill={DOT}
            stroke="#fff"
            strokeWidth={1.4}
          />
        )
      })}
      {/* 축 라벨 + 개수 */}
      {axes.map((ax, i) => {
        const [lx, ly] = point(i, n, 1.22)
        const anchor = lx < CX - 4 ? 'end' : lx > CX + 4 ? 'start' : 'middle'
        return (
          <g key={`label-${i}`}>
            <text
              x={lx}
              y={ly}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={11.5}
              fontWeight={700}
              fill={LABEL}
            >
              {ko ? ax.labelKo : ax.labelEn}
            </text>
            <text
              x={lx}
              y={ly + 13}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={10}
              fontWeight={600}
              fill={VALUE}
            >
              {ax.count}
              {ko ? '개' : ''}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default LifeRadar
