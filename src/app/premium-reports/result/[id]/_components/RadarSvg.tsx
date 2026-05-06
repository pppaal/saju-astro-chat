'use client'

import { useMemo } from 'react'
import type { UltimateRadarAxis } from '@/lib/premium-reports/ultimateReport'

interface RadarSvgProps {
  axes: UltimateRadarAxis[]
  size?: number
  color?: string
  fillOpacity?: number
  textColor?: string
  gridColor?: string
}

export default function RadarSvg({
  axes,
  size = 320,
  color = '#fb7185',
  fillOpacity = 0.35,
  textColor = '#e4e4e7',
  gridColor = '#3f3f46',
}: RadarSvgProps) {
  const padding = 56
  const radius = (size - padding * 2) / 2
  const center = size / 2
  const count = Math.max(axes.length, 3)
  const angleStep = (Math.PI * 2) / count

  const gridLevels = [0.25, 0.5, 0.75, 1]

  const points = useMemo(() => {
    return axes.map((axis, i) => {
      const value = Math.max(0, Math.min(axis.fullMark || 100, axis.value)) / (axis.fullMark || 100)
      const angle = -Math.PI / 2 + i * angleStep
      const x = center + Math.cos(angle) * radius * value
      const y = center + Math.sin(angle) * radius * value
      const lx = center + Math.cos(angle) * (radius + 22)
      const ly = center + Math.sin(angle) * (radius + 22)
      return { x, y, lx, ly, axis, angle }
    })
  }, [axes, angleStep, center, radius])

  const polygon = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      height="100%"
      role="img"
      aria-label="레이더 차트"
    >
      {gridLevels.map((level) => {
        const r = radius * level
        const path = Array.from({ length: count })
          .map((_, i) => {
            const angle = -Math.PI / 2 + i * angleStep
            const x = center + Math.cos(angle) * r
            const y = center + Math.sin(angle) * r
            return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
          })
          .join(' ')
        return (
          <path
            key={level}
            d={`${path} Z`}
            fill="none"
            stroke={gridColor}
            strokeOpacity={0.6}
            strokeDasharray="3 3"
          />
        )
      })}
      {points.map((p, i) => (
        <line
          key={`spoke-${i}`}
          x1={center}
          y1={center}
          x2={center + Math.cos(p.angle) * radius}
          y2={center + Math.sin(p.angle) * radius}
          stroke={gridColor}
          strokeOpacity={0.4}
        />
      ))}
      <polygon points={polygon} fill={color} fillOpacity={fillOpacity} stroke={color} strokeWidth={2} />
      {points.map((p, i) => (
        <circle key={`pt-${i}`} cx={p.x} cy={p.y} r={3.5} fill={color} />
      ))}
      {points.map((p, i) => {
        const anchor = anchorFor(p.angle)
        return (
          <text
            key={`lbl-${i}`}
            x={p.lx}
            y={p.ly}
            fill={textColor}
            fontSize={12}
            fontWeight={500}
            textAnchor={anchor}
            dominantBaseline="middle"
          >
            {p.axis.subject}
          </text>
        )
      })}
    </svg>
  )
}

function anchorFor(angle: number): 'start' | 'middle' | 'end' {
  const cos = Math.cos(angle)
  if (cos > 0.3) return 'start'
  if (cos < -0.3) return 'end'
  return 'middle'
}
