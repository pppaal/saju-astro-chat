'use client'

import React from 'react'

/**
 * 한 줄 해석(차트 요약) 문장을 사람이 읽기 쉽게 강조해서 보여준다.
 *   - 오행(목/화/토/금/수)은 각 기운의 색으로
 *   - 별자리(…자리 / Aries…)는 굵게 강조
 * generateChartSummary()가 만든 평문 문자열을 그대로 받아 토큰만 칠한다.
 */

type Theme = 'dark' | 'light'

const EL_COLOR: Record<string, Record<Theme, string>> = {
  wood: { dark: 'text-emerald-300', light: 'text-emerald-600' },
  fire: { dark: 'text-rose-300', light: 'text-rose-600' },
  earth: { dark: 'text-amber-300', light: 'text-amber-600' },
  metal: { dark: 'text-slate-200', light: 'text-slate-500' },
  water: { dark: 'text-sky-300', light: 'text-sky-600' },
}
const HANJA_EL: Record<string, string> = {
  목: 'wood',
  화: 'fire',
  토: 'earth',
  금: 'metal',
  수: 'water',
}
const EN_EL: Record<string, string> = {
  Wood: 'wood',
  Fire: 'fire',
  Earth: 'earth',
  Metal: 'metal',
  Water: 'water',
}

// group1: 오행(한자), group2: 오행(영문), group3: 별자리(한글), group4: 별자리(영문)
const PATTERN = new RegExp(
  [
    /([목화토금수]\([木火土金水]\))/,
    /\b(Wood|Fire|Earth|Metal|Water)\b/,
    /([가-힣]{1,4}자리)/,
    /\b(Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)\b/,
  ]
    .map((r) => r.source)
    .join('|'),
  'g'
)

export function ChartReading({
  text,
  theme = 'dark',
  className = '',
  style,
}: {
  text: string
  theme?: Theme
  className?: string
  style?: React.CSSProperties
}) {
  // 별자리 — 옛 indigo → gold (navy+gold 디자인 시스템 통일).
  const signClass =
    theme === 'dark' ? 'font-semibold text-[#e8cc8a]' : 'font-semibold text-[#a07a3c]'
  const nodes: React.ReactNode[] = []
  let last = 0
  let key = 0
  let m: RegExpExecArray | null
  PATTERN.lastIndex = 0

  while ((m = PATTERN.exec(text)) !== null) {
    const [full, elKo, elEn, signKo, signEn] = m
    if (m.index > last) nodes.push(text.slice(last, m.index))

    if (elKo) {
      const el = HANJA_EL[elKo[0]]
      nodes.push(
        <span key={key++} className={`font-semibold ${EL_COLOR[el][theme]}`}>
          {elKo}
        </span>
      )
    } else if (elEn) {
      const el = EN_EL[elEn]
      nodes.push(
        <span key={key++} className={`font-semibold ${EL_COLOR[el][theme]}`}>
          {elEn}
        </span>
      )
    } else if (signKo || signEn) {
      nodes.push(
        <span key={key++} className={signClass}>
          {signKo || signEn}
        </span>
      )
    }
    last = m.index + full.length
  }
  if (last < text.length) nodes.push(text.slice(last))

  return (
    <p className={className} style={style}>
      {nodes}
    </p>
  )
}

export default ChartReading
