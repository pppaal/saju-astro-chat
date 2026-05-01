'use client'

/**
 * 사주↔점성 Cross Map — 12 주요 cross 신호 시각화.
 * 좌측 사주 신호 / 우측 점성 신호 / 중앙 connector + meaning.
 */

interface CrossSignal {
  axis: string // "성격", "관계", "재물" 등 cross 축
  saju: string // 사주 측 신호
  astro: string // 점성 측 신호
  meaning?: string // 한 줄 의미 (선택)
  strength?: 'strong' | 'medium' | 'weak'
  direction?: 'flow' | 'caution' | 'neutral' // 신호 방향
}

interface SajuAstroCrossMapProps {
  signals: CrossSignal[]
  title?: string
  className?: string
}

const STRENGTH_STYLE = {
  strong: { color: '#22c55e', label: '강' },
  medium: { color: '#eab308', label: '중' },
  weak: { color: '#94a3b8', label: '약' },
}

const DIRECTION_ICON = {
  flow: '→',
  caution: '⚡',
  neutral: '·',
}

export default function SajuAstroCrossMap({
  signals,
  title = '사주 × 점성 Cross 신호',
  className = '',
}: SajuAstroCrossMapProps) {
  if (!signals || signals.length === 0) return null

  return (
    <section
      className={`overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,16,28,0.92),rgba(7,11,19,0.86))] p-5 backdrop-blur-md ${className}`}
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-200/70">
            Cross Map
          </p>
          <h3 className="mt-1 text-[1.05rem] font-semibold text-white">{title}</h3>
        </div>
        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-slate-300">
          {signals.length}개 cross
        </span>
      </header>

      <div className="space-y-2">
        {signals.map((sig, i) => {
          const strength = sig.strength || 'medium'
          const sStyle = STRENGTH_STYLE[strength]
          const dirIcon = DIRECTION_ICON[sig.direction || 'neutral']
          return (
            <div
              key={i}
              className="grid grid-cols-[120px_1fr_36px_1fr] gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition hover:border-cyan-300/20"
            >
              {/* axis label */}
              <div className="flex items-center">
                <span
                  className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    borderColor: sStyle.color + '50',
                    color: sStyle.color,
                    background: sStyle.color + '14',
                  }}
                >
                  {sig.axis}
                </span>
              </div>
              {/* 사주 column */}
              <div className="min-w-0">
                <p className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-amber-300/70">
                  사주
                </p>
                <p className="mt-0.5 truncate text-[13px] text-slate-200">{sig.saju}</p>
              </div>
              {/* connector */}
              <div className="flex flex-col items-center justify-center text-cyan-300/70">
                <span
                  className="text-base leading-none"
                  style={{ color: sStyle.color }}
                  title={sStyle.label}
                >
                  {dirIcon}
                </span>
              </div>
              {/* 점성 column */}
              <div className="min-w-0">
                <p className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-cyan-300/70">
                  점성
                </p>
                <p className="mt-0.5 truncate text-[13px] text-slate-200">{sig.astro}</p>
              </div>
              {/* meaning row (full width below) */}
              {sig.meaning && (
                <p className="col-span-4 mt-1 border-t border-white/[0.05] pt-2 text-[12px] leading-relaxed text-slate-400">
                  {sig.meaning}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <footer className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> 강
          <span className="ml-2 h-1.5 w-1.5 rounded-full bg-amber-400" /> 중
          <span className="ml-2 h-1.5 w-1.5 rounded-full bg-slate-400" /> 약
        </span>
        <span>→ 흐름 / ⚡ 주의 / · 중립</span>
      </footer>
    </section>
  )
}
