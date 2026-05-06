'use client'

import React, { useState, useMemo, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, Transition } from '@headlessui/react'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle2,
  Circle,
  Swords,
  Heart,
  Sparkles,
  ScrollText,
  BarChart3,
  Shield,
  Zap,
  X,
  TrendingUp,
  AlertTriangle,
  Activity,
  Moon,
  Sun,
  User,
  Flame,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'

import type { BirthInfo, CalendarData } from './types'

interface DestinyMatrixPlannerProps {
  /** Engine payload from /api/calendar. When omitted the component falls back to mock data. */
  data?: CalendarData | null
  /** Birth info used to fetch `data`. Reserved for future real wiring. */
  birthInfo?: BirthInfo | null
}

// --- Mock Data (Saju & Astro Themed) ---
const chartData = [
  { name: '월', vitality: 65, exp: 120 },
  { name: '화', vitality: 50, exp: 80 },
  { name: '수', vitality: 80, exp: 200 },
  { name: '목', vitality: 75, exp: 150 },
  { name: '금', vitality: 90, exp: 250 },
  { name: '토', vitality: 100, exp: 300 },
  { name: '일', vitality: 85, exp: 180 },
]

type QuestRow = { id: string; title: string; rank: 'S' | 'A' | 'B'; reward: string }

const questHistory: QuestRow[] = [
  { id: 'Q001', title: '해묘미(亥卯未) 목국 활성화 (기획안 완성)', rank: 'S', reward: '300 EXP' },
  { id: 'Q002', title: '화성 제어 훈련 (감정 조절 및 명상)', rank: 'A', reward: '200 EXP' },
  { id: 'Q003', title: '토성 스퀘어 극복 (밀린 업무 처리)', rank: 'B', reward: '100 EXP' },
  { id: 'Q004', title: 'Air 원소 발현 (팀 브레인스토밍)', rank: 'S', reward: '300 EXP' },
]

// 오행(Five Elements) 밸런스 데이터
const elementData = [
  { subject: '木 (기획/성장)', A: 85, fullMark: 100 },
  { subject: '火 (열정/체력)', A: 20, fullMark: 100 },
  { subject: '土 (안정/기반)', A: 60, fullMark: 100 },
  { subject: '金 (결단/실행)', A: 95, fullMark: 100 },
  { subject: '水 (지혜/휴식)', A: 50, fullMark: 100 },
]

type ViewMode = 'monthly' | 'daily' | 'stats'

