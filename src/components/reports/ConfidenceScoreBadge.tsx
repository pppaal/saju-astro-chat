'use client'

/**
 * Confidence Score Badge — 사주·점성 합의 강도 시각화 (Tier 2D).
 * 0-100% gauge + band color (high/medium/low/conflict).
 */

interface ConfidenceScoreBadgeProps {
  scorePercent: number // 0-100
  band: 'high' | 'medium' | 'low' | 'conflict'
  description?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const BAND_STYLES = {
  high: {
    color: '#22c55e',
    bgFrom: 'rgba(34,197,94,0.18)',
    bgTo: 'rgba(34,197,94,0.04)',
    border: 'rgba(34,197,94,0.45)',
    label: '강한 합의',
    en: 'Strong agreement',
  },
  medium: {
    color: '#eab308',
    bgFrom: 'rgba(234,179,8,0.18)',
    bgTo: 'rgba(234,179,8,0.04)',
    border: 'rgba(234,179,8,0.45)',
    label: '중간 합의',
    en: 'Moderate agreement',
  },
  low: {
    color: '#94a3b8',
    bgFrom: 'rgba(148,163,184,0.16)',
    bgTo: 'rgba(148,163,184,0.04)',
    border: 'rgba(148,163,184,0.4)',
    label: '약한 신호',
    en: 'Weak signal',
  },
  conflict: {
    color: '#ef4444',
    bgFrom: 'rgba(239,68,68,0.18)',
    bgTo: 'rgba(239,68,68,0.04)',
    border: 'rgba(239,68,68,0.45)',
    label: '방향 충돌',
    en: 'Direction conflict',
  },
} as const

const SIZES = {
  sm: { circle: 64, stroke: 6, font: 18, labelFont: 10 },
  md: { circle: 96, stroke: 8, font: 26, labelFont: 11 },
  lg: { circle: 130, stroke: 10, font: 36, labelFont: 12 },
}

export default function ConfidenceScoreBadge({
  scorePercent,
  band,
  description,
  size = 'md',
  className = '',
}: ConfidenceScoreBadgeProps) {
  const style = BAND_STYLES[band]
  const dim = SIZES[size]
  const score = Math.min(100, Math.max(0, scorePercent))
  const radius = dim.circle / 2 - dim.stroke
  const circumference = 2 * Math.PI * radius
  const dash = (score / 100) * circumference

  return (
    <div
      className={`inline-flex items-center gap-3 rounded-2xl border px-4 py-3 backdrop-blur-md ${className}`}
      style={{
        borderColor: style.border,
        background: `linear-gradient(135deg, ${style.bgFrom}, ${style.bgTo})`,
      }}
    >
      <svg
        width={dim.circle}
        height={dim.circle}
        viewBox={`0 0 ${dim.circle} ${dim.circle}`}
        className="flex-shrink-0"
      >
        {/* 배경 트랙 */}
        <circle
          cx={dim.circle / 2}
          cy={dim.circle / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={dim.stroke}
        />
        {/* 진행 트랙 */}
        <circle
          cx={dim.circle / 2}
          cy={dim.circle / 2}
          r={radius}
          fill="none"
          stroke={style.color}
          strokeWidth={dim.stroke}
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${dim.circle / 2} ${dim.circle / 2})`}
          style={{
            filter: `drop-shadow(0 0 8px ${style.color}66)`,
            transition: 'stroke-dasharray 0.8s ease',
          }}
        />
        {/* 중앙 텍스트 */}
        <text
          x={dim.circle / 2}
          y={dim.circle / 2 + dim.font * 0.35}
          textAnchor="middle"
          fill="#fff"
          style={{ fontSize: dim.font, fontWeight: 700, letterSpacing: -0.5 }}
        >
          {score}
          <tspan style={{ fontSize: dim.font * 0.5, fontWeight: 500, fill: style.color }}>%</tspan>
        </text>
      </svg>
      <div className="min-w-0 flex-1">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: style.color }}
        >
          사주·점성 합의 강도
        </p>
        <p className="mt-1 text-[14px] font-semibold text-white">{style.label}</p>
        {description && (
          <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-snug text-slate-300/85">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}
