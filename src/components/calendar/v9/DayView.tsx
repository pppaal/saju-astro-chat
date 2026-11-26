'use client'

/**
 * 일간(Daily) 탭 — 일 뷰모델(buildDayViewModel)만 그린다: 월간 탭과 같은 부품.
 *
 * 순서: 히어로 띠(까치 한 줄 + 算, '오늘 · 목요일 | 2026.11.19', 후크, 연속 방문 칩, 이날의 읽기 =
 * 톤 단어 · 바람 단어) → 까치 한 줄(한 끗) → 톤 카드(월간 '03 / 오늘'과 같은 카드 — '왜 이런 날' 행 =
 * day.reason, 공유 줄) → 01 해 볼 것(DO / EASE) → 02 분야별 → 03 겹치는 흐름(교차 행, '왜' 행은
 * 위 카드에 있어 뺀다) → 04 시진별(시진 창과 상승궁을 나란히 — 교차 아님, 결정 19) → 05 근거 사다리 →
 * 상담사 CTA → 이달 전체 보기.
 *
 * 상담사 CTA: 공개 샘플은 showCounselor={false} 로 숨긴다(QA-8). 일 질문은 날짜만 담고 이 차트의 판단을
 * 담지 않아('오늘을 더 자세히' / '11월 24일을 더 자세히') override 보기에서도 그대로 싣는다.
 *
 * 이모지 없음(분야 아이콘은 그리지 않는다). 계산하지 않는다 — 뷰모델이 이미 언어·순서·정화를 정했다.
 */

import CounselorCTA from '@/components/report/CounselorCTA'
import CrossCheckRow, { CrossCheckList } from '@/components/v9/CrossCheckRow'
import XLegend from '@/components/v9/XLegend'
import StreakChip from '@/components/calendar/StreakChip'
import { pick, type Lang } from '@/components/v9/v9Copy'
import type { DayViewModel } from '@/lib/calendar-view/dayViewModel'
import { HeroBand } from './MonthHero'
import { DayToneCard, KkachiLine } from './TodayBlock'
import EvidenceLadderV9 from './EvidenceLadderV9'
import { swatchClass } from './GridLegend'
import ArrowIcon from './ArrowIcon'
import { CAL_COPY } from './calendarCopy'
import s from './calendar.module.css'
import d from './DayView.module.css'

interface DayViewProps {
  vm: DayViewModel
  locale: Lang
  /** 이달 전체 보기(월간 탭으로). */
  onBackToMonth?: () => void
  /** 유료 상담사 CTA 를 그린다(기본 true) — 공개 샘플은 false. */
  showCounselor?: boolean
}

