'use client'

/**
 * Apple-tier compatibility report.
 * Renders pair_details + fusion insights + advice + timing in a unified
 * visual layout matching premium-reports/result/[id] design language.
 */

import { memo, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ScoreDashboard } from './ScoreDashboard'
import { buildCoupleTagline } from '@/lib/compatibility/coupleTagline'
import {
  Sparkles,
  Heart,
  Compass,
  MessageCircle,
  Home,
  Flame,
  Calendar,
  TrendingUp,
  Clock,
  ArrowRight,
  Lightbulb,
} from 'lucide-react'
import type {
  PairDetails,
  RelationshipDynamics,
  FutureGuidance,
  CoupleTimingData,
  CoupleAstroTiming,
  CoupleDeepInsights,
} from '@/hooks/useCompatibilityAnalysis'

interface NarrativePerson {
  name?: string
  date: string
  time: string
  gender?: 'male' | 'female' | 'M' | 'F' | 'Male' | 'Female'
  latitude?: number
  longitude?: number
  timeZone?: string
  city?: string
  relationToP1?: string
}

interface CompatibilityRichReportProps {
  pairDetails: PairDetails[]
  overallScore: number | null
  pairLabels: string[]
  /** Raw birth info needed for the narrative endpoint to recompute extended saju + astro */
  personsForNarrative?: NarrativePerson[]
  relationshipDynamics: RelationshipDynamics | null
  futureGuidance: FutureGuidance | null
  coupleTiming?: CoupleTimingData | null
  astroTiming?: CoupleAstroTiming | null
  deepInsights?: CoupleDeepInsights | null
  actionItems: string[]
}

function scoreBand(s: number): { label: string; color: string } {
  if (s >= 85) return { label: '환상적', color: '#a78bfa' }
  if (s >= 75) return { label: '아주 좋음', color: '#7c5cff' }
  if (s >= 65) return { label: '좋음', color: '#22d3ee' }
  if (s >= 55) return { label: '괜찮음', color: '#34d399' }
  if (s >= 45) return { label: '노력 필요', color: '#fbbf24' }
  return { label: '도전적', color: '#f87171' }
}

function ScoreCircle({ score, size = 200 }: { score: number; size?: number }) {
  const band = scoreBand(score)
  const stroke = 12
  const radius = (size - stroke) / 2
  const circ = 2 * Math.PI * radius
  const offset = circ - (score / 100) * circ

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={band.color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ filter: `drop-shadow(0 0 12px ${band.color}60)`, transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p
          className="text-[3.5rem] font-semibold leading-none tracking-[-0.04em] text-white"
          style={{ color: band.color }}
        >
          {score}
        </p>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
          {band.label}
        </p>
      </div>
    </div>
  )
}

