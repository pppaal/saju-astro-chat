'use client'

import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Compass,
  Eye,
  EyeOff,
  Fingerprint,
  Flame,
  Heart,
  Hexagon,
  MessageCircleHeart,
  Quote,
  Shield,
  Sparkles,
  Star,
  Target,
  X,
  XCircle,
} from 'lucide-react'

import RadarSvg from './RadarSvg'
import VolatilitySvg from './VolatilitySvg'
import type {
  UltimateCrossMatrixItem,
  UltimateInsight,
  UltimateReport,
} from '@/lib/premium-reports/ultimateReport'

interface UltimateReportViewProps {
  report: UltimateReport
  /**
   * Optional slot rendered inside the collapsible "전문가용 상세 데이터"
   * panel at the bottom. The result page passes the legacy section list
   * here so the existing audit / evidence / quality views are preserved.
   */
  deepDataSlot?: ReactNode
}

const ICON_MAP: Record<UltimateInsight['iconKey'], typeof Sparkles> = {
  sparkles: Sparkles,
  flame: Flame,
  message: MessageCircleHeart,
  heart: Heart,
  compass: Compass,
  star: Star,
  shield: Shield,
  target: Target,
}

const CROSS_ICON_MAP: Record<NonNullable<UltimateCrossMatrixItem['iconKey']>, typeof Sparkles> = {
  sparkles: Sparkles,
  flame: Flame,
  message: MessageCircleHeart,
  heart: Heart,
  compass: Compass,
  star: Star,
  shield: Shield,
  target: Target,
}

const PERIOD_LABEL: Record<UltimateReport['meta']['period'], string> = {
  monthly: 'Premium · Monthly',
  yearly: 'Premium · Yearly',
  comprehensive: 'Premium · Lifetime',
}

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

