'use client'

/**
 * Day tier insights — 4 직관 카드 (현재 raw 텍스트/chip 흩어진 것 통합).
 *
 *   1. DayVerdict   — score + scoreBreakdown(사주·점성 축 + 합의) + 중심 영역 + oneLine
 *   2. DayDomains   — themeScores 5 bar + matchedPatterns chip
 *   3. DayWhy       — dailyGanjiNarrative + evidence.cross.sajuDetails/astroDetails + shinsalActive
 *   4. DayHourly    — DailyHourlyChart wrap + best/worst hour + fusion.advice.do/avoid
 *
 * 각 카드는 엔진 데이터 없으면 자체 스킵 — UI 노이즈 0.
 * 모든 텍스트는 엔진이 plain text 로 직접 생성한 것 그대로 (jargon transform X).
 */

import { motion } from 'framer-motion'
import { Sparkles, BookOpen, Clock3 } from 'lucide-react'
import type { ImportantDate } from '../../types'
import type { GradeInfo } from '../../scoreGrade'
import { getStarRating } from '../../scoreGrade'
import DailyHourlyChart from '../../DailyHourlyChart'
import { getCalLabels, type CalLocale } from '../labels'
import { useCountUp } from './useCountUp'
import NoiseOverlay from './NoiseOverlay'
import { cardStack, cardItem, listStack, listItem } from './motionVariants'
import DomainBar from './DomainBar'
import SplitAxisBar from './SplitAxisBar'

type ThemeKey = 'love' | 'money' | 'career' | 'health' | 'growth'
type FusionAdvice = { do?: string[]; avoid?: string[] }
type HourlySlot = { hour: number; score?: number; reason?: string }
type HourlySlots = { best: HourlySlot[]; worst: HourlySlot[] } | null

interface Props {
  importantDate: ImportantDate | null
  dateStr: string
  grade: GradeInfo
  /** 최종 점수 (보통 importantDate.displayScore ?? importantDate.score) */
  score: number
  /** "오늘은 ~" 한 줄 (engine 생성, calendarDailyView.oneLineSummary 우선) */
  oneLine?: string | null
  /** 중심 영역 라벨 (calendarDailyView.frontDomainLabel 류) */
  frontDomain?: string | null
  /** fusion.advice (24h 카드 추진/보류 리스트) */
  advice?: FusionAdvice
  /** dailyHourlySlots (24h 카드 베스트/주의 시간) */
  hourlySlots?: HourlySlots
  /** fusion.hourly.slots — 24h 차트 (engineSignals 대체) */
  hourlySeries?: Array<{ hour: number; score: number }> | null
  locale?: CalLocale
}

export default function DayInsights({
  importantDate,
  dateStr,
  grade,
  score,
  oneLine,
  frontDomain,
  advice,
  hourlySlots,
  hourlySeries,
  locale,
}: Props) {
  if (!importantDate) return null
  return (
    <motion.div
      className="space-y-4"
      variants={cardStack}
      initial="hidden"
      animate="show"
      key={dateStr}
    >
      <motion.div variants={cardItem}>
        <DayVerdictCard
          grade={grade}
          score={score}
          importantDate={importantDate}
          oneLine={oneLine}
          frontDomain={frontDomain}
          locale={locale}
        />
      </motion.div>
      {/* Domains + Why 데스크탑 2-col, 모바일 stack */}
      <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4">
        <motion.div variants={cardItem}>
          <DayDomainsCard importantDate={importantDate} locale={locale} />
        </motion.div>
        <motion.div variants={cardItem}>
          <DayWhyCard importantDate={importantDate} locale={locale} />
        </motion.div>
      </div>
      <motion.div variants={cardItem}>
        <DayHourlyCard
          importantDate={importantDate}
          dateStr={dateStr}
          advice={advice}
          hourlySlots={hourlySlots}
          hourlySeries={hourlySeries}
          locale={locale}
        />
      </motion.div>
    </motion.div>
  )
}