function ScoreBar({
  label,
  score,
  Icon,
  accent,
}: {
  label: string
  score: number | null | undefined
  Icon: typeof Heart
  accent: string
}) {
  if (score === null || score === undefined) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: `${accent}1f`, color: accent }}
          >
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="text-[12px] font-medium text-slate-400">{label}</span>
        </div>
        <p className="mt-2 text-[12px] text-slate-500">측정 불가</p>
      </div>
    )
  }

  const safe = Math.max(0, Math.min(100, Math.round(score)))
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
      <div className="flex items-center gap-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: `${accent}1f`, color: accent }}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-[12px] font-medium text-slate-300">{label}</span>
      </div>
      <p className="mt-2.5 text-[1.5rem] font-semibold leading-none text-white">{safe}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${safe}%`, background: accent }}
        />
      </div>
    </div>
  )
}

export const CompatibilityRichReport = memo(function CompatibilityRichReport({
  pairDetails,
  overallScore,
  pairLabels,
  personsForNarrative,
  relationshipDynamics,
  futureGuidance,
  coupleTiming,
  astroTiming,
  deepInsights,
  actionItems,
}: CompatibilityRichReportProps) {
  const primaryPair = pairDetails[0]

  const [narrative, setNarrative] = useState('')
  const [narrativeStatus, setNarrativeStatus] = useState<
    'idle' | 'loading' | 'streaming' | 'done' | 'error'
  >('idle')
  const fetchedKeyRef = useRef<string | null>(null)

  type TabKey = 'overview' | 'depth' | 'marriage' | 'timing' | 'next'
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  const TABS: Array<{ key: TabKey; label: string }> = [
    { key: 'overview', label: '한눈에' },
    { key: 'depth', label: '두 분의 결' },
    { key: 'marriage', label: '결혼·지속력' },
    { key: 'timing', label: '시기' },
    { key: 'next', label: '다음 단계' },
  ]

  useEffect(() => {
    if (!primaryPair || !deepInsights || !personsForNarrative || personsForNarrative.length < 2) return
    const key = `${pairLabels.join('|')}|${primaryPair.weightedScore}|${deepInsights.attractionReasons.length}`
    if (fetchedKeyRef.current === key) return
    fetchedKeyRef.current = key

    const controller = new AbortController()
    setNarrativeStatus('loading')
    setNarrative('')
    ;(async () => {
      try {
        const res = await fetch('/api/compatibility/narrative-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            pairLabels,
            persons: personsForNarrative,
            overallScore: overallScore ?? primaryPair.weightedScore,
            scoreBreakdown: {
              saju: primaryPair.sajuScore,
              astro: primaryPair.astrologyScore,
              fusion: primaryPair.fusionScore,
              cross: primaryPair.crossScore,
            },
            deepInsightsSummary: {
              attractionReasons: deepInsights.attractionReasons,
              whyItWorks: deepInsights.whyItWorks,
              frictionPoints: deepInsights.frictionPoints,
              marriageSummary: deepInsights.marriage?.summary,
              longevitySummary: deepInsights.longevity?.summary,
            },
            coupleTiming: coupleTiming
              ? {
                  activationPeriod: coupleTiming.activationPeriod,
                  cautionPeriod: coupleTiming.cautionPeriod,
                  primeYearWindow: coupleTiming.primeYearWindow,
                  monthlyOutlook: coupleTiming.monthlyOutlook,
                }
              : null,
            astroTiming: astroTiming
              ? {
                  saturnEra: astroTiming.saturnEra,
                  jupiterEra: astroTiming.jupiterEra,
                  crossNarrative: astroTiming.crossNarrative,
                }
              : null,
          }),
        })
        if (!res.ok || !res.body) {
          setNarrativeStatus('error')
          return
        }
        setNarrativeStatus('streaming')
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let acc = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          let nl = buffer.indexOf('\n\n')
          while (nl !== -1) {
            const event = buffer.slice(0, nl)
            buffer = buffer.slice(nl + 2)
            for (const line of event.split('\n')) {
              if (!line.startsWith('data:')) continue
              const data = line.slice(5).trim()
              if (!data || data === '[DONE]') continue
              try {
                const parsed = JSON.parse(data) as { content?: string; done?: boolean }
                if (parsed.content) {
                  acc += parsed.content
                  setNarrative(acc)
                }
              } catch {
                // ignore parse errors
              }
            }
            nl = buffer.indexOf('\n\n')
          }
        }
        setNarrativeStatus('done')
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          setNarrativeStatus('error')
        }
      }
    })()

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryPair?.weightedScore, pairLabels.join('|'), Boolean(deepInsights)])

  if (!primaryPair) return null

  const fusion = primaryPair.fusionInsights
  const score = overallScore ?? primaryPair.weightedScore
  const band = scoreBand(score)
  const narrativeParagraphs = narrative.split(/\n\n+/).filter((p) => p.trim().length > 0)
  const tagline = buildCoupleTagline({
    overallScore: score,
    sajuScore: primaryPair.sajuScore,
    astrologyScore: primaryPair.astrologyScore,
    crossScore: primaryPair.crossScore,
    fusion: primaryPair.fusionInsights,
  })
  // Percentile context for hero (vs typical couples — mean 65, sd 12)
  const heroPercentile = (() => {
    const erfP = 0.3275911
    const a = [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429]
    const x = (score - 65) / (12 * Math.SQRT2)
    const sign = x >= 0 ? 1 : -1
    const ax = Math.abs(x)
    const t = 1 / (1 + erfP * ax)
    const y =
      1 -
      (((((a[4] * t + a[3]) * t) + a[2]) * t + a[1]) * t + a[0]) *
        t *
        Math.exp(-ax * ax)
    return Math.round(0.5 * (1 + sign * y) * 100)
  })()

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute -left-24 top-[-180px] h-[420px] w-[420px] rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, ${band.color}1f 0%, transparent 70%)` }}
        />
        <div className="absolute bottom-[-220px] right-[-110px] h-[460px] w-[460px] rounded-full bg-gradient-to-br from-cyan-400/10 to-blue-500/0 blur-3xl" />
      </div>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6" data-print-area>
        {/* Print / PDF action — hidden in print output */}
        <div className="no-print flex justify-end">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-[12.5px] font-medium text-slate-200 transition hover:border-cyan-300/35 hover:text-white"
          >
            인쇄 / PDF 저장
          </button>
        </div>

        {/* Hero */}
        <header className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,16,28,0.94),rgba(7,11,19,0.86))] p-6 backdrop-blur-2xl sm:p-8">
          {/* Tagline — single-sentence headline above everything */}
          <div className="mb-6 text-center">
            <h1
              className="text-balance text-[1.5rem] font-semibold leading-[1.25] tracking-[-0.018em] text-white sm:text-[1.85rem]"
              style={{ wordBreak: 'keep-all' }}
            >
              {tagline.headline}
            </h1>
            <p
              className="mt-2 text-[13.5px] leading-relaxed text-slate-400"
              style={{ wordBreak: 'keep-all' }}
            >
              {tagline.subline}
            </p>
          </div>

          <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-center sm:gap-8 sm:text-left">
            <ScoreCircle score={score} />
            <div className="flex-1">
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-300">
                  Compatibility Report
                </p>
                {heroPercentile >= 50 && (
                  <span
                    className="rounded-full border px-2 py-0.5 text-[10.5px] font-medium"
                    style={{
                      borderColor: heroPercentile >= 80 ? '#34d39960' : '#22d3ee60',
                      background: heroPercentile >= 80 ? '#34d39915' : '#22d3ee15',
                      color: heroPercentile >= 80 ? '#a7f3d0' : '#a5f3fc',
                    }}
                  >
                    {heroPercentile >= 90
                      ? `상위 ${100 - heroPercentile}%`
                      : heroPercentile >= 75
                        ? `상위 ${100 - heroPercentile}%`
                        : '평균 이상'}
                  </span>
                )}
              </div>
              <h1 className="mt-2 text-balance text-[1.85rem] font-semibold leading-[1.1] tracking-[-0.025em] text-white sm:text-[2.4rem]">
                {pairLabels.join(' & ')}
              </h1>
              <p className="mt-3 text-[14px] leading-relaxed text-slate-300">
                {primaryPair.relationLabel}
              </p>
              {/* Single unified score — sub-scores moved to expandable
                  detail in ScoreDashboard. Heroes stay clean. */}
            </div>
          </div>
        </header>

        {/* Tab navigation — groups 16 sections into 5 readable chunks */}
        <nav className="no-print sticky top-2 z-20 -mx-2 overflow-x-auto rounded-2xl border border-white/10 bg-[rgba(10,16,28,0.85)] p-1.5 backdrop-blur-xl sm:mx-0">
          <div className="flex gap-1">
            {TABS.map((t) => {
              const active = activeTab === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  className={`flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-[12.5px] font-medium transition ${
                    active
                      ? 'bg-[linear-gradient(135deg,rgba(124,92,255,0.22),rgba(34,211,238,0.16))] text-white shadow-[0_4px_16px_rgba(124,92,255,0.18)]'
                      : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Unified score dashboard — visible on Overview tab */}
        {activeTab === 'overview' && (
          <ScoreDashboard
            overall={score}
            saju={primaryPair.sajuScore}
            astro={primaryPair.astrologyScore}
            fusion={primaryPair.fusionScore}
            cross={primaryPair.crossScore}
            marriage={deepInsights?.marriage?.score ?? null}
            longevity={deepInsights?.longevity?.score ?? null}
            dayMaster={fusion?.dayMasterHarmony}
            sunMoon={fusion?.sunMoonHarmony}
            venusMars={fusion?.venusMarsSynergy}
            intellectual={fusion?.intellectualAlignment}
            spiritual={fusion?.spiritualConnection}
          />
        )}

        {/* AI Narrative — Claude-polished long-form Korean */}
        {activeTab === 'overview' && (narrativeStatus !== 'idle' || narrative) && (
          <section className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(10,16,28,0.94),rgba(7,11,19,0.86))] p-6 backdrop-blur-2xl sm:p-8">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-300" />
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                AI 풀이
              </h2>
              {narrativeStatus === 'streaming' && (
                <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-cyan-300/25 bg-cyan-400/10 px-2.5 py-0.5 text-[10.5px] font-medium text-cyan-100">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />
                  생성 중
                </span>
              )}
            </div>

            {narrativeStatus === 'loading' && narrative === '' && (
              <div className="mx-auto mt-5 max-w-[68ch] space-y-3.5">
                {[
                  '92%',
                  '88%',
                  '95%',
                  '83%',
                  '90%',
                  '78%',
                  '95%',
                  '85%',
                  '92%',
                  '70%',
                ].map((w, i) => (
                  <div
                    key={i}
                    className="h-3.5 animate-pulse rounded-full bg-white/[0.05]"
                    style={{
                      width: w,
                      animationDelay: `${i * 0.08}s`,
                    }}
                  />
                ))}
                <p className="mt-3 text-[12.5px] leading-relaxed text-slate-400">
                  사주·점성 데이터로 12 단락 long-form 풀이 작성 중 (약 20-30초 소요)
                </p>
              </div>
            )}

            {narrativeStatus === 'error' && (
              <p className="mt-3 text-[13px] text-amber-200/80">
                AI 풀이를 불러오지 못했어요. 아래 분석 카드들로 풀이 가능합니다.
              </p>
            )}

            {narrativeParagraphs.length > 0 && (
              <div
                className="mx-auto mt-5 max-w-[68ch] space-y-6 text-[16px] leading-[1.95] text-slate-100/95"
                style={{
                  letterSpacing: '0.005em',
                  fontFeatureSettings: '"kern", "palt"',
                }}
              >
                {narrativeParagraphs.map((p, i) => (
                  <p key={i} style={{ wordBreak: 'keep-all', textWrap: 'pretty' }}>
                    {p}
                  </p>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Top 3 actions — surface on overview so users get clear next steps */}
        {activeTab === 'overview' && actionItems.length > 0 && (
          <section className="rounded-3xl border border-violet-300/20 bg-[linear-gradient(135deg,rgba(124,92,255,0.12),rgba(34,211,238,0.06))] p-6 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.22em] text-violet-300">
                지금 바로 해볼 것
              </h2>
              <span className="text-[11px] text-slate-400">상위 3개</span>
            </div>
            <ul className="mt-4 space-y-3">
              {actionItems.slice(0, 3).map((item, i) => (
                <li
                  key={i}
                  className="flex gap-3 text-[14.5px] leading-relaxed text-slate-100"
                  style={{ wordBreak: 'keep-all' }}
                >
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-violet-400/20 text-[11.5px] font-semibold text-violet-200">
                    {i + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            {actionItems.length > 3 && (
              <p className="mt-3 text-[11.5px] text-slate-500">
                전체 {actionItems.length}개는 "다음 단계" 탭에서 볼 수 있어요
              </p>
            )}
          </section>
        )}

        {/* Fusion deep analysis */}
        {activeTab === 'overview' && fusion?.deepAnalysis && (
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-300" />
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                핵심 흐름
              </h2>
            </div>
            <p
              className="mt-3 text-[15px] leading-[1.85] text-slate-200"
              style={{ wordBreak: 'keep-all' }}
            >
              {fusion.deepAnalysis}
            </p>
          </section>
        )}

        {/* Why they click — attraction reasons */}
        {activeTab === 'depth' && deepInsights && deepInsights.attractionReasons.length > 0 && (
          <section className="rounded-3xl border border-pink-300/20 bg-[linear-gradient(135deg,rgba(244,114,182,0.10),rgba(244,114,182,0.02))] p-6 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-pink-300" />
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.22em] text-pink-300">
                서로 끌리는 이유
              </h2>
            </div>
            <ul className="mt-4 space-y-3">
              {deepInsights.attractionReasons.map((r, i) => (
                <li
                  key={i}
                  className="flex gap-3 text-[14px] leading-relaxed text-slate-200"
                  style={{ wordBreak: 'keep-all' }}
                >
                  <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-pink-300" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Why it works + Friction points */}
        {activeTab === 'depth' && deepInsights && (deepInsights.whyItWorks.length > 0 || deepInsights.frictionPoints.length > 0) && (
          <section className="grid gap-3 sm:grid-cols-2">
            {deepInsights.whyItWorks.length > 0 && (
              <div className="rounded-3xl border border-emerald-300/20 bg-emerald-400/[0.04] p-5 backdrop-blur-md">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
                  잘 맞는 이유
                </p>
                <ul className="mt-3 space-y-2.5">
                  {deepInsights.whyItWorks.map((r, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-[13.5px] leading-relaxed text-slate-200"
                      style={{ wordBreak: 'keep-all' }}
                    >
                      <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-emerald-300" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {deepInsights.frictionPoints.length > 0 && (
              <div className="rounded-3xl border border-amber-300/20 bg-amber-400/[0.04] p-5 backdrop-blur-md">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-300">
                  마찰 가능 지점
                </p>
                <ul className="mt-3 space-y-2.5">
                  {deepInsights.frictionPoints.map((r, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-[13.5px] leading-relaxed text-slate-200"
                      style={{ wordBreak: 'keep-all' }}
                    >
                      <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-amber-300" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Ideal type matching */}
        {activeTab === 'depth' && deepInsights && deepInsights.idealMatch.length > 0 && (
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-violet-300" />
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.22em] text-violet-300">
                이상형 vs 실제 매칭
              </h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {deepInsights.idealMatch.map((m, i) => {
                const labelColor =
                  m.matchLevel === 'strong'
                    ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100'
                    : m.matchLevel === 'partial'
                      ? 'border-cyan-300/30 bg-cyan-400/10 text-cyan-100'
                      : 'border-amber-300/30 bg-amber-400/10 text-amber-100'
                const matchKo =
                  m.matchLevel === 'strong'
                    ? '강한 매칭'
                    : m.matchLevel === 'partial'
                      ? '부분 매칭'
                      : '대비 매칭'
                return (
                  <div
                    key={i}
                    className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold text-white">
                        {pairLabels[m.personIndex - 1] || `Person ${m.personIndex}`}의 이상형
                      </p>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${labelColor}`}
                      >
                        {matchKo}
                      </span>
                    </div>
                    <p
                      className="mt-2 text-[12.5px] leading-relaxed text-slate-300"
                      style={{ wordBreak: 'keep-all' }}
                    >
                      <span className="text-violet-200">추구:</span> {m.seeks}
                    </p>
                    <p
                      className="mt-1 text-[12.5px] leading-relaxed text-slate-300"
                      style={{ wordBreak: 'keep-all' }}
                    >
                      <span className="text-cyan-200">
                        {pairLabels[m.partnerIndex - 1] || `Person ${m.partnerIndex}`} 실제:
                      </span>{' '}
                      {m.partnerActually}
                    </p>
                    <p
                      className="mt-2 text-[12px] leading-relaxed text-slate-400"
                      style={{ wordBreak: 'keep-all' }}
                    >
                      {m.note}
                    </p>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Marriage readiness */}
        {activeTab === 'marriage' && deepInsights?.marriage && (
          <section className="rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(124,92,255,0.10),rgba(124,92,255,0.02))] p-6 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-300" />
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.22em] text-violet-300">
                  결혼·약속 준비도
                </h2>
              </div>
              <span
                className="text-[2rem] font-semibold leading-none text-white"
                style={{
                  color:
                    deepInsights.marriage.band === 'high'
                      ? '#a78bfa'
                      : deepInsights.marriage.band === 'medium'
                        ? '#22d3ee'
                        : '#fbbf24',
                }}
              >
                {deepInsights.marriage.score}
              </span>
            </div>
            <p
              className="mt-3 text-[14px] leading-relaxed text-slate-200"
              style={{ wordBreak: 'keep-all' }}
            >
              {deepInsights.marriage.summary}
            </p>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {deepInsights.marriage.bestWindow && (
                <div className="rounded-2xl border border-violet-300/25 bg-violet-400/[0.06] p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">
                    최적 시기
                  </p>
                  <p className="mt-1.5 text-[13.5px] font-medium text-white">
                    {deepInsights.marriage.bestWindow}
                  </p>
                </div>
              )}
              <div className="rounded-2xl border border-amber-300/25 bg-amber-400/[0.04] p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                  사주 신호
                </p>
                <p
                  className="mt-1.5 text-[12.5px] leading-relaxed text-slate-300"
                  style={{ wordBreak: 'keep-all' }}
                >
                  {deepInsights.marriage.sajuSignal}
                </p>
              </div>
              <div className="rounded-2xl border border-cyan-300/25 bg-cyan-400/[0.04] p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                  점성 신호
                </p>
                <p
                  className="mt-1.5 text-[12.5px] leading-relaxed text-slate-300"
                  style={{ wordBreak: 'keep-all' }}
                >
                  {deepInsights.marriage.astroSignal}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Longevity assessment */}
        {activeTab === 'marriage' && deepInsights?.longevity && (
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-300" />
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
                  관계 지속력
                </h2>
              </div>
              <span
                className="text-[2rem] font-semibold leading-none"
                style={{
                  color:
                    deepInsights.longevity.band === 'strong'
                      ? '#34d399'
                      : deepInsights.longevity.band === 'medium'
                        ? '#22d3ee'
                        : '#fbbf24',
                }}
              >
                {deepInsights.longevity.score}
              </span>
            </div>
            <p
              className="mt-3 text-[14px] leading-relaxed text-slate-200"
              style={{ wordBreak: 'keep-all' }}
            >
              {deepInsights.longevity.summary}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {deepInsights.longevity.positive.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                    지지 요소
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {deepInsights.longevity.positive.map((p, i) => (
                      <li
                        key={i}
                        className="text-[12.5px] leading-relaxed text-slate-300"
                        style={{ wordBreak: 'keep-all' }}
                      >
                        • {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {deepInsights.longevity.cautionary.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                    주의 신호
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {deepInsights.longevity.cautionary.map((c, i) => (
                      <li
                        key={i}
                        className="text-[12.5px] leading-relaxed text-slate-300"
                        style={{ wordBreak: 'keep-all' }}
                      >
                        • {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Theme breakdown — 5 dimensions */}
        {activeTab === 'depth' && (
        <section>
          <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
            5 차원 분석
          </h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            <ScoreBar label="성격" score={fusion?.dayMasterHarmony} Icon={Compass} accent="#a78bfa" />
            <ScoreBar label="감정" score={fusion?.sunMoonHarmony} Icon={Heart} accent="#f472b6" />
            <ScoreBar
              label="친밀"
              score={fusion?.venusMarsSynergy}
              Icon={Flame}
              accent="#fb923c"
            />
            <ScoreBar
              label="소통"
              score={fusion?.intellectualAlignment}
              Icon={MessageCircle}
              accent="#22d3ee"
            />
            <ScoreBar
              label="유대"
              score={fusion?.spiritualConnection}
              Icon={Home}
              accent="#34d399"
            />
          </div>
        </section>
        )}

        {/* Relationship dynamics + key signals */}
        {activeTab === 'depth' && relationshipDynamics?.conflictResolutionStyle && (
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-300" />
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
                관계 다이내믹
              </h2>
            </div>
            <p
              className="mt-3 text-[14px] leading-relaxed text-slate-200"
              style={{ wordBreak: 'keep-all' }}
            >
              <span className="text-cyan-300">갈등 해결:</span>{' '}
              {relationshipDynamics.conflictResolutionStyle}
            </p>
          </section>
        )}

        {/* Strengths & Challenges */}
        {activeTab === 'depth' && (primaryPair.strengths.length > 0 || primaryPair.challenges.length > 0) && (
          <section className="grid gap-3 sm:grid-cols-2">
            {primaryPair.strengths.length > 0 && (
              <div className="rounded-3xl border border-emerald-300/20 bg-emerald-400/[0.04] p-5 backdrop-blur-md">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
                  강점
                </p>
                <ul className="mt-3 space-y-2">
                  {primaryPair.strengths.map((s, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-[13.5px] leading-relaxed text-slate-200"
                      style={{ wordBreak: 'keep-all' }}
                    >
                      <span
                        className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-emerald-300"
                        aria-hidden
                      />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {primaryPair.challenges.length > 0 && (
              <div className="rounded-3xl border border-amber-300/20 bg-amber-400/[0.04] p-5 backdrop-blur-md">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-300">
                  과제
                </p>
                <ul className="mt-3 space-y-2">
                  {primaryPair.challenges.map((c, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-[13.5px] leading-relaxed text-slate-200"
                      style={{ wordBreak: 'keep-all' }}
                    >
                      <span
                        className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-amber-300"
                        aria-hidden
                      />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Top synastry aspects + house overlays */}
        {activeTab === 'depth' && (primaryPair.topAspects.length > 0 || primaryPair.topHouseOverlays.length > 0) && (
          <section className="grid gap-3 sm:grid-cols-2">
            {primaryPair.topAspects.length > 0 && (
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                  주요 시너스트리
                </p>
                <ul className="mt-3 space-y-1.5">
                  {primaryPair.topAspects.slice(0, 6).map((a, i) => (
                    <li
                      key={i}
                      className="text-[13px] leading-relaxed text-slate-300"
                      style={{ wordBreak: 'keep-all' }}
                    >
                      • {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {primaryPair.topHouseOverlays.length > 0 && (
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-300">
                  하우스 활성화
                </p>
                <ul className="mt-3 space-y-1.5">
                  {primaryPair.topHouseOverlays.slice(0, 6).map((h, i) => (
                    <li
                      key={i}
                      className="text-[13px] leading-relaxed text-slate-300"
                      style={{ wordBreak: 'keep-all' }}
                    >
                      • {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Concrete timing — best meeting month, activation, caution, prime year */}
        {activeTab === 'timing' && coupleTiming && (
          <section className="rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.10),rgba(34,211,238,0.02))] p-6 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-cyan-300" />
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                구체적 타이밍
              </h2>
            </div>

            <p
              className="mt-3 text-[14px] leading-relaxed text-slate-200"
              style={{ wordBreak: 'keep-all' }}
            >
              {coupleTiming.monthlyOutlook}
            </p>

            <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {coupleTiming.bestMeetingMonth && (
                <div className="rounded-2xl border border-emerald-300/25 bg-emerald-400/[0.06] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                    만남·약속 좋은 달
                  </p>
                  <p className="mt-1.5 text-[1.1rem] font-semibold text-white">
                    {coupleTiming.bestMeetingMonth.year}년{' '}
                    {coupleTiming.bestMeetingMonth.month}월
                  </p>
                  <p
                    className="mt-1.5 text-[12.5px] leading-relaxed text-slate-300"
                    style={{ wordBreak: 'keep-all' }}
                  >
                    {coupleTiming.bestMeetingMonth.reason}
                  </p>
                </div>
              )}

              {coupleTiming.activationPeriod && (
                <div className="rounded-2xl border border-cyan-300/25 bg-cyan-400/[0.06] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                    발휘 시기
                  </p>
                  <p className="mt-1.5 text-[1.1rem] font-semibold text-white">
                    {coupleTiming.activationPeriod.when}
                  </p>
                  <p
                    className="mt-1.5 text-[12.5px] leading-relaxed text-slate-300"
                    style={{ wordBreak: 'keep-all' }}
                  >
                    {coupleTiming.activationPeriod.reason}
                  </p>
                </div>
              )}

              {coupleTiming.cautionPeriod && (
                <div className="rounded-2xl border border-amber-300/25 bg-amber-400/[0.06] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                    조심 시기
                  </p>
                  <p className="mt-1.5 text-[1.1rem] font-semibold text-white">
                    {coupleTiming.cautionPeriod.when}
                  </p>
                  <p
                    className="mt-1.5 text-[12.5px] leading-relaxed text-slate-300"
                    style={{ wordBreak: 'keep-all' }}
                  >
                    {coupleTiming.cautionPeriod.reason}
                  </p>
                </div>
              )}

              {coupleTiming.primeYearWindow && (
                <div className="rounded-2xl border border-violet-300/25 bg-violet-400/[0.06] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">
                    장기 약속 좋은 해
                  </p>
                  <p className="mt-1.5 text-[1.1rem] font-semibold text-white">
                    {coupleTiming.primeYearWindow.startYear}년
                    {coupleTiming.primeYearWindow.endYear !==
                      coupleTiming.primeYearWindow.startYear &&
                      ` ~ ${coupleTiming.primeYearWindow.endYear}년`}
                  </p>
                  <p
                    className="mt-1.5 text-[12.5px] leading-relaxed text-slate-300"
                    style={{ wordBreak: 'keep-all' }}
                  >
                    {coupleTiming.primeYearWindow.reason}
                  </p>
                </div>
              )}
            </div>

            {/* 12-month strip */}
            {coupleTiming.upcomingMonths.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  앞으로 12개월
                </p>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {coupleTiming.upcomingMonths.map((m, i) => {
                    const bg =
                      m.label === 'great'
                        ? 'bg-emerald-400/30 border-emerald-300/40 text-emerald-50'
                        : m.label === 'good'
                          ? 'bg-cyan-400/20 border-cyan-300/30 text-cyan-50'
                          : m.label === 'caution'
                            ? 'bg-amber-400/20 border-amber-300/30 text-amber-50'
                            : 'bg-white/[0.04] border-white/10 text-slate-300'
                    return (
                      <div
                        key={i}
                        className={`flex min-w-[64px] flex-col items-center rounded-xl border px-2 py-2 ${bg}`}
                        title={m.reason}
                      >
                        <span className="text-[10px] opacity-70">{m.year % 100}</span>
                        <span className="text-[15px] font-semibold leading-none">
                          {m.month}월
                        </span>
                      </div>
                    )
                  })}
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  💚 활성 · 🩵 좋음 · 🤍 평이 · 🟡 조심
                </p>
              </div>
            )}
          </section>
        )}

        {/* Astro timing — Saturn/Jupiter era + life-stage transits */}
        {activeTab === 'timing' &&
          astroTiming &&
          (astroTiming.saturnEra ||
            astroTiming.jupiterEra ||
            astroTiming.lifeStages.length > 0 ||
            astroTiming.crossNarrative) && (
            <section className="rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(167,139,250,0.10),rgba(167,139,250,0.02))] p-6 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-300" />
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.22em] text-violet-300">
                  점성 타이밍 (현재 흐름)
                </h2>
              </div>

              {astroTiming.crossNarrative && (
                <p
                  className="mt-3 text-[14px] leading-relaxed text-slate-200"
                  style={{ wordBreak: 'keep-all' }}
                >
                  <span className="rounded bg-violet-400/15 px-1.5 py-0.5 text-violet-100">
                    교차 신호
                  </span>{' '}
                  {astroTiming.crossNarrative}
                </p>
              )}

              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {astroTiming.saturnEra && (
                  <div className="rounded-2xl border border-slate-300/20 bg-slate-400/[0.04] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                      Saturn — 구조의 시기
                    </p>
                    <p className="mt-1.5 text-[1.05rem] font-semibold text-white">
                      {astroTiming.saturnEra.signKo}
                    </p>
                    <p className="mt-1 text-[12.5px] text-slate-300">
                      {astroTiming.saturnEra.themeKo}
                    </p>
                    <p
                      className="mt-2 text-[12.5px] leading-relaxed text-slate-400"
                      style={{ wordBreak: 'keep-all' }}
                    >
                      {astroTiming.saturnEra.bothImpact}
                    </p>
                  </div>
                )}
                {astroTiming.jupiterEra && (
                  <div className="rounded-2xl border border-amber-300/25 bg-amber-400/[0.04] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                      Jupiter — 확장의 시기
                    </p>
                    <p className="mt-1.5 text-[1.05rem] font-semibold text-white">
                      {astroTiming.jupiterEra.signKo}
                    </p>
                    <p className="mt-1 text-[12.5px] text-slate-300">
                      {astroTiming.jupiterEra.themeKo}
                    </p>
                    <p
                      className="mt-2 text-[12.5px] leading-relaxed text-slate-400"
                      style={{ wordBreak: 'keep-all' }}
                    >
                      {astroTiming.jupiterEra.bothImpact}
                    </p>
                  </div>
                )}
              </div>

              {astroTiming.lifeStages.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    인생 단계 전환
                  </p>
                  <div className="space-y-2">
                    {astroTiming.lifeStages.map((ls, i) => (
                      <div
                        key={i}
                        className="rounded-2xl border border-violet-300/20 bg-violet-400/[0.04] p-3.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[13px] font-semibold text-white">
                            {pairLabels[ls.person - 1] || `Person ${ls.person}`} ·{' '}
                            {ls.label}
                          </p>
                          <span className="rounded-full border border-violet-300/30 bg-violet-300/10 px-2 py-0.5 text-[10.5px] font-medium text-violet-100">
                            {ls.timing}
                          </span>
                        </div>
                        <p
                          className="mt-1.5 text-[12.5px] leading-relaxed text-slate-300"
                          style={{ wordBreak: 'keep-all' }}
                        >
                          {ls.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

        {/* Future guidance — 3 horizons */}
        {activeTab === 'timing' &&
          futureGuidance &&
          (futureGuidance.shortTerm || futureGuidance.mediumTerm || futureGuidance.longTerm) && (
            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-300" />
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.22em] text-amber-300">
                  앞으로의 흐름
                </h2>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  { label: '단기 (3개월)', text: futureGuidance.shortTerm, Icon: Clock },
                  { label: '중기 (1년)', text: futureGuidance.mediumTerm, Icon: TrendingUp },
                  { label: '장기 (수년)', text: futureGuidance.longTerm, Icon: ArrowRight },
                ]
                  .filter((b) => b.text)
                  .map((b, i) => {
                    const BIcon = b.Icon
                    return (
                      <div
                        key={i}
                        className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4"
                      >
                        <div className="flex items-center gap-2">
                          <BIcon className="h-3.5 w-3.5 text-amber-300" />
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200">
                            {b.label}
                          </p>
                        </div>
                        <p
                          className="mt-2 text-[13px] leading-relaxed text-slate-300"
                          style={{ wordBreak: 'keep-all' }}
                        >
                          {b.text}
                        </p>
                      </div>
                    )
                  })}
              </div>
            </section>
          )}

        {/* Counselor CTA — embedded at end of report */}
        {activeTab === 'next' && (
        <section className="rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(124,92,255,0.18),rgba(34,211,238,0.08))] p-6 backdrop-blur-md sm:p-7">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-violet-400/20">
              <MessageCircle className="h-5 w-5 text-violet-200" />
            </div>
            <div className="flex-1">
              <h2 className="text-balance text-[1.1rem] font-semibold leading-tight tracking-[-0.01em] text-white">
                이 궁합으로 더 깊이 물어보세요
              </h2>
              <p
                className="mt-1.5 text-[13.5px] leading-relaxed text-slate-300"
                style={{ wordBreak: 'keep-all' }}
              >
                두 분의 사주·점성·교차 데이터를 모두 알고 있는 카운슬러와 1:1로 — 이상형, 결혼
                시기, 갈등 해결, 미래 흐름 등 궁금한 것 무엇이든.
              </p>
              <Link
                href="/compatibility/counselor"
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[linear-gradient(135deg,#7c5cff_0%,#9b7fff_100%)] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_12px_40px_rgba(124,92,255,0.35)] transition hover:opacity-90"
              >
                상담사와 대화 시작
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>
        )}

        {/* Action items */}
        {activeTab === 'next' && actionItems.length > 0 && (
          <section className="rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(124,92,255,0.12),rgba(124,92,255,0.02))] p-6 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-violet-300" />
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.22em] text-violet-300">
                실천 가이드
              </h2>
            </div>
            <ul className="mt-4 space-y-2.5">
              {actionItems.slice(0, 8).map((item, i) => (
                <li
                  key={i}
                  className="flex gap-3 text-[14px] leading-relaxed text-slate-200"
                  style={{ wordBreak: 'keep-all' }}
                >
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-violet-400/20 text-[11px] font-semibold text-violet-200">
                    {i + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
})
