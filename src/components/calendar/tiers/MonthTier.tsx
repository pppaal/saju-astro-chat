'use client'

/* ============================================================
   destinypal · MonthTier — 1달(月運) "이 달의 모양" · LIGHT 만세력
   ────────────────────────────────────────────────────────────
   디자인 방향(시안 · LIGHT):
     · 앱 셸은 다크 — 이 티어는 .monthRoot 가 라이트 팔레트를 직접 들고
       독립 레이아웃을 쓴다(TierFrame 미사용).
     · 간지(甲午)·월운 읽기·raw 사주/점성 용어(편재·화성…)를 *표면에* 드러낸다.
       → 옛 "자세한 신호 보기" jargon 폴드 + WhyList 제거.
     · 색 달력 그리드(좋음/조심/피함/큰날/오늘) + 클릭으로 셀 선택 → 리드아웃.
     · 큰 날 리스트 · 한 줄 총평(verdict + term-tag) · 겹치는 흐름 카드.

   PRESENTATION ONLY — 엔진/derivers/스코어링 미변경. 살아있는 데이터만 사용:
     month.{ym,label,woolun,calendar[].{d,ds,mark,focus},focusDay,
            goodDays,cautionDays,avoidDays,bestDay,keyDays,narrative,
            woolunSibsin,crossActivations,seed}
   ============================================================ */

import { useState } from 'react'
import type { DestinyMonth, DestinyDayMark } from '@/types/calendar'
import styles from './MonthTier.module.css'
import { useI18n } from '@/i18n/I18nProvider'
import { toneMeaningFor, type MeaningTone } from '@/lib/calendar-engine/derivers/toneMeaning'
import { sibsinArea, sibsinAreaEn, planetPlain } from '@/lib/calendar-engine/derivers/plainLanguage'
import { ShareCalendarButton } from '@/components/calendar/ShareCalendarButton'
import { monthShareHook } from '@/lib/share/shareHook'
import { reconcileMonthTone } from '@/lib/calendar-engine/derivers/reconcile'

const MONTH_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

const DOWS = ['일', '월', '화', '수', '목', '금', '토'] as const
const DOWS_EN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const

// ============================================================================
// Props (계약 불변 — 셸 줌 네비게이션이 onDive/onRise/showRise 를 호출)
// ============================================================================

export interface MonthTierProps {
  month: DestinyMonth
  /** 줌인 — 그리드에서 *선택된 날*(기본=오늘)을 넘긴다. 일 티어가 그 날로 빌드됨. */
  onDive: (selectedDay: number) => void
  onRise: () => void
  /** 위 티어가 있을 때만 줌아웃 버튼 노출 (월이 최상단이면 숨김). 기본 true. */
  showRise?: boolean
  /**
   * 그리드에서 날짜를 고를 때마다 호출 — 부모가 일 티어 데이터를 미리 준비해,
   * CTA 없이 스와이프/레일로 줌인해도 고른 날이 보이게 한다.
   */
  onSelectDay?: (day: number) => void
}

// ============================================================================
// helpers
// ============================================================================

/** ym = "YYYY-MM" → 1일의 요일 (0=일 .. 6=토). */
function firstDowOfMonth(ym: string): number {
  const yyyy = parseInt(ym.slice(0, 4), 10)
  const mm = parseInt(ym.slice(5, 7), 10)
  if (!Number.isFinite(yyyy) || !Number.isFinite(mm)) return 0
  return new Date(Date.UTC(yyyy, mm - 1, 1)).getUTCDay()
}

// ============================================================================
// 컴포넌트
// ============================================================================

