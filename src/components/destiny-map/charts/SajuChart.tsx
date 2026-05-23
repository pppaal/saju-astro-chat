'use client'

import React from 'react'

type FiveElement = '목' | '화' | '토' | '금' | '수' | string

interface GanjiCell {
  name: string
  element: FiveElement
}

interface PillarShape {
  heavenlyStem?: GanjiCell
  earthlyBranch?: GanjiCell
}

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
}

const ELEMENT_STYLE: Record<string, { text: string; bg: string }> = {
  목: { text: 'text-emerald-300', bg: 'bg-emerald-950/50' },
  화: { text: 'text-rose-300', bg: 'bg-rose-950/50' },
  토: { text: 'text-amber-300', bg: 'bg-amber-950/50' },
  금: { text: 'text-slate-200', bg: 'bg-slate-800/60' },
  수: { text: 'text-sky-300', bg: 'bg-sky-950/50' },
}
const DEFAULT_STYLE = { text: 'text-slate-300', bg: 'bg-slate-800/50' }

// Hanja → Korean reading (신금 / 을목 / 해수)
const STEM_READING: Record<string, string> = {
  甲: '갑', 乙: '을', 丙: '병', 丁: '정', 戊: '무', 己: '기', 庚: '경', 辛: '신', 壬: '임', 癸: '계',
}
const BRANCH_READING: Record<string, string> = {
  子: '자', 丑: '축', 寅: '인', 卯: '묘', 辰: '진', 巳: '사', 午: '오', 未: '미', 申: '신', 酉: '유', 戌: '술', 亥: '해',
}
const readingOf = (name?: string) => (name ? (STEM_READING[name] ?? BRANCH_READING[name] ?? name) : '')

// 물상(物像) — each character's everyday image, so users grasp it at a glance.
const STEM_IMAGE: Record<string, string> = {
  甲: '큰 나무', 乙: '유연한 풀', 丙: '태양', 丁: '촛불·등불', 戊: '넓은 산',
  己: '기름진 밭', 庚: '큰 바위', 辛: '빛나는 보석', 壬: '큰 바다', 癸: '이슬·비',
}
const BRANCH_IMAGE: Record<string, string> = {
  子: '깊은 물', 丑: '언 땅', 寅: '큰 나무', 卯: '여린 화초', 辰: '촉촉한 흙', 巳: '큰 불',
  午: '한낮 태양', 未: '건조한 흙', 申: '단단한 금속', 酉: '예리한 칼', 戌: '마른 흙', 亥: '깊은 바다',
}
const imageOf = (name?: string) => (name ? (STEM_IMAGE[name] ?? BRANCH_IMAGE[name] ?? '') : '')

function pickPillars(saju: SajuChartProps['saju']) {
  if (!saju) return null
  const year = saju.yearPillar || saju.pillars?.year
  const month = saju.monthPillar || saju.pillars?.month
  const day = saju.dayPillar || saju.pillars?.day
  const time = saju.timePillar || saju.hourPillar || saju.pillars?.time
  if (!year || !month || !day || !time) return null
  return { year, month, day, time }
}

export function SajuChart({ saju, lang = 'ko' }: SajuChartProps) {
  const pillars = pickPillars(saju)
  const isKo = lang === 'ko'

  if (!pillars) {
    return (
      <div className="rounded-xl border border-stone-700/50 bg-stone-900/40 p-4 text-center text-sm text-stone-400">
        {isKo ? '사주 정보가 아직 계산되지 않았습니다.' : 'Saju data is not ready yet.'}
      </div>
    )
  }

  // 시주 leftmost → time, day(나), month, year
  const order: Array<{ key: 'time' | 'day' | 'month' | 'year'; pillar: PillarShape; isMe: boolean; posKo: string; posEn: string }> = [
    { key: 'time', pillar: pillars.time, isMe: false, posKo: '미래·말년', posEn: 'Future' },
    { key: 'day', pillar: pillars.day, isMe: true, posKo: '나', posEn: 'Me' },
    { key: 'month', pillar: pillars.month, isMe: false, posKo: '직업·청년', posEn: 'Career' },
    { key: 'year', pillar: pillars.year, isMe: false, posKo: '사회·초년', posEn: 'Early' },
  ]

  const cellText = (cell?: GanjiCell) => {
    if (!cell?.name) return '·'
    if (!isKo) return cell.name
    const r = readingOf(cell.name)
    return cell.element ? `${r}${cell.element}` : r
  }

  return (
    <div className="grid grid-cols-4 gap-2 rounded-xl border border-stone-800 bg-stone-950/80 p-3 shadow-inner">
        {order.map(({ key, pillar, isMe, posKo, posEn }) => {
          const stem = pillar.heavenlyStem
          const branch = pillar.earthlyBranch
          const stemStyle = ELEMENT_STYLE[stem?.element || ''] || DEFAULT_STYLE
          const branchStyle = ELEMENT_STYLE[branch?.element || ''] || DEFAULT_STYLE
          return (
            <div key={key} className="flex flex-col items-center gap-1.5">
              <div className="flex h-5 items-center justify-center">
                {isMe ? (
                  <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-bold text-rose-400">
                    {isKo ? posKo : posEn}
                  </span>
                ) : (
                  <span className="text-[11px] text-stone-500">{isKo ? posKo : posEn}</span>
                )}
              </div>
              {[{ cell: stem, style: stemStyle }, { cell: branch, style: branchStyle }].map((c, idx) => (
                <div
                  key={idx}
                  className={`flex h-16 w-full flex-col items-center justify-center rounded-xl border p-1 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md ${c.style.bg} ${
                    isMe ? 'border-rose-500/40 ring-1 ring-rose-500/20' : 'border-stone-700/50'
                  }`}
                >
                  <span className={`${isKo ? 'text-base' : 'font-serif text-lg'} font-bold ${c.style.text}`}>
                    {cellText(c.cell)}
                  </span>
                  {isKo && imageOf(c.cell?.name) && (
                    <span className="mt-0.5 text-[10px] leading-none text-stone-400">{imageOf(c.cell?.name)}</span>
                  )}
                </div>
              ))}
            </div>
          )
        })}
    </div>
  )
}

export default SajuChart