// ── 1. DayVerdict ────────────────────────────────────────────────────
function DayVerdictCard({
  grade,
  score,
  importantDate,
  oneLine,
  frontDomain,
  locale,
}: {
  grade: GradeInfo
  score: number
  importantDate: ImportantDate
  oneLine?: string | null
  frontDomain?: string | null
  locale?: CalLocale
}) {
  const t = getCalLabels(locale)
  const sb = importantDate.scoreBreakdown
  const sajuAxis = sb
    ? Math.round(typeof sb.sajuAxisRaw === 'number' ? sb.sajuAxisRaw : sb.sajuAxis)
    : null
  const astroAxis = sb
    ? Math.round(typeof sb.astroAxisRaw === 'number' ? sb.astroAxisRaw : sb.astroAxis)
    : null
  const agreement = sb?.axisAgreement ?? null
  const animatedScore = useCountUp(score)

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${grade.borderClass} ${grade.heroBgClass} ${grade.heroShadowClass} px-5 py-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]`}
    >
      <NoiseOverlay opacity={0.025} />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-3 -bottom-6 text-[140px] leading-none opacity-[0.06] select-none"
      >
        {grade.emoji}
      </span>
      <div className="relative flex items-center gap-4">
        <span className="text-4xl shrink-0 leading-none" aria-hidden>
          {grade.emoji}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 leading-none mb-1.5">
            <span
              className="text-3xl sm:text-4xl font-black tracking-tight text-amber-300 leading-none"
              title={String(animatedScore)}
              aria-label={`${getStarRating(score).stars} / 5`}
            >
              {'★'.repeat(getStarRating(score).stars)}
              <span className="text-zinc-700">{'☆'.repeat(5 - getStarRating(score).stars)}</span>
            </span>
            <span className={`text-base font-black ${grade.colorClass}`}>
              {t.gradeLabel(grade.key)}
            </span>
          </div>
          {oneLine && <p className="text-sm text-zinc-200 leading-snug line-clamp-2">{oneLine}</p>}
        </div>
      </div>

      {(sajuAxis !== null || frontDomain) && (
        <div className="relative mt-3 pt-3 border-t border-white/5 space-y-2.5">
          {sajuAxis !== null && astroAxis !== null && (
            <SplitAxisBar
              sajuScore={sajuAxis}
              astroScore={astroAxis}
              agreement={agreement}
              locale={locale}
            />
          )}
          {frontDomain && (
            <div className="flex items-center justify-end text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                  {t.dayVerdictDomainPrefix}
                </span>
                <span className="font-bold text-zinc-100">{frontDomain}</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── 2. DayDomains ────────────────────────────────────────────────────
function DayDomainsCard({
  importantDate,
  locale,
}: {
  importantDate: ImportantDate
  locale?: CalLocale
}) {
  const t = getCalLabels(locale)
  const themes = importantDate.themeScores ?? {}
  const themeKeys: ThemeKey[] = ['love', 'money', 'career', 'health', 'growth']
  const ranked = themeKeys
    .map((theme) => ({
      theme,
      score: typeof themes[theme] === 'number' ? (themes[theme] as number) : 0,
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
  const patterns = (importantDate.matchedPatterns ?? [])
    .filter((p) => p.headline || p.name)
    .slice(0, 3)

  if (ranked.length === 0 && patterns.length === 0) return null
  const topTheme = ranked[0]?.theme

  return (
    <div className="relative bg-gradient-to-br from-zinc-900/60 via-zinc-900/45 to-zinc-950/55 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-xl overflow-hidden">
      <div className="pointer-events-none absolute -top-16 -left-12 w-40 h-40 bg-amber-500/8 blur-3xl rounded-full" />
      <div className="relative flex items-baseline justify-between mb-4">
        <h3 className="text-lg font-bold text-amber-200 flex items-center gap-2 group">
          <Sparkles className="w-4 h-4 text-amber-400 group-hover:text-amber-300 transition" />
          {t.dayDomainsTitle}
        </h3>
        <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
          {t.contextTodayEnergy}
        </span>
      </div>
      {ranked.length > 0 && (
        <div className="relative space-y-2.5">
          {ranked.map((r) => (
            <DomainBar
              key={r.theme}
              label={t.themeName(r.theme)}
              score={r.score}
              isTop={r.theme === topTheme}
            />
          ))}
        </div>
      )}
      {patterns.length > 0 && (
        <div className="relative mt-4 pt-4 border-t border-white/5">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">
            {t.dayPatternsLabel}
          </p>
          <div className="space-y-1.5">
            {patterns.map((p) => (
              <div
                key={p.id}
                className="rounded-md bg-[rgba(212,181,114,0.10)] border border-[rgba(212,181,114,0.15)] px-2.5 py-2 text-[11px]"
              >
                <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                  <span className="font-semibold text-[#e8cc8a]">{p.name}</span>
                  {p.headline && (
                    <span className="text-[#e8cc8a]/75 font-medium">· {p.headline}</span>
                  )}
                </div>
                {p.action && (
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-[9px] uppercase tracking-widest text-emerald-300/80 font-bold shrink-0">
                      {t.dayPatternActionLabel}
                    </span>
                    <span className="text-zinc-200 leading-snug">{p.action}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── 3. DayWhy ────────────────────────────────────────────────────────
function DayWhyCard({
  importantDate,
  locale,
}: {
  importantDate: ImportantDate
  locale?: CalLocale
}) {
  const t = getCalLabels(locale)
  const ganji = importantDate.dailyGanjiNarrative?.trim()
  const sajuDetails = importantDate.evidence?.cross?.sajuDetails ?? []
  const astroDetails = importantDate.evidence?.cross?.astroDetails ?? []
  const bridges = importantDate.evidence?.cross?.bridges ?? []
  const shinsal = importantDate.shinsalActive ?? []
  const agreement = importantDate.scoreBreakdown?.axisAgreement ?? null

  const hasAnything =
    ganji ||
    sajuDetails.length > 0 ||
    astroDetails.length > 0 ||
    bridges.length > 0 ||
    shinsal.length > 0
  if (!hasAnything) return null

  return (
    <div className="bg-zinc-900/40 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6">
      <h3 className="text-base font-semibold text-zinc-200 flex items-center gap-2 mb-5 group">
        <BookOpen className="w-4 h-4 text-amber-400/80 group-hover:text-amber-300 transition" />
        {t.dayWhyTitle}
      </h3>
      {ganji && (
        <p className="text-sm text-zinc-200 leading-relaxed mb-5 whitespace-pre-line">{ganji}</p>
      )}
      <div className="space-y-4">
        {sajuDetails.length > 0 && (
          <WhyBlock label={t.dayWhySajuLabel} items={sajuDetails} tone="saju" />
        )}
        {astroDetails.length > 0 && (
          <WhyBlock label={t.dayWhyAstroLabel} items={astroDetails} tone="astro" />
        )}
        {bridges.length > 0 && (
          <CrossBridgeInline
            bridge={bridges[0]}
            agreement={agreement}
            alignedHeader={t.crossSpotAlignedHeader}
            opposedHeader={t.crossSpotOpposedHeader}
            mixedHeader={t.dayWhyCrossLabel}
          />
        )}
        {shinsal.length > 0 && (
          <WhyBlock
            label={t.dayWhyShinsalLabel}
            items={shinsal.map((s) => `${s.name} — ${s.affectedArea}`)}
            tone="shinsal"
          />
        )}
      </div>
    </div>
  )
}

/**
 * DayWhy 안 cross bridges 인라인 spot — axisAgreement 기준 톤 분기:
 *   - aligned → emerald + ✨ + bridges[0]
 *   - opposed → rose + ⚠️ + bridges[0]
 *   - mixed/unknown → zinc + bridges[0]
 */
function CrossBridgeInline({
  bridge,
  agreement,
  alignedHeader,
  opposedHeader,
  mixedHeader,
}: {
  bridge: string
  agreement: 'aligned' | 'mixed' | 'opposed' | null
  alignedHeader: string
  opposedHeader: string
  mixedHeader: string
}) {
  const tone: 'aligned' | 'opposed' | 'mixed' =
    agreement === 'aligned' ? 'aligned' : agreement === 'opposed' ? 'opposed' : 'mixed'
  const borderClass =
    tone === 'aligned'
      ? 'border-emerald-500/30'
      : tone === 'opposed'
        ? 'border-rose-500/30'
        : 'border-white/10'
  const bgClass =
    tone === 'aligned'
      ? 'bg-emerald-950/20'
      : tone === 'opposed'
        ? 'bg-rose-950/20'
        : 'bg-zinc-900/40'
  const headerClass =
    tone === 'aligned'
      ? 'text-emerald-300'
      : tone === 'opposed'
        ? 'text-rose-300'
        : 'text-zinc-300/90'
  const icon = tone === 'aligned' ? '✨' : tone === 'opposed' ? '⚠️' : null
  const header = tone === 'aligned' ? alignedHeader : tone === 'opposed' ? opposedHeader : mixedHeader
  return (
    <div className={`rounded-lg border ${borderClass} ${bgClass} p-3`}>
      <div className="flex items-center gap-2 mb-1.5">
        {icon && (
          <span aria-hidden className="text-sm leading-none">
            {icon}
          </span>
        )}
        <p className={`text-[10px] uppercase tracking-widest font-bold ${headerClass}`}>{header}</p>
      </div>
      <p className="text-sm text-zinc-200 leading-relaxed">{bridge}</p>
    </div>
  )
}

function WhyBlock({
  label,
  items,
  tone,
}: {
  label: string
  items: string[]
  tone: 'saju' | 'astro' | 'cross' | 'shinsal'
}) {
  const labelColor =
    tone === 'saju'
      ? 'text-amber-300/90'
      : tone === 'astro'
        ? 'text-cyan-300/90'
        : tone === 'cross'
          ? 'text-emerald-300/90'
          : 'text-[#d4b572]/90'
  const dotColor =
    tone === 'saju'
      ? 'bg-amber-400'
      : tone === 'astro'
        ? 'bg-cyan-400'
        : tone === 'cross'
          ? 'bg-emerald-400'
          : 'bg-[#d4b572]'
  return (
    <div>
      <h4 className={`text-sm font-bold mb-2 tracking-wide ${labelColor}`}>{label}</h4>
      <motion.ul className="space-y-1.5" variants={listStack} initial="hidden" animate="show">
        {items.slice(0, 5).map((item, i) => (
          <motion.li
            key={i}
            variants={listItem}
            className="flex items-start gap-2 text-sm text-zinc-300 leading-snug"
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-2 ${dotColor}`} />
            <span>{item}</span>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  )
}

