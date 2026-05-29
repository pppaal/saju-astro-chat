'use client'

import React from 'react'
import { getHanjaRich } from '@/lib/chart-dictionary'
import { HanjaBubble } from './atoms/HanjaBubble'
import { SibsinChip } from './atoms/SibsinChip'

type FiveElement = '목' | '화' | '토' | '금' | '수' | string

interface GanjiCell {
  name: string
  element: FiveElement
  /** 십성 (편재/정인 등) — saju 엔진에서 채워줌. 셀 아래 칩으로 노출. */
  sibsin?: string
}

interface PillarShape {
  heavenlyStem?: GanjiCell
  earthlyBranch?: GanjiCell
}

type Theme = 'light' | 'dark'

interface SajuChartProps {
  saju?: {
    yearPillar?: PillarShape
    monthPillar?: PillarShape
    dayPillar?: PillarShape
    timePillar?: PillarShape
    hourPillar?: PillarShape
    pillars?: { year?: PillarShape; month?: PillarShape; day?: PillarShape; time?: PillarShape }
    dayMaster?: { name?: string; element?: string }
    fiveElements?: Record<string, number>
  }
  lang?: 'ko' | 'en'
  /**
   * 'light' (default) — 옛 stone pastel 톤. 궁합 상담사 페이지(흰 카드 위)
   * 에 자연스럽게 얹힘.
   * 'dark' — navy glass 모달 (운명 차트) 안에서 안 떠보이게 dark glass +
   * 톤 다운된 element pastel + gold 액센트.
   */
  theme?: Theme
  /**
   * 셀(기둥) 클릭 시 호출 — PillarDrawer 띄울 때 사용.
   * 미지정 시 셀은 클릭 비활성 (기존 동작).
   */
  onPillarClick?: (pillar: 'time' | 'day' | 'month' | 'year') => void
}

// 오행 색 톤 — light/dark 양쪽 모두 그대로 element 의미는 유지.
const ELEMENT_STYLE_LIGHT: Record<string, { text: string; bg: string }> = {
  목: { text: 'text-emerald-700', bg: 'bg-emerald-50' },
  화: { text: 'text-rose-700', bg: 'bg-rose-50' },
  토: { text: 'text-amber-700', bg: 'bg-amber-50' },
  금: { text: 'text-slate-700', bg: 'bg-slate-100' },
  수: { text: 'text-sky-700', bg: 'bg-sky-50' },
}
const ELEMENT_STYLE_DARK: Record<string, { text: string; bg: string }> = {
  목: { text: 'text-emerald-200', bg: 'bg-emerald-500/10' },
  화: { text: 'text-rose-200', bg: 'bg-rose-500/10' },
  토: { text: 'text-amber-200', bg: 'bg-amber-500/10' },
  금: { text: 'text-slate-200', bg: 'bg-slate-500/10' },
  수: { text: 'text-sky-200', bg: 'bg-sky-500/10' },
}
const DEFAULT_STYLE_LIGHT = { text: 'text-stone-700', bg: 'bg-stone-50' }
const DEFAULT_STYLE_DARK = { text: 'text-slate-200', bg: 'bg-white/5' }

// Hanja → 발음(한국어) / 물상(物像) — chart-dictionary(hanja-rich) 단일 출처에서 조회.
// hanja-rich 의 `image` 필드는 "큰 나무·동량목 — 곧게…" 같이 풍부해 9px 셀 라벨에는
// 길어서, 첫 어절(·/— 앞)만 잘라 기존 한 줄 라벨 길이를 유지한다.
const readingOf = (name?: string, lang: 'ko' | 'en' = 'ko') => {
  if (!name) return ''
  return getHanjaRich(name, lang)?.name ?? name
}
const imageOf = (name?: string, lang: 'ko' | 'en' = 'ko') => {
  if (!name) return ''
  const raw = getHanjaRich(name, lang)?.image
  if (!raw) return ''
  return raw.split('·')[0].split('—')[0].trim()
}

