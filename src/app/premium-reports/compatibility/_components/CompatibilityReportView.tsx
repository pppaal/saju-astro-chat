'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Compass,
  Flame,
  Heart,
  MessageCircleHeart,
  Quote,
  Shield,
  Sparkles,
  Star,
  Target,
  XCircle,
  CheckCircle2,
} from 'lucide-react'
import type {
  CompatibilityNarrative,
  CompatibilityNarrativeIcon,
} from '@/lib/destiny-matrix/compatibility/narrativeTypes'
import type { ThreeLayerCompatibility } from '@/lib/destiny-matrix/compatibility'

type Result = ThreeLayerCompatibility & {
  narrative?: CompatibilityNarrative | null
  narrativeMeta?: {
    error?: string
    warnings?: string[]
  }
}

interface CompatibilityReportViewProps {
  result: Result
  labelA: string
  labelB: string
  onReset: () => void
}

const ICON_MAP: Record<CompatibilityNarrativeIcon, typeof Sparkles> = {
  sparkles: Sparkles,
  flame: Flame,
  message: MessageCircleHeart,
  heart: Heart,
  compass: Compass,
  star: Star,
  shield: Shield,
  target: Target,
}

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

export default function CompatibilityReportView({
  result,
  labelA,
  labelB,
  onReset,
}: CompatibilityReportViewProps) {
  const { narrative, integrated, layer1_saju, layer2_synastry, layer3_composite } = result

  const layerCards = useMemo(
    () => [
      { key: 'saju', title: '사주 정합도', subtitle: '천간·지지·오행 관계', layer: layer1_saju, accent: 'text-rose-400' },
      { key: 'synastry', title: '점성 시너스트리', subtitle: '두 사람 행성 간 관계 (간이)', layer: layer2_synastry, accent: 'text-pink-400' },
      { key: 'composite', title: '합쳐진 에너지', subtitle: '둘이 만들어내는 공동 에너지', layer: layer3_composite, accent: 'text-indigo-400' },
    ],
    [layer1_saju, layer2_synastry, layer3_composite]
  )

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 pb-24">
      <div className="w-full border-b border-zinc-800 bg-black px-6 py-3 flex items-center justify-between text-xs font-mono text-zinc-500">
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-zinc-700 hover:border-zinc-500 transition-colors text-zinc-300"
        >
          <ArrowLeft className="w-4 h-4" />
          다시 분석하기
        </button>
        <span className="hidden sm:inline">Premium · Compatibility</span>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-zinc-800 bg-zinc-950">
        <div className="absolute inset-0 bg-gradient-to-b from-rose-950/40 via-zinc-900/30 to-zinc-950" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl -translate-y-1/2" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl -translate-y-1/2" />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="max-w-5xl mx-auto px-6 pt-16 pb-16 relative z-10 text-center space-y-7"
        >
          <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full border bg-zinc-900/80 border-rose-500/40 backdrop-blur-md">
            <Heart className="w-4 h-4 text-rose-400" />
            <span className="text-sm font-bold tracking-widest uppercase text-rose-200">
              {labelA} × {labelB}
            </span>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            <h1
              className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-rose-200 to-pink-500 leading-tight"
              style={{ wordBreak: 'keep-all' }}
            >
              {narrative?.theme || `종합 ${integrated.score}점 — ${integrated.level}`}
            </h1>
            {narrative?.subTheme && (
              <p
                className="text-lg md:text-xl font-medium text-rose-300/80 leading-relaxed"
                style={{ wordBreak: 'keep-all' }}
              >
                {narrative.subTheme}
              </p>
            )}
          </div>

          <div className="inline-flex items-stretch gap-px rounded-2xl overflow-hidden border border-zinc-700">
            <ScorePill label="사주" score={layer1_saju.score} />
            <ScorePill label="점성" score={layer2_synastry.score} />
            <ScorePill label="컴포지트" score={layer3_composite.score} />
            <ScorePill label="종합" score={integrated.score} highlight />
          </div>

          {(narrative?.summary || integrated.narration) && (
            <div className="max-w-4xl mx-auto mt-8 relative p-7 md:p-10 rounded-3xl border bg-zinc-900/40 border-zinc-700/50 backdrop-blur-xl shadow-2xl text-left">
              <Quote className="absolute top-5 left-5 w-9 h-9 rotate-180 text-rose-500/20" />
              <div className="space-y-5 relative z-10 px-2 md:px-6">
                {narrative?.summary && narrative.summary.length > 0 ? (
                  narrative.summary.map((paragraph, idx) => (
                    <p
                      key={idx}
                      className="text-base md:text-lg leading-loose break-keep text-zinc-300 font-light"
                    >
                      {paragraph}
                    </p>
                  ))
                ) : (
                  <p className="text-base md:text-lg leading-loose text-zinc-300">
                    {integrated.narration}
                  </p>
                )}
              </div>
              <Quote className="absolute bottom-5 right-5 w-9 h-9 text-rose-500/20" />
            </div>
          )}
        </motion.div>
      </section>

      <div className="max-w-5xl mx-auto px-6 mt-14 space-y-16">
        {/* 3 Layer cards */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={fadeInUp}
        >
          <h2 className="text-xl font-extrabold mb-6 text-white">3-Layer 분석</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {layerCards.map((card) => (
              <article
                key={card.key}
                className="rounded-3xl border bg-zinc-900/60 border-zinc-800 shadow-2xl p-6 backdrop-blur-xl space-y-4"
              >
                <div className="flex items-baseline justify-between">
                  <h3 className={`text-base font-extrabold ${card.accent}`}>{card.title}</h3>
                  <span className="text-xl font-black text-white">{card.layer.score}</span>
                </div>
                <p className="text-xs text-zinc-500">{card.subtitle}</p>
                <div className="space-y-2">
                  {card.layer.signals.slice(0, 5).map((signal, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 text-xs text-zinc-300 leading-relaxed"
                    >
                      <span
                        className={`mt-1 inline-flex h-1.5 w-1.5 shrink-0 rounded-full ${
                          signal.delta >= 0 ? 'bg-rose-400' : 'bg-zinc-500'
                        }`}
                      />
                      <span style={{ wordBreak: 'keep-all' }}>{signal.text}</span>
                    </div>
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-zinc-400 break-keep border-t border-zinc-800 pt-3">
                  {card.layer.narration}
                </p>
              </article>
            ))}
          </div>
        </motion.section>

        {narrative && (
          <>
            {/* Insights */}
            <motion.section
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              variants={fadeInUp}
              className="space-y-7"
            >
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-xl border bg-rose-500/10 border-rose-500/20">
                  <Compass className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-white">
                    영역별 심층 해석
                  </h2>
                  <span className="font-medium text-xs tracking-wide uppercase text-zinc-400">
                    Deep Dive Insights
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                {narrative.insights.map((insight, idx) => {
                  const Icon = ICON_MAP[insight.iconKey] ?? Compass
                  const accent =
                    idx % 4 === 0
                      ? 'text-rose-400'
                      : idx % 4 === 1
                        ? 'text-pink-400'
                        : idx % 4 === 2
                          ? 'text-indigo-400'
                          : 'text-amber-400'
                  return (
                    <article
                      key={insight.id}
                      className="rounded-3xl p-7 relative overflow-hidden bg-zinc-900/60 border border-zinc-800 shadow-2xl"
                    >
                      <div className="flex items-center space-x-4 mb-5 border-b pb-4 border-zinc-700/50">
                        <div
                          className={`p-3 rounded-xl border bg-black/50 border-zinc-700/50 ${accent}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg md:text-xl font-extrabold tracking-tight text-white">
                          {insight.title}
                        </h3>
                      </div>

                      {insight.content.length > 0 ? (
                        <div className="space-y-4 mb-6">
                          {insight.content.map((paragraph, pIdx) => (
                            <p
                              key={pIdx}
                              className="leading-relaxed text-base break-keep text-zinc-300 font-light"
                            >
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="mb-6 text-sm italic text-zinc-500">
                          해당 영역의 본문은 다음 분석에서 더 풍성하게 채워집니다.
                        </p>
                      )}

                      {insight.advice && (
                        <div className="rounded-2xl p-5 flex items-start space-x-4 border bg-black/60 border-rose-500/30">
                          <Shield className="w-5 h-5 flex-shrink-0 mt-1 text-rose-400" />
                          <div>
                            <h4 className="font-bold text-xs tracking-widest uppercase mb-2 text-rose-300">
                              Action Insight
                            </h4>
                            <p className="text-sm md:text-base font-medium leading-relaxed break-keep text-rose-100">
                              {insight.advice}
                            </p>
                          </div>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            </motion.section>

            {/* Key moments timeline */}
            {narrative.keyMoments.length > 0 && (
              <motion.section
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                variants={fadeInUp}
              >
                <h2 className="text-xl font-extrabold mb-6 text-white">관계의 결정적 시점</h2>
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-rose-500/80 before:to-transparent">
                  {narrative.keyMoments.map((moment, i) => (
                    <div key={i} className="relative flex items-start">
                      <div className="flex items-center justify-center w-5 h-5 mt-1 rounded-full border-4 shrink-0 z-10 border-zinc-900 bg-rose-500" />
                      <div className="flex-1 ml-4 p-5 rounded-2xl border shadow-sm bg-zinc-800/40 border-zinc-700/50">
                        <span className="inline-block px-2 py-1 text-xs font-bold tracking-widest rounded border mb-2 bg-rose-500/20 text-rose-300 border-rose-500/30">
                          {moment.phase}
                        </span>
                        <h4 className="text-base font-bold text-white mb-1">{moment.headline}</h4>
                        <p className="text-sm leading-relaxed break-keep text-zinc-400 font-light">
                          {moment.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Dos & Donts */}
            <motion.section
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              variants={fadeInUp}
              className="grid grid-cols-1 md:grid-cols-2 gap-5"
            >
              <div className="rounded-3xl p-6 bg-zinc-900/60 border border-zinc-800 shadow-2xl">
                <h4 className="text-xs font-bold mb-4 flex items-center w-fit px-3 py-1.5 rounded-lg border uppercase tracking-wider text-pink-400 bg-pink-400/10 border-pink-400/20">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Do This
                </h4>
                <ul className="space-y-2.5">
                  {narrative.dosAndDonts.dos.map((item, i) => (
                    <li
                      key={i}
                      className="text-sm flex items-start leading-relaxed text-zinc-300 font-light"
                    >
                      <span className="text-pink-400 mr-2 mt-0.5 text-lg leading-none">•</span>
                      <span style={{ wordBreak: 'keep-all' }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-3xl p-6 bg-zinc-900/60 border border-zinc-800 shadow-2xl">
                <h4 className="text-xs font-bold mb-4 flex items-center w-fit px-3 py-1.5 rounded-lg border uppercase tracking-wider text-zinc-400 bg-zinc-800 border-zinc-700">
                  <XCircle className="w-4 h-4 mr-2" /> Avoid This
                </h4>
                <ul className="space-y-2.5">
                  {narrative.dosAndDonts.donts.map((item, i) => (
                    <li
                      key={i}
                      className="text-sm flex items-start leading-relaxed text-zinc-300 font-light"
                    >
                      <span className="text-slate-500 mr-2 mt-0.5 text-lg leading-none">•</span>
                      <span style={{ wordBreak: 'keep-all' }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.section>
          </>
        )}

        {result.narrativeMeta?.error && (
          <p className="text-xs text-zinc-500 italic text-center">
            매거진 톤 윤문 생성에 일시적 문제가 있어 엔진 결과만 표시했습니다.
          </p>
        )}
      </div>
    </div>
  )
}

interface ScorePillProps {
  label: string
  score: number
  highlight?: boolean
}

function ScorePill({ label, score, highlight }: ScorePillProps) {
  return (
    <div
      className={`px-4 py-3 ${
        highlight
          ? 'bg-rose-500/15 text-rose-100'
          : 'bg-zinc-900/80 text-zinc-200'
      }`}
    >
      <div className="text-[10px] font-mono uppercase tracking-widest opacity-60">
        {label}
      </div>
      <div className={`text-xl font-black ${highlight ? 'text-rose-300' : ''}`}>{score}</div>
    </div>
  )
}
