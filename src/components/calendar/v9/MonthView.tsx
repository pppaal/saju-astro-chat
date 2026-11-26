'use client'

/**
 * 월간(Monthly) 탭 — 월 뷰모델(buildMonthViewModel)만 그린다. 계산하지 않는다(범례 · 축 눈금 · BEST
 * 주석 · 그리드 빈칸 · 큰 날 · 해 볼 것 · 오늘 · 사다리 · 공유 재료 모두 뷰모델이 이미 정했다).
 *
 * 순서(디자인 calendar9 · FIX9b): 먹 띠 히어로(까치 한 줄 + 算, THE MONTH, H1, 리드, 한 달 읽기, 날 수
 * 네 칸) → 해 볼 것(PUSH · HOLD) → 01 하루씩(제목 · 30일 막대 · 그리드 · 범례 · 캡션 · 고른 날 읽기)
 * → 02 큰 날 → 03 오늘 → 04 근거 사다리 → 상담사 CTA(가격 줄 포함) → 이달 공유하기.
 *
 * 상담사 CTA(QA-8): 공개 샘플(/calendar/preview)은 showCounselor={false} 로 숨긴다. override 보기
 * (ctaSubject = 화면의 본명)는 저장된 본명과 같을 때만 이 달 PUSH · HOLD 질문을, 아니면 일반 질문을 싣는다.
 *
 * 그리드 탭: 처음엔 오늘이 골라져 있다 — 일간에서 이 달의 다른 날을 보다 왔으면 그 날(initialSelectedIso,
 * QA CODE-6). 다른 날을 누르면 고른 날 읽기가 열리고(onSelectDay —
 * 호출자가 그날 일 데이터를 미리 받는다), 고른 날을 한 번 더 누르면 하루 전체로(gridTapIntent → dive
 * → onOpenDay). 오늘 블록·고른 날 읽기의 '하루 전체 보기'도 onOpenDay.
 */

import { useState } from 'react'
import CounselorCTA from '@/components/report/CounselorCTA'
import type { BirthSubject } from '@/lib/birth/sameBirth'
import CrossCheckRow from '@/components/v9/CrossCheckRow'
import { fill, pick, type Lang } from '@/components/v9/v9Copy'
import type { MonthGridCellVM, MonthViewModel } from '@/lib/calendar-view/monthViewModel'
// 값으로 쓰는 재탭 규칙은 잎 모듈에서 — 뷰모델 모듈은 천체력 캐시를 끌고 와 클라이언트에 넣지 않는다.
import { gridTapIntent } from '@/lib/calendar-view/gridTap'
import { ShareCalendarButton } from '@/components/calendar/ShareCalendarButton'
import MonthHero from './MonthHero'
import MonthRead from './MonthRead'
import TryThis from './TryThis'
import DayBars from './DayBars'
import MonthGrid from './MonthGrid'
import GridLegend, { swatchClass } from './GridLegend'
import KeyDayList from './KeyDayList'
import TodayBlock from './TodayBlock'
import EvidenceLadderV9 from './EvidenceLadderV9'
import ArrowIcon from './ArrowIcon'
import { CAL_COPY } from './calendarCopy'
import s from './calendar.module.css'

interface MonthViewProps {
  vm: MonthViewModel
  locale: Lang
  /** 다른 날을 골랐을 때('YYYY-MM-DD') — 호출자가 그날 일 데이터를 미리 받는다. */
  onSelectDay?: (iso: string) => void
  /** 하루 전체로('YYYY-MM-DD') — 재탭 · '하루 전체 보기'. */
  onOpenDay: (iso: string) => void
  /** 유료 상담사 CTA 를 그린다(기본 true) — 공개 샘플은 false. */
  showCounselor?: boolean
  /** override 보기의 본명 — 저장된 본명과 다르면 CTA 가 일반 질문을 싣는다. */
  ctaSubject?: BirthSubject
  /** 처음 고를 날('YYYY-MM-DD') — 이 달이면 그 날, 아니면 오늘(일간에서 보던 날, QA CODE-6). */
  initialSelectedIso?: string
}

/** 고른 날 읽기 — 큰 날 행과 같은 말(그리드 마크 판정 · 엔진 한 줄 · '왜' 행) + '하루 전체 보기'. */
function SelectedRead({
  cell,
  locale,
  onOpen,
}: {
  cell: MonthGridCellVM
  locale: Lang
  onOpen: () => void
}) {
  const { read } = cell
  return (
    <div className={s.panel} data-cal-selected={cell.ds}>
      <div className={s.lr}>
        <span>{pick(CAL_COPY.selectedRead, locale)}</span>
        <span>{read.label}</span>
      </div>
      <p className={`${s.h3} ${s.selVerdict}`}>
        <i className={swatchClass(cell.mark)} aria-hidden="true" />
        {read.verdict}
      </p>
      <p className={s.sub}>{read.meaning}</p>
      {read.why ? (
        <div className={s.why}>
          <CrossCheckRow
            kind="timing"
            first
            saju={read.why.saju}
            stars={read.why.stars}
            mark={read.why.mark}
            note={read.why.note}
            locale={locale}
          />
        </div>
      ) : null}
      <button type="button" className={s.lrow} onClick={onOpen} data-open-day="">
        <span>
          <b>{pick(CAL_COPY.openDay, locale)}</b>
          <span className={s.s}>{pick(CAL_COPY.openDaySub, locale)}</span>
        </span>
        <ArrowIcon />
      </button>
    </div>
  )
}

