'use client'

import type { ExtendedAnalysis } from '@/lib/saju/extendedAnalysis'

const DOMAIN_ICON: Record<string, string> = {
  marriage: '💍',
  job_change: '🔄',
  business: '🚀',
  move: '✈️',
  health_warning: '🩺',
  wealth_peak: '💰',
  crisis: '⚠️',
  parents: '👪',
  spouse: '💞',
  children: '👶',
  siblings: '🤝',
  benefactors: '🌟',
}

interface ExtendedAnalysisSectionProps {
  analysis: ExtendedAnalysis
  className?: string
}

/**
 * Renders the deterministic add-on bundle: life stages, decisive
 * timings, relationships, practical info, and karmic insight. Sits
 * inside the result page alongside the streamed AI sections — every
 * sub-section is rendered from pre-computed data, no LLM calls.
 */
export default function ExtendedAnalysisSection({
  analysis,
  className = '',
}: ExtendedAnalysisSectionProps) {
  return (
    <section className={`mx-auto mt-8 max-w-4xl space-y-8 px-4 ${className}`.trim()}>
      {/* A. Life stages */}
      <Block title="🌱 인생 시기별 흐름" subtitle="원국과 대운이 시기별로 만드는 결">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {analysis.lifeStages.map((stage) => (
            <div
              key={stage.label}
              className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 backdrop-blur-md"
            >
              <div className="text-[10px] font-mono uppercase tracking-widest text-fuchsia-400 mb-1">
                {stage.governedBy}
              </div>
              <div className="text-lg font-bold text-white mb-0.5">{stage.label}</div>
              <div className="text-xs text-slate-400 mb-3 font-mono">{stage.ageRange}</div>
              <p className="text-[13px] text-slate-300 leading-relaxed mb-3">
                {stage.description}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {stage.keywords.map((k) => (
                  <span
                    key={k}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-500/15 text-fuchsia-200 border border-fuchsia-400/20"
                  >
                    #{k}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Block>

      {/* B. Decisive timings */}
      <Block title="⏳ 결정적 시기" subtitle="대운 흐름으로 본 인생의 변곡점">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {analysis.decisiveTimings.map((timing) => (
            <div
              key={timing.domain}
              className="rounded-xl border border-white/10 bg-slate-900/40 p-4 backdrop-blur-md flex items-start gap-3"
            >
              <div className="text-2xl flex-shrink-0 mt-0.5">{DOMAIN_ICON[timing.domain] || '·'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2 mb-1.5">
                  <h4 className="text-sm font-semibold text-white">{timing.label}</h4>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {timing.ageWindows.map((w) => (
                      <span
                        key={w}
                        className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-200 border border-cyan-400/20 whitespace-nowrap"
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-[12px] text-slate-400 leading-snug">{timing.reasoning}</p>
              </div>
            </div>
          ))}
        </div>
      </Block>

      {/* C. Relationships */}
      <Block title="👥 관계 운" subtitle="궁위론으로 본 가족·배우자·인덕">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {analysis.relationships.map((rel) => (
            <div
              key={rel.domain}
              className="rounded-xl border border-white/10 bg-slate-900/40 p-4 backdrop-blur-md"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{DOMAIN_ICON[rel.domain] || '·'}</span>
                <h4 className="text-sm font-semibold text-white">{rel.label}</h4>
              </div>
              <p className="text-[12.5px] text-slate-300 leading-relaxed mb-3">{rel.summary}</p>
              <div className="space-y-1.5">
                {rel.strengths.map((s) => (
                  <div key={s} className="flex items-start gap-1.5 text-[11.5px] text-emerald-300">
                    <span>+</span>
                    <span>{s}</span>
                  </div>
                ))}
                {rel.cautions.map((c) => (
                  <div key={c} className="flex items-start gap-1.5 text-[11.5px] text-amber-300">
                    <span>−</span>
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Block>

      {/* D. Practical info */}
      <Block title="🧭 실용 정보" subtitle="용신 + 격국 매핑">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <PracticalCard
            label="추천 직업"
            items={analysis.practical.recommendedCareers}
            tone="violet"
          />
          <PracticalCard
            label="길한 방위"
            items={analysis.practical.luckyDirections}
            tone="emerald"
          />
          <PracticalCard
            label="길색"
            items={analysis.practical.luckyColors}
            tone="amber"
          />
          <PracticalCard
            label="길수"
            items={analysis.practical.luckyNumbers.map(String)}
            tone="cyan"
          />
          <div className="col-span-2 md:col-span-2 rounded-xl border border-fuchsia-400/20 bg-fuchsia-500/5 p-4 backdrop-blur-md">
            <div className="text-[10px] font-mono uppercase tracking-widest text-fuchsia-300 mb-2">
              운명 키워드
            </div>
            <div className="flex flex-wrap gap-1.5">
              {analysis.practical.destinyKeywords.map((k) => (
                <span
                  key={k}
                  className="text-xs px-2.5 py-1 rounded-full bg-fuchsia-500/15 text-fuchsia-100 border border-fuchsia-400/30 font-medium"
                >
                  #{k}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Block>

      {/* E. Karmic */}
      <Block title="🕊 카르마와 사명" subtitle="원국과 대운으로 본 영적 결">
        <div className="rounded-2xl border border-purple-400/20 bg-gradient-to-br from-purple-500/10 via-slate-900/40 to-fuchsia-500/10 p-6 backdrop-blur-md space-y-5">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-purple-300 mb-1">
              전생 인연 / 원형
            </div>
            <p className="text-base text-white font-medium">{analysis.karmic.pastLifeArchetype}</p>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-purple-300 mb-1">
              이번 생의 사명
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">{analysis.karmic.lifeMission}</p>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-purple-300 mb-2">
              숙명 vs 운명
            </div>
            <div className="flex h-3 rounded-full overflow-hidden bg-white/5 mb-2">
              <div
                className="bg-gradient-to-r from-rose-400 to-fuchsia-500"
                style={{ width: `${analysis.karmic.fateVsDestiny.fixedRatio * 100}%` }}
              />
              <div
                className="bg-gradient-to-r from-cyan-400 to-emerald-400"
                style={{ width: `${analysis.karmic.fateVsDestiny.flexibleRatio * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-2">
              <span>숙명 {Math.round(analysis.karmic.fateVsDestiny.fixedRatio * 100)}%</span>
              <span>운명 {Math.round(analysis.karmic.fateVsDestiny.flexibleRatio * 100)}%</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {analysis.karmic.fateVsDestiny.interpretation}
            </p>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-purple-300 mb-1">
              카르마 유형
            </div>
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-xl font-bold text-white">{analysis.karmic.karmaType}</span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {analysis.karmic.karmaDescription}
            </p>
          </div>
        </div>
      </Block>
    </section>
  )
}

function Block({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-3">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function PracticalCard({
  label,
  items,
  tone,
}: {
  label: string
  items: string[]
  tone: 'violet' | 'emerald' | 'amber' | 'cyan'
}) {
  const toneClasses: Record<typeof tone, string> = {
    violet: 'border-violet-400/20 bg-violet-500/5 text-violet-100',
    emerald: 'border-emerald-400/20 bg-emerald-500/5 text-emerald-100',
    amber: 'border-amber-400/20 bg-amber-500/5 text-amber-100',
    cyan: 'border-cyan-400/20 bg-cyan-500/5 text-cyan-100',
  }
  const labelTone: Record<typeof tone, string> = {
    violet: 'text-violet-300',
    emerald: 'text-emerald-300',
    amber: 'text-amber-300',
    cyan: 'text-cyan-300',
  }
  return (
    <div className={`rounded-xl border p-4 backdrop-blur-md ${toneClasses[tone]}`}>
      <div className={`text-[10px] font-mono uppercase tracking-widest mb-2 ${labelTone[tone]}`}>
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="text-xs px-2 py-0.5 rounded-md bg-white/5 border border-white/10"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
