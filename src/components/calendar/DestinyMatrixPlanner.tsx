'use client'

import React, { useState, useMemo, useCallback, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, Transition } from '@headlessui/react'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  ScrollText,
  Activity,
  CalendarRange,
  Moon,
  Sun,
  ThumbsUp,
  ThumbsDown,
  Cpu,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react'

import type { BirthInfo, CalendarData, ImportantDate } from './types'
import { ganjiToKorean } from '@/lib/saju/ganjiKo'
import { useDateDetail } from './useDateDetail'
import YearHighlightsCard from './YearHighlightsCard'
import YearDashboard from './premium/YearDashboard'
import MonthlyInterpretationCard from './MonthlyInterpretationCard'
import DailyFlowCard from './DailyFlowCard'
import DailyHourlyChart from './DailyHourlyChart'
import MonthDashboard from './premium/MonthDashboard'
import ThemeRadar from './premium/shared/ThemeRadar'
import Highlights from './premium/shared/Highlights'
import { branchFromHour, getHourNarrative } from '@/lib/calendar-engine/data/hourBranchNarrative'
import { getHourThemeNarrative } from '@/lib/calendar-engine/data/hourThemeNarrative'

// 시진 테마 narrative 선택용 — 그 날 themeScores 의 최고 테마
type HourTheme = 'love' | 'money' | 'career' | 'health' | 'growth'
const HOUR_THEME_KEYS: HourTheme[] = ['love', 'money', 'career', 'health', 'growth']
function topHourTheme(themeScores: Partial<Record<string, number>> | undefined): HourTheme {
  if (!themeScores) return 'growth'
  let best: HourTheme = 'growth'
  let bestV = -Infinity
  for (const k of HOUR_THEME_KEYS) {
    const v = themeScores[k]
    if (typeof v === 'number' && v > bestV) {
      bestV = v
      best = k
    }
  }
  return best
}
import { getGrade } from './scoreGrade'

interface DestinyMatrixPlannerProps {
  /** Engine payload from /api/calendar. When omitted the component falls back to mock data. */
  data?: CalendarData | null
  /** Birth info used to fetch `data`. Reserved for future real wiring. */
  birthInfo?: BirthInfo | null
  /** "올해 큰 날" — 메인 응답에서 분리해 지연 로드한 연간 수렴. */
  yearlyConvergence?: NonNullable<ImportantDate['monthlyInterpretation']>['yearlyConvergence']
  /** 월별 요약(v2) — 연간 수렴과 함께 지연 로드. yearly 뷰 흐름·이유에 사용. */
  yearlyMonthly?: YearMonthly[]
}

export type YearMonthly = {
  month: number
  score: number
  themes: Array<{ theme: 'love' | 'money' | 'career' | 'health' | 'growth'; score: number }>
  tone: 'up' | 'down' | 'flat'
}

type ViewMode = 'yearly' | 'monthly' | 'daily'

