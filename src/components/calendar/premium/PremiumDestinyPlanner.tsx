'use client'

/**
 * PremiumDestinyPlanner — 4-스케일(인생→연→월→일) 줌 대시보드.
 *
 * 디자인 셸은 제공된 목업(zinc-950 + indigo glow + layoutId 탭)을 따르되,
 * mock 랜덤 데이터 대신 **실제 엔진 산출물**을 그대로 흘려보낸다. 특히 그동안
 * 화면에 한 번도 노출 안 되던 콘텐츠를 끝까지 보여주는 게 목적:
 *   - monthlyInterpretation.narrative (합성 산문)
 *   - monthlyInterpretation.sections[] (룰별 해석 카드 — month tier 에서 "jargon"
 *     이라며 3카드로 치환됐던 그 원문)
 *   - themeBreakdown 전체 5테마 (기존엔 top 1~2 만 chip)
 *   - lifetimePivots / scoreBreakdown 축 / 24h fusion / convergence 큰 날
 *
 * 데이터가 없으면 해당 블록은 통째로 스킵 — fake fallback 노출 X.
 */

import React, { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  Globe,
  Calendar,
  CalendarDays,
  Clock,
  Star,
  AlertCircle,
  Activity,
  ChevronRight,
  Sparkles,
  ScrollText,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  BarChart,
  Bar,
  Cell,
} from 'recharts'

import type { BirthInfo, CalendarData, ImportantDate } from '../types'
import type { YearMonthly } from '../DestinyMatrixPlanner'
import { ganjiToKorean } from '@/lib/saju/ganjiKo'
import { getGrade } from '../scoreGrade'
import { useDateDetail } from '../useDateDetail'
import { getCalLabels, type CalLocale } from './labels'

// ─────────────────────────────── types & helpers ───────────────────────────

type ViewMode = 'lifetime' | 'year' | 'month' | 'day'
type ThemeKey = 'love' | 'money' | 'career' | 'health' | 'growth'

interface Props {
  data?: CalendarData | null
  birthInfo?: BirthInfo | null
  /** 월별 요약(v2) — year tab 흐름/테마 바에 사용 */
  yearlyMonthly?: YearMonthly[]
  /** 올해 큰 날 — year tab "큰 날" 리스트 */
  yearlyConvergence?: NonNullable<ImportantDate['monthlyInterpretation']>['yearlyConvergence']
  locale?: CalLocale
}

const THEME_ORDER: ThemeKey[] = ['love', 'money', 'career', 'health', 'growth']

function avg(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
}
function pickScore(d: ImportantDate): number {
  return d.displayScore ?? d.score
}
function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

// ─────────────────────────────── animation variants ────────────────────────

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
}
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
}

// ═══════════════════════════════ main ═══════════════════════════════════════

