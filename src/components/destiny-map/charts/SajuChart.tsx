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

// 톤: 사용자 피드백 "어두워서 안 보임" → 진한 -950/50 톤을 옅은 pastel
// (-50 ~ -100 bg) + 가독성 좋은 -700 글자로 교체. ChartModal 이 light 카드
// 위에 얹는 구조라 light 톤이 자연스럽고, 오행 색 톤은 그대로 유지.
const ELEMENT_STYLE: Record<string, { text: string; bg: string }> = {
  목: { text: 'text-emerald-700', bg: 'bg-emerald-50' },
  화: { text: 'text-rose-700', bg: 'bg-rose-50' },
  토: { text: 'text-amber-700', bg: 'bg-amber-50' },
  금: { text: 'text-slate-700', bg: 'bg-slate-100' },
  수: { text: 'text-sky-700', bg: 'bg-sky-50' },
}
const DEFAULT_STYLE = { text: 'text-stone-700', bg: 'bg-stone-50' }

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
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-center text-sm text-stone-500">
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
    { key: 'time', pillar: pillars.time, isMe: false, pillarKo: '時', posKo: '말년·자녀', posEn: 'Future' },
    { key: 'day', pillar: pillars.day, isMe: true, pillarKo: '日', posKo: '나', posEn: 'Me' },
    { key: 'month', pillar: pillars.month, isMe: false, pillarKo: '月', posKo: '청년·직업', posEn: 'Career' },
    { key: 'year', pillar: pillars.year, isMe: false, pillarKo: '年', posKo: '초년·조상', posEn: 'Early' },
  ]

  const cellText = (cell?: GanjiCell) => {
    if (!cell?.name) return '·'
    if (!isKo) return cell.name
    const r = readingOf(cell.name)
    return cell.element ? `${r}${cell.element}` : r
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-gradient-to-br from-stone-50 to-white p-4 shadow-sm">
      {/* 컬럼 헤더: 한자 기둥명(時/日/月/年) + 시기 라벨 */}
      <div className="mb-3 grid grid-cols-4 gap-2">
        {order.map(({ key, isMe, pillarKo, posKo, posEn }) => (
          <div key={`hd-${key}`} className="flex flex-col items-center gap-0.5">
            {isKo && (
              <span className="font-serif text-sm font-semibold tracking-wide text-stone-400">
                {pillarKo}
              </span>
            )}
            {isMe ? (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                {isKo ? posKo : posEn}
              </span>
            ) : (
              <span className="text-[11px] text-stone-500">{isKo ? posKo : posEn}</span>
            )}
          </div>
        ))}
      </div>

      {/* 천간 / 지지 그리드 */}
      <div className="grid grid-cols-4 gap-2">
        {order.map(({ key, pillar, isMe }) => {
          const stem = pillar.heavenlyStem
          const branch = pillar.earthlyBranch
          const stemStyle = ELEMENT_STYLE[stem?.element || ''] || DEFAULT_STYLE
          const branchStyle = ELEMENT_STYLE[branch?.element || ''] || DEFAULT_STYLE
          return (
            <div key={key} className="flex flex-col gap-1.5">
              {/* 천간 (윗 셀) — 색 톤 그대로, 약간 더 진한 글자 */}
              {[
                { cell: stem, style: stemStyle, isStem: true },
                { cell: branch, style: branchStyle, isStem: false },
              ].map((c, idx) => (
                <div
                  key={idx}
                  className={`flex h-[68px] w-full flex-col items-center justify-center rounded-xl border p-1.5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md ${c.style.bg} ${
                    isMe
                      ? 'border-rose-300 ring-1 ring-rose-200'
                      : 'border-stone-200'
                  } ${c.isStem ? '' : 'opacity-95'}`}
                >
                  <span
                    className={`${isKo ? 'text-[15px]' : 'font-serif text-lg'} font-bold tracking-tight ${c.style.text}`}
                  >
                    {cellText(c.cell)}
                  </span>
                  {isKo && imageOf(c.cell?.name) && (
                    <span className="mt-1 text-[10px] leading-none text-stone-500">
                      {imageOf(c.cell?.name)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* 행 라벨 (왼쪽 가이드) — 모바일에선 생략, 데스크탑(sm+) 에서만 표시 */}
      {isKo && (
        <div className="mt-2 hidden sm:flex justify-center gap-6 text-[10px] text-stone-400">
          <span>천간(天干) · 드러난 결</span>
          <span>지지(地支) · 안에 품은 결</span>
        </div>
      )}
    </div>
  )
}

export default SajuChart