// --- Helpers ---
function avg(xs: number[]): number {
  if (xs.length === 0) return 0
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

function pickFinalScore(d: ImportantDate): number {
  return d.displayScore ?? d.score
}

export default function DestinyMatrixPlanner({
  data,
  birthInfo,
  yearlyConvergence,
  yearlyMonthly,
}: DestinyMatrixPlannerProps = {}) {
  const [viewMode, setViewMode] = useState<ViewMode>('monthly')
  const [currentDay, setCurrentDay] = useState<number>(() => new Date().getDate())
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false)
  // 엔진 자기 진단 카드 — 일반 사용자에겐 디버그 노이즈라 디폴트 접힘.
  const [showEngineDiag, setShowEngineDiag] = useState(false)
  // 시간대 자세히 — 디폴트 접힘. Highlights 가 best/caution Top1 만 보여줌으로
  // 단순화한 대신 4 best + 2 worst + 시진 narrative + theme narrative 풀
  // 디테일은 펼치면 노출. 엔진 데이터 손실 없이 가시성만 단계화.
  const [showHourDetail, setShowHourDetail] = useState(false)

  // --- View date (state — prev/next month 이동 가능) -------------------
  // 이전엔 today로 하드코딩돼 month 이동 자체가 안 됐음. 우측 상단 모달의
  // "외부 캘린더 연동 추후 추가 예정" 안내도 그래서 무력화돼 있었다.
  // API는 year 단위로 1년치 allDates를 한 번에 받으니 month 전환은 client-only.
  const today = useMemo(() => new Date(), [])
  const [viewDate, setViewDate] = useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  )
  const viewYear = viewDate.getFullYear()
  const viewMonth = viewDate.getMonth() // 0-indexed

  // ── "오늘" hero — 헤더 고정. 어느 뷰를 보든 항상 사용자가 "지금 무슨 날인지" 알 수 있게.
  //    탭하면 daily 뷰로 점프(currentDay/viewDate 동기). 데이터 없으면 hero 숨김.
  const todayStr = useMemo(() => {
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }, [today])
  const todayWeekday = useMemo(() => {
    const days = ['일', '월', '화', '수', '목', '금', '토']
    return days[today.getDay()]
  }, [today])
  const todayHero = useMemo(() => {
    const d = data?.allDates?.find((x) => x.date === todayStr)
    if (!d) return null
    const score = Math.round(pickFinalScore(d))
    const grade = getGrade(score)
    const oneLine =
      data?.calendarDailyView?.date === todayStr
        ? (data.calendarDailyView.oneLineSummary ?? null)
        : (d.summary ?? null)
    // 점수 분포는 sticky 헤더(공간 좁음)에서는 안 보이고 daily 뷰에서 별도 표시.
    return { score, grade, oneLine }
  }, [data, todayStr])
  const handleHeroClick = useCallback(() => {
    const t = new Date()
    setViewDate(new Date(t.getFullYear(), t.getMonth(), 1))
    setCurrentDay(t.getDate())
    setViewMode('daily')
  }, [])

  const goToPrevMonth = useCallback(() => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
    setCurrentDay(1)
  }, [])
  const goToNextMonth = useCallback(() => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
    setCurrentDay(1)
  }, [])
  const goToThisMonth = useCallback(() => {
    const now = new Date()
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1))
    setCurrentDay(now.getDate())
  }, [])
  const isThisMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth()

  const monthLabel = useMemo(() => {
    const labels = [
      'JAN',
      'FEB',
      'MAR',
      'APR',
      'MAY',
      'JUN',
      'JUL',
      'AUG',
      'SEP',
      'OCT',
      'NOV',
      'DEC',
    ]
    return `${labels[viewMonth]} ${viewYear}`
  }, [viewMonth, viewYear])

  const daysInMonth = useMemo(
    () => new Date(viewYear, viewMonth + 1, 0).getDate(),
    [viewYear, viewMonth]
  )
  const leadingBlanks = useMemo(
    () => new Date(viewYear, viewMonth, 1).getDay(),
    [viewYear, viewMonth]
  )

  // --- Engine-derived: natal day pillar (header badge) ----------------
  const natalSaju = useMemo(
    () => data?.allDates?.find((d) => d.natalSaju)?.natalSaju ?? null,
    [data]
  )
  const natalDayPillar = useMemo(() => {
    if (!natalSaju) return null
    return `${natalSaju.dayStem}${natalSaju.dayBranch}`
  }, [natalSaju])

  // --- Engine-derived: this month's dates -----------------------------
  const monthDates = useMemo<ImportantDate[]>(() => {
    if (!data?.allDates) return []
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-`
    return data.allDates.filter((d) => d.date.startsWith(prefix))
  }, [data, viewYear, viewMonth])

  // 일자 → 등급 키 룩업 — 셀 히트맵 배경에 사용. 같은 cutoff(getGrade,
  // 절대 57/43, scoreGrade.ts)라 MonthHighlightsCard/Daily 라벨과 색 의미 일관.
  const dayGradeMap = useMemo(() => {
    const out = new Map<number, 'lucky' | 'neutral' | 'unlucky'>()
    for (const d of monthDates) {
      const day = parseInt(d.date.slice(8, 10), 10)
      out.set(day, getGrade(pickFinalScore(d)).key)
    }
    return out
  }, [monthDates])

  const monthlySummaryText =
    data?.monthSummary?.summary ?? data?.calendarMonthView?.oneLineSummary ?? null

  const monthScore = useMemo(() => {
    if (monthDates.length === 0) return 84 // mock fallback
    return Math.round(avg(monthDates.map(pickFinalScore)))
  }, [monthDates])

  const phaseLabel =
    data?.matrixContract?.overallPhaseLabel ?? data?.matrixContract?.overallPhase ?? null

  // --- Engine-derived: selected day -----------------------------------
  const selectedDateStr = useMemo(
    () =>
      `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`,
    [viewYear, viewMonth, currentDay]
  )

  const selectedImportantDate = useMemo(() => {
    if (!data?.allDates) return null
    return data.allDates.find((d) => d.date === selectedDateStr) ?? null
  }, [data, selectedDateStr])

  // ── fusion 엔진 (date-detail) — 선택 날짜 1번만 호출 ──
  const selectedDayDate = useMemo(
    () => new Date(viewYear, viewMonth, currentDay),
    [viewYear, viewMonth, currentDay]
  )
  const { detail: dateDetail } = useDateDetail({
    selectedDay: selectedDayDate,
    birthInfo: birthInfo ?? { birthDate: '', birthTime: '', birthPlace: '', gender: 'Male' },
  })
  const fusion = dateDetail?.fusion

  // dailyIndices (총점·연애·재물·건강 3-bar 백킹) 는 day tier ThemeRadar 도입으로
  // 사용처 사라져 제거. 점수는 sticky today hero 가, 도메인 분포는 ThemeRadar 가 표시.

  // --- Daily best/worst hours (engine-precise, 24-hour analysis) -------
  // 엔진은 selectedDate가 *오늘*일 때만 시간대 분석을 yearly 응답에 끼워
  // 보낸다 (`todayHourlyTimeSlots`). 다른 날짜는 자체 hourlyTimeSlots
  // 필드가 차 있을 때만 노출 — 그 외엔 placeholder로 정직하게 비운다.
  const dailyHourlySlots = useMemo(() => {
    // fusion 우선 — 24슬롯 정밀 분석
    if (fusion?.hourly) {
      return {
        best: fusion.hourly.bestHours.slice(0, 4).map((s) => ({
          hour: s.hour,
          score: s.score,
          reason: [
            s.topDomain ?? '',
            s.hourPillar ? `시주 ${s.hourPillar}` : '',
            s.planetaryHour ?? '',
          ]
            .filter(Boolean)
            .join(' · '),
        })),
        worst: fusion.hourly.worstHours.slice(0, 2).map((s) => ({
          hour: s.hour,
          score: s.score,
          reason: [s.hourPillar ? `시주 ${s.hourPillar}` : '', s.planetaryHour ?? '']
            .filter(Boolean)
            .join(' · '),
        })),
      }
    }
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const isToday = selectedDateStr === todayStr
    if (isToday && data?.todayHourlyTimeSlots) {
      return data.todayHourlyTimeSlots
    }
    return null
  }, [fusion, today, selectedDateStr, data])

  const formatHour = (h: number): string => {
    if (h === 0) return '자정 12시'
    if (h === 12) return '정오 12시'
    if (h < 12) return `오전 ${h}시`
    return `오후 ${h - 12}시`
  }

  // Day tier ThemeRadar — 5 도메인. year/month 와 같은 축 순서로 통일해
  // 사용자가 형태 변화로 차이를 인식. themeScores 우선, fusion.domainScores 폴백.
  // 신호 없는 축은 fabricate(50) 대신 있는 축 평균으로 fallback + caption disclose.
  const dayRadarData = useMemo(() => {
    const ORDER: Array<'growth' | 'career' | 'money' | 'love' | 'health'> = [
      'growth',
      'career',
      'money',
      'love',
      'health',
    ]
    const KO: Record<string, string> = {
      growth: '성장',
      career: '직업',
      money: '재물',
      love: '연애',
      health: '건강',
    }
    const ts = selectedImportantDate?.themeScores
    const ds = fusion?.domainScores
    const stats = ORDER.map((k) => {
      const v = typeof ts?.[k] === 'number' ? ts[k] : typeof ds?.[k] === 'number' ? ds[k] : null
      return { name: KO[k], present: v != null, score: v as number | null }
    })
    const present = stats.filter((s) => s.score != null).map((s) => s.score as number)
    const fb = present.length ? present.reduce((a, b) => a + b, 0) / present.length : 50
    const themes = stats.map((s) => ({
      name: s.name,
      score: Math.round(s.present ? (s.score as number) : fb),
    }))
    const missing = stats.filter((s) => !s.present).map((s) => s.name)
    const caption =
      missing.length > 0
        ? `${missing.join('·')} 신호 부족 — 다른 축 평균으로 표시했어요.`
        : undefined
    return { themes, caption }
  }, [selectedImportantDate, fusion])

  // Day tier Highlights — 베스트 시간 / 주의 시간. dailyHourlySlots 에서 1개씩.
  const dayHighlights = useMemo(() => {
    if (!dailyHourlySlots) return null
    const best = dailyHourlySlots.best[0]
    const caution = dailyHourlySlots.worst[0]
    return {
      bestCard: best
        ? {
            value: formatHour(best.hour),
            description: best.reason || '에너지가 가장 좋은 시간',
          }
        : undefined,
      cautionCard: caution
        ? {
            value: formatHour(caution.hour),
            description: caution.reason || '한 박자 쉬어가는 시간',
          }
        : undefined,
    }
  }, [dailyHourlySlots])

  // --- Daily Dos / Donts ----------------------------------------------
  // 엔진이 진짜 advice를 못 만들면 카드 자체를 숨김 (Dos·Donts 모두 빈 배열일 때
  // 렌더 가드). 옛 MOCK_DOS/DONTS는 "충동적인 대규모 지출 금지" 같은 generic
  // 한 줄이라 정직하지 않았음.
  const dailyDos = useMemo(() => {
    if (fusion?.advice?.do && fusion.advice.do.length > 0) return fusion.advice.do.slice(0, 2)
    const recs = selectedImportantDate?.recommendations
    if (recs && recs.length > 0) return recs.slice(0, 2)
    return []
  }, [fusion, selectedImportantDate])

  const dailyDonts = useMemo(() => {
    if (fusion?.advice?.avoid && fusion.advice.avoid.length > 0)
      return fusion.advice.avoid.slice(0, 2)
    const warns = selectedImportantDate?.warnings
    if (warns && warns.length > 0) return warns.slice(0, 2)
    return []
  }, [fusion, selectedImportantDate])

  // 엔진 doNow / watchOut — calendarDailyView 의 짧은 액션 nudge.
  // dailyDos/dailyDonts(advice/recommendations 기반) 와 source 다르고 더 high-level.
  // 같은 날짜 entry 일 때만.
  const dailyActionPair = useMemo(() => {
    const v = data?.calendarDailyView
    if (!v || v.date !== selectedDateStr) return null
    return {
      doNow: v.doNow?.trim() || null,
      watchOut: v.watchOut?.trim() || null,
    }
  }, [data, selectedDateStr])

  // --- Daily one-line summary (engine pre-formatted, when available) ---
  const dailyOneLineSummary = useMemo(() => {
    if (
      data?.calendarDailyView &&
      data.calendarDailyView.date === selectedDateStr &&
      data.calendarDailyView.oneLineSummary
    ) {
      return data.calendarDailyView.oneLineSummary
    }
    // fusion 사람말 신호 (legacy 없을 때만 fallback — 이미 다른 곳에 narrative 있으면 중복 피함)
    if (fusion && !selectedImportantDate?.summary) {
      const { agreement, confidence, overallScore } = fusion
      if (agreement < 55)
        return confidence > 40 ? '사주와 점성이 갈리는 날 — 분별 필요' : '신호가 흐릿한 날'
      if (overallScore >= 70 && confidence >= 45) return '아주 좋은 날 — 사주·점성 모두 우호'
      if (overallScore >= 60) return '잔잔하게 우호적인 흐름'
      if (overallScore <= 30 && confidence >= 45) return '주의일 — 사주·점성 모두 신중'
      if (overallScore <= 40) return '조금 부담되는 결'
      return '평이한 흐름'
    }
    return selectedImportantDate?.summary ?? null
  }, [fusion, data, selectedDateStr, selectedImportantDate])

  // --- Daily engine self-diagnostic: confidence + cross agreement ------
  const dailyEngineSignal = useMemo(() => {
    // fusion 우선 — agreement + confidence 정밀
    if (fusion) {
      return {
        confidence: fusion.confidence,
        sync: fusion.agreement,
      }
    }
    if (!selectedImportantDate) return null
    const conf = selectedImportantDate.evidence?.confidence
    const sync = selectedImportantDate.evidence?.crossAgreementPercent
    if (conf == null && sync == null) return null
    return {
      confidence: typeof conf === 'number' ? Math.round(conf) : null,
      sync: typeof sync === 'number' ? Math.round(sync) : null,
    }
  }, [fusion, selectedImportantDate])

  // --- Astro identity badge for the header ---------------------------
  // 풀 차트가 들어오면 ASC, 없으면 태양 별자리.
  const astroBadge = useMemo(() => {
    const id = data?.astroIdentity
    if (!id) return null
    const ZODIAC_KO: Record<string, string> = {
      Aries: '양자리',
      Taurus: '황소자리',
      Gemini: '쌍둥이자리',
      Cancer: '게자리',
      Leo: '사자자리',
      Virgo: '처녀자리',
      Libra: '천칭자리',
      Scorpio: '전갈자리',
      Sagittarius: '사수자리',
      Capricorn: '염소자리',
      Aquarius: '물병자리',
      Pisces: '물고기자리',
    }
    if (id.ascendantSign) {
      const ko = ZODIAC_KO[id.ascendantSign]
      return { label: ko ? `${ko} ASC` : `${id.ascendantSign} ASC`, kind: 'asc' as const }
    }
    if (id.sunSign) {
      const ko = ZODIAC_KO[id.sunSign]
      return { label: ko ? `${ko} ☉` : `${id.sunSign} Sun`, kind: 'sun' as const }
    }
    return null
  }, [data])

  const handlePrevDay = () => setCurrentDay((prev) => (prev > 1 ? prev - 1 : daysInMonth))
  const handleNextDay = () => setCurrentDay((prev) => (prev < daysInMonth ? prev + 1 : 1))

  const handleDayClick = (day: number) => {
    setCurrentDay(day)
    setViewMode('daily')
  }

  // 올해 큰 날에서 날짜 클릭 — 그 달로 이동 후 daily 뷰
  const handleDateClick = (iso: string) => {
    const [y, m, d] = iso.split('-').map((x) => parseInt(x, 10))
    if (!y || !m || !d) return
    setViewDate(new Date(y, m - 1, 1))
    setCurrentDay(d)
    setViewMode('daily')
  }

  const getDayOfWeek = (day: number) => {
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
    return days[new Date(viewYear, viewMonth, day).getDay()]
  }

  return (
    <div className="w-full max-w-md mx-auto h-screen bg-zinc-950 text-zinc-200 font-sans flex flex-col shadow-2xl overflow-hidden relative border-x border-zinc-900">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-64 bg-indigo-900/20 blur-3xl rounded-full pointer-events-none -translate-y-1/2" />

      {/* --- Header --- */}
      <div className="px-6 pt-12 pb-4 shrink-0 relative z-20 bg-zinc-950/80 backdrop-blur-md border-b border-white/5">
        <div className="flex justify-between items-center mb-4">
          {/* 사주 일주/자리 badge — 풀 색 chip 2개가 hero 위 시각적 노이즈였음.
              희미한 inline 텍스트로 축소 — 정보는 유지, 비주얼 우선순위 양보. */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium flex-wrap min-w-0">
            <span className="inline-flex items-center gap-1 text-amber-300/85">
              <Sun className="w-3 h-3" />
              {ganjiToKorean(natalDayPillar ?? '辛未')} 일주
            </span>
            {(astroBadge || !data) && <span className="text-zinc-700">·</span>}
            {astroBadge ? (
              <span className="inline-flex items-center gap-1 text-cyan-300/85">
                <Moon className="w-3 h-3" />
                {astroBadge.label}
              </span>
            ) : !data ? (
              <span className="inline-flex items-center gap-1 text-cyan-300/85">
                <Moon className="w-3 h-3" />
                물병자리 ASC
              </span>
            ) : null}
          </div>

          <button
            onClick={() => setViewMode('monthly')}
            className="px-3 py-2 bg-zinc-900/80 rounded-xl border border-white/10 text-indigo-400 hover:text-indigo-300 hover:bg-zinc-800 hover:border-indigo-500/50 transition-all shadow-lg flex items-center gap-1.5 text-sm font-bold"
            aria-label="달력 뷰로 이동"
          >
            <Calendar className="w-4 h-4" />
            캘린더
          </button>
        </div>

        {/* "오늘" Hero — 헤더 sticky, 모든 뷰 위. 디자인 시스템 토큰(heroBgClass +
            heroShadowClass + emoji)으로 시각 임팩트 풀로. 점수는 text-5xl 큰 글자. */}
        {todayHero && (
          <button
            onClick={handleHeroClick}
            className={`w-full text-left mb-3 rounded-2xl border ${todayHero.grade.borderClass} ${todayHero.grade.heroBgClass} ${todayHero.grade.heroShadowClass} px-4 py-3.5 flex items-center gap-4 hover:brightness-110 transition`}
            aria-label="오늘 상세 보기"
          >
            <span className="text-4xl shrink-0 leading-none" aria-hidden>
              {todayHero.grade.emoji}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 leading-none">
                <span className={`text-5xl font-black ${todayHero.grade.colorClass}`}>
                  {todayHero.score}
                </span>
                <span className={`text-base font-black ${todayHero.grade.colorClass}`}>
                  {todayHero.grade.label}
                </span>
              </div>
              {todayHero.oneLine && (
                <p className="text-xs text-zinc-200 mt-1.5 line-clamp-1 leading-snug">
                  {todayHero.oneLine}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end shrink-0 leading-none">
              <span className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">
                오늘
              </span>
              <span className="text-sm font-black text-zinc-100 mt-0.5">
                {today.getMonth() + 1}.{today.getDate()}
              </span>
              <span className="text-[10px] text-zinc-500 mt-0.5">{todayWeekday}</span>
              <ChevronRight className="w-4 h-4 text-zinc-500 mt-1.5" />
            </div>
          </button>
        )}

        {/* View Mode Toggle */}
        <div className="flex bg-zinc-900/50 rounded-xl p-1.5 border border-white/5 backdrop-blur-sm">
          {(['yearly', 'monthly', 'daily'] as const).map((mode) => {
            const label = mode === 'yearly' ? '올해' : mode === 'monthly' ? '달력' : '오늘'
            return (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  viewMode === mode
                    ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg shadow-indigo-900/50'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {mode === 'yearly' && <CalendarRange className="w-4 h-4" />}
                {mode === 'monthly' && <ScrollText className="w-4 h-4" />}
                {mode === 'daily' && <Activity className="w-4 h-4" />}
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* --- Main Content Area --- */}
      <div className="flex-1 overflow-y-auto relative z-10 pb-10">
        <AnimatePresence mode="wait">
          {/* 0. YEARLY VIEW — 올해 큰 날 (오늘→이달→올해 줌의 가장 바깥) */}
          {viewMode === 'yearly' && (
            <motion.div
              key="yearly"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.2 }}
              className="p-5 space-y-4"
            >
              <YearDashboard
                year={viewYear}
                allDates={data?.allDates ?? []}
                yearlyMonthly={yearlyMonthly}
                birthDate={birthInfo?.birthDate}
                currentPhaseLabel={phaseLabel}
                topClaim={data?.matrixContract?.topClaim ?? null}
                onMonthClick={(monthIdx) => {
                  setViewDate(new Date(viewYear, monthIdx, 1))
                  setViewMode('monthly')
                }}
              />
              {!yearlyMonthly && (
                <YearHighlightsCard
                  allDates={data?.allDates ?? []}
                  year={viewYear}
                  onDateClick={handleDateClick}
                />
              )}
            </motion.div>
          )}

          {/* 1. MONTHLY VIEW */}
          {viewMode === 'monthly' && (
            <motion.div
              key="monthly"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.2 }}
              className="p-5 space-y-4"
            >
              {/* Premium Dashboard — Hero + Radar + Flow + Highlights.
                  같은 데이터 모델(monthDates, themeScores, keyEvents)을 4개
                  시각화로 분배. */}
              <MonthDashboard
                year={viewYear}
                month={viewMonth}
                monthLabel={monthLabel}
                monthDates={monthDates}
                monthScore={monthScore}
                monthSummary={monthlySummaryText}
                onDayClick={handleDayClick}
              />

              {/* 달력 그리드 — actionable surface. 대시보드 highlights 와 함께
                  사용자가 일자 탭으로 daily 뷰 진입. */}
              <div className="bg-zinc-900/60 p-6 rounded-3xl border border-white/5 shadow-2xl">
                <div className="flex justify-between items-center mb-4 gap-2">
                  <button
                    onClick={goToPrevMonth}
                    className="p-2 rounded-lg bg-zinc-950/70 hover:bg-zinc-800 border border-white/5 text-zinc-300 transition shrink-0"
                    aria-label="이전 달"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-2xl font-black text-zinc-100 tracking-widest flex-1 text-center">
                    {monthLabel}
                  </h2>
                  <button
                    onClick={goToNextMonth}
                    className="p-2 rounded-lg bg-zinc-950/70 hover:bg-zinc-800 border border-white/5 text-zinc-300 transition shrink-0"
                    aria-label="다음 달"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex justify-center items-center mb-5 gap-2 flex-wrap">
                  {/* phaseLabel은 engine matrixContract에서 옴 — 없으면 그냥 숨김.
                      이전엔 '甲戌 대운 (32세~)' 하드코딩이 fallback이었는데
                      특정인의 phase라 다른 사용자에게 잘못 노출됐음. */}
                  {phaseLabel && (
                    <span className="text-[12px] font-semibold text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                      Phase · {phaseLabel}
                    </span>
                  )}
                  {!isThisMonth && (
                    <button
                      onClick={goToThisMonth}
                      className="text-[11px] font-semibold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1 rounded-full border border-cyan-500/30 transition"
                    >
                      오늘로
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-7 gap-2 text-center mb-4">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <span
                      key={i}
                      className={`text-xs font-bold ${
                        i === 0 ? 'text-rose-500' : i === 6 ? 'text-blue-400' : 'text-zinc-500'
                      }`}
                    >
                      {day}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: leadingBlanks }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1
                    const isSelected = day === currentDay
                    // 셀 히트맵: 등급별 채도 낮은 톤으로 칠해 캘린더만 봐도
                    // 이달 흐름이 보이게. MonthlyDailyChart 색 코드와 통일.
                    const grade = dayGradeMap.get(day)
                    let gradeClass =
                      'text-zinc-300 bg-zinc-950/50 hover:bg-zinc-800 border border-white/5'
                    if (grade === 'lucky') {
                      gradeClass =
                        'text-emerald-100 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30'
                    } else if (grade === 'unlucky') {
                      gradeClass =
                        'text-rose-100 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30'
                    } else if (grade === 'neutral') {
                      gradeClass =
                        'text-zinc-200 bg-zinc-800/50 hover:bg-zinc-800 border border-white/5'
                    }
                    return (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        key={day}
                        onClick={() => handleDayClick(day)}
                        className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm relative transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-br from-indigo-500 to-cyan-600 text-white font-bold shadow-lg shadow-indigo-500/50 border-transparent'
                            : gradeClass
                        }`}
                      >
                        {day}
                      </motion.button>
                    )
                  })}
                </div>

                {/* 색 범례 — 캘린더가 히트맵으로 바뀌었으니 의미 한 줄로. */}
                <div className="flex items-center justify-center gap-3 mt-4 text-[10px] text-zinc-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/40 border border-emerald-400/40" />
                    좋은 날
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-zinc-800/70 border border-white/10" />
                    보통
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/40 border border-rose-400/40" />
                    조심
                  </span>
                </div>
              </div>

              {/* 월간 결론 카드 — 본문 sections + convergence + 전통 사주 (deep narrative).
                  Dashboard 가 이미 verdict / 테마 / keyEvents / flow chart 를 다 표시하므로
                  이 카드는 깊이 읽고 싶은 사용자를 위한 보조. */}
              <MonthlyInterpretationCard
                interp={
                  monthDates[0]?.monthlyInterpretation ??
                  selectedImportantDate?.monthlyInterpretation
                }
                yearlyConvergence={yearlyConvergence}
                monthScore={monthScore}
                summaryText={monthlySummaryText}
                seed={viewYear * 12 + viewMonth}
              />
            </motion.div>
          )}

          {/* 2. DAILY VIEW */}
          {viewMode === 'daily' && (
            <motion.div
              key="daily"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="p-5 space-y-4"
            >
              <div className="flex items-center justify-between bg-zinc-900/40 p-3 rounded-2xl border border-white/5 backdrop-blur-sm">
                <button
                  onClick={handlePrevDay}
                  className="p-3 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div
                  className="flex flex-col items-center cursor-pointer"
                  onClick={() => setViewMode('monthly')}
                >
                  <span className="text-xs font-bold text-indigo-500/80 mb-1 tracking-widest">
                    {monthLabel}
                  </span>
                  <h2 className="text-3xl font-black text-zinc-100 tracking-tighter flex items-baseline gap-1">
                    {currentDay}
                    <span className="text-lg font-medium text-zinc-500">
                      {getDayOfWeek(currentDay)}
                    </span>
                  </h2>
                </div>
                <button
                  onClick={handleNextDay}
                  className="p-3 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* One-line summary (engine pre-formatted) */}
              {dailyOneLineSummary && (
                <div className="bg-indigo-900/10 border border-indigo-500/20 px-4 py-3 rounded-xl">
                  <p className="text-sm text-zinc-200 leading-relaxed">{dailyOneLineSummary}</p>
                </div>
              )}

              {/* doNow / watchOut — engine high-level 액션 nudge (calendarDailyView).
                  Dos/Donts(advice 기반) 와 별개 — 더 짧고 핵심적인 한 줄. */}
              {dailyActionPair && (dailyActionPair.doNow || dailyActionPair.watchOut) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {dailyActionPair.doNow && (
                    <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-3 py-2 flex items-start gap-2">
                      <span className="text-[10px] font-bold text-emerald-300 tracking-wider uppercase shrink-0 mt-0.5">
                        지금
                      </span>
                      <p className="text-sm text-emerald-100 leading-snug">
                        {dailyActionPair.doNow}
                      </p>
                    </div>
                  )}
                  {dailyActionPair.watchOut && (
                    <div className="bg-rose-500/8 border border-rose-500/20 rounded-xl px-3 py-2 flex items-start gap-2">
                      <span className="text-[10px] font-bold text-rose-300 tracking-wider uppercase shrink-0 mt-0.5">
                        조심
                      </span>
                      <p className="text-sm text-rose-100 leading-snug">
                        {dailyActionPair.watchOut}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── 24h 시간대 교차 그래프 (saju 시진 × 점성 행성시) — 오늘 보면 현재 시각 노란 세로 가이드. */}
              <DailyHourlyChart importantDate={selectedImportantDate} dateStr={selectedDateStr} />

              {/* 5축 도메인 레이더 — 기존 등급 배너 + 3 도메인 bar 자리. year/month
                  대시보드와 같은 시각 언어로 통일. dailyIndices.score 는 sticky
                  today hero 가 이미 표시하므로 여기선 도메인 분포만. */}
              <ThemeRadar themes={dayRadarData.themes} caption={dayRadarData.caption} />

              {/* 엔진 자기 진단 — 디버그 성격이라 디폴트 접힘. 한 줄 chip 형태로
                  궁금한 사람만 펼치게. */}
              {dailyEngineSignal && (
                <div className="bg-zinc-900/30 rounded-2xl border border-white/5">
                  <button
                    onClick={() => setShowEngineDiag((v) => !v)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-zinc-400 text-xs font-semibold tracking-wider uppercase"
                  >
                    <Cpu className="w-3.5 h-3.5 text-indigo-400/80" />
                    엔진 자기 진단
                    <span className="ml-auto flex items-center gap-2 text-[11px] text-zinc-500 normal-case">
                      {dailyEngineSignal.confidence != null && (
                        <span>신뢰 {dailyEngineSignal.confidence}%</span>
                      )}
                      {dailyEngineSignal.sync != null && (
                        <span>합치 {dailyEngineSignal.sync}%</span>
                      )}
                      {showEngineDiag ? (
                        <ChevronLeft className="w-3.5 h-3.5 rotate-90" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                      )}
                    </span>
                  </button>
                  {showEngineDiag && (
                    <div className="grid grid-cols-2 gap-3 px-4 pb-4">
                      <div className="bg-zinc-950/60 p-4 rounded-xl border border-indigo-500/10">
                        <div className="text-xs text-zinc-500 mb-1">신뢰도</div>
                        <div className="text-2xl font-black text-indigo-300">
                          {dailyEngineSignal.confidence != null
                            ? `${dailyEngineSignal.confidence}%`
                            : '—'}
                        </div>
                        <p className="text-xs text-zinc-500 mt-2 leading-snug">
                          엔진이 이 예측에 부여한 자체 신뢰도
                        </p>
                      </div>
                      <div className="bg-zinc-950/60 p-4 rounded-xl border border-cyan-500/10">
                        <div className="text-xs text-zinc-500 mb-1">사주↔점성 합치</div>
                        <div className="text-2xl font-black text-cyan-300">
                          {dailyEngineSignal.sync != null ? `${dailyEngineSignal.sync}%` : '—'}
                        </div>
                        <p className="text-xs text-zinc-500 mt-2 leading-snug">
                          두 시스템이 같은 방향을 가리키는 정도
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 오늘의 활성 흐름 — narrative + 신호 통합 카드.
                  MatchedPatternsCard(★ 패턴 헤드라인)는 DailyFlowCard가 같은
                  matchedPatterns를 narrative로 풀어쓰고 있어 중복 — 제거. */}
              <DailyFlowCard importantDate={selectedImportantDate} />

              {/* 베스트/주의 시간대 — year/month dashboard 와 동일한 3-카드 패턴.
                  day tier 는 convergence (수렴) 의 좋은 source 가 없어 두 카드만
                  사용 (Highlights 컴포넌트는 undefined 카드를 placeholder 로 표시). */}
              {dayHighlights ? (
                <Highlights
                  best={dayHighlights.bestCard}
                  caution={dayHighlights.cautionCard}
                  bestLabel="베스트 시간 (추진)"
                  cautionLabel="주의 시간 (보류)"
                  hideConvergence
                />
              ) : (
                <div className="bg-zinc-900/40 p-5 rounded-2xl border border-white/5">
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    이 날의 시간대별 정밀 분석은{' '}
                    <span className="text-zinc-200 font-medium">달력에서 날짜를 탭</span>하면
                    상세보기에 표시됩니다.
                  </p>
                </div>
              )}

              {/* 시간대 자세히 — 펼치면 full best 4 + worst 2 + 시진 narrative
                  + 시간×테마 narrative. Highlights(Top 1)에서 잘린 엔진 디테일을
                  손실 없이 복구. */}
              {dailyHourlySlots &&
                (dailyHourlySlots.best.length > 1 || dailyHourlySlots.worst.length > 1) && (
                  <div className="bg-zinc-900/30 rounded-2xl border border-white/5">
                    <button
                      onClick={() => setShowHourDetail((v) => !v)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-zinc-300 text-xs font-semibold tracking-wider uppercase"
                    >
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      시간대 자세히 — best {dailyHourlySlots.best.length} / worst{' '}
                      {dailyHourlySlots.worst.length}
                      {showHourDetail ? (
                        <ChevronUp className="w-3.5 h-3.5 ml-auto" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 ml-auto" />
                      )}
                    </button>
                    {showHourDetail && (
                      <div className="grid grid-cols-2 gap-3 px-4 pb-4">
                        <div>
                          <div className="text-[11px] font-bold text-emerald-400 mb-2 tracking-wider">
                            ↑ BEST
                          </div>
                          <ul className="space-y-2">
                            {dailyHourlySlots.best.slice(0, 4).map((s, i) => {
                              const branch = branchFromHour(s.hour)
                              const narrative = getHourNarrative(branch)
                              const themeLine = getHourThemeNarrative(
                                branch,
                                topHourTheme(selectedImportantDate?.themeScores),
                                'ko'
                              )
                              return (
                                <li
                                  key={`best-${i}`}
                                  className="bg-emerald-900/10 border border-emerald-500/15 px-3 py-2 rounded-lg"
                                >
                                  <span className="text-sm font-bold text-emerald-200">
                                    {formatHour(s.hour)}
                                  </span>
                                  <p className="text-[11px] text-emerald-100/85 mt-1 leading-snug">
                                    {narrative.positiveKo}
                                  </p>
                                  {themeLine && (
                                    <p className="text-[10px] text-emerald-200/70 mt-1 leading-snug">
                                      {themeLine}
                                    </p>
                                  )}
                                  {s.reason && (
                                    <p className="text-[10px] text-zinc-500 mt-1 leading-snug">
                                      {s.reason}
                                    </p>
                                  )}
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-rose-400 mb-2 tracking-wider">
                            ↓ WORST
                          </div>
                          <ul className="space-y-2">
                            {dailyHourlySlots.worst.slice(0, 2).map((s, i) => {
                              const branch = branchFromHour(s.hour)
                              const narrative = getHourNarrative(branch)
                              return (
                                <li
                                  key={`worst-${i}`}
                                  className="bg-rose-900/10 border border-rose-500/15 px-3 py-2 rounded-lg"
                                >
                                  <span className="text-sm font-bold text-rose-200">
                                    {formatHour(s.hour)}
                                  </span>
                                  <p className="text-[11px] text-rose-100/85 mt-1 leading-snug">
                                    {narrative.cautionKo}
                                  </p>
                                  {s.reason && (
                                    <p className="text-[10px] text-zinc-500 mt-1 leading-snug">
                                      {s.reason}
                                    </p>
                                  )}
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {(dailyDos.length > 0 || dailyDonts.length > 0) && (
                <div className="grid grid-cols-2 gap-4">
                  {dailyDos.length > 0 && (
                    <div className="bg-emerald-900/10 border border-emerald-500/20 p-4 rounded-2xl">
                      <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2 mb-3">
                        <ThumbsUp className="w-4 h-4" /> 권장 행동 패턴
                      </h4>
                      <ul className="space-y-2">
                        {dailyDos.map((item, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-emerald-100/80 flex items-start gap-1.5 leading-relaxed"
                          >
                            <span className="text-emerald-500 mt-0.5">•</span> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {dailyDonts.length > 0 && (
                    <div className="bg-rose-900/10 border border-rose-500/20 p-4 rounded-2xl">
                      <h4 className="text-sm font-bold text-rose-400 flex items-center gap-2 mb-3">
                        <ThumbsDown className="w-4 h-4" /> 주의 행동 패턴
                      </h4>
                      <ul className="space-y-2">
                        {dailyDonts.map((item, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-rose-100/80 flex items-start gap-1.5 leading-relaxed"
                          >
                            <span className="text-rose-500 mt-0.5">•</span> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- Headless UI Calendar Modal --- */}
      <Transition appear show={isCalendarModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsCalendarModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-700 p-6 text-left align-middle shadow-2xl transition-all">
                  <div className="flex justify-between items-center mb-6">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-bold text-white flex items-center gap-2"
                    >
                      <Calendar className="w-5 h-5 text-indigo-400" />월 이동
                    </Dialog.Title>
                    <button
                      onClick={() => setIsCalendarModalOpen(false)}
                      className="text-zinc-400 hover:text-white p-1"
                      aria-label="닫기"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* 현재 보고 있는 달 + prev/next */}
                  <div className="bg-zinc-950 rounded-2xl p-5 border border-zinc-800">
                    <div className="flex items-center justify-between mb-5">
                      <button
                        onClick={() => {
                          goToPrevMonth()
                          setIsCalendarModalOpen(false)
                        }}
                        className="p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-zinc-200 transition"
                        aria-label="이전 달"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <div className="text-center">
                        <div className="text-[11px] text-zinc-500 tracking-widest uppercase mb-1">
                          보는 달
                        </div>
                        <div className="text-xl font-black text-white tracking-wide">
                          {monthLabel}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          goToNextMonth()
                          setIsCalendarModalOpen(false)
                        }}
                        className="p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-zinc-200 transition"
                        aria-label="다음 달"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        goToThisMonth()
                        setIsCalendarModalOpen(false)
                      }}
                      disabled={isThisMonth}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl font-bold transition-colors"
                    >
                      {isThisMonth ? '이번 달입니다' : '이번 달로 가기'}
                    </button>

                    {birthInfo?.birthDate && (
                      <p className="mt-4 text-[11px] text-zinc-500 text-center">
                        기준 생년월일 · {birthInfo.birthDate}
                      </p>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  )
}