export default function PremiumDestinyPlanner({
  data,
  birthInfo,
  yearlyMonthly,
  yearlyConvergence,
  locale,
}: Props = {}) {
  const t = getCalLabels(locale)
  const [viewMode, setViewMode] = useState<ViewMode>('month')

  const [today, setToday] = useState<Date>(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setToday(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const year = data?.year ?? today.getFullYear()
  const [selMonth, setSelMonth] = useState<number>(() => today.getMonth()) // 0-indexed
  const [selDay, setSelDay] = useState<number>(() => today.getDate())

  // ── 본명 뱃지 (제목 자리를 대체 — 누구의 운인지) ──
  const natalSaju = useMemo(
    () => data?.allDates?.find((d) => d.natalSaju)?.natalSaju ?? null,
    [data]
  )
  const natalDayPillar = natalSaju ? `${natalSaju.dayStem}${natalSaju.dayBranch}` : null

  // ── month 단위 파생 ──
  const monthDates = useMemo<ImportantDate[]>(() => {
    if (!data?.allDates) return []
    const prefix = `${year}-${pad2(selMonth + 1)}-`
    return data.allDates.filter((d) => d.date.startsWith(prefix))
  }, [data, year, selMonth])

  const monthScore = useMemo(
    () => (monthDates.length ? Math.round(avg(monthDates.map(pickScore))) : null),
    [monthDates]
  )

  // monthlyInterpretation 은 API 가 서빙한 "이번 달" 고정 top-level 객체다.
  // 따라서 다른 달을 선택했을 때 그대로 붙이면 8월 헤더 밑에 6월 해석이 박히는
  // 오부착이 된다 — 이번 달과 일치할 때만 노출(나머지 달은 점수·흐름만, 정직).
  const isCurrentMonth = year === today.getFullYear() && selMonth === today.getMonth()
  const monthInterp = useMemo(
    () => (isCurrentMonth ? (data?.monthlyInterpretation ?? null) : null),
    [isCurrentMonth, data]
  )

  const selDateStr = `${year}-${pad2(selMonth + 1)}-${pad2(selDay)}`
  const selDate = useMemo(
    () => data?.allDates?.find((d) => d.date === selDateStr) ?? null,
    [data, selDateStr]
  )

  // ── day fusion (24h 정밀 + 축 + advice) ──
  const selJsDate = useMemo(() => new Date(year, selMonth, selDay), [year, selMonth, selDay])
  const { detail: dateDetail } = useDateDetail({
    selectedDay: selJsDate,
    birthInfo: birthInfo ?? { birthDate: '', birthTime: '', birthPlace: '', gender: 'Male' },
    // 일 탭일 때만 fetch — 다른 탭에선 fusion 미사용이라 불필요한 호출 차단.
    enabled: viewMode === 'day',
  })
  const fusion = dateDetail?.fusion
  // 신살은 연간 응답엔 없고 date-detail(일별)에서만 계산됨 — 일 탭에서 그 날 발동분.
  const shinsal = dateDetail?.shinsalActive ?? []

  const drillToMonth = (m: number) => {
    setSelMonth(m)
    setSelDay((d) => Math.min(d, new Date(year, m + 1, 0).getDate()))
    setViewMode('month')
  }
  const drillToDay = (d: number) => {
    setSelDay(d)
    setViewMode('day')
  }

  const isToday =
    year === today.getFullYear() &&
    selMonth === today.getMonth() &&
    selDay === today.getDate()
  const tabs: Array<{ id: ViewMode; label: string; icon: typeof Globe }> = [
    { id: 'lifetime', label: locale === 'en' ? 'Lifetime' : '인생', icon: Globe },
    { id: 'year', label: String(year), icon: Calendar },
    { id: 'month', label: t.fmtMonth(selMonth + 1), icon: CalendarDays },
    // 오늘이면 "오늘", 다른 날을 보고 있으면 그 날짜를 라벨에 반영.
    { id: 'day', label: isToday ? t.tabDay : t.fmtMonthDay(selMonth + 1, selDay), icon: Clock },
  ]

  return (
    <div className="min-h-screen bg-zinc-950 flex items-start justify-center p-4 sm:p-8 font-sans selection:bg-indigo-500/30">
      <div className="w-full max-w-2xl relative">
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-64 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none" />

        <div className="relative bg-zinc-900/40 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl overflow-hidden flex flex-col min-h-[800px]">
          {/* Header — 제목 제거. 본명 일주/별자리만 정체성으로 남긴다. */}
          {(natalDayPillar || data?.astroIdentity?.sunSign) && (
            <header className="px-8 pt-8 pb-2 flex items-center justify-center gap-2 text-[11px] font-medium">
              {natalDayPillar && (
                <span className="inline-flex items-center gap-1 text-amber-300/85">
                  <Sparkles className="w-3 h-3" />
                  {locale === 'en'
                    ? `${natalDayPillar} pillar`
                    : `${ganjiToKorean(natalDayPillar)} 일주`}
                </span>
              )}
              {natalDayPillar && data?.astroIdentity?.sunSign && (
                <span className="text-zinc-700">·</span>
              )}
              {data?.astroIdentity?.sunSign && (
                <span className="text-cyan-300/85">{data.astroIdentity.sunSign}</span>
              )}
            </header>
          )}

          {/* Tab Bar */}
          <div className="px-8 pt-6 mb-8">
            <div className="flex items-center p-1 bg-zinc-950/50 rounded-2xl border border-white/5 shadow-inner">
              {tabs.map((tab) => {
                const isActive = tab.id === viewMode
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setViewMode(tab.id)}
                    className="relative flex-1 flex flex-col sm:flex-row items-center justify-center py-3 space-y-1 sm:space-y-0 sm:space-x-2 group outline-none"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-white/10 rounded-xl shadow-sm"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <Icon
                      size={16}
                      className={`relative z-10 transition-colors duration-300 ${isActive ? 'text-amber-200' : 'text-zinc-500 group-hover:text-zinc-300'}`}
                    />
                    <span
                      className={`relative z-10 text-xs font-medium tracking-wider transition-colors duration-300 ${isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}
                    >
                      {tab.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 px-6 sm:px-8 pb-10 relative">
            <AnimatePresence mode="wait">
              {viewMode === 'lifetime' && (
                <LifetimeView
                  key="lifetime"
                  pivots={data?.monthlyInterpretation?.lifetimePivots?.pivots}
                  onZoom={() => setViewMode('year')}
                  locale={locale}
                />
              )}
              {viewMode === 'year' && (
                <YearView
                  key="year"
                  year={year}
                  allDates={data?.allDates ?? []}
                  yearlyMonthly={yearlyMonthly}
                  yearlyConvergence={yearlyConvergence}
                  phaseLabel={
                    data?.matrixContract?.overallPhaseLabel ??
                    data?.matrixContract?.overallPhase ??
                    null
                  }
                  selMonth={selMonth}
                  onMonthClick={drillToMonth}
                  locale={locale}
                />
              )}
              {viewMode === 'month' && (
                <MonthView
                  key="month"
                  year={year}
                  month={selMonth}
                  monthLabel={t.fmtYearMonthHeader(year, selMonth + 1)}
                  monthDates={monthDates}
                  monthScore={monthScore}
                  interp={monthInterp}
                  summary={
                    isCurrentMonth
                      ? (data?.monthSummary?.summary ?? data?.calendarMonthView?.oneLineSummary)
                      : null
                  }
                  showReadingHint={!isCurrentMonth && monthScore !== null}
                  onDayClick={drillToDay}
                  locale={locale}
                />
              )}
              {viewMode === 'day' && (
                <DayView
                  key="day"
                  dateStr={selDateStr}
                  day={selDay}
                  weekday={t.weekdayFull[selJsDate.getDay()]}
                  importantDate={selDate}
                  fusion={fusion}
                  shinsal={shinsal}
                  isToday={isToday}
                  nowHour={today.getHours()}
                  todayHourly={data?.todayHourlyTimeSlots}
                  locale={locale}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════ 1. Lifetime ════════════════════════════════

function LifetimeView({
  pivots,
  onZoom,
  locale,
}: {
  pivots?: NonNullable<
    NonNullable<ImportantDate['monthlyInterpretation']>['lifetimePivots']
  >['pivots']
  onZoom: () => void
  locale?: CalLocale
}) {
  const list = pivots ?? []
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className="h-full flex flex-col"
    >
      <motion.div variants={itemVariants} className="mb-10 text-center">
        <h2 className="text-3xl sm:text-4xl font-light text-white mb-3 tracking-tight">
          {locale === 'en' ? 'Life trajectory' : '인생의 궤적'}
        </h2>
        <p className="text-sm text-zinc-400 font-light">
          {locale === 'en'
            ? 'Major pivots where sky and chart turn together.'
            : '점성·사주가 함께 도는 큰 전환의 시기들'}
        </p>
      </motion.div>

      {list.length === 0 ? (
        <motion.p variants={itemVariants} className="text-center text-sm text-zinc-600 py-16">
          {locale === 'en' ? 'No lifetime pivots available.' : '인생 분기점 데이터가 없습니다.'}
        </motion.p>
      ) : (
        <div className="relative flex-1 max-w-md mx-auto w-full">
          <div className="absolute left-[15px] top-4 bottom-4 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
          <div className="space-y-10">
            {list.map((p, idx) => {
              const highlight = p.phase === 'current'
              return (
                <motion.div
                  variants={itemVariants}
                  key={`${p.year}-${idx}`}
                  className="relative pl-12 group"
                  onClick={highlight ? onZoom : undefined}
                  style={{ cursor: highlight ? 'pointer' : 'default' }}
                >
                  <div
                    className={`absolute left-[11px] top-2 w-2 h-2 rounded-full transition-all duration-500 ${
                      highlight
                        ? 'bg-amber-300 shadow-lg shadow-amber-300/50 scale-125'
                        : p.phase === 'past'
                          ? 'bg-zinc-800'
                          : 'bg-zinc-700 group-hover:bg-zinc-500'
                    }`}
                  />
                  <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mb-2">
                    <span
                      className={`text-xs font-semibold tracking-widest ${highlight ? 'text-amber-300' : 'text-zinc-500'}`}
                    >
                      {locale === 'en' ? `age ${p.age}` : `${p.age}세`} · {p.year}
                    </span>
                    {p.bothSystems && (
                      <span className="text-[9px] uppercase tracking-wider bg-fuchsia-500/10 text-fuchsia-200/80 px-2 py-0.5 rounded border border-fuchsia-500/20">
                        {locale === 'en' ? 'Saju + Astro' : '사주·점성 수렴'}
                      </span>
                    )}
                    {highlight && (
                      <span className="text-[9px] uppercase tracking-wider bg-amber-500/10 text-amber-200/80 px-2 py-0.5 rounded border border-amber-500/20">
                        {locale === 'en' ? 'Current Phase' : '지금 이 시기'}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-light text-zinc-200 mb-1 group-hover:text-white transition-colors flex items-center">
                    {p.label}
                    {highlight && (
                      <ChevronRight className="w-5 h-5 ml-2 text-amber-300/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </h3>
                  {p.meaning && (
                    <p className="text-sm text-zinc-500 font-light leading-relaxed">{p.meaning}</p>
                  )}
                  {(p.astro || p.saju) && (
                    <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-zinc-600">
                      {p.astro && <span>☿ {p.astro}</span>}
                      {p.saju && <span>干 {p.saju}</span>}
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ═══════════════════════════════ 2. Year ════════════════════════════════════

function YearView({
  year,
  allDates,
  yearlyMonthly,
  yearlyConvergence,
  phaseLabel,
  selMonth,
  onMonthClick,
  locale,
}: {
  year: number
  allDates: ImportantDate[]
  yearlyMonthly?: YearMonthly[]
  yearlyConvergence?: NonNullable<ImportantDate['monthlyInterpretation']>['yearlyConvergence']
  phaseLabel: string | null
  selMonth: number
  onMonthClick: (m: number) => void
  locale?: CalLocale
}) {
  const t = getCalLabels(locale)

  const { flow, yearScore, themeBars } = useMemo(() => {
    // 월별 점수 — yearlyMonthly 우선, 없으면 allDates 월평균
    let flow: Array<{ month: number; score: number }>
    if (yearlyMonthly && yearlyMonthly.length) {
      flow = yearlyMonthly.map((m) => ({ month: m.month, score: Math.round(m.score) }))
    } else {
      flow = Array.from({ length: 12 }, (_, i) => {
        const prefix = `${year}-${pad2(i + 1)}-`
        const ds = allDates.filter((d) => d.date.startsWith(prefix)).map(pickScore)
        return { month: i + 1, score: Math.round(avg(ds)) }
      })
    }
    const yearScore = Math.round(avg(flow.map((f) => f.score).filter((s) => s > 0)))

    // 12개월 평균 테마 바
    const themeBars: Array<{ theme: ThemeKey; score: number }> = []
    if (yearlyMonthly && yearlyMonthly.length) {
      for (const th of THEME_ORDER) {
        const vals = yearlyMonthly
          .map((m) => m.themes.find((x) => x.theme === th)?.score)
          .filter((v): v is number => typeof v === 'number')
        if (vals.length) themeBars.push({ theme: th, score: Math.round(avg(vals)) })
      }
    }
    return { flow, yearScore, themeBars }
  }, [year, allDates, yearlyMonthly])

  const bigDays = (yearlyConvergence?.keyDays ?? []).slice(0, 6)

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className="space-y-6"
    >
      <motion.div variants={itemVariants} className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl sm:text-4xl font-light text-white mb-1">{year}</h2>
          {phaseLabel && <p className="text-sm text-zinc-400 font-light">{phaseLabel}</p>}
        </div>
        {yearScore > 0 && (
          <div className="text-right">
            <div className="text-xs text-zinc-500 tracking-widest uppercase mb-1">
              {locale === 'en' ? 'Yearly Score' : '올해 점수'}
            </div>
            <div className="text-4xl font-light text-amber-200">
              {yearScore}
              <span className="text-xl text-zinc-600">/100</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* 12개월 흐름 */}
      <motion.div
        variants={itemVariants}
        className="bg-zinc-900/30 p-5 sm:p-6 rounded-3xl border border-white/5"
      >
        <h3 className="text-xs font-medium tracking-widest text-zinc-400 uppercase mb-6 flex items-center">
          <Activity size={14} className="mr-2 text-indigo-400" />
          {locale === 'en' ? '12 Months Flow' : '12개월 흐름'}
        </h3>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={flow} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717a', fontSize: 11 }}
                dy={8}
              />
              <Tooltip
                cursor={{ fill: '#27272a', opacity: 0.4 }}
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                }}
                formatter={((v: number) => [v, locale === 'en' ? 'score' : '점수']) as never}
                labelFormatter={((m: number) => t.fmtMonth(m)) as never}
              />
              <Bar
                dataKey="score"
                radius={[4, 4, 4, 4]}
                onClick={(_, idx) => onMonthClick(idx)}
                className="cursor-pointer"
              >
                {flow.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === selMonth ? '#fcd34d' : '#3f3f46'}
                    className="transition-all duration-300 hover:opacity-80"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* 12개월 평균 테마 */}
      {themeBars.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="bg-zinc-900/30 p-5 sm:p-6 rounded-3xl border border-white/5 space-y-4"
        >
          <h3 className="text-xs font-medium tracking-widest text-zinc-400 uppercase">
            {locale === 'en' ? 'Areas this year' : '올해 영역별 흐름'}
          </h3>
          {themeBars.map((b) => (
            <ThemeBar key={b.theme} label={t.themeName(b.theme)} score={b.score} />
          ))}
        </motion.div>
      )}

      {/* 올해 큰 날 */}
      {bigDays.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-3">
          <h3 className="text-xs font-medium tracking-widest text-zinc-400 uppercase flex items-center">
            <Star size={14} className="mr-2 text-amber-300/70" />
            {locale === 'en' ? 'Big days this year' : '올해 큰 날'}
          </h3>
          {bigDays.map((d) => (
            <BigDayRow key={d.date} day={d} locale={locale} />
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}

// ═══════════════════════════════ 3. Month ═══════════════════════════════════

function MonthView({
  year,
  month,
  monthLabel,
  monthDates,
  monthScore,
  interp,
  summary,
  showReadingHint,
  onDayClick,
  locale,
}: {
  year: number
  month: number
  monthLabel: string
  monthDates: ImportantDate[]
  monthScore: number | null
  interp: NonNullable<ImportantDate['monthlyInterpretation']> | null
  summary?: string | null
  showReadingHint?: boolean
  onDayClick: (d: number) => void
  locale?: CalLocale
}) {
  const t = getCalLabels(locale)

  const flow = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const byDay = new Map<number, number>()
    for (const d of monthDates) {
      const day = parseInt(d.date.slice(8, 10), 10)
      byDay.set(day, pickScore(d))
    }
    return Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      score: byDay.get(i + 1) ?? null,
    }))
  }, [monthDates, year, month])

  const grade = monthScore !== null ? getGrade(monthScore) : null

  // themeRanking + 전체 themeBreakdown (그동안 top1~2 만 보이던 why-card 전부)
  const ranking = interp?.themeRanking ?? []
  const breakdown = interp?.themeBreakdown ?? {}

  // synergy / conflict — keyEvents 우선, 없으면 convergence
  const best = interp?.keyEvents?.best
  const avoidDates = interp?.keyEvents?.avoid?.dates ?? []
  const bigDays = (interp?.convergence?.keyDays ?? []).filter((d) => d.bothSystems).slice(0, 4)
  const cmp = interp?.monthComparison

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className="space-y-6"
    >
      {/* Hero */}
      <motion.div variants={itemVariants} className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl sm:text-4xl font-light text-white mb-1">{monthLabel}</h2>
          {summary && (
            <p className="text-sm text-zinc-400 font-light max-w-xs leading-relaxed">{summary}</p>
          )}
        </div>
        {grade && monthScore !== null && (
          <div className="flex flex-col items-end gap-2">
            <div className="text-3xl font-light text-amber-200">
              {monthScore}
              <span className="text-lg text-zinc-600">/100</span>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                grade.key === 'lucky'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : grade.key === 'unlucky'
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                    : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              {t.gradeLabel(grade.key)}
            </span>
          </div>
        )}
      </motion.div>

      {/* 지난달 대비 */}
      {cmp && (
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs -mt-2"
        >
          <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
            {locale === 'en' ? 'vs last month' : '지난달 대비'}
          </span>
          <span
            className={`font-bold ${cmp.overallDelta > 0 ? 'text-emerald-300' : cmp.overallDelta < 0 ? 'text-rose-300' : 'text-zinc-400'}`}
          >
            {cmp.overallDelta > 0 ? '+' : ''}
            {Math.round(cmp.overallDelta)}
          </span>
          {cmp.themes.slice(0, 3).map((th) => (
            <span
              key={th.theme}
              className={th.dir === 'up' ? 'text-emerald-200/90' : 'text-rose-200/90'}
            >
              <span className="text-zinc-500">{t.themeName(th.theme)}</span>{' '}
              <span className="font-bold tabular-nums">
                {th.dir === 'up' ? '+' : '−'}
                {Math.abs(Math.round(th.delta))}
              </span>
            </span>
          ))}
        </motion.div>
      )}

      {/* 일별 흐름 */}
      <motion.div
        variants={itemVariants}
        className="bg-zinc-900/30 p-5 sm:p-6 rounded-3xl border border-white/5"
      >
        <h3 className="text-xs font-medium tracking-widest text-zinc-400 uppercase mb-5 flex items-center">
          <Activity size={14} className="mr-2 text-indigo-400" />
          {t.fmtDailyFlow}
        </h3>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={flow}
              onClick={(e?: { activeLabel?: string | number }) => {
                const d = Number(e?.activeLabel)
                if (d >= 1) onDayClick(d)
              }}
            >
              <defs>
                <linearGradient id="monthFlowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#52525b', fontSize: 10 }}
                interval={4}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                }}
                formatter={((v: number) => [v, locale === 'en' ? 'score' : '점수']) as never}
                labelFormatter={((d: number) => t.fmtMonthDay(month + 1, d)) as never}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#818cf8"
                strokeWidth={2}
                fill="url(#monthFlowGrad)"
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Synergy / Conflict */}
      {(best || avoidDates.length > 0) && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {best && (
            <div className="bg-zinc-900/20 p-5 rounded-2xl border border-white/5">
              <h3 className="text-xs font-medium tracking-widest text-emerald-400/80 mb-3 flex items-center uppercase">
                <Star size={14} className="mr-2" />
                {locale === 'en' ? 'Best day' : '가장 좋은 날'}
              </h3>
              <div className="text-zinc-200 font-medium mb-1">{best.date}</div>
              <p className="text-sm text-zinc-500 font-light">
                {locale === 'en' ? `score ${best.score}` : `흐름 점수 ${best.score}`}
              </p>
            </div>
          )}
          {avoidDates.length > 0 && (
            <div className="bg-zinc-900/20 p-5 rounded-2xl border border-white/5">
              <h3 className="text-xs font-medium tracking-widest text-rose-400/80 mb-3 flex items-center uppercase">
                <AlertCircle size={14} className="mr-2" />
                {locale === 'en' ? 'Take care' : '조심할 날'}
              </h3>
              <div className="text-zinc-200 font-medium mb-1">{avoidDates.join(', ')}</div>
              <p className="text-sm text-zinc-500 font-light">
                {locale === 'en' ? 'Keep it steady.' : '무리한 결정은 미루기'}
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* 영역별 점수 + 전체 themeBreakdown (why) */}
      {ranking.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="bg-zinc-900/30 p-5 sm:p-6 rounded-3xl border border-white/5 space-y-5"
        >
          <h3 className="text-xs font-medium tracking-widest text-zinc-400 uppercase">
            {locale === 'en' ? 'Why these scores' : '영역별 점수와 근거'}
          </h3>
          {ranking.map((r) => {
            const factors = breakdown[r.theme] ?? []
            return (
              <div key={r.theme}>
                <ThemeBar label={t.themeName(r.theme)} score={r.score} />
                {factors.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {factors.map((f, i) => (
                      <span
                        key={i}
                        className={`text-[10px] px-2 py-0.5 rounded-md border ${
                          f.dir === 'up'
                            ? 'bg-emerald-500/10 border-emerald-500/15 text-emerald-200/90'
                            : 'bg-rose-500/10 border-rose-500/15 text-rose-200/90'
                        }`}
                      >
                        {f.label} {f.dir === 'up' ? '+' : '−'}
                        {Math.abs(Math.round(f.delta))}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </motion.div>
      )}

      {/* 이번 달 큰 날 (수렴) */}
      {bigDays.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-3">
          <h3 className="text-xs font-medium tracking-widest text-zinc-400 uppercase flex items-center">
            <Sparkles size={14} className="mr-2 text-fuchsia-300/70" />
            {locale === 'en' ? 'Convergence days' : '사주·점성이 겹치는 큰 날'}
          </h3>
          {bigDays.map((d) => (
            <BigDayRow key={d.date} day={d} locale={locale} />
          ))}
        </motion.div>
      )}

      {/* 다른 달 — 상세 해석은 이번 달만 제공(서빙 달 한정). 정직한 안내. */}
      {showReadingHint && (
        <motion.p
          variants={itemVariants}
          className="text-center text-xs text-zinc-600 font-light py-6 px-4 leading-relaxed"
        >
          {locale === 'en'
            ? 'Detailed reading is available for the current month. Other months show the flow and scores only.'
            : '상세 해석은 이번 달에서 볼 수 있어요. 다른 달은 흐름과 점수만 표시돼요.'}
        </motion.p>
      )}

      {/* ── 합성 서사 (narrative) — 그동안 화면에 없던 산문 ── */}
      {interp?.narrative && (
        <motion.div
          variants={itemVariants}
          className="bg-zinc-900/30 p-5 sm:p-6 rounded-3xl border border-white/5"
        >
          <h3 className="text-xs font-medium tracking-widest text-zinc-400 uppercase mb-4 flex items-center">
            <ScrollText size={14} className="mr-2 text-amber-200/70" />
            {locale === 'en' ? 'Reading' : '이달의 해석'}
          </h3>
          <NarrativeText text={interp.narrative} />
        </motion.div>
      )}

      {/* ── 섹션별 해석 (sections) — month tier 에서 치환됐던 룰 원문 전부 ── */}
      {interp?.sections && interp.sections.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-3">
          <h3 className="text-xs font-medium tracking-widest text-zinc-400 uppercase flex items-center">
            <ChevronRight size={14} className="mr-1.5 text-zinc-500" />
            {locale === 'en' ? 'In detail' : '자세히 보기'}
          </h3>
          {interp.sections.map((s, i) => (
            <details
              key={`${s.section}-${i}`}
              className="group bg-zinc-900/20 rounded-2xl border border-white/5 overflow-hidden"
              open={i === 0}
            >
              <summary className="cursor-pointer list-none px-5 py-3.5 flex items-center justify-between text-sm font-medium text-zinc-200 hover:bg-white/[0.02]">
                {s.title}
                <ChevronRight className="w-4 h-4 text-zinc-600 transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-5 pb-4 -mt-1">
                <NarrativeText text={s.text} />
              </div>
            </details>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}

// ═══════════════════════════════ 4. Day ═════════════════════════════════════

function DayView({
  dateStr,
  day,
  weekday,
  importantDate,
  fusion,
  shinsal,
  isToday,
  nowHour,
  todayHourly,
  locale,
}: {
  dateStr: string
  day: number
  weekday: string
  importantDate: ImportantDate | null
  fusion: NonNullable<ReturnType<typeof useDateDetail>['detail']>['fusion'] | undefined
  shinsal: NonNullable<NonNullable<ReturnType<typeof useDateDetail>['detail']>['shinsalActive']>
  isToday: boolean
  nowHour: number
  todayHourly?: CalendarData['todayHourlyTimeSlots']
  locale?: CalLocale
}) {
  const t = getCalLabels(locale)
  const month = parseInt(dateStr.slice(5, 7), 10)

  const rawScore = importantDate?.displayScore ?? importantDate?.score ?? fusion?.overallScore ?? null
  const dayScore = typeof rawScore === 'number' ? Math.round(rawScore) : null

  // 사주 / 점성 축 — engine scoreBreakdown 우선, 없으면 fusion 축 점수
  const sajuAxis = importantDate?.scoreBreakdown?.sajuAxis ?? fusion?.sajuAxisScore
  const astroAxis = importantDate?.scoreBreakdown?.astroAxis ?? fusion?.astroAxisScore

  // 24h 시리즈 (fusion 우선)
  const hourSeries = fusion?.hourly?.slots ?? null
  const bestHour = fusion?.hourly?.bestHours?.[0] ?? todayHourly?.best?.[0]

  const oneLine =
    importantDate?.summary ?? fusion?.topInsights?.[0] ?? fusion?.advice?.do?.[0] ?? null

  // 추진 / 보류 — engine 우선, 없으면 fusion advice
  const recommendations =
    importantDate?.recommendations?.length ? importantDate.recommendations : (fusion?.advice?.do ?? [])
  const warnings =
    importantDate?.warnings?.length ? importantDate.warnings : (fusion?.advice?.avoid ?? [])

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className="space-y-6"
    >
      {/* Hero */}
      <motion.div variants={itemVariants} className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl sm:text-4xl font-light text-white mb-1">
            {t.fmtMonthDay(month, day)}{' '}
            <span className="text-xl text-zinc-500">{weekday}</span>
          </h2>
          {importantDate?.dailyGanjiNarrative && (
            <p className="text-sm text-zinc-400 font-light leading-relaxed max-w-xs">
              {importantDate.dailyGanjiNarrative}
            </p>
          )}
        </div>
        {dayScore !== null && (
          <div className="text-right">
            <div className="text-xs text-zinc-500 tracking-widest uppercase mb-1">
              {locale === 'en' ? 'Daily Score' : '오늘 점수'}
            </div>
            <div className="text-4xl font-light text-white">
              {dayScore}
              <span className="text-xl text-zinc-600">/100</span>
            </div>
          </div>
        )}
      </motion.div>

      {oneLine && oneLine !== importantDate?.dailyGanjiNarrative && (
        <motion.p
          variants={itemVariants}
          className="text-sm text-zinc-300 font-light leading-relaxed bg-zinc-900/20 rounded-2xl border border-white/5 px-5 py-4"
        >
          {oneLine}
        </motion.p>
      )}

      {/* 일진 간지·십신 + 충/합/형 — FlowLadder 의 사주 알맹이를 일 탭 inline 으로.
          (사다리 구조 자체는 4탭이 대체하므로 위젯은 생략) */}
      {(importantDate?.longCycleContext?.iljin ||
        (importantDate?.cycleInteractions?.length ?? 0) > 0) && (
        <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-2">
          {importantDate?.longCycleContext?.iljin &&
            (() => {
              const ilj = importantDate.longCycleContext!.iljin!
              const ko = locale === 'en' ? ilj.ganji : ganjiToKorean(ilj.ganji)
              const raw = [ilj.sibsinStem, ilj.sibsinBranch].filter(Boolean) as string[]
              const meanings = Array.from(new Set(raw.map((s) => easySibsin(s, locale))))
              return (
                <span
                  title={raw.join('·')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-amber-500/10 border border-amber-500/20 text-amber-200/90"
                >
                  {ko} {locale === 'en' ? 'day energy' : '그날 기운'}
                  {meanings.length > 0 && (
                    <span className="text-zinc-500 font-light">· {meanings.join(' · ')}</span>
                  )}
                </span>
              )
            })()}
        </motion.div>
      )}

      {/* 충/합/형 — 한자 용어 대신 쉬운말 + 한 줄 설명(blurb 뒷부분) */}
      {(importantDate?.cycleInteractions?.length ?? 0) > 0 && (
        <motion.div variants={itemVariants} className="space-y-2">
          {importantDate!.cycleInteractions!.map((ix, i) => {
            const easy = easyCycleLabel(ix.kind)
            // blurb 예: "...이 천간충 — 결정 압박이 크게 들어옵니다." → 뒷부분만 쉬운 설명
            const meaning = ix.blurb.split('—').slice(1).join('—').trim() || ix.blurb
            return (
              <div key={`${ix.pair}-${i}`} className="flex items-start gap-2 text-xs">
                <span
                  className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-md font-medium border ${easy.cls}`}
                >
                  {easy.label}
                </span>
                <span className="text-zinc-400 font-light leading-relaxed">{meaning}</span>
              </div>
            )
          })}
        </motion.div>
      )}

      {/* 신살 — 그 날 발동분 (date-detail 일별). 길신=emerald / 흉신=rose */}
      {shinsal.length > 0 && (
        <motion.div variants={itemVariants} className="flex flex-wrap gap-2">
          {shinsal.map((s, i) => {
            const bad = s.type.includes('흉') || s.type.toLowerCase().includes('inausp')
            return (
              <span
                key={`${s.name}-${i}`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                  bad
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-200/90'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200/90'
                }`}
              >
                {s.name}
                {s.affectedArea && (
                  <span className="text-zinc-500 font-light">· {s.affectedArea}</span>
                )}
              </span>
            )
          })}
        </motion.div>
      )}

      {/* Energy Axis — 사주/점성 분해 */}
      {(typeof sajuAxis === 'number' || typeof astroAxis === 'number') && (
        <motion.div
          variants={itemVariants}
          className="bg-zinc-900/30 p-5 sm:p-6 rounded-3xl border border-white/5 space-y-5"
        >
          <h3 className="text-xs font-medium tracking-widest text-zinc-400 uppercase">
            {locale === 'en' ? 'Energy Axis' : '에너지 축'}
          </h3>
          {typeof sajuAxis === 'number' && (
            <AxisBar
              label={locale === 'en' ? 'Saju' : '사주'}
              value={Math.round(sajuAxis)}
              from="from-indigo-600"
              to="to-indigo-400"
            />
          )}
          {typeof astroAxis === 'number' && (
            <AxisBar
              label={locale === 'en' ? 'Astrology' : '점성'}
              value={Math.round(astroAxis)}
              from="from-emerald-600"
              to="to-emerald-400"
              delay={0.15}
            />
          )}
          {importantDate?.scoreBreakdown?.axisAgreement && (
            <p className="text-[11px] text-zinc-500">
              {locale === 'en' ? 'Agreement: ' : '합치도: '}
              <span className="text-zinc-300">
                {importantDate.scoreBreakdown.axisAgreement === 'aligned'
                  ? locale === 'en'
                    ? 'aligned'
                    : '일치'
                  : importantDate.scoreBreakdown.axisAgreement === 'opposed'
                    ? locale === 'en'
                      ? 'opposed'
                      : '상충'
                    : locale === 'en'
                      ? 'mixed'
                      : '혼재'}
              </span>
            </p>
          )}
        </motion.div>
      )}

      {/* 24h Timeline */}
      {hourSeries && hourSeries.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="bg-zinc-900/30 p-5 sm:p-6 rounded-3xl border border-white/5"
        >
          <h3 className="text-xs font-medium tracking-widest text-zinc-400 mb-5 flex items-center uppercase">
            <Clock size={14} className="mr-2 text-amber-200/70" />
            {locale === 'en' ? '24H Timeline' : '24시간 흐름'}
          </h3>
          <div className="h-44 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourSeries}>
                <XAxis dataKey="hour" hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                  formatter={((v: number) => [v, locale === 'en' ? 'score' : '점수']) as never}
                  labelFormatter={((h: number) => `${h}:00`) as never}
                />
                <Area
                  type="step"
                  dataKey="score"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  fill="#fbbf24"
                  fillOpacity={0.06}
                />
                {isToday && hourSeries[nowHour] && (
                  <ReferenceDot
                    x={nowHour}
                    y={hourSeries[nowHour].score}
                    r={4}
                    fill="#fbbf24"
                    stroke="#18181b"
                    strokeWidth={2}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {bestHour && (
            <p className="text-[11px] text-zinc-500 mt-3">
              {locale === 'en' ? 'Best hour: ' : '가장 좋은 시간대: '}
              <span className="text-amber-300/90 font-medium">{bestHour.hour}:00</span>
              {'reason' in bestHour && bestHour.reason ? (
                <span className="text-zinc-600"> · {bestHour.reason}</span>
              ) : null}
            </p>
          )}
        </motion.div>
      )}

      {/* 추진 / 보류 */}
      {(recommendations.length > 0 || warnings.length > 0) && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {recommendations.length > 0 && (
            <div className="bg-zinc-900/20 p-5 rounded-2xl border border-white/5">
              <h3 className="text-xs font-medium tracking-widest text-emerald-400/80 mb-3 uppercase">
                {locale === 'en' ? 'Do' : '추진'}
              </h3>
              <ul className="space-y-1.5">
                {recommendations.slice(0, 4).map((r, i) => (
                  <li key={i} className="text-sm text-zinc-400 font-light flex gap-2">
                    <span className="text-emerald-500/60">+</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {warnings.length > 0 && (
            <div className="bg-zinc-900/20 p-5 rounded-2xl border border-white/5">
              <h3 className="text-xs font-medium tracking-widest text-rose-400/80 mb-3 uppercase">
                {locale === 'en' ? 'Hold' : '보류'}
              </h3>
              <ul className="space-y-1.5">
                {warnings.slice(0, 4).map((w, i) => (
                  <li key={i} className="text-sm text-zinc-400 font-light flex gap-2">
                    <span className="text-rose-500/60">−</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}

      {dayScore === null && !importantDate && (
        <motion.p variants={itemVariants} className="text-center text-sm text-zinc-600 py-12">
          {locale === 'en' ? 'No reading for this day.' : '이 날짜의 분석이 없습니다.'}
        </motion.p>
      )}
    </motion.div>
  )
}

// ═══════════════════════════════ shared bits ════════════════════════════════

function ThemeBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
        <span>{label}</span>
        <span className="text-zinc-400 tabular-nums">{score}</span>
      </div>
      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(100, score))}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
        />
      </div>
    </div>
  )
}

function AxisBar({
  label,
  value,
  from,
  to,
  delay = 0,
}: {
  label: string
  value: number
  from: string
  to: string
  delay?: number
}) {
  return (
    <div>
      <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
        <span>{label}</span>
        <span className="text-zinc-300 tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
          transition={{ duration: 1, delay, ease: 'easeOut' }}
          className={`h-full bg-gradient-to-r ${from} ${to} rounded-full`}
        />
      </div>
    </div>
  )
}

function BigDayRow({
  day,
  locale,
}: {
  day: NonNullable<
    NonNullable<ImportantDate['monthlyInterpretation']>['convergence']
  >['keyDays'][number]
  locale?: CalLocale
}) {
  return (
    <div className="bg-zinc-900/20 p-4 rounded-2xl border border-white/5 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-zinc-200">{day.date.slice(5)}</div>
        {day.meaning && (
          <p className="text-xs text-zinc-500 font-light truncate">{day.meaning}</p>
        )}
        {(day.saju.length > 0 || day.astro.length > 0) && (
          <p className="text-[10px] text-zinc-600 mt-0.5 truncate">
            {[...day.saju.slice(0, 1), ...day.astro.slice(0, 1)].join(' · ')}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <div className="text-lg font-light text-amber-200 tabular-nums">{Math.round(day.score)}</div>
        {day.bothSystems && (
          <div className="text-[9px] uppercase tracking-wider text-fuchsia-300/70">
            {locale === 'en' ? 'both' : '수렴'}
          </div>
        )}
      </div>
    </div>
  )
}

/** 십신(편인/정관…) → 쉬운말 의미. 원어는 chip title 로 보존. */
function easySibsin(name: string, locale?: CalLocale): string {
  const ko: Record<string, string> = {
    비견: '경쟁·자립',
    겁재: '경쟁·지출',
    식신: '표현·여유',
    상관: '재능·돌파',
    편재: '큰 재물·기회',
    정재: '안정 재물',
    편관: '압박·도전',
    정관: '책임·명예',
    편인: '아이디어·전문성',
    정인: '배움·보호',
  }
  const en: Record<string, string> = {
    비견: 'self-reliance',
    겁재: 'rivalry·spending',
    식신: 'expression·ease',
    상관: 'talent·breakthrough',
    편재: 'big money·chance',
    정재: 'steady money',
    편관: 'pressure·challenge',
    정관: 'duty·honor',
    편인: 'ideas·expertise',
    정인: 'learning·support',
  }
  return (locale === 'en' ? en : ko)[name] ?? name
}

/** 충/합/형 한자 용어 → 쉬운말 라벨 + 색. (천간/지지 구분 없이 의미만) */
function easyCycleLabel(kind: string): { label: string; cls: string } {
  const rose = 'bg-rose-500/10 border-rose-500/20 text-rose-200/90'
  const emerald = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200/90'
  const amber = 'bg-amber-500/10 border-amber-500/20 text-amber-200/90'
  if (kind.includes('자형')) return { label: '스스로 부담', cls: amber }
  if (kind.includes('합')) return { label: '잘 맞음', cls: emerald }
  if (kind.includes('충')) return { label: '부딪힘', cls: rose }
  if (kind.includes('형')) return { label: '마찰', cls: amber }
  if (kind.includes('해')) return { label: '어긋남', cls: amber }
  if (kind.includes('파')) return { label: '흐트러짐', cls: amber }
  return { label: kind, cls: 'bg-zinc-500/10 border-white/10 text-zinc-300' }
}

/** narrative / section 텍스트 — 줄바꿈 단락 + 간단한 마크다운(**굵게**) 처리 */
function NarrativeText({ text }: { text: string }) {
  const paras = text
    .split(/\n{2,}|\n/)
    .map((p) => p.trim())
    .filter(Boolean)
  return (
    <div className="space-y-2">
      {paras.map((p, i) => (
        <p key={i} className="text-sm text-zinc-400 font-light leading-relaxed">
          {p.split(/(\*\*[^*]+\*\*)/g).map((seg, j) =>
            seg.startsWith('**') && seg.endsWith('**') ? (
              <strong key={j} className="text-zinc-200 font-medium">
                {seg.slice(2, -2)}
              </strong>
            ) : (
              <React.Fragment key={j}>{seg}</React.Fragment>
            )
          )}
        </p>
      ))}
    </div>
  )
}
