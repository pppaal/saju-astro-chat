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
  }
  lang?: 'ko' | 'en'
}

const ELEMENT_STYLE: Record<string, { text: string; bg: string }> = {
  목: { text: 'text-emerald-300', bg: 'bg-emerald-950/60' },
  화: { text: 'text-rose-300', bg: 'bg-rose-950/60' },
  토: { text: 'text-amber-300', bg: 'bg-amber-950/60' },
  금: { text: 'text-slate-200', bg: 'bg-slate-800/70' },
  수: { text: 'text-sky-300', bg: 'bg-sky-950/60' },
}

const DEFAULT_STYLE = { text: 'text-slate-300', bg: 'bg-slate-800/50' }

// Hanja → Korean reading, so the pillar cells read "신금 / 을목 / 해수" instead
// of bare 辛 / 乙 / 亥 (which most users can't read).
const STEM_READING: Record<string, string> = {
  甲: '갑', 乙: '을', 丙: '병', 丁: '정', 戊: '무', 己: '기', 庚: '경', 辛: '신', 壬: '임', 癸: '계',
}
const BRANCH_READING: Record<string, string> = {
  子: '자', 丑: '축', 寅: '인', 卯: '묘', 辰: '진', 巳: '사', 午: '오', 未: '미', 申: '신', 酉: '유', 戌: '술', 亥: '해',
}
const readingOf = (name?: string) =>
  (name ? (STEM_READING[name] ?? BRANCH_READING[name] ?? name) : '')

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
  const labels = isKo
    ? { time: '시주', day: '일주', month: '월주', year: '년주', me: '나' }
    : { time: 'Hour', day: 'Day', month: 'Month', year: 'Year', me: 'Me' }

  if (!pillars) {
    return (
      <div className="rounded-xl border border-stone-700/50 bg-stone-900/40 p-4 text-center text-sm text-stone-400">
        {isKo ? '사주 정보가 아직 계산되지 않았습니다.' : 'Saju data is not ready yet.'}
      </div>
    )
  }

  const order: Array<{ key: 'time' | 'day' | 'month' | 'year'; pillar: PillarShape; isMe: boolean }> = [
    { key: 'time', pillar: pillars.time, isMe: false },
    { key: 'day', pillar: pillars.day, isMe: true },
    { key: 'month', pillar: pillars.month, isMe: false },
    { key: 'year', pillar: pillars.year, isMe: false },
  ]

  // KO: "신금 / 을목 / 해수" (reading + element); EN keeps the Hanja glyph.
  const cellText = (cell?: GanjiCell) => {
    if (!cell?.name) return '·'
    if (!isKo) return cell.name
    const r = readingOf(cell.name)
    return cell.element ? `${r}${cell.element}` : r
  }

  return (
    <div className="flex justify-between gap-2 rounded-xl border border-stone-800 bg-stone-950/80 p-4 shadow-inner">
      {order.map(({ key, pillar, isMe }) => {
        const stem = pillar.heavenlyStem
        const branch = pillar.earthlyBranch
        const stemStyle = ELEMENT_STYLE[stem?.element || ''] || DEFAULT_STYLE
        const branchStyle = ELEMENT_STYLE[branch?.element || ''] || DEFAULT_STYLE
        return (
          <div key={key} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex h-5 items-center justify-center gap-1">
              <span className="text-xs font-medium text-stone-400">{labels[key]}</span>
              {isMe && (
                <span className="rounded bg-rose-600 px-1.5 py-0.5 text-xs leading-none text-white shadow-sm">
                  {labels.me}
                </span>
              )}
            </div>
            <div
              className={`flex h-10 w-12 items-center justify-center rounded-lg border border-stone-700/50 shadow-sm ${stemStyle.bg}`}
            >
              <span className={`${isKo ? 'text-sm' : 'font-serif text-lg'} font-bold ${stemStyle.text}`}>
                {cellText(stem)}
              </span>
            </div>
            <div
              className={`flex h-10 w-12 items-center justify-center rounded-lg border border-stone-700/50 shadow-sm ${branchStyle.bg}`}
            >
              <span className={`${isKo ? 'text-sm' : 'font-serif text-lg'} font-bold ${branchStyle.text}`}>
                {cellText(branch)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default SajuChart