function pickPillars(saju: SajuChartProps['saju']) {
  if (!saju) return null
  const year = saju.yearPillar || saju.pillars?.year
  const month = saju.monthPillar || saju.pillars?.month
  const day = saju.dayPillar || saju.pillars?.day
  const time = saju.timePillar || saju.hourPillar || saju.pillars?.time
  if (!year || !month || !day || !time) return null
  return { year, month, day, time }
}

export function SajuChart({ saju, lang = 'ko', theme = 'light', onPillarClick }: SajuChartProps) {
  const pillars = pickPillars(saju)
  const isKo = lang === 'ko'
  const isDark = theme === 'dark'

  // 테마별 톤 — 컨테이너, 헤더 텍스트, "내 일주" ring, 행 라벨, 빈 상태.
  const tokens = isDark
    ? {
        container: 'rounded-2xl border p-4',
        containerStyle: {
          background: 'var(--ds-dark-surface)',
          borderColor: 'var(--ds-dark-border)',
        } as React.CSSProperties,
        headerHanja: 'text-slate-500',
        headerLabelNeutral: 'text-slate-400',
        headerLabelMe: 'rounded-full px-2 py-0.5 text-[11px] font-bold',
        headerLabelMeStyle: {
          background: 'rgba(212, 181, 114, 0.18)',
          color: 'var(--ds-gold-on-dark-soft)',
        } as React.CSSProperties,
        cellBorderNeutral: 'border-white/10',
        cellBorderMe: 'border-[#d4b572] ring-1 ring-[#d4b572]/40',
        imageText: 'text-slate-500',
        guideText: 'text-slate-500',
        emptyContainer:
          'rounded-xl border border-white/10 bg-white/5 p-4 text-center text-sm text-slate-400',
        elementStyle: ELEMENT_STYLE_DARK,
        defaultStyle: DEFAULT_STYLE_DARK,
      }
    : {
        container:
          'rounded-2xl border border-stone-200 bg-gradient-to-br from-stone-50 to-white p-4 shadow-sm',
        containerStyle: undefined as React.CSSProperties | undefined,
        headerHanja: 'text-stone-400',
        headerLabelNeutral: 'text-stone-500',
        headerLabelMe: 'rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700',
        headerLabelMeStyle: undefined as React.CSSProperties | undefined,
        cellBorderNeutral: 'border-stone-200',
        cellBorderMe: 'border-[#c19b56] ring-1 ring-[#d4b572]/60',
        imageText: 'text-stone-500',
        guideText: 'text-stone-400',
        emptyContainer:
          'rounded-xl border border-stone-200 bg-stone-50 p-4 text-center text-sm text-stone-500',
        elementStyle: ELEMENT_STYLE_LIGHT,
        defaultStyle: DEFAULT_STYLE_LIGHT,
      }

  if (!pillars) {
    return (
      <div className={tokens.emptyContainer}>
        {isKo ? '사주 정보가 아직 계산되지 않았습니다.' : 'Saju data is not ready yet.'}
      </div>
    )
  }

  // 시주 leftmost → time, day(나), month, year
  const order: Array<{
    key: 'time' | 'day' | 'month' | 'year'
    pillar: PillarShape
    isMe: boolean
    pillarKo: string // 年/月/日/時 한자 라벨
    posKo: string // 사회·초년 등 의미 라벨
    posEn: string
  }> = [
    {
      key: 'time',
      pillar: pillars.time,
      isMe: false,
      pillarKo: '時',
      posKo: '말년·자녀',
      posEn: 'Future',
    },
    { key: 'day', pillar: pillars.day, isMe: true, pillarKo: '日', posKo: '나', posEn: 'Me' },
    {
      key: 'month',
      pillar: pillars.month,
      isMe: false,
      pillarKo: '月',
      posKo: '청년·직업',
      posEn: 'Career',
    },
    {
      key: 'year',
      pillar: pillars.year,
      isMe: false,
      pillarKo: '年',
      posKo: '초년·조상',
      posEn: 'Early',
    },
  ]

  const cellText = (cell?: GanjiCell) => {
    if (!cell?.name) return '·'
    if (!isKo) return cell.name
    const r = readingOf(cell.name)
    return cell.element ? `${r}${cell.element}` : r
  }

  return (
    <div className={tokens.container} style={tokens.containerStyle}>
      {/* 컬럼 헤더: 한자 기둥명(時/日/月/年) + 시기 라벨 */}
      <div className="mb-3 grid grid-cols-4 gap-2">
        {order.map(({ key, isMe, pillarKo, posKo, posEn }) => (
          <div key={`hd-${key}`} className="flex flex-col items-center gap-0.5">
            {isKo && (
              <span
                className={`font-serif text-sm font-semibold tracking-wide ${tokens.headerHanja}`}
              >
                {pillarKo}
              </span>
            )}
            {isMe ? (
              <span className={tokens.headerLabelMe} style={tokens.headerLabelMeStyle}>
                {isKo ? posKo : posEn}
              </span>
            ) : (
              <span className={`text-[11px] ${tokens.headerLabelNeutral}`}>
                {isKo ? posKo : posEn}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* 천간 / 지지 그리드 */}
      <div className="grid grid-cols-4 gap-2">
        {order.map(({ key, pillar, isMe }) => {
          const stem = pillar.heavenlyStem
          const branch = pillar.earthlyBranch
          const stemStyle = tokens.elementStyle[stem?.element || ''] || tokens.defaultStyle
          const branchStyle = tokens.elementStyle[branch?.element || ''] || tokens.defaultStyle
          const clickable = !!onPillarClick
          return (
            <div
              key={key}
              className={`flex flex-col gap-1.5 ${clickable ? 'cursor-pointer transition-transform hover:-translate-y-0.5' : ''}`}
              onClick={clickable ? () => onPillarClick(key) : undefined}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onPillarClick(key)
                      }
                    }
                  : undefined
              }
            >
              {/* 천간 (윗 셀) / 지지 (아래 셀) */}
              {[
                { cell: stem, style: stemStyle, isStem: true },
                { cell: branch, style: branchStyle, isStem: false },
              ].map((c, idx) => (
                <div
                  key={idx}
                  className={`flex min-h-[88px] w-full flex-col items-center justify-center gap-1 rounded-xl border p-1.5 shadow-sm ${c.style.bg} ${
                    isMe ? tokens.cellBorderMe : tokens.cellBorderNeutral
                  } ${c.isStem ? '' : 'opacity-95'}`}
                >
                  {/* 한자 (long-press / hover → 의미 bubble) — 메인 표시. */}
                  {c.cell?.name ? (
                    <HanjaBubble
                      hanja={c.cell.name}
                      className={`font-serif text-[18px] font-bold leading-tight tracking-tight ${c.style.text}`}
                    >
                      {c.cell.name}
                    </HanjaBubble>
                  ) : (
                    <span
                      className={`font-serif text-[18px] font-bold leading-tight tracking-tight ${c.style.text}`}
                    >
                      ·
                    </span>
                  )}
                  {/* 한자 아래: 한국 발음 + 오행 한 줄 (KO 모드만). 비전공자가 한자
                      모르더라도 즉시 읽을 수 있게. */}
                  {isKo && c.cell?.name && (
                    <span className={`text-[10px] leading-none ${tokens.imageText}`}>
                      {readingOf(c.cell.name)}
                      {c.cell.element ? `·${c.cell.element}` : ''}
                    </span>
                  )}
                  {/* 한자의 물상(物像) — "큰 나무" 같은 한 줄 의미. */}
                  {isKo && imageOf(c.cell?.name) && (
                    <span className={`text-[9px] leading-none ${tokens.imageText}`}>
                      {imageOf(c.cell?.name)}
                    </span>
                  )}
                  {/* 십성 chip — 색만 봐도 카테고리 (비겁/식상/재성/관성/인성) 직관 */}
                  {c.cell?.sibsin && <SibsinChip sibsin={c.cell.sibsin} size="xs" />}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* 행 라벨 (왼쪽 가이드) — 모바일에선 생략, 데스크탑(sm+) 에서만 표시 */}
      {isKo && (
        <div className={`mt-2 hidden sm:flex justify-center gap-6 text-[10px] ${tokens.guideText}`}>
          <span>천간(天干) · 드러난 결</span>
          <span>지지(地支) · 안에 품은 결</span>
        </div>
      )}
    </div>
  )
}

export default SajuChart
