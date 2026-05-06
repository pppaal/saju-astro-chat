'use client'

import type { UltimateNarrative } from '@/lib/premium-reports/ultimateReport'

interface VolatilitySvgProps {
  data: UltimateNarrative['volatility']
  width?: number
  height?: number
  primaryColor?: string
  secondaryColor?: string
  textColor?: string
  gridColor?: string
}

export default function VolatilitySvg({
  data,
  width = 560,
  height = 240,
  primaryColor = '#e11d48',
  secondaryColor = '#6366f1',
  textColor = '#a1a1aa',
  gridColor = '#27272a',
}: VolatilitySvgProps) {
  const padding = { top: 24, right: 16, bottom: 36, left: 36 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const points = data.points
  if (points.length === 0) {
    return null
  }
  const barCount = points.length
  const barWidth = Math.max(8, innerW / (barCount * 1.6))
  const slot = innerW / barCount
  const max = 100

  const gridLines = [0, 25, 50, 75, 100]

  const linePath = points
    .map((p, i) => {
      const x = padding.left + slot * i + slot / 2
      const y = padding.top + innerH - (p.secondary / max) * innerH
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      role="img"
      aria-label="기간별 변동성 차트"
    >
      {gridLines.map((g) => {
        const y = padding.top + innerH - (g / max) * innerH
        return (
          <g key={g}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke={gridColor}
              strokeDasharray="3 3"
            />
            <text
              x={padding.left - 8}
              y={y}
              fill={textColor}
              fontSize={10}
              textAnchor="end"
              dominantBaseline="central"
            >
              {g}
            </text>
          </g>
        )
      })}
      {points.map((p, i) => {
        const x = padding.left + slot * i + (slot - barWidth) / 2
        const barH = (p.primary / max) * innerH
        const y = padding.top + innerH - barH
        return (
          <g key={`bar-${i}`}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              fill={primaryColor}
              fillOpacity={0.75}
              rx={3}
            />
            <text
              x={x + barWidth / 2}
              y={height - 18}
              fill={textColor}
              fontSize={11}
              textAnchor="middle"
            >
              {p.axis}
            </text>
          </g>
        )
      })}
      <path d={linePath} fill="none" stroke={secondaryColor} strokeWidth={2.5} />
      {points.map((p, i) => {
        const x = padding.left + slot * i + slot / 2
        const y = padding.top + innerH - (p.secondary / max) * innerH
        return <circle key={`dot-${i}`} cx={x} cy={y} r={4} fill={secondaryColor} />
      })}
      <g transform={`translate(${padding.left}, 12)`}>
        <rect width={10} height={10} fill={primaryColor} fillOpacity={0.75} rx={2} />
        <text x={16} y={8} fill={textColor} fontSize={11} dominantBaseline="middle">
          {data.primaryLabel}
        </text>
        <circle cx={140} cy={5} r={5} fill={secondaryColor} />
        <text x={150} y={8} fill={textColor} fontSize={11} dominantBaseline="middle">
          {data.secondaryLabel}
        </text>
      </g>
    </svg>
  )
}
