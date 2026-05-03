'use client'

/**
 * 5행 분포 도넛 차트 — 사주 5원소 (목·화·토·금·수) 분포 시각화.
 * Pure SVG, no external deps.
 */

interface FiveElementsDonutProps {
  fiveElements: {
    wood?: number
    fire?: number
    earth?: number
    metal?: number
    water?: number
  }
  size?: number
  className?: string
}

const ELEMENTS = [
  { key: 'wood', ko: '목', color: '#22c55e', accent: 'rgba(34,197,94,0.18)' },
  { key: 'fire', ko: '화', color: '#ef4444', accent: 'rgba(239,68,68,0.18)' },
  { key: 'earth', ko: '토', color: '#eab308', accent: 'rgba(234,179,8,0.18)' },
  { key: 'metal', ko: '금', color: '#cbd5e1', accent: 'rgba(203,213,225,0.18)' },
  { key: 'water', ko: '수', color: '#3b82f6', accent: 'rgba(59,130,246,0.18)' },
] as const

export default function FiveElementsDonut({
  fiveElements,
  size = 180,
  className = '',
}: FiveElementsDonutProps) {
  const counts = ELEMENTS.map((e) => Math.max(0, fiveElements[e.key] || 0))
  const total = counts.reduce((a, b) => a + b, 0) || 1

  const radius = size / 2 - 20
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * radius

  let offset = 0
  const segments = ELEMENTS.map((el, i) => {
    const value = counts[i]
    const portion = value / total
    const length = portion * circumference
    const seg = {
      el,
      value,
      portion,
      strokeDasharray: `${length} ${circumference - length}`,
      strokeDashoffset: -offset,
    }
    offset += length
    return seg
  })

  // 가장 강한 / 가장 약한 element 식별
  const sorted = ELEMENTS.map((el, i) => ({ el, value: counts[i] })).sort(
    (a, b) => b.value - a.value
  )
  const dominant = sorted[0]
  const lacking = sorted[sorted.length - 1]

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* 배경 원 */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={14}
          />
          {/* 각 element segment */}
          <g transform={`rotate(-90 ${cx} ${cy})`}>
            {segments.map((s) =>
              s.value > 0 ? (
                <circle
                  key={s.el.key}
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="none"
                  stroke={s.el.color}
                  strokeWidth={14}
                  strokeDasharray={s.strokeDasharray}
                  strokeDashoffset={s.strokeDashoffset}
                  strokeLinecap="butt"
                  style={{
                    filter: `drop-shadow(0 0 6px ${s.el.color}33)`,
                    transition: 'stroke-dasharray 0.6s ease',
                  }}
                />
              ) : null
            )}
          </g>
          {/* 중앙 텍스트 */}
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            className="fill-white"
            style={{ fontSize: 12, fontWeight: 500, letterSpacing: 1 }}
          >
            5행 분포
          </text>
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            style={{ fontSize: 11, fill: 'rgba(255,255,255,0.55)' }}
          >
            총 {total}개
          </text>
        </svg>
      </div>

      {/* 범례 */}
      <div className="flex flex-wrap justify-center gap-2 text-[11px]">
        {ELEMENTS.map((el, i) => (
          <span
            key={el.key}
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1"
            style={{
              borderColor: counts[i] > 0 ? el.color + '60' : 'rgba(255,255,255,0.1)',
              background: counts[i] > 0 ? el.accent : 'rgba(255,255,255,0.03)',
              color: counts[i] > 0 ? '#fff' : 'rgba(255,255,255,0.4)',
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: el.color }}
              aria-hidden
            />
            {el.ko} {counts[i]}
          </span>
        ))}
      </div>

      {/* 한 줄 풀이 */}
      {dominant.value > 0 && lacking.value === 0 && (
        <p className="max-w-md text-center text-[12px] leading-relaxed text-slate-300">
          <span className="text-white">{dominant.el.ko}</span> 기운이 두텁고{' '}
          <span className="text-white">{lacking.el.ko}</span> 기운이 비어 있어
          {' '}{lacking.el.ko === '화'
            ? '표현·발산'
            : lacking.el.ko === '금'
              ? '결단·정리'
              : lacking.el.ko === '수'
                ? '관찰·통찰'
                : lacking.el.ko === '목'
                  ? '시작·추진'
                  : '안정·축적'}{' '}
          영역을 의식적으로 보완하면 균형이 맞춰져요.
        </p>
      )}
      {dominant.value > 0 && lacking.value > 0 && dominant.value > lacking.value + 1 && (
        <p className="max-w-md text-center text-[12px] leading-relaxed text-slate-300">
          <span className="text-white">{dominant.el.ko}</span> 기운이 가장 두텁고{' '}
          <span className="text-white">{lacking.el.ko}</span> 기운이 가장 약한 분포예요.
        </p>
      )}
    </div>
  )
}
