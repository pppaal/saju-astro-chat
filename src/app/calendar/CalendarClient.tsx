'use client'

/* ============================================================
   /calendar — v9.2 운세 달력 클라이언트 틀(/calendar · /calendar/preview 공용).
   종이 한 장 위에 상단 바(운세 달력 · 사람 칩) → 폴리오 → 월간 | 일간 스위치 → 그 탭의
   보기(MonthView · DayView) → 끝 폴리오 → 푸터. 뷰모델은 서버(page.tsx)가 만든다 —
   buildMonthViewModel/buildDayViewModel 은 천체력 캐시·절기표를 끌고 와 클라이언트 번들에
   넣지 않는다. 이 컴포넌트는 탭 상태와 '다른 날' 데이터만 다룬다.

   일간 탭은 상태로 든다 — 서버가 준 '오늘' 뷰모델이 기본값이고, 월 그리드에서 다른 날을
   골라 들어가면 /api/calendar/day 로 그 날짜의 일 뷰모델을 받아 갈아끼운다(같은
   assembleDayTier · buildDayViewModel 경로라 월↔일 내용 일치). 받은 날짜는 세션 안에서
   캐시하고, 늦게 도착한 응답이 최신 선택을 덮지 않게 seq 가드를 둔다.

   '오늘'은 이 화면의 오늘(dayVm.iso)이다 — /api/calendar/day 에 today= 로 실어 보내, 표본 날에
   고정된 /calendar/preview 에서도 일간의 'Today'와 그리드의 오늘이 같은 날을 가리킨다(QA CODE-4).

   다른 날을 받는 중이거나 받지 못했으면 이전 날의 일간을 그대로 두지 않는다 — 상태 줄 + 빈 뼈대만
   (QA CODE-5). 상태·연 날 요약은 늘 붙어 있는 화면 읽기용 라이브 영역에 쓴다(A11Y-4). 화면 안의
   버튼(재탭 · '하루 전체 보기' · '이달 전체 보기')이 보기를 갈아끼우면 새 보기의 H1 로 초점을
   옮긴다(A11Y-1) — 그 버튼은 사라지므로.

   탭 기억: localStorage 'dp_tier'('month' | 'day' — 옛 셸의 숫자 0/1 도 읽는다). 저장소가
   막혀 있어도(사파리 프라이빗 등) 조용히 기본값(월간).
   ============================================================ */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import V9TopBar from '@/components/v9/V9TopBar'
import Folio from '@/components/v9/Folio'
import SegSwitch from '@/components/v9/SegSwitch'
import { fill, pick, type ElementKey, type Lang } from '@/components/v9/v9Copy'
import MonthView from '@/components/calendar/v9/MonthView'
import DayView from '@/components/calendar/v9/DayView'
import CalendarFooter from '@/components/calendar/v9/CalendarFooter'
import { CAL_COPY } from '@/components/calendar/v9/calendarCopy'
import s from '@/components/calendar/v9/calendar.module.css'
import type { MonthViewModel } from '@/lib/calendar-view/monthViewModel'
import type { DayViewModel } from '@/lib/calendar-view/dayViewModel'
import type { BirthSubject } from '@/lib/birth/sameBirth'

export type CalendarTab = 'month' | 'day'

const TAB_KEY = 'dp_tier'

/** 저장된 탭 — 'month' | 'day', 옛 셸 값 '0'(월) · '1'(일)도. 그 밖·실패는 null. */
export function readStoredTab(): CalendarTab | null {
  try {
    const raw = window.localStorage.getItem(TAB_KEY)
    if (raw === 'month' || raw === '0') return 'month'
    if (raw === 'day' || raw === '1') return 'day'
    return null
  } catch {
    return null
  }
}

function storeTab(tab: CalendarTab) {
  try {
    window.localStorage.setItem(TAB_KEY, tab)
  } catch {
    /* 저장소 불가 — 탭 기억 없이 계속 */
  }
}

export interface CalendarClientProps {
  locale: Lang
  monthVm: MonthViewModel
  /** 오늘의 일 뷰모델(서버 빌드). */
  dayVm: DayViewModel
  /** 상단 칩 — 날짜(+ 도시), 시각 없음. */
  chipStamp: string
  /** 폴리오 — 'COMPUTED · 1997.3.21 14:30 · Seoul'. */
  folioStamp: string
  /** 폴리오 오른쪽 — 실제 사용자 'destinypal.com', 공개 샘플 'Sample'. */
  folioRight: string
  /** 일간 — 상단 칩 원판. */
  dayMaster?: { stem: string; element: ElementKey }
  /**
   * 일 재빌드 fetch(/api/calendar/day)에 강제로 실을 생일 override 쿼리.
   * 세션/URL 과 다른 고정 본명을 쓰는 surface(/calendar/preview)용 — 미지정 시
   * 현재 URL 쿼리(override 규약) 또는 세션 본명이 그대로 쓰인다.
   */
  dayFetchParams?: Record<string, string>
  backHref?: string
  /** 유료 상담사 CTA(월간 · 일간) — 공개 샘플(/calendar/preview)은 false(QA-8). 기본 true. */
  showCounselor?: boolean
  /**
   * override 보기(?date=…)의 본명 — 저장된 본명과 다르면 월간 CTA 가 이 차트의 PUSH · HOLD 대신
   * 일반 질문을 싣는다(상담은 저장된 본명으로 열린다). 세션 보기는 생략.
   */
  ctaSubject?: BirthSubject
}

