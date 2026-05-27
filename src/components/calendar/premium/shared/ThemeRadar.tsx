'use client'

/**
 * 5축 테마 레이더 — year/month/day 모든 tier 공용.
 * year: 12개월 테마 평균
 * month: 그 달 일별 테마 평균
 * day: 그 날 themeScores 직접
 *
 * 모든 tier에서 같은 5축 순서(성장/직업/재물/연애/건강)를 유지해 사용자가
 * 형태 변화로 차이를 인식할 수 있게.
 *
 * 정직성 가드(2026 audit):
 *  - PolarRadiusAxis domain [0,100] 명시 — 전 축 같은 값일 때 recharts 가
 *    auto-scale 해서 풀 펜타곤으로 그리던 회귀 차단.
 *  - "신호 부족" 축은 부모가 caption 으로 disclose. 데이터 없는 축에 50 같은
 *    중립값을 fabricate 하지 않도록 부모(Year/Month/Day Dashboard) 가 책임.
 */
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts'
import { Activity } from 'lucide-react'

export interface ThemeScore {
  name: string
  score: number
}

interface Props {
  themes: ThemeScore[]
  /** 카드 헤더 — 기본 "분야별 밸런스" */
  title?: string
  /** 차트 아래 한 줄 캡션 (강세/약세 한 줄). 없으면 자동 생성. */
  caption?: string
}

export default function ThemeRadar({ themes, title = '분야별 밸런스', caption }: Props) {
  if (themes.length === 0) return null

  const sorted = [...themes].sort((a, b) => b.score - a.score)
  const top = sorted[0]
  const bottom = sorted[sorted.length - 1]
  const autoCaption =
    top && bottom && top.name !== bottom.name
      ? `${top.name}(${top.score})과 ${sorted[1]?.name ?? ''}(${sorted[1]?.score ?? ''}) 영역이 돋보이며, ${bottom.name}(${bottom.score}) 관리에 유의하세요.`
      : '전체적으로 고르게 분포된 형태입니다.'

  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-5 shadow-xl flex flex-col">
      <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-amber-400" />
        {title}
      </h3>
      <div className="w-full h-56">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="72%" data={themes}>
            <PolarGrid stroke="#27272a" />
            <PolarAngleAxis
              dataKey="name"
              tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 600 }}
            />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} tickCount={5} />
            <Radar
              name="Score"
              dataKey="score"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="#f59e0b"
              fillOpacity={0.22}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-zinc-400 text-center mt-3 leading-relaxed">
        {caption ?? autoCaption}
      </p>
    </div>
  )
}