export function MonthTier({ month, onDive, onRise, showRise = true, onSelectDay }: MonthTierProps) {
  const { locale } = useI18n()
  const ko = locale === 'ko'
  const firstDow = firstDowOfMonth(month.ym)
  const calendar = month.calendar ?? []
  const focusDay = month.focusDay

  // 1달 제목 — ko: "6월의 모양" / en: "The shape of June"
  const ymM = Number(month.ym.split('-')[1])
  const year = month.ym.split('-')[0] ?? ''
  const monthEn = MONTH_EN[(ymM ?? 1) - 1] ?? ''
  const flowTitle = ko ? `${ymM ?? ''}월의 모양` : `The shape of ${monthEn}`.trim()

  // 월 verdict — 톤·카운트의 단일 권위. 서버(assembleTiers)가 중립화까지 끝낸 최종
  // 카운트로 산출해 month.verdict 로 실어 준다. 없으면(직접 렌더/테스트) 같은
  // 함수로 폴백 — 어느 경로든 히어로·총평·공유카드가 한 공식을 본다(감사 D-1).
  const verdict =
    month.verdict ??
    reconcileMonthTone({
      goodN: month.goodDays?.length ?? 0,
      cautionN: month.cautionDays?.length ?? 0,
      avoidN: month.avoidDays?.length ?? 0,
      totalN: month.calendar?.length ?? 0,
    })
  const goodN = verdict.goodN
  const cautionN = verdict.cautionN
  const avoidN = verdict.avoidN
  const careN = verdict.careN
  // 개인 시드 — 톤 문구를 사람마다 다르게 회전(같은 날·톤이라도 본명 다르면 다른 줄).
  const seed = month.seed ?? 0

  // ── 셀 mark ↔ 톤 매핑 (색과 의미가 어긋나지 않게 같은 소스). ──
  const markByDs = new Map<string, DestinyDayMark | null>(calendar.map((c) => [c.ds, c.mark]))
  // 셀별 화해 톤(서버 reconcileCellOneLine) — 태그·조언·큰 날 라벨의 단일 권위.
  // 규약: 색=점수 밴드(mark), 문장·라벨=화해 톤. 없으면(구 캐시) mark 톤 폴백.
  const toneByDs = new Map<string, 'positive' | 'mixed' | 'caution' | undefined>(
    calendar.map((c) => [c.ds, c.tone])
  )
  const cellToneToMeaningTone = (t: 'positive' | 'mixed' | 'caution'): MeaningTone =>
    t === 'positive' ? 'positive' : t === 'caution' ? 'negative' : 'neutral'
  const verdictPrefix = (m: DestinyDayMark | null): string => {
    if (m === 'best' || m === 'good') return ko ? '좋은 날' : 'Good day'
    if (m === 'caution') return ko ? '조심할 날' : 'Caution'
    if (m === 'avoid') return ko ? '피할 날' : 'Avoid'
    return ko ? '잔잔한 날' : 'Calm day'
  }
  // 톤(positive/negative/neutral) → prefix. meaning 과 *같은 톤* 에서 뽑아야
  // "잔잔한 날 · 부딪힘을 조심할 날" 식 모순이 안 난다.
  const verdictPrefixForTone = (t: MeaningTone): string => {
    if (t === 'positive') return ko ? '좋은 날' : 'Good day'
    if (t === 'negative') return ko ? '조심할 날' : 'Caution'
    return ko ? '잔잔한 날' : 'Calm day'
  }
  const markToTone = (m: DestinyDayMark | null): MeaningTone => {
    if (m === 'best' || m === 'good') return 'positive'
    if (m === 'caution' || m === 'avoid') return 'negative'
    return 'neutral'
  }

  // ── 이달의 큰 날 — 판정 prefix + 톤 문구. 'MM-DD' 기준으로 셀 톤을 끌어온다. ──
  interface BigDay {
    when: string
    title: string
  }
  // 최고의 날 라벨 — 그리드 best(초록)라도 그날 화해 톤이 mixed(tense: 좋은밴드인데
  // 흉신 우세)면 라벨도 그 톤을 따른다. 무조건 positive 로 굳히면 목록은 "최고의 날 ·
  // <낙관>"인데 그날 리드아웃은 "기복 있는 날"이라 어긋난다(감사 #4). caution 은
  // good 밴드 best 에선 안 나오지만 방어적으로 포함. flat/positive 는 최고의 날 유지.
  const bestDayTitle = (date: string): string => {
    const dn = parseInt(date.slice(-2), 10)
    const cellTone = toneByDs.get(date)
    if (cellTone === 'mixed') {
      return `${ko ? '기복 있는 날' : 'Mixed day'} · ${toneMeaningFor('neutral', dn, ko ? 'ko' : 'en', seed)}`
    }
    if (cellTone === 'caution') {
      return `${verdictPrefixForTone('negative')} · ${toneMeaningFor('negative', dn, ko ? 'ko' : 'en', seed)}`
    }
    return `${ko ? '최고의 날' : 'Best day'} · ${toneMeaningFor('positive', dn, ko ? 'ko' : 'en', seed)}`
  }
  const keyDayItems: BigDay[] = [...(month.keyDays ?? [])].map((k) => {
    const mark = markByDs.get(k.date) ?? null
    const dayNum = parseInt(k.date.slice(-2), 10)
    // 이 날이 그리드 '최고의 날'(초록 best)이면 best 라벨 규약을 따른다(화해 톤 반영).
    if (month.bestDay?.date && k.date === month.bestDay.date) {
      return { when: k.date, title: bestDayTitle(k.date) }
    }
    // 톤 권위 = 셀의 화해 톤(cell.tone) — 그리드 리드아웃·일 화면과 같은 축.
    // 예전엔 k.tone(수렴 톤: 전 층 무거운 신호 순극성)을 그대로 써서, 그리드가
    // 빨간(avoid) 날이 목록에선 "좋은 날"로 뜨는 모순이 났다(감사 #3). 수렴은
    // *선정*(어느 날이 큰 날인가)까지만 — 라벨·문구 톤은 화해 톤이 정한다.
    // meaning 도 클라이언트 로케일로 재생성 — k.meaning 은 서버 언어로 구워져
    // 언어 토글 시 "Good day · 먼저 움직이면…" 혼종이 났다(감사 #11).
    const cellTone = toneByDs.get(k.date)
    const tone: MeaningTone = cellTone
      ? cellToneToMeaningTone(cellTone)
      : (k.tone ?? markToTone(mark))
    const meaning = toneMeaningFor(tone, dayNum, ko ? 'ko' : 'en', seed)
    const prefix =
      cellTone === 'mixed'
        ? ko
          ? '기복 있는 날'
          : 'Mixed day'
        : cellTone
          ? verdictPrefixForTone(tone)
          : verdictPrefix(mark)
    return { when: k.date, title: `${prefix} · ${meaning}` }
  })
  // best(최고)일이 큰 날 목록에 빠졌으면 채워 넣는다(화해 톤 반영 라벨).
  if (month.bestDay?.date && !keyDayItems.some((i) => i.when === month.bestDay.date)) {
    keyDayItems.push({ when: month.bestDay.date, title: bestDayTitle(month.bestDay.date) })
  }
  const bigDays = keyDayItems.sort((a, b) => a.when.localeCompare(b.when))
  const keyDates = new Set(bigDays.map((i) => i.when))
  const goodPrefix = ko ? '좋은 날' : 'Good day'
  const bestPrefix = ko ? '최고의 날' : 'Best day'

  // ── 간지(甲午) — 표면에 노출(시안 의도). ──
  const ganjiHanja = month.woolun?.hanja ?? ''
  const ganjiRead = ko ? (month.woolun?.kr ?? '') : (month.woolun?.en ?? month.woolun?.kr ?? '')

  // ── 월운 십신(raw) — verdict-sub term-tag 에 그대로. ──
  const woolunSibsinRaw = month.woolunSibsin ? String(month.woolunSibsin) : ''
  const woolunArea = woolunSibsinRaw
    ? ko
      ? sibsinArea(woolunSibsinRaw)
      : sibsinAreaEn(woolunSibsinRaw)
    : ''

  // ── 이달의 겹치는 흐름 — 월운 십신 × 그 달 점성 페어. ──
  const monthCross = month.crossActivations ?? []
  // 가장 센(극성 절댓값 최대) 흐름 — hero 강조 + 풀이의 한 축.
  const topCross = [...monthCross].sort((a, b) => Math.abs(b.polarity) - Math.abs(a.polarity))[0]
  const topCrossMeaning = topCross
    ? ko
      ? topCross.meaning
      : (topCross.meaningEn ?? topCross.meaning)
    : ''

  // ── 월 톤 — 후크·톤워드·총평·공유카드를 다 지배하는 *단일 권위*(verdict.tone). ──
  // 4-way: good(좋은날 우세) / care(조심날 우세) / volatile(둘 다 있고 균형=기복) /
  // flat(둘 다 없음=고른·평탄). 이제 reconcileMonthTone 한 곳에서만 판정하고 여기선
  // 읽기만 — 예전엔 이 공식이 monthSummary 와 두 벌 복붙이라 어긋날 수 있었다(D-1).
  const noviceTone = verdict.tone
  // 총평/한줄이 쓰는 톤 서술어(순한/조심스러운/기복/고른) — 한 소스.
  const toneVerdictKo =
    noviceTone === 'good'
      ? '순한 편이에요'
      : noviceTone === 'care'
        ? '조심스러운 달이에요'
        : noviceTone === 'flat'
          ? '고르게 흐르는 달이에요'
          : '기복이 있는 달이에요'
  const toneVerdictEn =
    noviceTone === 'good'
      ? 'fairly smooth'
      : noviceTone === 'care'
        ? 'a careful month'
        : noviceTone === 'flat'
          ? 'evenly paced'
          : 'a bit uneven'

  // ── 이달 한 줄 총평 — 월운 분야 + 좋은/조심 날 + 가장 센 흐름 합성(쉬운말 2~3줄). ──
  const monthReading: string = (() => {
    const parts: string[] = []
    if (woolunArea) {
      parts.push(
        ko
          ? `이달은 ‘${woolunArea}’ 쪽으로 결이 기울어요.`
          : `This month leans toward ${woolunArea}.`
      )
    }
    if (goodN > 0 || cautionN > 0) {
      parts.push(
        ko
          ? `흐름이 트이는 날이 ${goodN}개, 한 박자 조심할 날이 ${careN}개라 전체적으로 ${toneVerdictKo}.`
          : `${goodN} day${goodN === 1 ? '' : 's'} open up while ${careN} ${careN === 1 ? 'asks' : 'ask'} for care, so overall it reads ${toneVerdictEn}.`
      )
    }
    if (topCrossMeaning) {
      parts.push(
        ko
          ? `가장 또렷한 흐름은 ‘${topCrossMeaning}’ — 큰 날의 색을 이 신호가 끌어요.`
          : `The clearest thread is "${topCrossMeaning}" — it sets the color of the key days.`
      )
    }
    return parts.join(' ')
  })()
  const verdictText =
    monthReading ||
    (ko
      ? `좋은 날 ${goodN}개, 조심할 날 ${careN}개 — ${toneVerdictKo}.`
      : `${goodN} good, ${careN} for care — ${toneVerdictEn}.`)

  // ── novice hero 톤 워드 — 위 단일 톤에서. ──
  const noviceToneWord = ko
    ? noviceTone === 'good'
      ? '좋은'
      : noviceTone === 'care'
        ? '조심스러운'
        : noviceTone === 'flat'
          ? '고른'
          : '기복 있는'
    : noviceTone === 'good'
      ? 'favourable'
      : noviceTone === 'care'
        ? 'careful'
        : noviceTone === 'flat'
          ? 'even'
          : 'mixed'
  // 일상어 영역(예: "정재" → "재물·실속"). 없으면 결론 문장에서 영역 절을 생략.
  const noviceArea = woolunArea
  const noviceLine = ko
    ? noviceArea
      ? `${ymM ?? ''}월은 ‘${noviceArea}’ 쪽으로 ${noviceToneWord} 흐름의 달이에요.`
      : `${ymM ?? ''}월은 ${noviceToneWord} 흐름의 달이에요.`
    : noviceArea
      ? `${monthEn} leans a ${noviceToneWord} way, toward ${noviceArea}.`
      : `${monthEn} reads a ${noviceToneWord} month.`
  const noviceCounts = ko
    ? `일이 잘 풀리는 날 ${goodN}일 · 한 박자 쉬어갈 날 ${careN}일`
    : `${goodN} day${goodN === 1 ? '' : 's'} flow · ${careN} to ease off`

  // 'MM-DD' → 'M/D' (큰 날 날짜 라벨)
  const mdLabel = (ds: string) => {
    const dd = ds.split('-').pop() ?? ds
    return `${ymM ?? ''}/${Number(dd)}`
  }
  // ── 기본뷰 do/avoid 한 줄 — 그동안 share 카드에만 쓰이던 narrative[0] 의 행동 권유를
  //    구조화 필드(bestDay/cautionDays/avoidDays)에서 평이하게 재구성해 표면에 노출. ──
  // bestDay 폴백은 *앞으로 남은* 초록일 우선 — goodDays 는 시간순이라 첫 항목이
  // 이미 지난 날짜(예: 28일에 "7/2 추진")일 수 있다(감사). 남은 초록일이 없으면
  // 첫 초록일 유지(회고성 안내보단 낫진 않지만 빈칸보단 정보가 있음).
  const focusDayNum = month.focusDay ?? 0
  const upcomingGood = month.goodDays?.find((d) => Number(d.slice(-2)) >= focusDayNum)
  const doDate = month.bestDay?.date || upcomingGood || month.goodDays?.[0] || ''
  const avoidDate = month.cautionDays?.[0] || month.avoidDays?.[0] || ''
  const doAvoidLine: string = (() => {
    if (!doDate && !avoidDate) return ''
    // 각 절이 단독으로도 완결되게 — 예전엔 avoid 없는 달에 "…추진하고"로 끝나는
    // 비문, do 없는 달에 EN 소문자 시작("hold big…")이 나왔다(감사).
    const parts: string[] = []
    if (doDate) {
      parts.push(
        ko
          ? avoidDate
            ? `${mdLabel(doDate)} 무렵 미뤄둔 일을 추진하고`
            : `${mdLabel(doDate)} 무렵 미뤄둔 일을 추진해 보세요.`
          : avoidDate
            ? `Push waiting tasks around ${mdLabel(doDate)}`
            : `Push waiting tasks around ${mdLabel(doDate)}.`
      )
    }
    if (avoidDate) {
      parts.push(
        ko
          ? `${mdLabel(avoidDate)} 무렵엔 큰 결정·이동을 미루세요.`
          : doDate
            ? `hold big decisions and moves near ${mdLabel(avoidDate)}.`
            : `Hold big decisions and moves near ${mdLabel(avoidDate)}.`
      )
    }
    return parts.join(', ')
  })()

  // ── readout — 선택된 날(기본=focusDay)의 셀 판정으로 라벨/문구를 결정. ──
  const [selectedDay, setSelectedDay] = useState<number>(focusDay)
  const selectedCell = calendar.find((c) => c.d === selectedDay)
  const selectedBigDay = bigDays.find((b) => {
    const dd = Number(b.when.split('-').pop())
    return Number.isFinite(dd) && dd === selectedDay
  })
  const selMark = selectedCell?.mark ?? null
  const selToday = !!selectedCell?.focus
  // 선택일의 화해 톤 — 태그·조언·라벨의 권위(문장 selectedOneLine 과 같은 소스).
  const selTone = selectedCell?.tone
  // 그날 근거(쉬운 뜻 + 용어 칩) — 교차가 있는 날만. 엔진이 calendar 셀에 실어 줌.
  const selectedReason = selectedCell?.reason ?? null
  const readoutLabel = selectedBigDay
    ? selectedBigDay.title
    : selToday
      ? ko
        ? '오늘'
        : 'Today'
      : selTone === 'positive'
        ? selMark === 'best'
          ? ko
            ? '최고의 날'
            : 'Best day'
          : ko
            ? '좋은 날'
            : 'Good day'
        : selTone === 'caution'
          ? selMark === 'avoid'
            ? ko
              ? '피할 날'
              : 'Avoid'
            : ko
              ? '조심할 날'
              : 'Caution'
          : selTone === 'mixed'
            ? ko
              ? '기복 있는 날'
              : 'Mixed day'
            : verdictPrefix(selMark)
  // 그날의 화해된 한 줄 — 일(日) 티어 oneLine 과 같은 소스(셀에 서버가 실어 줌).
  // 줌인하면 이 문장이 일 화면 첫 줄로 그대로 이어진다. 없으면(구 캐시 등) 톤 풀 폴백.
  const selectedOneLine = ko
    ? selectedCell?.oneLine
    : (selectedCell?.oneLineEn ?? selectedCell?.oneLine)
  const readoutText = selectedBigDay
    ? ''
    : (selectedOneLine ?? toneMeaningFor(markToTone(selMark), selectedDay, ko ? 'ko' : 'en', seed))
  // 행동 한 줄 — 화해 톤(문장과 같은 소스)으로 평이하게(전문어 0). 예전엔 mark
  // (점수 밴드)에서 뽑아 tense 날에 "밀어붙이기 좋아요" + "무게중심 지키세요"가
  // 한 패널에 같이 떴다(감사 #2). mixed 는 조언 생략(oneLine 이 이미 행동 프레임).
  const readoutAdvice: string = (() => {
    const tone = selTone ?? markToTone(selMark)
    if (tone === 'caution' || tone === 'negative') {
      return ko
        ? '큰 결정·계약·이사는 며칠 미루는 게 좋아요.'
        : 'Best to push big decisions, contracts, and moves back a few days.'
    }
    if (tone === 'positive') {
      return ko
        ? '미뤄둔 일을 시작하거나 밀어붙이기 좋아요.'
        : 'A good day to start what you put off, or push ahead.'
    }
    return ''
  })()
  // 태그 칩 — today 우선, 그다음 화해 톤(라벨·문장과 같은 축), 톤 없으면 mark 폴백.
  const readoutTag = selToday
    ? ko
      ? '오늘'
      : 'Today'
    : selTone === 'positive'
      ? ko
        ? '좋은 날'
        : 'good'
      : selTone === 'caution'
        ? ko
          ? '조심할 날'
          : 'caution'
        : selTone === 'mixed'
          ? ko
            ? '기복 있는 날'
            : 'mixed'
          : selMark === 'best' || selMark === 'good'
            ? ko
              ? '좋은 날'
              : 'good'
            : selMark === 'caution'
              ? ko
                ? '조심할 날'
                : 'caution'
              : selMark === 'avoid'
                ? ko
                  ? '피하는 날'
                  : 'avoid'
                : ko
                  ? '잔잔한 날'
                  : 'normal'
  const readoutTagClass = selToday
    ? styles.rtagToday
    : (selTone ?? markToTone(selMark)) === 'positive'
      ? styles.rtagGood
      : selTone === 'caution' && selMark === 'avoid'
        ? styles.rtagAvoid
        : !selTone && selMark === 'avoid'
          ? styles.rtagAvoid
          : ''

  // ── 셰어용 ── (한 줄 총평 + 큰 날 몇 개)
  const periodLabel = ko ? month.label : `${monthEn} ${year}`.trim()
  const summaryCard = (month.narrative ?? []).find((n) => n.tag === '이달 총평')
  const summaryText = ko ? summaryCard?.body : (summaryCard?.bodyEn ?? summaryCard?.body)
  const headline = (summaryText || verdictText || flowTitle).slice(0, 260)
  const shareHighlights = bigDays
    .slice(0, 4)
    .map((i) => (ko ? `${Number(i.when.slice(-2))}일 · ${i.title}` : `${i.when} · ${i.title}`))
  // 공유 카드용 이달 흐름 곡선 — 셀 intensity(=점수/100)에서 숫자만. 원국 미전송.
  const shareCurve = calendar.map((c) => Math.round(Math.max(0, Math.min(1, c.intensity)) * 100))
  const shareMarkerIndex = calendar.findIndex((c) => c.focus)

  // ── 셀 클래스 결정 ──
  const cellMarkClass = (mark: DestinyDayMark | null): string | null => {
    if (mark === 'best' || mark === 'good') return styles.cellGood
    if (mark === 'caution') return styles.cellCaution
    if (mark === 'avoid') return styles.cellAvoid
    return null
  }
  // 흐름 막대 색 — 그리드와 *같은 mark* 에서. 색이 둘로 갈리지 않게 단일 소스.
  const barMarkClass = (mark: DestinyDayMark | null): string => {
    if (mark === 'best' || mark === 'good') return styles.barGood
    if (mark === 'caution') return styles.barCaution
    if (mark === 'avoid') return styles.barAvoid
    return styles.barNeutral
  }

  return (
    <div className={styles.monthRoot}>
      {showRise && (
        <button type="button" className={styles.rise} onClick={onRise}>
          ↑ {ko ? '올해로 줌아웃' : 'Zoom out to year'}
        </button>
      )}

      {/* ── eyebrow ── */}
      <div className={styles.eyebrow}>
        <span>{ko ? `${year}년 ${ymM ?? ''}월` : `MONTHLY · ${monthEn} ${year}`.trim()}</span>
        <span aria-hidden />
      </div>

      {/* ── novice 기본: 한자·용어 없는 일상어 결론 ── */}
      <header className={styles.novice}>
        {/* 도발적 월 후크 — 히어로 최상단. 공유 톤도 verdict.shareTone 단일 소스에서
            (tone→shareTone 매핑은 reconcileMonthTone 이 소유) — 히어로 톤워드와 어긋날
            수 없다. */}
        {(() => {
          const mh = monthShareHook({
            tone: verdict.shareTone,
            seed,
            monthSalt: ymM || 0,
            ko,
          })
          return (
            <>
              <p className={styles.novHook}>{mh.headline}</p>
              {mh.subline && <p className={styles.novHookSub}>{mh.subline}</p>}
            </>
          )
        })()}
        <div
          className={`${styles.novToneWord} ${
            noviceTone === 'good' ? styles.novGood : noviceTone === 'care' ? styles.novCare : ''
          }`.trim()}
        >
          {ko
            ? noviceTone === 'good'
              ? '잘 풀리는 달'
              : noviceTone === 'care'
                ? '조심스러운 달'
                : noviceTone === 'flat'
                  ? '고르게 흐르는 달'
                  : '기복 있는 달'
            : noviceTone === 'good'
              ? 'A favourable month'
              : noviceTone === 'care'
                ? 'A careful month'
                : noviceTone === 'flat'
                  ? 'An even month'
                  : 'A mixed month'}
        </div>
        <p className={styles.novLine}>{noviceLine}</p>
        <p className={styles.novCounts}>{noviceCounts}</p>
        {/* ── 이렇게 해보세요 — share 카드에만 쓰이던 행동 권유를 기본뷰로 surface ── */}
        {doAvoidLine && (
          <div className={styles.doBox}>
            <span className={styles.doLbl}>{ko ? '이렇게 해보세요' : 'Try this'}</span>
            <span className={styles.doText}>{doAvoidLine}</span>
          </div>
        )}
        {/* good/caution/avoid 카운트 — 기본에 유지(시각적 요약). */}
        <div className={styles.counts}>
          <span className={styles.cGood}>
            {ko ? '좋은 날' : 'good'}
            <b>{goodN}</b>
          </span>
          <span className={styles.cCare}>
            {ko ? '조심할 날' : 'caution'}
            <b>{cautionN}</b>
          </span>
          <span className={styles.cAvoid}>
            {ko ? '피하는 날' : 'avoid'}
            <b>{avoidN}</b>
          </span>
        </div>
      </header>

      {/* ── 한 달 흐름 막대 — 그날 점수(intensity)를 높이로, 색은 그리드와 같은 mark 로.
            그리드·카운트와 *같은 calendar[].{intensity,mark}* 한 소스라 절대 안 어긋난다. ── */}
      {calendar.length > 0 && (
        <section className={styles.flow}>
          <div className={styles.flowH}>
            <span className={styles.flowTitle}>{ko ? '한 달 흐름' : 'This month'}</span>
            <span className={styles.flowHint}>
              {ko ? '높을수록 잘 풀리는 날' : 'higher = smoother'}
            </span>
          </div>
          <div
            className={styles.ribbon}
            role="img"
            aria-label={ko ? '한 달 운 흐름 막대' : 'Monthly flow bars'}
          >
            {calendar.map((c) => (
              <div
                key={c.d}
                className={`${styles.bar} ${barMarkClass(c.mark)} ${c.focus ? styles.barToday : ''}`.trim()}
                style={{ height: `${Math.max(14, Math.round((c.intensity ?? 0) * 100))}%` }}
              >
                {keyDates.has(c.ds) && (
                  <span className={styles.barStar} aria-hidden>
                    ✦
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 자세히 ① 간지·월운 (사주를 아는 사람용) ── */}
      <details className={styles.expertWrap}>
        <summary className={styles.expertSummary}>
          {ko ? '자세히 보기 · 간지와 월운' : 'Details · pillar & month'}
        </summary>
        <p className={styles.foldLede}>
          {ko
            ? "쉽게 말하면, 이 달 전체에 흐르는 기운을 사주의 '간지'로 나타낸 거예요."
            : "In plain terms, this is the month's overall energy written as its Saju pillar."}
        </p>
        <header className={styles.header}>
          <div className={styles.ganzhi}>{ganjiHanja}</div>
          {ganjiRead && (
            <div className={styles.ganzhiRead}>{ko ? `${ganjiRead}월` : ganjiRead}</div>
          )}
          <div className={styles.title}>
            {`${monthEn} ${year}`.trim()}
            <span className={styles.titleKo}>{flowTitle}</span>
          </div>
          {woolunArea && (
            <div className={styles.sibsinTag}>
              <span className={styles.sibsinPlain}>{woolunArea}</span>
            </div>
          )}
        </header>
      </details>

      {/* ── 인터랙션 힌트 — 날짜가 눌러진다는 걸 모르는 초보용. 오늘은 이미
          선택돼 있어 첫 탭에 바로 풀이가 열리므로, "선택된 날"을 기준으로 쓴다
          (예전 문구는 오늘 셀 동작과 안 맞았다 — 감사 #14). ── */}
      <p className={styles.tapHint}>
        {ko
          ? '👆 날짜를 누르면 그날 운이, 선택된 날을 다시 누르면 자세한 풀이가 열려요.'
          : '👆 Tap a date for its read — tap the selected date again for the full day.'}
      </p>

      {/* ── weekday row ── */}
      <div className={styles.dows}>
        {(ko ? DOWS : DOWS_EN).map((d, i) => (
          <span
            key={`dow-${i}`}
            className={i === 0 ? `${styles.dow} ${styles.dowSun}` : styles.dow}
          >
            {d}
          </span>
        ))}
      </div>

      {/* ── calendar grid ── */}
      <div className={styles.grid}>
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`pad-${i}`} className={styles.cellPad} />
        ))}
        {calendar.map((c) => {
          const isBig = keyDates.has(c.ds)
          const markCls = cellMarkClass(c.mark)
          // 큰 날도 *제 색(mark)* 을 유지하고 cellBig 는 금색 ✦ 링만 더한다 —
          // 색을 덮으면 막대(같은 mark 색)와 어긋나므로(조심·피함인 큰 날). 색=길흉,
          // ✦=현저도(큰 날) 두 축을 직교로 둔다.
          const cls = [
            styles.cell,
            markCls,
            isBig && styles.cellBig,
            c.focus && styles.cellToday,
            c.d === selectedDay && styles.cellSel,
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <div
              key={c.d}
              className={cls}
              role="button"
              tabIndex={0}
              aria-label={ko ? `${c.d}일 자세히 보기` : `View day ${c.d}`}
              aria-pressed={c.d === selectedDay}
              onClick={() => {
                // 이미 선택된 날을 한 번 더 탭 → 바로 그 날로 줌인(일반 캘린더 직관).
                // 첫 탭은 선택(리드아웃)만 — 스캔하며 훑어보는 동작을 방해하지 않는다.
                if (c.d === selectedDay) {
                  onDive(c.d)
                  return
                }
                setSelectedDay(c.d)
                onSelectDay?.(c.d)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  if (c.d === selectedDay) {
                    onDive(c.d)
                    return
                  }
                  setSelectedDay(c.d)
                  onSelectDay?.(c.d)
                }
              }}
            >
              <span className={styles.num}>{c.d}</span>
              {isBig && (
                <span className={styles.star} aria-hidden>
                  ✦
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* ── readout panel — 선택된 날의 판정. 모든 날에 대해 생성됨. ── */}
      <div className={styles.readout}>
        <div className={styles.rday}>
          <span className={styles.rnum}>{selectedDay}</span>
          <span className={`${styles.rtag} ${readoutTagClass}`.trim()}>{readoutTag}</span>
        </div>
        <div className={styles.rlabel}>{readoutLabel}</div>
        {readoutText && <div className={styles.rtext}>{readoutText}</div>}
        {readoutAdvice && <div className={styles.rAdvice}>{readoutAdvice}</div>}
        {/* ── 왜 이런 날인지 — 쉬운 뜻(교차 meaning) + 전문용어 칩. topReasons(용어)
              대신 plain 문장을 surface. 그날 교차가 없으면 생략. ── */}
        {selectedReason && (
          <div className={styles.rWhy}>
            <div className={styles.rWhyHead}>{ko ? '왜 이런 날일까요' : 'Why this day'}</div>
            <div className={styles.rWhyBody}>
              <span className={styles.rWhyPole} aria-hidden>
                {selectedReason.polarity > 0 ? '▲' : selectedReason.polarity < 0 ? '▼' : '·'}
              </span>
              <span>
                {ko ? selectedReason.meaning : selectedReason.meaningEn || selectedReason.meaning}
              </span>
            </div>
            <div className={styles.rWhyChips}>
              <span className={`${styles.rChip} ${styles.rChipSaju}`}>
                <small>{ko ? '사주' : 'Saju'}</small>{' '}
                {ko ? selectedReason.saju : selectedReason.sajuEn}
              </span>
              <span className={styles.rChipX} aria-hidden>
                ×
              </span>
              <span className={`${styles.rChip} ${styles.rChipAstro}`}>
                <small>{ko ? '별자리' : 'Astro'}</small>{' '}
                {ko ? selectedReason.astro : selectedReason.astroEn}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── legend ── */}
      <div className={styles.legend}>
        <span className={`${styles.lg} ${styles.lgGood}`}>
          <i />
          {ko ? '좋은 날' : 'Good day'}
        </span>
        <span className={`${styles.lg} ${styles.lgCare}`}>
          <i />
          {ko ? '조심할 날' : 'Caution'}
        </span>
        <span className={`${styles.lg} ${styles.lgAvoid}`}>
          <i />
          {ko ? '피하는 날' : 'Avoid'}
        </span>
        <span className={`${styles.lg} ${styles.lgToday}`}>
          <i />
          {ko ? '오늘' : 'Today'}
        </span>
        {bigDays.length > 0 && (
          <span className={`${styles.lg} ${styles.lgBig}`}>
            <i />
            {ko ? '큰 날' : 'Key day'}
          </span>
        )}
      </div>
      <p className={styles.legendNote}>
        {ko
          ? '색이 진할수록 잘 풀리는 날, 붉은 날은 큰 결정을 미루기 좋은 날이에요.'
          : 'Deeper color means a smoother day; red days are best for delaying big decisions.'}
      </p>

      {/* ── 이달의 큰 날 ── */}
      {bigDays.length > 0 && (
        <section className={styles.sec}>
          <div className={styles.secH}>
            <span className={styles.secLbl}>{ko ? '이달의 큰 날' : 'Key days'}</span>
            <span className={styles.secLn} />
            <span className={styles.secLat}>Key days</span>
          </div>
          {bigDays.map((b) => {
            const isGood = b.title.startsWith(goodPrefix) || b.title.startsWith(bestPrefix)
            return (
              <div className={styles.bigday} key={b.when}>
                <span className={styles.bdStar} aria-hidden>
                  ✦
                </span>
                <span className={styles.bdDate}>{mdLabel(b.when)}</span>
                <span className={styles.bdName}>{b.title}</span>
                {isGood && <span className={styles.bdPill}>{ko ? '좋은 날' : 'Good'}</span>}
              </div>
            )
          })}
        </section>
      )}

      {/* ── 자세히 ② 한 줄·사주×별자리 (사주를 아는 사람용) ── */}
      <details className={styles.expertWrap}>
        <summary className={styles.expertSummary}>
          {ko ? '왜 이런가요? · 사주 × 별자리' : 'Why? · Saju × Astrology'}
        </summary>
        <p className={styles.foldLede}>
          {ko
            ? '쉽게 말하면, 이 달의 색을 정하는 가장 또렷한 흐름이 사주와 별자리 어디서 겹치는지를 보여드려요.'
            : "In plain terms, this shows where Saju and astrology overlap to set the month's strongest thread."}
        </p>

        {/* ── 이달의 한 줄 (verdict) ── */}
        <section className={styles.sec}>
          <div className={styles.secH}>
            <span className={styles.secLbl}>{ko ? '이달의 한 줄' : 'In a line'}</span>
            <span className={styles.secLn} />
            <span className={styles.secLat}>In a line</span>
          </div>
          <p className={styles.verdict}>{verdictText}</p>
          {(ganjiHanja || woolunSibsinRaw) && (
            <div className={styles.verdictSub}>
              <span className={styles.termTag}>
                {[ganjiHanja, woolunSibsinRaw].filter(Boolean).join(' · ')}
              </span>
            </div>
          )}
        </section>

        {/* ── 겹치는 흐름 (crossings) ── */}
        {monthCross.length > 0 && (
          <section className={styles.sec}>
            <div className={styles.secH}>
              <span className={styles.secLbl}>{ko ? '겹치는 흐름' : 'Crossings'}</span>
              <span className={styles.secLn} />
              <span className={styles.secLat}>Crossings</span>
            </div>
            <div className={styles.crossLegend}>
              <span className={styles.clUp}>▲ {ko ? '도움이 되는 흐름' : 'Supporting flow'}</span>
              <span className={styles.clDn}>▼ {ko ? '부딪히는 흐름' : 'Clashing flow'}</span>
            </div>
            {monthCross.map((c, i) => {
              const isHero = topCross != null && c === topCross
              const poleSym = c.polarity > 0 ? '▲' : c.polarity < 0 ? '▼' : '·'
              const poleCls = c.polarity > 0 ? styles.poleUp : c.polarity < 0 ? styles.poleDn : ''
              const head = ko
                ? `${sibsinArea(c.saju)} × ${planetPlain(c.astro, true)}`
                : `${sibsinAreaEn(c.saju)} × ${planetPlain(c.astro, false)}`
              const body = ko ? c.meaning : (c.meaningEn ?? c.meaning)
              return (
                <div className={`${styles.cross} ${isHero ? styles.crossHero : ''}`.trim()} key={i}>
                  <div className={styles.crossTop}>
                    <span className={`${styles.pole} ${poleCls}`.trim()} aria-hidden>
                      {poleSym}
                    </span>
                    <span className={`${styles.term} ${styles.termSaju}`}>
                      <span className={styles.termSys}>Saju</span>
                      <span className={styles.termNm}>{ko ? c.saju : c.sajuEn}</span>
                    </span>
                    <span className={styles.crossX} aria-hidden>
                      ×
                    </span>
                    <span className={`${styles.term} ${styles.termAstro}`}>
                      <span className={styles.termSys}>Astro</span>
                      <span className={styles.termNm}>{ko ? c.astro : c.astroEn}</span>
                    </span>
                    {isHero && (
                      <span className={styles.crossFlag}>
                        {ko ? '큰 날의 색' : 'Key-day color'}
                      </span>
                    )}
                  </div>
                  <div className={styles.crossHead}>{head}</div>
                  <div className={styles.crossBody}>{body}</div>
                </div>
              )
            })}
          </section>
        )}
      </details>

      {/* ── share (discreet) ── */}
      <div className={styles.shareRow}>
        <ShareCalendarButton
          data={{
            isKo: ko,
            periodLabel,
            headline,
            highlights: shareHighlights,
            curve: shareCurve.length >= 3 ? shareCurve : undefined,
            markerIndex: shareMarkerIndex >= 0 ? shareMarkerIndex : undefined,
          }}
        />
      </div>

      {/* ── CTA (zoom-in) — 그리드에서 고른 날로 줌인(기본=오늘). 예전엔 어떤 날을
            골라도 focusDay(오늘)만 넘겨 일 티어가 항상 오늘을 보여줬다. ── */}
      <button className={styles.cta} onClick={() => onDive(selectedDay)} type="button">
        {selectedDay === focusDay
          ? ko
            ? `오늘 ${ymM ?? ''}월 ${focusDay}일로 줌인 →`
            : `Zoom in to today, ${monthEn} ${focusDay}`
          : ko
            ? `${ymM ?? ''}월 ${selectedDay}일 운 자세히 보기 →`
            : `Zoom in to ${monthEn} ${selectedDay}`}
      </button>
    </div>
  )
}