export default function CalendarClient({
  locale,
  monthVm,
  dayVm,
  chipStamp,
  folioStamp,
  folioRight,
  dayMaster,
  dayFetchParams,
  backHref = '/',
  showCounselor = true,
  ctaSubject,
}: CalendarClientProps) {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<CalendarTab>('month')
  const topRef = useRef<HTMLDivElement | null>(null)

  // 마운트 후 저장된 탭 복원(SSR 은 항상 월간 — hydration 일치).
  useEffect(() => {
    const stored = readStoredTab()
    if (stored) setTab(stored)
  }, [])

  // 일간 데이터 — 기본은 서버가 빌드한 '오늘'. 다른 날 선택 시 교체.
  const [dayData, setDayData] = useState<DayViewModel>(dayVm)
  const [dayLoading, setDayLoading] = useState(false)
  const [dayError, setDayError] = useState(false)
  // 마지막으로 요청한 날 — dayData 와 다르면(받는 중 · 실패) 이전 날을 보이지 않는다.
  const [wantIso, setWantIso] = useState(dayVm.iso)
  // 받아온 날짜 캐시(세션 내) + 늦게 도착한 응답이 최신 선택을 덮지 않게 seq 가드.
  const dayCacheRef = useRef<Map<string, DayViewModel>>(new Map())
  const reqSeqRef = useRef(0)
  const lastIsoRef = useRef(dayVm.iso)

  const loadDay = useCallback(
    async (iso: string) => {
      lastIsoRef.current = iso
      const seq = ++reqSeqRef.current
      setDayError(false)
      setWantIso(iso)

      // 오늘(서버 빌드분) 또는 이미 받아둔 날짜 — 네트워크 없이 즉시.
      const cached = iso === dayVm.iso ? dayVm : dayCacheRef.current.get(iso)
      if (cached) {
        setDayData(cached)
        setDayLoading(false)
        return
      }

      setDayLoading(true)
      try {
        // 익명 override(?date=&lat=…) 규약 보존 — 현재 쿼리를 그대로 넘긴다.
        const qs = new URLSearchParams(searchParams?.toString() ?? '')
        for (const [k, v] of Object.entries(dayFetchParams ?? {})) qs.set(k, v)
        qs.set('day', iso)
        // 이 화면의 '오늘' — 라우트가 서버 시계 대신 이 날로 isToday 를 정한다(QA CODE-4).
        qs.set('today', dayVm.iso)
        const res = await fetch(`/api/calendar/day?${qs.toString()}`)
        if (!res.ok) throw new Error(`day fetch ${res.status}`)
        const json = (await res.json()) as { data?: { vm?: DayViewModel } }
        const fetched = json?.data?.vm
        if (!fetched) throw new Error('empty day payload')
        dayCacheRef.current.set(iso, fetched)
        if (seq !== reqSeqRef.current) return // 더 최신 선택이 있음 — 버린다.
        setDayData(fetched)
        setDayLoading(false)
      } catch {
        if (seq !== reqSeqRef.current) return
        setDayLoading(false)
        setDayError(true)
      }
    },
    [dayVm, searchParams, dayFetchParams]
  )

  // 셀 선택 시 디바운스 프리로드 — 재탭·'하루 전체 보기' 때 고른 날이 이미 준비돼 있게.
  // 연타 스캔이 rate limit 을 치지 않게 400ms.
  const selectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (selectTimerRef.current) clearTimeout(selectTimerRef.current)
    },
    []
  )
  const handleSelectDay = useCallback(
    (iso: string) => {
      if (selectTimerRef.current) clearTimeout(selectTimerRef.current)
      selectTimerRef.current = setTimeout(() => void loadDay(iso), 400)
    },
    [loadDay]
  )

  const changeTab = useCallback((next: CalendarTab) => {
    setTab(next)
    storeTab(next)
  }, [])

  // 화면 안 버튼이 보기를 갈아끼운 뒤 새 보기의 H1 로 초점(A11Y-1). 일간이 아직 받는 중이면 상태
  // 줄에 두었다가, 다 받으면 H1 로.
  const mainRef = useRef<HTMLElement | null>(null)
  const pendingFocusRef = useRef(false)

  // 아래로 내려가 있으면 스위치가 보이게 올린다(탭이 바뀐 걸 바로 보이게).
  const scrollToTop = useCallback(() => {
    const el = topRef.current
    if (!el) return
    if (el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' })
  }, [])

  // 재탭 · '하루 전체 보기' — 그날을 받고 일간 탭으로.
  const openDay = useCallback(
    (iso: string) => {
      if (selectTimerRef.current) clearTimeout(selectTimerRef.current)
      void loadDay(iso)
      pendingFocusRef.current = true
      changeTab('day')
      scrollToTop()
    },
    [loadDay, changeTab, scrollToTop]
  )

  const backToMonth = () => {
    pendingFocusRef.current = true
    changeTab('month')
    scrollToTop()
  }

  const busy = tab === 'day' && (dayLoading || dayError)
  // 다른 날을 받는 중이거나 받지 못함 — 이전 날의 읽기를 그 날의 답처럼 두지 않는다(CODE-5).
  const stale = busy && dayData.iso !== wantIso

  useEffect(() => {
    if (!pendingFocusRef.current) return
    const root = mainRef.current
    if (!root) return
    const h1 = root.querySelector<HTMLElement>('h1')
    if (h1) {
      pendingFocusRef.current = false
      h1.focus({ preventScroll: true })
      return
    }
    root.querySelector<HTMLElement>('[data-day-status]')?.focus({ preventScroll: true })
  }, [tab, stale, dayData])

  // 라이브 영역 문구 — 상태(받는 중 · 실패) 또는 일간이 연 날의 요약. 월간의 고른 날 요약은
  // MonthView 의 라이브 영역이 쓴다.
  const liveText =
    tab !== 'day'
      ? ''
      : dayLoading
        ? pick(CAL_COPY.dayLoading, locale)
        : dayError
          ? pick(CAL_COPY.dayError, locale)
          : fill(pick(CAL_COPY.liveDay, locale), {
              label: dayData.hero.label,
              date: dayData.hero.dateLabel,
            })

  return (
    <div className={[s.page, locale === 'ko' ? s.ko : ''].filter(Boolean).join(' ')} lang={locale}>
      <V9TopBar
        title={pick(CAL_COPY.title, locale)}
        locale={locale}
        backHref={backHref}
        who={{ stamp: chipStamp, dayMaster }}
        whoLabel={pick(CAL_COPY.whoLabel, locale)}
      />
      <Folio stamp={folioStamp} right={folioRight} locale={locale} className={s.folio} />

      <div ref={topRef}>
        <SegSwitch<CalendarTab>
          options={[
            { value: 'month', label: pick(CAL_COPY.monthly, locale) },
            { value: 'day', label: pick(CAL_COPY.daily, locale) },
          ]}
          value={tab}
          // 스위치로 일간을 열면 표시 중인 날 그대로(다른 날을 보다 왔으면 그날).
          onChange={changeTab}
          ariaLabel={pick(CAL_COPY.segAria, locale)}
          className={s.seg}
        />
      </div>

      {/* 늘 붙어 있는 라이브 영역 — 내용이 바뀔 때 읽힌다(함께 마운트되면 첫 알림을 놓친다). */}
      <div className={s.sr} role="status" aria-live="polite" data-live="calendar">
        {liveText}
      </div>

      <main
        ref={mainRef}
        className={s.view}
        aria-busy={dayLoading && tab === 'day' ? true : undefined}
      >
        {busy ? (
          <div className={s.status} data-day-status="" tabIndex={-1}>
            <span>
              {dayLoading ? pick(CAL_COPY.dayLoading, locale) : pick(CAL_COPY.dayError, locale)}
            </span>
            {dayError ? (
              <button
                type="button"
                className={s.retry}
                onClick={() => void loadDay(lastIsoRef.current)}
              >
                {pick(CAL_COPY.retry, locale)}
              </button>
            ) : null}
          </div>
        ) : null}
        {tab === 'month' ? (
          <MonthView
            vm={monthVm}
            locale={locale}
            onSelectDay={handleSelectDay}
            onOpenDay={openDay}
            showCounselor={showCounselor}
            ctaSubject={ctaSubject}
            // 일간에서 보던 날이 이 달이면 그 날을 고른 채로(QA CODE-6 — 두 탭이 같은 날을 가리킨다).
            initialSelectedIso={dayData.iso}
          />
        ) : stale ? (
          <div className={s.pending} data-day-pending="" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        ) : (
          <DayView
            vm={dayData}
            locale={locale}
            onBackToMonth={backToMonth}
            showCounselor={showCounselor}
          />
        )}
      </main>

      <Folio
        stamp={folioStamp}
        right={folioRight}
        position="end"
        locale={locale}
        className={s.folio}
      />
      <CalendarFooter locale={locale} className={s.foot} />
    </div>
  )
}