export default function DestinyMatrixPlanner({ data, birthInfo }: DestinyMatrixPlannerProps = {}) {
  const [viewMode, setViewMode] = useState<ViewMode>('monthly')
  const [currentDay, setCurrentDay] = useState<number>(() => new Date().getDate())
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)

  // --- View date (current real month) ---------------------------------
  const today = useMemo(() => new Date(), [])
  const viewYear = today.getFullYear()
  const viewMonth = today.getMonth() // 0-indexed

  const monthLabel = useMemo(() => {
    const labels = [
      'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
      'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
    ]
    return `${labels[viewMonth]} ${viewYear}`
  }, [viewMonth, viewYear])

  const daysInMonth = useMemo(
    () => new Date(viewYear, viewMonth + 1, 0).getDate(),
    [viewYear, viewMonth],
  )
  const leadingBlanks = useMemo(
    () => new Date(viewYear, viewMonth, 1).getDay(),
    [viewYear, viewMonth],
  )

  // --- Engine-derived values (Step 2b) --------------------------------
  const natalDayPillar = useMemo(() => {
    const ns = data?.allDates?.find((d) => d.natalSaju)?.natalSaju
    if (!ns) return null
    return `${ns.dayStem}${ns.dayBranch}`
  }, [data])

  const monthEventSet = useMemo(() => {
    const out = new Set<number>()
    if (!data?.allDates) return out
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-`
    for (const d of data.allDates) {
      if (!d.date.startsWith(prefix)) continue
      if (d.grade > 1) continue
      out.add(parseInt(d.date.slice(8, 10), 10))
    }
    return out
  }, [data, viewYear, viewMonth])

  const monthlySummaryText =
    data?.monthSummary?.summary ?? data?.calendarMonthView?.oneLineSummary ?? null

  const phaseLabel =
    data?.matrixContract?.overallPhaseLabel ?? data?.matrixContract?.overallPhase ?? null

  const handlePrevDay = () => setCurrentDay((prev) => (prev > 1 ? prev - 1 : daysInMonth))
  const handleNextDay = () => setCurrentDay((prev) => (prev < daysInMonth ? prev + 1 : 1))

  const handleDayClick = (day: number) => {
    setCurrentDay(day)
    setViewMode('daily')
  }

  const columns = useMemo<ColumnDef<QuestRow>[]>(
    () => [
      {
        header: '랭크',
        accessorKey: 'rank',
        cell: (info) => {
          const v = info.getValue<string>()
          return (
            <span
              className={`font-bold ${
                v === 'S' ? 'text-amber-400' : v === 'A' ? 'text-purple-400' : 'text-blue-400'
              }`}
            >
              {v}
            </span>
          )
        },
      },
      {
        header: '퀘스트명',
        accessorKey: 'title',
        cell: (info) => <span className="text-zinc-200">{info.getValue<string>()}</span>,
      },
      {
        header: '보상',
        accessorKey: 'reward',
        cell: (info) => <span className="text-purple-400 text-xs">{info.getValue<string>()}</span>,
      },
    ],
    [],
  )

  const table = useReactTable({
    data: questHistory,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const getDayOfWeek = (day: number) => {
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
    return days[new Date(viewYear, viewMonth, day).getDay()]
  }

  // 사주/점성술 데이터를 반영한 일일 평가 로직
  const getDailyEvaluation = (day: number) => {
    if (day % 3 === 0)
      return {
        rank: 'S',
        score: 95,
        title: '목성(Jupiter)의 가호 & 해묘미 삼합',
        text: '수성-목성 섹스타일(Sextile) 효과로 지력이 상승하며, 사주의 해묘미(亥卯未) 목국(木局)이 활성화되어 메인 퀘스트에서 압도적인 성과를 거둘 수 있는 완벽한 하루입니다.',
        color: 'text-amber-400',
        bg: 'bg-amber-400/10',
      }
    if (day % 3 === 1)
      return {
        rank: 'A',
        score: 82,
        title: 'Air 원소의 순풍',
        text: '물병자리와 쌍둥이자리의 Air(공기) 에너지가 강하게 작용하여 아이디어가 넘칩니다. 다만 亥-寅 파(파괴) 기운이 내재되어 있으니 파티원(동료)과의 소통 방식에 유의하세요.',
        color: 'text-purple-400',
        bg: 'bg-purple-400/10',
      }
    return {
      rank: 'B',
      score: 68,
      title: '천간충 & 토성 스퀘어 경보',
      text: '달-토성 스퀘어(Square)와 乙-辛 천간충이 겹치는 날입니다. 마나(멘탈) 소모가 극심하고 내적 갈등이 예상되니, 무리한 진격보다는 방어력(휴식) 위주로 플레이하세요.',
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    }
  }

  const dailyEval = getDailyEvaluation(currentDay)

  return (
    <div className="w-full max-w-md mx-auto h-screen bg-zinc-950 text-zinc-200 font-sans flex flex-col shadow-2xl overflow-hidden relative border-x border-zinc-900">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-64 bg-indigo-900/20 blur-3xl rounded-full pointer-events-none -translate-y-1/2" />

      {/* --- Header --- */}
      <div className="px-6 pt-12 pb-4 shrink-0 relative z-20 bg-zinc-950/80 backdrop-blur-md border-b border-white/5">
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-zinc-900 bg-amber-500 px-2 py-0.5 rounded-sm tracking-widest uppercase flex items-center gap-1">
                <Sun className="w-3 h-3" /> {natalDayPillar ?? '辛未'} 일주
              </span>
              {!data && (
                <span className="text-xs font-bold text-zinc-900 bg-cyan-400 px-2 py-0.5 rounded-sm tracking-widest uppercase flex items-center gap-1">
                  <Moon className="w-3 h-3" /> 물병자리 ASC
                </span>
              )}
            </div>
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent tracking-wide flex items-center gap-2">
              운명의 수레바퀴
            </h1>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="p-3 bg-zinc-900/80 rounded-xl border border-white/10 text-cyan-400 hover:text-cyan-300 hover:bg-zinc-800 hover:border-cyan-500/50 transition-all shadow-lg"
            >
              <User className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsCalendarModalOpen(true)}
              className="p-3 bg-zinc-900/80 rounded-xl border border-white/10 text-indigo-400 hover:text-indigo-300 hover:bg-zinc-800 hover:border-indigo-500/50 transition-all shadow-lg"
            >
              <Calendar className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex bg-zinc-900/50 rounded-xl p-1.5 border border-white/5 backdrop-blur-sm">
          {(['monthly', 'daily', 'stats'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all capitalize flex items-center justify-center gap-2 ${
                viewMode === mode
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg shadow-indigo-900/50'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {mode === 'monthly' && <ScrollText className="w-4 h-4" />}
              {mode === 'daily' && <Swords className="w-4 h-4" />}
              {mode === 'stats' && <BarChart3 className="w-4 h-4" />}
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* --- Engine connection probe (Step 2a — to be replaced with real wiring) --- */}
      {data && (
        <div className="px-6 py-2 shrink-0 relative z-20 bg-emerald-500/10 border-b border-emerald-500/20 text-[11px] text-emerald-300 flex items-center justify-between">
          <span>
            ✓ 엔진 연결됨 · year {data.year} · grades {data.summary?.total ?? '?'} · phase{' '}
            {data.matrixContract?.overallPhaseLabel ?? data.matrixContract?.overallPhase ?? '—'}
          </span>
          <span className="text-emerald-400/70">
            {birthInfo?.birthDate ?? ''}
          </span>
        </div>
      )}

      {/* --- Main Content Area --- */}
      <div className="flex-1 overflow-y-auto relative z-10 pb-10">
        <AnimatePresence mode="wait">
          {/* 1. MONTHLY VIEW */}
          {viewMode === 'monthly' && (
            <motion.div
              key="monthly"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.2 }}
              className="p-6 space-y-6"
            >
              <div className="bg-zinc-900/60 p-6 rounded-3xl border border-white/5 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-black text-zinc-100 tracking-widest">{monthLabel}</h2>
                  <span className="text-xs font-medium text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                    {phaseLabel ? `Phase: ${phaseLabel}` : '甲戌 대운 (32세~)'}
                  </span>
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
                    const hasEvent = data ? monthEventSet.has(day) : [3, 9, 12, 15, 22, 28].includes(day)

                    return (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        key={day}
                        onClick={() => handleDayClick(day)}
                        className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm relative transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-br from-indigo-500 to-cyan-600 text-white font-bold shadow-lg shadow-indigo-500/50 border-transparent'
                            : 'text-zinc-300 bg-zinc-950/50 hover:bg-zinc-800 border border-white/5'
                        }`}
                      >
                        {day}
                        {hasEvent && !isSelected && (
                          <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-amber-400 shadow shadow-amber-400/80" />
                        )}
                        {hasEvent && isSelected && (
                          <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-white shadow shadow-white/80" />
                        )}
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              {/* 월간 요약 섹션 (엔진 monthSummary 매핑) */}
              <div className="bg-zinc-900/40 p-5 rounded-2xl border border-white/5 backdrop-blur-sm">
                <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-amber-400" /> 월간 운명 요약 (Cross Matrix)
                </h3>
                {monthlySummaryText ? (
                  <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                    {monthlySummaryText}
                  </p>
                ) : (
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    현재 <span className="text-indigo-400 font-bold">甲戌(갑술) 대운</span>을 지나고
                    있으며, 사주와 점성술의 교차 시스템 합의도(Confidence 71.8%)가 매우 높습니다.
                    이번 달은 <span className="text-cyan-400 font-bold">Air(공기) 원소 3/3 압도</span>로
                    지적 호기심이 폭발하지만, 乙-辛 천간충과 태양-화성 오포지션의 영향으로 돌발적인
                    전투(갈등)가 발생할 수 있으니 템포 조절이 필수적입니다.
                  </p>
                )}
                {data?.calendarMonthView?.strongestWindow && (
                  <p className="text-xs text-amber-400/80 mt-3 pt-3 border-t border-white/10">
                    ⏵ 강세 구간: {data.calendarMonthView.strongestWindow}
                  </p>
                )}
                {data?.calendarMonthView?.cautionWindow && (
                  <p className="text-xs text-rose-400/80 mt-1">
                    ⚠ 주의 구간: {data.calendarMonthView.cautionWindow}
                  </p>
                )}
              </div>
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
              className="p-6 space-y-6"
            >
              {/* Date Navigator */}
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

              {/* 일일 성과 판정 (사주/점성술 근거) */}
              <div className={`p-5 rounded-2xl border border-white/5 ${dailyEval.bg}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col">
                    <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2 mb-1">
                      <Activity className="w-4 h-4" /> 일일 성과 판정
                    </h3>
                    <span className="text-xs font-semibold text-zinc-400">{dailyEval.title}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xl font-black ${dailyEval.color}`}>
                      Rank {dailyEval.rank}
                    </span>
                    <span className="text-xs font-medium text-zinc-400 ml-2">
                      ({dailyEval.score}점)
                    </span>
                  </div>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed mt-3 border-t border-white/10 pt-3">
                  {dailyEval.text}
                </p>
              </div>

              {/* Status Bars (Vitality & Mana) */}
              <div className="space-y-4">
                <div className="bg-zinc-900/60 p-5 rounded-2xl border border-white/5 shadow-inner">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
                      <h3 className="text-sm font-bold text-zinc-300">Vitality (HP)</h3>
                    </div>
                    <span className="text-sm font-bold text-rose-400">45 / 100</span>
                  </div>
                  <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-white/5">
                    <motion.div
                      key={`hp-${currentDay}`}
                      initial={{ width: 0 }}
                      animate={{ width: '45%' }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-full shadow-md shadow-rose-500/50"
                    />
                  </div>
                  <p className="text-xs text-rose-400/70 mt-2 text-right">
                    ※ 火 원소 부재로 인한 체력 회복력 저하 상태
                  </p>
                </div>

                <div className="bg-zinc-900/60 p-5 rounded-2xl border border-white/5 shadow-inner">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-cyan-500 fill-cyan-500/20" />
                      <h3 className="text-sm font-bold text-zinc-300">Mana (Focus)</h3>
                    </div>
                    <span className="text-sm font-bold text-cyan-400">85 / 100</span>
                  </div>
                  <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-white/5">
                    <motion.div
                      key={`mp-${currentDay}`}
                      initial={{ width: 0 }}
                      animate={{ width: '85%' }}
                      transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full shadow-md shadow-cyan-500/50"
                    />
                  </div>
                  <p className="text-xs text-cyan-400/70 mt-2 text-right">
                    ※ Air 원소 압도로 인한 높은 지적 회전율 유지 중
                  </p>
                </div>
              </div>

              {/* Active Aura */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-zinc-400 tracking-widest uppercase flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-500" /> Active Aura
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mb-1">
                      Buff
                    </span>
                    <p className="text-xs text-zinc-200 font-medium">수성-목성 섹스타일</p>
                    <p className="text-[10px] text-zinc-400 mt-1">학습 속도 +30%</p>
                  </div>
                  <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
                    <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block mb-1">
                      Debuff
                    </span>
                    <p className="text-xs text-zinc-200 font-medium">乙-辛 천간충</p>
                    <p className="text-[10px] text-zinc-400 mt-1">대인관계 피로도 +50%</p>
                  </div>
                </div>
              </div>

              {/* Quests */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Swords className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-extrabold text-zinc-100 tracking-wide">
                    오늘의 퀘스트
                  </h3>
                </div>
                <div className="space-y-3">
                  {[
                    {
                      id: 1,
                      text: '일일 퀘스트: 12H 스텔리움 명상 (30분)',
                      type: 'Daily',
                      done: currentDay % 2 === 0,
                    },
                    {
                      id: 2,
                      text: '메인 퀘스트: 10H 목성 커리어 확장 기획',
                      type: 'Main',
                      done: false,
                    },
                  ].map((quest) => (
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      key={quest.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                        quest.done
                          ? 'bg-indigo-900/10 border-indigo-500/30'
                          : 'bg-zinc-900/40 border-white/5 hover:border-indigo-500/50'
                      }`}
                    >
                      {quest.done ? (
                        <CheckCircle2 className="w-6 h-6 text-indigo-500 shrink-0" />
                      ) : (
                        <Circle className="w-6 h-6 text-zinc-600 shrink-0" />
                      )}
                      <div>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-md mb-1 inline-block ${
                            quest.type === 'Main'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {quest.type}
                        </span>
                        <p
                          className={`text-sm font-medium ${
                            quest.done ? 'text-zinc-500 line-through' : 'text-zinc-200'
                          }`}
                        >
                          {quest.text}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* 3. STATS VIEW */}
          {viewMode === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6 space-y-8"
            >
              {/* Cross Matrix 융합 패널 */}
              <div className="bg-gradient-to-br from-indigo-900/40 to-cyan-900/20 p-5 rounded-2xl border border-indigo-500/30 shadow-lg relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/20 blur-2xl rounded-full" />
                <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4" /> Cross Matrix (사주 × 점성 융합)
                </h3>
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">Final Adjusted Score</p>
                    <p className="text-3xl font-black text-white">
                      6.6 <span className="text-sm font-medium text-zinc-500">/ 10</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-400 mb-1">Confidence</p>
                    <p className="text-lg font-bold text-cyan-400">71.8%</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-black/20 p-2 rounded-lg text-xs">
                    <span className="text-zinc-400">Layer 5 Synergy</span>
                    <span className="text-amber-400 font-bold">7개 극강 시너지 발동</span>
                  </div>
                  <div className="flex items-center justify-between bg-black/20 p-2 rounded-lg text-xs">
                    <span className="text-zinc-400">원소 불협 (土 vs 風)</span>
                    <span className="text-rose-400 font-bold">안정 vs 변화 충돌 중</span>
                  </div>
                </div>
              </div>

              {/* 오행(Five Elements) 레이더 차트 */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-400 tracking-widest uppercase flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Elements Balance (오행 스탯)
                </h3>
                <div className="h-64 w-full bg-zinc-900/40 p-4 rounded-2xl border border-white/5 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={elementData}>
                      <PolarGrid stroke="#3f3f46" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar
                        name="My Stats"
                        dataKey="A"
                        stroke="#06b6d4"
                        fill="#06b6d4"
                        fillOpacity={0.4}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-zinc-500 text-center">
                  ※ 金(결단력)과 木(기획력)이 극대화된 반면, 火(열정/체력)가 부족한 상태입니다.
                </p>
              </div>

              {/* 테마별 상태 평가 */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-400 tracking-widest uppercase flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Theme Evaluation
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <div className="bg-zinc-900/40 p-4 rounded-xl border border-white/5 flex items-start gap-4">
                    <div className="p-2 bg-emerald-500/10 rounded-lg shrink-0">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-200 mb-1">
                        전투력 (커리어) <span className="text-emerald-400 ml-1">최상</span>
                      </h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        목성 10H(사수자리)와 MC 전갈자리 배치의 시너지로 커리어 확장의 강력한 버프가
                        발동 중입니다.
                      </p>
                    </div>
                  </div>

                  <div className="bg-zinc-900/40 p-4 rounded-xl border border-rose-500/30 flex items-start gap-4">
                    <div className="p-2 bg-rose-500/10 rounded-lg shrink-0">
                      <AlertTriangle className="w-5 h-5 text-rose-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-200 mb-1">
                        생명력 (건강/체력) <span className="text-rose-400 ml-1">주의 요망</span>
                      </h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        사주 내 火(불) 원소 부재 및 태양-화성 오포지션(충돌)으로 인해 급격한 체력
                        저하 및 번아웃 디버프가 우려됩니다.
                      </p>
                    </div>
                  </div>

                  <div className="bg-zinc-900/40 p-4 rounded-xl border border-white/5 flex items-start gap-4">
                    <div className="p-2 bg-blue-500/10 rounded-lg shrink-0">
                      <Zap className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-200 mb-1">
                        마력 (멘탈/지력) <span className="text-blue-400 ml-1">양호 (불안정)</span>
                      </h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Air(공기) 원소 압도로 지적 회전율은 최상이나, 천왕성-해왕성 12H 결합으로 현실
                        감각(Earth) 보완이 필요합니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recharts: Weekly Performance */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-400 tracking-widest uppercase flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Weekly EXP Gain
                </h3>
                <div className="h-48 w-full bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="name"
                        stroke="#52525b"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181b',
                          border: '1px solid #27272a',
                          borderRadius: '8px',
                        }}
                        itemStyle={{ color: '#818cf8' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="exp"
                        stroke="#6366f1"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorExp)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Tanstack Table: Quest History */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-400 tracking-widest uppercase flex items-center gap-2">
                  <ScrollText className="w-4 h-4" /> Quest History
                </h3>
                <div className="bg-zinc-900/40 rounded-2xl border border-white/5 overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-950/50 text-zinc-500 text-xs uppercase">
                      {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <th key={header.id} className="px-4 py-3 font-medium">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {table.getRowModel().rows.map((row) => (
                        <tr key={row.id} className="hover:bg-white/5 transition-colors">
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="px-4 py-3">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
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
                      <Calendar className="w-5 h-5 text-indigo-400" />
                      일정 선택
                    </Dialog.Title>
                    <button
                      onClick={() => setIsCalendarModalOpen(false)}
                      className="text-zinc-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800 text-center text-zinc-400 text-sm">
                    <p className="mb-2">구글 캘린더 등 외부 캘린더 연동이나</p>
                    <p>연/월 단위 이동 기능을 추가할 수 있습니다.</p>
                    <button
                      onClick={() => setIsCalendarModalOpen(false)}
                      className="mt-6 w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-colors"
                    >
                      확인
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* --- Headless UI Profile/Status Modal --- */}
      <Transition appear show={isProfileModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsProfileModalOpen(false)}>
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
                      <User className="w-5 h-5 text-cyan-400" />
                      캐릭터 명세서 (Status)
                    </Dialog.Title>
                    <button
                      onClick={() => setIsProfileModalOpen(false)}
                      className="text-zinc-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* 사주 명식 요약 */}
                    <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800">
                      <h4 className="text-xs font-bold text-amber-500 mb-2 uppercase tracking-widest">
                        사주 원국 (Four Pillars)
                      </h4>
                      <div className="grid grid-cols-4 gap-2 text-center text-sm font-bold text-zinc-200">
                        <div className="bg-zinc-900 p-2 rounded">
                          時
                          <br />
                          <span className="text-zinc-400 font-normal text-xs">丁酉</span>
                        </div>
                        <div className="bg-zinc-800 border border-amber-500/30 p-2 rounded">
                          日
                          <br />
                          <span className="text-amber-400 text-xs">辛未</span>
                        </div>
                        <div className="bg-zinc-900 p-2 rounded">
                          月
                          <br />
                          <span className="text-zinc-400 font-normal text-xs">乙卯</span>
                        </div>
                        <div className="bg-zinc-900 p-2 rounded">
                          年
                          <br />
                          <span className="text-zinc-400 font-normal text-xs">癸亥</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-2 text-center">
                        ※ 해묘미(亥卯未) 목국 형성, 재성(재물/결과) 발달
                      </p>
                    </div>

                    {/* 점성술 네이탈 요약 */}
                    <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800">
                      <h4 className="text-xs font-bold text-indigo-400 mb-2 uppercase tracking-widest">
                        네이탈 차트 (Natal Chart)
                      </h4>
                      <ul className="space-y-2 text-xs text-zinc-300">
                        <li className="flex justify-between">
                          <span className="text-zinc-500">Sun (자아)</span>{' '}
                          <span>쌍둥이자리 (Gemini) ♊</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-zinc-500">Moon (내면)</span>{' '}
                          <span>전갈자리 (Scorpio) ♏</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-zinc-500">ASC (외형)</span>{' '}
                          <span>물병자리 (Aquarius) ♒</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-zinc-500">Dominant</span>{' '}
                          <span>Air (공기) 원소 압도</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsProfileModalOpen(false)}
                    className="mt-6 w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold transition-colors"
                  >
                    닫기
                  </button>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  )
}
