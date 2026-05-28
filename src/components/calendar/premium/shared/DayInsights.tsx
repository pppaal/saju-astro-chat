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
import DailyHourlyChart from '../../DailyHourlyChart'
import { getCalLabels, type CalLocale } from '../labels'
import { useCountUp } from './useCountUp'
import NoiseOverlay from './NoiseOverlay'
import { cardStack, cardItem, barFill, listStack, listItem } from './motionVariants'

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
            <span className="text-4xl sm:text-5xl font-black tabular-nums bg-gradient-to-br from-white to-zinc-300 bg-clip-text text-transparent">
              {animatedScore}
            </span>
            <span className={`text-base font-black ${grade.colorClass}`}>
              {t.gradeLabel(grade.key)}
            </span>
          </div>
          {oneLine && <p className="text-sm text-zinc-200 leading-snug line-clamp-2">{oneLine}</p>}
        </div>
      </div>

      {(sajuAxis !== null || frontDomain) && (
        <div className="relative mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
          {sajuAxis !== null && (
            <span className="inline-flex items-center gap-1">
              <span className="text-zinc-500">{t.dayWhySajuLabel}</span>
              <span className="font-bold text-amber-200 tabular-nums">{sajuAxis}</span>
            </span>
          )}
          {astroAxis !== null && (
            <span className="inline-flex items-center gap-1">
              <span className="text-zinc-500">{t.dayWhyAstroLabel}</span>
              <span className="font-bold text-cyan-200 tabular-nums">{astroAxis}</span>
            </span>
          )}
          {agreement && (
            <span
              className={`text-[11px] font-medium ${
                agreement === 'aligned'
                  ? 'text-emerald-300'
                  : agreement === 'opposed'
                    ? 'text-rose-300'
                    : 'text-zinc-400'
              }`}
            >
              {t.dayAxisAgreement(agreement)}
            </span>
          )}
          {frontDomain && (
            <span className="inline-flex items-center gap-1.5 ml-auto">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                {t.dayVerdictDomainPrefix}
              </span>
              <span className="font-bold text-zinc-100">{frontDomain}</span>
            </span>
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
              theme={r.theme}
              score={r.score}
              isTop={r.theme === topTheme}
              t={t}
            />
          ))}
        </div>
      )}
      {patterns.length > 0 && (
        <div className="relative mt-4 pt-4 border-t border-white/5">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">
            {t.dayPatternsLabel}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {patterns.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-violet-500/10 text-violet-200 text-[11px]"
              >
                <span className="font-semibold">{p.name}</span>
                {p.headline && <span className="opacity-80 font-medium">· {p.headline}</span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DomainBar({
  theme,
  score,
  isTop,
  t,
}: {
  theme: ThemeKey
  score: number
  isTop: boolean
  t: ReturnType<typeof getCalLabels>
}) {
  const pct = Math.max(0, Math.min(100, Math.round(score)))
  return (
    <div className="flex items-center gap-3 group">
      <span
        className={`w-12 text-xs font-semibold shrink-0 ${isTop ? 'text-amber-200' : 'text-zinc-400'}`}
      >
        {t.themeName(theme)}
      </span>
      <div className="flex-1 h-2 rounded-full bg-zinc-800/70 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${
            isTop
              ? 'bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.45)]'
              : 'bg-gradient-to-r from-zinc-500 to-zinc-600'
          }`}
          variants={barFill}
          custom={pct}
        />
      </div>
      <span
        className={`text-xs font-bold w-8 text-right shrink-0 tabular-nums ${
          isTop ? 'text-amber-200' : 'text-zinc-400'
        }`}
      >
        {pct}
      </span>
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
        {bridges.length > 0 && <WhyBlock label={t.dayWhyCrossLabel} items={bridges} tone="cross" />}
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
          : 'text-violet-300/90'
  const dotColor =
    tone === 'saju'
      ? 'bg-amber-400'
      : tone === 'astro'
        ? 'bg-cyan-400'
        : tone === 'cross'
          ? 'bg-emerald-400'
          : 'bg-violet-400'
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
  locale,
}: {
  importantDate: ImportantDate
  dateStr: string
  advice?: FusionAdvice
  hourlySlots?: HourlySlots
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
        <DailyHourlyChart importantDate={importantDate} dateStr={dateStr} locale={locale} />
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