export default function UltimateReportView({ report, deepDataSlot }: UltimateReportViewProps) {
  const [isClassic, setIsClassic] = useState(false)
  const [selectedCard, setSelectedCard] = useState<UltimateCrossMatrixItem | null>(null)
  const [deepOpen, setDeepOpen] = useState(false)

  const bgMain = isClassic ? 'bg-rose-50 text-slate-900' : 'bg-zinc-950 text-zinc-200'
  const cardBg = isClassic
    ? 'bg-white border-rose-100 shadow-md'
    : 'bg-zinc-900/60 border-zinc-800 shadow-2xl backdrop-blur-xl'
  const textMuted = isClassic ? 'text-slate-500' : 'text-zinc-400'
  const textHeading = isClassic ? 'text-slate-900' : 'text-white'

  const { meta, core, computed, narrative } = report

  return (
    <div
      className={`min-h-screen font-sans selection:bg-rose-500 selection:text-white pb-24 transition-colors duration-300 ${bgMain}`}
    >
      {selectedCard && (
        <CrossMatrixModal
          item={selectedCard}
          isClassic={isClassic}
          textMuted={textMuted}
          onClose={() => setSelectedCard(null)}
        />
      )}

      <div
        className={`w-full border-b py-3 px-6 flex flex-wrap justify-between items-center text-xs font-mono ${
          isClassic ? 'bg-white border-rose-200 text-slate-600' : 'bg-black border-zinc-800 text-zinc-500'
        }`}
      >
        <div className="flex items-center space-x-4 mb-2 sm:mb-0">
          <Fingerprint className="w-4 h-4 text-rose-500" />
          <span>ID: {meta.reportId.slice(0, 16).toUpperCase()}</span>
          <span className="hidden sm:flex items-center ml-4">
            <span className="w-2 h-2 rounded-full mr-2 bg-rose-500" />
            {PERIOD_LABEL[meta.period]}
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setIsClassic((v) => !v)}
            className={`flex items-center px-3 py-1.5 rounded-md border transition-colors ${
              isClassic
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {isClassic ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {isClassic ? '다크 모드' : '가독성 모드'}
          </button>
        </div>
      </div>

      {/* Hero */}
      <section
        className={`relative overflow-hidden border-b ${
          isClassic ? 'border-rose-200 bg-rose-50' : 'border-zinc-800/80 bg-zinc-950'
        }`}
      >
        {!isClassic && (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-rose-950/40 via-zinc-900/30 to-zinc-950" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl -translate-y-1/2" />
            <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl -translate-y-1/2" />
          </>
        )}

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="max-w-7xl mx-auto px-6 pt-16 pb-16 relative z-10"
        >
          <div className="text-center space-y-7">
            <div
              className={`inline-flex items-center space-x-3 px-6 py-2.5 rounded-full border shadow-sm ${
                isClassic
                  ? 'bg-white border-rose-300'
                  : 'bg-zinc-900/80 border-rose-500/40 backdrop-blur-md'
              }`}
            >
              <Heart className={`w-4 h-4 ${isClassic ? 'text-rose-600' : 'text-rose-400'}`} />
              <span
                className={`text-sm font-bold tracking-widest uppercase ${
                  isClassic ? 'text-rose-700' : 'text-rose-200'
                }`}
              >
                {PERIOD_LABEL[meta.period]}
              </span>
            </div>

            <div className="space-y-5 max-w-5xl mx-auto">
              <h1
                className={`text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight ${
                  isClassic
                    ? 'text-slate-900'
                    : 'text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-rose-200 to-pink-500'
                }`}
                style={{ wordBreak: 'keep-all' }}
              >
                {core.theme}
              </h1>
              {core.subTheme && (
                <p
                  className={`text-lg md:text-xl font-medium tracking-wide leading-relaxed ${
                    isClassic ? 'text-rose-700' : 'text-rose-300/80'
                  }`}
                  style={{ wordBreak: 'keep-all' }}
                >
                  {core.subTheme}
                </p>
              )}
            </div>

            {core.summary.length > 0 && (
              <div
                className={`max-w-5xl mx-auto mt-10 relative p-7 md:p-10 rounded-3xl border ${
                  isClassic
                    ? 'bg-white border-rose-200 shadow-lg'
                    : 'bg-zinc-900/40 border-zinc-700/50 backdrop-blur-xl shadow-2xl'
                }`}
              >
                <Quote
                  className={`absolute top-5 left-5 w-9 h-9 rotate-180 ${
                    isClassic ? 'text-rose-100' : 'text-rose-500/20'
                  }`}
                />
                <div className="space-y-5 relative z-10 px-2 md:px-6 text-left">
                  {core.summary.map((paragraph, idx) => (
                    <p
                      key={idx}
                      className={`text-base md:text-lg leading-loose break-keep ${
                        isClassic ? 'text-slate-700 font-normal' : 'text-zinc-300 font-light'
                      }`}
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
                <Quote
                  className={`absolute bottom-5 right-5 w-9 h-9 ${
                    isClassic ? 'text-rose-100' : 'text-rose-500/20'
                  }`}
                />
              </div>
            )}
          </div>
        </motion.div>
      </section>

      <div className="max-w-7xl mx-auto px-6 mt-14 space-y-20">
        {/* Saju + Astro Profile */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={fadeInUp}
        >
          <div className={`p-7 md:p-9 rounded-3xl border ${cardBg}`}>
            <div className="flex flex-col lg:flex-row gap-10 items-stretch justify-between">
              <div className="w-full lg:w-1/2">
                <h3
                  className={`text-lg font-extrabold mb-5 flex items-center ${textHeading}`}
                >
                  <Hexagon className="w-5 h-5 mr-3 text-rose-500" />
                  사주 명식 (Four Pillars)
                </h3>
                <div className="grid grid-cols-4 gap-3 text-center">
                  {computed.sajuPillars.map((pillar) => (
                    <div key={pillar.label} className="flex flex-col space-y-2">
                      <span
                        className={`text-[11px] font-mono uppercase tracking-widest ${textMuted}`}
                      >
                        {pillar.labelKo}
                      </span>
                      <div
                        className={`py-5 rounded-2xl border ${
                          isClassic
                            ? 'bg-rose-50/50 border-rose-100'
                            : 'bg-black/40 border-zinc-700/50'
                        }`}
                      >
                        <span className="block text-2xl md:text-3xl font-black mb-1 text-rose-500">
                          {pillar.stem}
                        </span>
                        <span className="block text-2xl md:text-3xl font-black text-rose-500">
                          {pillar.branch}
                        </span>
                      </div>
                      <span className="text-[10px] md:text-xs font-medium text-rose-500">
                        {pillar.stemElement}/{pillar.branchElement}
                      </span>
                    </div>
                  ))}
                </div>
                <p className={`text-xs mt-5 ${textMuted}`}>
                  일간(日干) {computed.dayMaster.stem} · {computed.dayMaster.element} ·{' '}
                  {computed.dayMaster.yinYang}
                </p>
              </div>

              <div
                className={`hidden lg:block w-px ${
                  isClassic ? 'bg-rose-200' : 'bg-zinc-800'
                }`}
              />

              <div className="w-full lg:w-1/2">
                <h3
                  className={`text-lg font-extrabold mb-5 flex items-center ${textHeading}`}
                >
                  <Star className="w-5 h-5 mr-3 text-pink-500" />
                  점성학 주요 배치 (Astro Profile)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {computed.astroPlacements.slice(0, 6).map((placement) => (
                    <div
                      key={placement.body}
                      className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center space-y-1 ${
                        isClassic
                          ? 'bg-rose-50/50 border-rose-100'
                          : 'bg-black/40 border-zinc-700/50'
                      }`}
                    >
                      <span
                        className={`text-[10px] font-mono uppercase tracking-widest ${textMuted}`}
                      >
                        {placement.bodyKo || placement.body}
                      </span>
                      <span className={`text-sm font-bold ${textHeading}`}>
                        {placement.signKo || placement.sign}
                      </span>
                      {typeof placement.house === 'number' && (
                        <span className={`text-[10px] ${textMuted}`}>
                          {placement.house}H
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Cross Matrix */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={fadeInUp}
        >
          <div
            className={`w-full py-12 px-6 md:px-10 rounded-3xl border ${
              isClassic ? 'bg-white border-rose-200' : 'bg-black/40 border-zinc-800/80'
            }`}
          >
            <div className="text-center mb-10">
              <h3
                className={`text-2xl font-extrabold tracking-tight flex items-center justify-center ${textHeading}`}
              >
                <Target className={`w-6 h-6 mr-3 ${isClassic ? 'text-rose-600' : 'text-rose-400'}`} />
                사주 × 점성 교차 매트릭스
              </h3>
              <p className={`mt-2 font-mono text-sm uppercase tracking-widest ${textMuted}`}>
                Click cards for details
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl mx-auto">
              {narrative.crossMatrix.map((item, idx) => {
                const Icon = CROSS_ICON_MAP[item.iconKey ?? 'compass'] ?? Compass
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedCard(item)}
                    className={`text-left cursor-pointer transition-transform hover:scale-[1.01] border rounded-2xl p-5 flex flex-col relative overflow-hidden ${
                      isClassic
                        ? 'bg-white shadow-md border-rose-200'
                        : 'bg-zinc-900/80 backdrop-blur-md shadow-lg border-rose-500/30'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center space-x-2">
                        <div
                          className={`p-2 rounded-lg ${
                            isClassic ? 'bg-rose-50 text-rose-600' : 'bg-black/50 text-rose-400'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className={`font-bold text-base ${textHeading}`}>{item.module}</span>
                      </div>
                      <span
                        className={`text-xs font-mono px-2 py-1 rounded border ${
                          isClassic
                            ? 'bg-rose-50 border-rose-200 text-rose-600'
                            : 'bg-black/50 border-zinc-800 text-zinc-400'
                        }`}
                      >
                        Score: {item.score}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div
                        className={`rounded-lg p-3 border ${
                          isClassic
                            ? 'bg-rose-50/50 border-rose-100'
                            : 'bg-black/40 border-zinc-800/50'
                        }`}
                      >
                        <span className={`block text-[10px] uppercase mb-1 ${textMuted}`}>
                          Saju Variable
                        </span>
                        <span
                          className={`text-sm font-medium ${
                            isClassic ? 'text-slate-800' : 'text-pink-400/90'
                          }`}
                        >
                          {item.sajuVariable}
                        </span>
                      </div>
                      <div
                        className={`rounded-lg p-3 border ${
                          isClassic
                            ? 'bg-rose-50/50 border-rose-100'
                            : 'bg-black/40 border-zinc-800/50'
                        }`}
                      >
                        <span className={`block text-[10px] uppercase mb-1 ${textMuted}`}>
                          Astro Variable
                        </span>
                        <span
                          className={`text-sm font-medium ${
                            isClassic ? 'text-slate-800' : 'text-rose-400/90'
                          }`}
                        >
                          {item.astroVariable}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`mt-auto rounded-lg p-3 text-center border ${
                        isClassic
                          ? 'bg-rose-50 border-rose-200'
                          : 'bg-rose-500/10 border-rose-500/20'
                      }`}
                    >
                      <span
                        className={`font-bold text-sm tracking-wide ${
                          isClassic ? 'text-rose-700' : 'text-rose-300'
                        }`}
                      >
                        {item.result}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </motion.section>

        {/* Charts */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={fadeInUp}
        >
          <div className="flex flex-col items-center text-center mb-10 space-y-3">
            <div
              className={`p-3 rounded-2xl border ${
                isClassic ? 'bg-rose-50 border-rose-200' : 'bg-rose-500/10 border-rose-500/20'
              }`}
            >
              <Activity className={`w-7 h-7 ${isClassic ? 'text-rose-600' : 'text-rose-400'}`} />
            </div>
            <h2 className={`text-2xl font-extrabold tracking-tight ${textHeading}`}>
              지표 시각화
              <span
                className={`block mt-2 font-medium text-sm uppercase tracking-widest ${textMuted}`}
              >
                Visualized Metrics
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`rounded-3xl p-7 ${cardBg}`}>
              <div className="text-center mb-4">
                <h3 className={`text-lg font-bold ${textHeading}`}>
                  {meta.period === 'comprehensive' ? '인생 흐름 변동' : '기간별 변동성'}
                </h3>
                <p className={`text-xs mt-1 ${textMuted}`}>
                  {narrative.volatility.primaryLabel} · {narrative.volatility.secondaryLabel}
                </p>
              </div>
              <div className="w-full" style={{ aspectRatio: '5 / 3' }}>
                <VolatilitySvg
                  data={narrative.volatility}
                  primaryColor={isClassic ? '#f43f5e' : '#e11d48'}
                  secondaryColor="#6366f1"
                  textColor={isClassic ? '#475569' : '#a1a1aa'}
                  gridColor={isClassic ? '#fecdd3' : '#27272a'}
                />
              </div>
            </div>

            <div className={`rounded-3xl p-7 ${cardBg}`}>
              <div className="text-center mb-4">
                <h3 className={`text-lg font-bold ${textHeading}`}>5축 밸런스 분석</h3>
                <p className={`text-xs mt-1 ${textMuted}`}>핵심 영역 지수화</p>
              </div>
              <div className="w-full flex justify-center" style={{ aspectRatio: '1 / 1' }}>
                <RadarSvg
                  axes={core.radar}
                  textColor={isClassic ? '#475569' : '#e4e4e7'}
                  gridColor={isClassic ? '#fecdd3' : '#3f3f46'}
                />
              </div>
            </div>
          </div>
        </motion.section>

        {/* Insights + Sidebar */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={fadeInUp}
          className={`grid grid-cols-1 xl:grid-cols-12 gap-10 pt-10 border-t ${
            isClassic ? 'border-rose-200' : 'border-zinc-800/60'
          }`}
        >
          <section className="xl:col-span-8 space-y-7">
            <div className="flex items-center space-x-4 mb-4">
              <div
                className={`p-3 rounded-xl border ${
                  isClassic ? 'bg-rose-50 border-rose-200' : 'bg-rose-500/10 border-rose-500/20'
                }`}
              >
                <Compass
                  className={`w-6 h-6 ${isClassic ? 'text-rose-600' : 'text-rose-400'}`}
                />
              </div>
              <div>
                <h2 className={`text-xl font-extrabold tracking-tight ${textHeading}`}>
                  영역별 심층 해석
                </h2>
                <span
                  className={`font-medium text-xs tracking-wide uppercase ${textMuted}`}
                >
                  Deep Dive Insights
                </span>
              </div>
            </div>

            <div className="space-y-7">
              {core.insights.map((insight, idx) => {
                const Icon = ICON_MAP[insight.iconKey] ?? Compass
                const accent =
                  idx % 4 === 0
                    ? 'text-rose-500'
                    : idx % 4 === 1
                      ? 'text-pink-500'
                      : idx % 4 === 2
                        ? 'text-indigo-500'
                        : 'text-amber-500'
                return (
                  <article
                    key={insight.id}
                    className={`rounded-3xl p-7 relative overflow-hidden ${cardBg}`}
                  >
                    <div
                      className={`flex items-center space-x-4 mb-5 border-b pb-4 ${
                        isClassic ? 'border-rose-200' : 'border-zinc-700/50'
                      }`}
                    >
                      <div
                        className={`p-3 rounded-xl border ${
                          isClassic
                            ? 'bg-rose-50/50 border-rose-200'
                            : 'bg-black/50 border-zinc-700/50'
                        } ${accent}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3
                        className={`text-lg md:text-xl font-extrabold tracking-tight ${textHeading}`}
                      >
                        {insight.title}
                      </h3>
                    </div>

                    {insight.content.length > 0 ? (
                      <div className="space-y-4 mb-7">
                        {insight.content.map((paragraph, pIdx) => (
                          <p
                            key={pIdx}
                            className={`leading-relaxed text-base break-keep ${
                              isClassic ? 'text-slate-700' : 'text-zinc-300 font-light'
                            }`}
                          >
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className={`mb-7 text-sm italic ${textMuted}`}>
                        해당 영역의 본문은 다음 빌드에서 더 풍성하게 채워집니다.
                      </p>
                    )}

                    {insight.highlight && (
                      <div
                        className={`rounded-2xl p-5 flex items-start space-x-4 border ${
                          isClassic
                            ? 'bg-rose-50 border-rose-200'
                            : 'bg-black/60 border-rose-500/30'
                        }`}
                      >
                        <Shield
                          className={`w-5 h-5 flex-shrink-0 mt-1 ${
                            isClassic ? 'text-rose-600' : 'text-rose-400'
                          }`}
                        />
                        <div>
                          <h4
                            className={`font-bold text-xs tracking-widest uppercase mb-2 ${
                              isClassic ? 'text-rose-800' : 'text-rose-300'
                            }`}
                          >
                            Action Insight
                          </h4>
                          <p
                            className={`text-sm md:text-base font-medium leading-relaxed break-keep ${
                              isClassic ? 'text-rose-900' : 'text-rose-100'
                            }`}
                          >
                            {insight.highlight}
                          </p>
                        </div>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </section>

          <aside className="xl:col-span-4 space-y-7">
            <div className={`rounded-3xl p-6 sticky top-6 ${cardBg}`}>
              <div
                className={`flex items-center space-x-3 border-b pb-4 mb-5 ${
                  isClassic ? 'border-rose-200' : 'border-zinc-700/60'
                }`}
              >
                <div className={`p-2 rounded-lg ${isClassic ? 'bg-rose-50' : 'bg-zinc-800'}`}>
                  <AlertCircle
                    className={`w-5 h-5 ${isClassic ? 'text-rose-600' : 'text-rose-400'}`}
                  />
                </div>
                <h3 className={`text-base font-extrabold ${textHeading}`}>행동 처방전</h3>
              </div>

              <div className="space-y-7">
                <div>
                  <h4
                    className={`text-xs font-bold mb-3 flex items-center w-fit px-3 py-1.5 rounded-lg border uppercase tracking-wider ${
                      isClassic
                        ? 'text-pink-700 bg-pink-50 border-pink-200'
                        : 'text-pink-400 bg-pink-400/10 border-pink-400/20'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Do This
                  </h4>
                  {core.dosAndDonts.dos.length > 0 ? (
                    <ul className="space-y-2.5">
                      {core.dosAndDonts.dos.map((item, i) => (
                        <li
                          key={i}
                          className={`text-sm flex items-start leading-relaxed ${
                            isClassic ? 'text-slate-700' : 'text-zinc-300 font-light'
                          }`}
                        >
                          <span className="text-pink-500 mr-2 mt-0.5 text-lg leading-none">•</span>
                          <span style={{ wordBreak: 'keep-all' }}>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={`text-xs italic ${textMuted}`}>다음 빌드에서 채워집니다.</p>
                  )}
                </div>

                <div className={`h-px w-full ${isClassic ? 'bg-rose-200' : 'bg-zinc-800'}`} />

                <div>
                  <h4
                    className={`text-xs font-bold mb-3 flex items-center w-fit px-3 py-1.5 rounded-lg border uppercase tracking-wider ${
                      isClassic
                        ? 'text-slate-700 bg-slate-100 border-slate-300'
                        : 'text-zinc-400 bg-zinc-800 border-zinc-700'
                    }`}
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Avoid This
                  </h4>
                  {core.dosAndDonts.donts.length > 0 ? (
                    <ul className="space-y-2.5">
                      {core.dosAndDonts.donts.map((item, i) => (
                        <li
                          key={i}
                          className={`text-sm flex items-start leading-relaxed ${
                            isClassic ? 'text-slate-700' : 'text-zinc-300 font-light'
                          }`}
                        >
                          <span className="text-slate-400 mr-2 mt-0.5 text-lg leading-none">•</span>
                          <span style={{ wordBreak: 'keep-all' }}>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={`text-xs italic ${textMuted}`}>다음 빌드에서 채워집니다.</p>
                  )}
                </div>
              </div>
            </div>

            {core.keyDates.length > 0 && (
              <div className={`rounded-3xl p-6 ${cardBg}`}>
                <div
                  className={`flex items-center space-x-3 border-b pb-4 mb-5 ${
                    isClassic ? 'border-rose-200' : 'border-zinc-700/60'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${isClassic ? 'bg-pink-50' : 'bg-zinc-800'}`}>
                    <Star
                      className={`w-5 h-5 ${isClassic ? 'text-pink-500' : 'text-pink-400'}`}
                    />
                  </div>
                  <h3 className={`text-base font-extrabold ${textHeading}`}>결정적 타이밍</h3>
                </div>

                <div className="space-y-5 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-rose-500/80 before:to-transparent">
                  {core.keyDates.map((date, i) => (
                    <div key={i} className="relative flex items-start">
                      <div
                        className={`flex items-center justify-center w-5 h-5 mt-1 rounded-full border-4 shrink-0 z-10 ${
                          isClassic
                            ? 'border-white bg-rose-500'
                            : 'border-zinc-900 bg-rose-500'
                        }`}
                      />
                      <div
                        className={`flex-1 ml-4 p-4 rounded-2xl border shadow-sm ${
                          isClassic
                            ? 'bg-rose-50/50 border-rose-200'
                            : 'bg-zinc-800/40 border-zinc-700/50'
                        }`}
                      >
                        <div className="mb-2">
                          <span
                            className={`inline-block px-2 py-1 text-xs font-bold tracking-widest rounded border mb-2 ${
                              isClassic
                                ? 'bg-rose-100 text-rose-700 border-rose-200'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            }`}
                          >
                            {date.date || '시점'}
                          </span>
                          <h4 className={`text-sm font-bold ${textHeading}`}>{date.title}</h4>
                        </div>
                        <p
                          className={`text-xs leading-relaxed break-keep ${
                            isClassic ? 'text-slate-600' : 'text-zinc-400 font-light'
                          }`}
                        >
                          {date.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </motion.div>

        {deepDataSlot && (
          <section
            className={`rounded-3xl border ${cardBg} overflow-hidden`}
          >
            <button
              type="button"
              onClick={() => setDeepOpen((v) => !v)}
              className={`w-full px-6 py-5 flex items-center justify-between text-left transition-colors ${
                isClassic ? 'hover:bg-rose-50/40' : 'hover:bg-zinc-800/40'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className={`text-base font-extrabold ${textHeading}`}>
                  🔬 전문가용 상세 데이터
                </span>
                <span className={`text-xs ${textMuted}`}>
                  근거 앵커 · 품질 점검 · 계산 명세
                </span>
              </div>
              <span className={`text-xs font-mono ${textMuted}`}>
                {deepOpen ? 'CLOSE' : 'OPEN'}
              </span>
            </button>
            {deepOpen && (
              <div
                className={`px-6 pb-8 pt-2 border-t ${
                  isClassic ? 'border-rose-200' : 'border-zinc-800'
                }`}
              >
                {deepDataSlot}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

interface CrossMatrixModalProps {
  item: UltimateCrossMatrixItem
  isClassic: boolean
  textMuted: string
  onClose: () => void
}

function CrossMatrixModal({ item, isClassic, textMuted, onClose }: CrossMatrixModalProps) {
  const Icon = CROSS_ICON_MAP[item.iconKey ?? 'compass'] ?? Compass
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`${
          isClassic ? 'bg-white text-slate-900' : 'bg-zinc-900 text-zinc-100'
        } w-full max-w-lg rounded-3xl p-7 shadow-2xl border ${
          isClassic ? 'border-rose-200' : 'border-zinc-700'
        } relative`}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-zinc-500/20 transition-colors"
          aria-label="닫기"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center space-x-4 mb-5">
          <div
            className={`p-3 rounded-xl ${
              isClassic ? 'bg-rose-100 text-rose-600' : 'bg-rose-500/20 text-rose-400'
            }`}
          >
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold">{item.module} 상세 분석</h3>
            {item.accuracy && (
              <p className={`text-xs ${textMuted}`}>{item.accuracy}</p>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div
            className={`p-4 rounded-xl ${
              isClassic ? 'bg-rose-50 border border-rose-100' : 'bg-black/40 border border-zinc-800'
            }`}
          >
            <span className="block text-xs font-bold uppercase mb-1 text-rose-500">
              종합 점수
            </span>
            <span className="text-3xl font-black">{item.score}점</span>
          </div>
          <p
            className={`leading-relaxed ${
              isClassic ? 'text-slate-700' : 'text-zinc-300'
            }`}
          >
            {item.detail || '해당 영역의 상세 해설은 다음 빌드에서 채워집니다.'}
          </p>
        </div>
      </motion.div>
    </div>
  )
}