export default function MonthView({
  vm,
  locale,
  onSelectDay,
  onOpenDay,
  showCounselor = true,
  ctaSubject,
  initialSelectedIso,
}: MonthViewProps) {
  const todayCell = vm.grid.cells.find((c) => c.isToday)
  const [selected, setSelected] = useState<number>(() => {
    const d = Number(initialSelectedIso?.slice(8, 10))
    const inMonth =
      initialSelectedIso?.slice(0, 7) === vm.ym && vm.grid.cells.some((c) => c.d === d)
    return inMonth ? d : (todayCell?.d ?? 0)
  })
  // 고른 날 요약 — 늘 붙어 있는 라이브 영역에(A11Y-4). 처음 렌더(복원된 고른 날)는 알리지 않는다.
  const [live, setLive] = useState('')
  const isoOf = (d: number) => `${vm.ym}-${String(d).padStart(2, '0')}`

  const onTap = (d: number) => {
    if (gridTapIntent(selected, d) === 'dive') {
      onOpenDay(isoOf(d))
      return
    }
    setSelected(d)
    const c = vm.grid.cells.find((x) => x.d === d)
    if (c)
      setLive(
        fill(pick(CAL_COPY.liveSelected, locale), { label: c.read.label, verdict: c.read.verdict })
      )
    onSelectDay?.(isoOf(d))
  }
  // 오늘을 고른 상태면 읽기를 따로 열지 않는다 — 오늘의 읽기는 '03 / 오늘'에.
  const selectedCell = vm.grid.cells.find((c) => c.d === selected && !c.isToday) ?? null
  const bestLabel = vm.legend.find((l) => l.key === 'best')?.label ?? 'Best'
  const ladderRange = pick(
    vm.ladderSource === 'day' ? CAL_COPY.ladderRange : CAL_COPY.ladderRangeMonth,
    locale
  )

  return (
    <div data-cal-view="month" data-ym={vm.ym}>
      <MonthHero
        monthLabel={vm.monthLabel}
        headline={vm.hero.headline}
        subline={vm.hero.subline}
        locale={locale}
      >
        <MonthRead
          read={vm.read}
          counts={vm.counts}
          countsLine={vm.hero.countsLine}
          legend={vm.legend}
          locale={locale}
        />
      </MonthHero>

      <TryThis tryThis={vm.tryThis} locale={locale} />

      <section className={s.sec} data-cal-section="days">
        <div className={s.lr}>
          <span>{pick(CAL_COPY.dayByDay, locale)}</span>
          <span>{vm.monthShort}</span>
        </div>
        {/* 큰 날이 없는 달은 'Zero key days.' 같은 머리말 대신 머리말 없이(QA CODE-8). */}
        {vm.h2.lead || vm.h2.best ? (
          <h2 className={s.h2}>
            {vm.h2.lead}
            {vm.h2.best ? <span className={s.lt}>{vm.h2.best}</span> : null}
          </h2>
        ) : null}
        <DayBars
          bars={vm.bars}
          bestAnnotation={vm.bestAnnotation}
          axisTicks={vm.axisTicks}
          monthShort={vm.monthShort}
          locale={locale}
        />
        <MonthGrid
          grid={vm.grid}
          selected={selected}
          onTap={onTap}
          bestLabel={bestLabel}
          locale={locale}
        />
        <GridLegend legend={vm.legend} />
        <p className={s.cap}>
          <span>{pick(CAL_COPY.gridCapA, locale)}</span>
          <span>{pick(CAL_COPY.gridCapB, locale)}</span>
        </p>
        <div className={s.sr} role="status" aria-live="polite" data-live="selected">
          {live}
        </div>
        {selectedCell ? (
          <SelectedRead
            cell={selectedCell}
            locale={locale}
            onOpen={() => onOpenDay(isoOf(selectedCell.d))}
          />
        ) : null}
      </section>

      {vm.keyDays.length > 0 ? <KeyDayList rows={vm.keyDays} locale={locale} /> : null}

      {vm.today ? (
        <TodayBlock
          today={vm.today}
          locale={locale}
          onOpenDay={() => vm.today && onOpenDay(vm.today.iso)}
        />
      ) : null}

      <EvidenceLadderV9
        rows={vm.ladder}
        caption={vm.ladderCaption}
        label={pick(CAL_COPY.ladderLabel, locale)}
        range={ladderRange}
        locale={locale}
      />

      {showCounselor ? (
        <div className={s.cta}>
          <CounselorCTA
            lang={locale}
            variant="v9"
            funnelEvent="calendar.counselor_cta"
            question={{ ko: vm.cta.question, en: vm.cta.question }}
            subject={
              ctaSubject
                ? {
                    birth: ctaSubject,
                    genericQuestion: { ko: vm.cta.generic, en: vm.cta.generic },
                  }
                : undefined
            }
          />
        </div>
      ) : null}
      <div className={s.share}>
        <ShareCalendarButton data={{ isKo: locale === 'ko', ...vm.share }} />
      </div>
    </div>
  )
}