export default function DayView({ vm, locale, onBackToMonth, showCounselor = true }: DayViewProps) {
  const { hero } = vm
  // '왜' 행은 톤 카드에 이미 있다 — 교차 목록 맨 위가 같은 근거면 뺀다(뷰모델: 맨 위 = '왜').
  const crossings = vm.why ? vm.crossings.slice(1) : vm.crossings
  return (
    <div data-cal-view="day" data-iso={vm.iso}>
      <HeroBand
        section="day-hero"
        corner={{ left: hero.label, right: hero.dateLabel }}
        headline={hero.headline}
        subline={hero.subline}
        locale={locale}
      >
        {vm.isToday ? (
          <div className={d.streak}>
            <StreakChip ko={locale === 'ko'} />
          </div>
        ) : null}
        <div className={s.read} data-cal-read="">
          <span className={s.rdL}>{pick(CAL_COPY.dayRead, locale)}</span>
          <span className={s.rdV}>
            <span className={s.nw}>{hero.toneWord}&nbsp;·</span> <span>{hero.windWord}</span>
          </span>
        </div>
      </HeroBand>

      <div className={s.sec} data-cal-section="day-card">
        {hero.voice ? <KkachiLine text={hero.voice} /> : null}
        <DayToneCard today={hero} locale={locale} isToday={vm.isToday} />
        {/* 범례 — 화면의 타이밍 행 블록 맨 아래 한 번: 아래 교차 목록이 없으면 카드의 '왜' 아래. */}
        {vm.why && crossings.length === 0 ? (
          <XLegend locale={locale} className={s.xlegend} />
        ) : null}
      </div>

      {vm.tryThis ? (
        <section className={s.sec} data-cal-section="day-try">
          <div className={s.lr}>
            <span>{pick(CAL_COPY.dayTry, locale)}</span>
            <span>{pick(CAL_COPY.dayTryRange, locale)}</span>
          </div>
          <div className={d.tryGrid}>
            <div className={d.tryCol} data-try="do">
              <span className={d.tryK}>{pick(CAL_COPY.do, locale)}</span>
              <ul className={d.tryList}>
                {vm.tryThis.do.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
            <div className={d.tryCol} data-try="ease">
              <span className={d.tryK}>{pick(CAL_COPY.ease, locale)}</span>
              <ul className={`${d.tryList} ${d.ease}`}>
                {vm.tryThis.ease.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {vm.byArea ? (
        <section className={s.sec} data-cal-section="day-area">
          <div className={s.lr}>
            <span>{pick(CAL_COPY.dayArea, locale)}</span>
            <span>{hero.dateLabel}</span>
          </div>
          {vm.byArea.note ? <p className={d.areaNote}>{vm.byArea.note}</p> : null}
          <ul className={d.areas}>
            {vm.byArea.areas.map((a) => (
              <li key={a.key} className={d.area} data-area={a.key}>
                <span className={d.areaHead}>
                  <span className={d.areaLabel}>{a.label}</span>
                  {a.active ? (
                    <span className={d.focus}>{pick(CAL_COPY.inFocus, locale)}</span>
                  ) : null}
                </span>
                <p className={d.areaBody}>{a.body}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {crossings.length > 0 ? (
        <section className={s.sec} data-cal-section="day-cross">
          <div className={s.lr}>
            <span>{pick(CAL_COPY.dayCross, locale)}</span>
            <span>{pick(CAL_COPY.dayCrossRange, locale)}</span>
          </div>
          <CrossCheckList className={d.xlist}>
            {crossings.map((c, i) => (
              <CrossCheckRow
                key={`${c.saju.text}-${c.stars.text}-${i}`}
                kind="timing"
                first={i === 0}
                saju={c.saju}
                stars={c.stars}
                mark={c.mark}
                note={c.note}
                locale={locale}
              />
            ))}
          </CrossCheckList>
          {/* 범례 — 이 화면의 타이밍 행(카드의 '왜' + 이 목록) 블록 맨 아래 한 번. */}
          <XLegend locale={locale} className={s.xlegend} />
        </section>
      ) : null}

      {vm.hours.length > 0 ? (
        <section className={s.sec} data-cal-section="day-hours">
          <div className={s.lr}>
            <span>{pick(CAL_COPY.dayHours, locale)}</span>
            <span>{pick(CAL_COPY.dayHoursRange, locale)}</span>
          </div>
          <ul className={d.hours}>
            {vm.hours.map((h) => (
              <li
                key={h.window}
                className={[d.hour, h.peak ? d.peak : ''].filter(Boolean).join(' ')}
                data-hour-tone={h.tone}
                data-peak={h.peak ? '' : undefined}
              >
                <i
                  className={swatchClass(h.tone === 'good' ? 'good' : 'caution')}
                  aria-hidden="true"
                />
                <span className={d.win}>{h.window}</span>
                <span className={d.hname}>
                  {h.name}
                  <span className={s.sr}>
                    {' '}
                    {pick(h.tone === 'good' ? CAL_COPY.hourGood : CAL_COPY.hourCaution, locale)}
                  </span>
                </span>
                <span className={d.rise}>{h.rising}</span>
                {h.narrative ? <p className={d.narr}>{h.narrative}</p> : null}
              </li>
            ))}
          </ul>
          <div className={d.hourKey}>
            <span>
              <i className={swatchClass('good')} aria-hidden="true" />
              {pick(CAL_COPY.hourGood, locale)}
            </span>
            <span>
              <i className={swatchClass('caution')} aria-hidden="true" />
              {pick(CAL_COPY.hourCaution, locale)}
            </span>
          </div>
          <p className={s.cap}>{pick(CAL_COPY.hoursCap, locale)}</p>
        </section>
      ) : null}

      <EvidenceLadderV9
        rows={vm.ladder}
        caption={vm.ladderCaption}
        label={pick(CAL_COPY.dayLadder, locale)}
        range={pick(CAL_COPY.ladderRange, locale)}
        locale={locale}
      />

      {showCounselor ? (
        <div className={s.cta}>
          <CounselorCTA
            lang={locale}
            variant="v9"
            funnelEvent="calendar.counselor_cta"
            question={{ ko: vm.cta.question, en: vm.cta.question }}
          />
        </div>
      ) : null}

      {onBackToMonth ? (
        <div className={s.share}>
          <button
            type="button"
            className={`${s.lrow} ${s.lrowBare}`}
            onClick={onBackToMonth}
            data-back-to-month=""
          >
            <span>
              <b>{pick(CAL_COPY.backToMonth, locale)}</b>
              <span className={s.s}>{pick(CAL_COPY.backToMonthSub, locale)}</span>
            </span>
            <ArrowIcon />
          </button>
        </div>
      ) : null}
    </div>
  )
}