// ── 4. DayHourly ─────────────────────────────────────────────────────
function DayHourlyCard({
  importantDate,
  dateStr,
  advice,
  hourlySlots,
  hourlySeries,
  locale,
}: {
  importantDate?: ImportantDate | null
  dateStr: string
  advice?: FusionAdvice
  hourlySlots?: HourlySlots
  hourlySeries?: Array<{ hour: number; score: number }> | null
  locale?: CalLocale
}) {
  const t = getCalLabels(locale)
  const bestHour = hourlySlots?.best?.[0]
  const worstHour = hourlySlots?.worst?.[0]
  const doList = (advice?.do ?? []).slice(0, 4)
  const avoidList = (advice?.avoid ?? []).slice(0, 4)

  return (
    <div className="relative bg-gradient-to-br from-zinc-900/55 via-zinc-900/40 to-cyan-950/15 backdrop-blur-sm border border-cyan-500/15 rounded-2xl p-6 overflow-hidden">
      <div className="pointer-events-none absolute -top-16 -right-12 w-40 h-40 bg-cyan-500/8 blur-3xl rounded-full" />
      <h3 className="relative text-base font-semibold text-cyan-200 flex items-center gap-2 mb-5 group">
        <Clock3 className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300 transition" />
        {t.dayHourlyTitle}
      </h3>

      <div className="relative">
        <DailyHourlyChart
          slots={hourlySeries}
          importantDate={importantDate}
          dateStr={dateStr}
          locale={locale}
        />
      </div>

      {(bestHour || worstHour) && (
        <div className="relative grid grid-cols-2 gap-3 mt-4">
          {bestHour && (
            <div className="bg-emerald-900/15 border border-emerald-500/25 rounded-xl p-4">
              <div className="text-[10px] font-bold text-emerald-400 mb-1 tracking-wider uppercase">
                {t.dayHourlyBestHour}
              </div>
              <div className="text-lg font-black text-white leading-tight">
                {t.formatHour(bestHour.hour)}
              </div>
              {bestHour.reason && (
                <p className="text-[11px] text-emerald-200/80 mt-1 leading-snug line-clamp-2">
                  {bestHour.reason}
                </p>
              )}
            </div>
          )}
          {worstHour && (
            <div className="bg-rose-900/15 border border-rose-500/25 rounded-xl p-4">
              <div className="text-[10px] font-bold text-rose-400 mb-1 tracking-wider uppercase">
                {t.dayHourlyWorstHour}
              </div>
              <div className="text-lg font-black text-white leading-tight">
                {t.formatHour(worstHour.hour)}
              </div>
              {worstHour.reason && (
                <p className="text-[11px] text-rose-200/80 mt-1 leading-snug line-clamp-2">
                  {worstHour.reason}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {(doList.length > 0 || avoidList.length > 0) && (
        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {doList.length > 0 && (
            <AdviceList label={t.dayHourlyPushLabel} items={doList} tone="push" />
          )}
          {avoidList.length > 0 && (
            <AdviceList label={t.dayHourlyAvoidLabel} items={avoidList} tone="avoid" />
          )}
        </div>
      )}
    </div>
  )
}

function AdviceList({
  label,
  items,
  tone,
}: {
  label: string
  items: string[]
  tone: 'push' | 'avoid'
}) {
  const labelColor = tone === 'push' ? 'text-emerald-300' : 'text-rose-300'
  const dotColor = tone === 'push' ? 'bg-emerald-400' : 'bg-rose-400'
  return (
    <div className="bg-zinc-950/40 border border-white/5 rounded-xl p-3">
      <p className={`text-[10px] uppercase tracking-widest font-bold mb-2 ${labelColor}`}>
        {label}
      </p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-zinc-200 leading-snug">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${dotColor}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
