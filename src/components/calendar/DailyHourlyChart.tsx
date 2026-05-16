'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts'
import { Clock } from 'lucide-react'
import type { ImportantDate } from './types'

interface Props {
  importantDate: ImportantDate | null
}

/**
 * 24시간 시간대 교차 그래프 — 사주 시진 × 점성 행성시.
 *
 * 데이터 소스:
 *  - engineSignals 중 layer === 'hourly' 신호 (saju-hour + astro-planetary-hour)
 *  - 시간(0-23)별 polarity × weight 평균 → 0~100 점수
 *  - sajuLine: 사주 source 신호 / astroLine: 점성 source 신호
 *
 * 차트: 24 데이터 포인트 라인 차트. 0시 ~ 23시.
 */
export default function DailyHourlyChart({ importantDate }: Props) {
  const hourly = useMemo(() => {
    if (!importantDate?.engineSignals) return []
    const hourlySignals = importantDate.engineSignals.filter((s) => s.layer === 'hourly')
    if (hourlySignals.length === 0) return []

    // 시간(0-23)별 평균 polarity × weight
    const buckets: Array<{ saju: number[]; astro: number[] }> = Array.from(
      { length: 24 },
      () => ({ saju: [], astro: [] }),
    )

    // 신호 active.start 시간 추출
    for (const s of importantDate.engineSignals) {
      if (s.layer !== 'hourly') continue
      // engineSignals 타입에는 active 필드가 없음 — id에서 시간 정보 추출
      // 또는 weight·polarity 자체로 시간 슬롯 추정
      // 보조: id 형식 'saju.hour.YYYY-MM-DD.{branch}.{stem}' → branch idx로 시간 추정
      const hourFromId = inferHourFromSignalId(s.id)
      const score = s.polarity * s.weight
      if (hourFromId == null) continue
      const target = (s.source === 'saju' ? buckets[hourFromId].saju : buckets[hourFromId].astro)
      target.push(score)
    }

    return buckets.map((b, hour) => {
      const sajuAvg =
        b.saju.length > 0 ? b.saju.reduce((a, v) => a + v, 0) / b.saju.length : 0
      const astroAvg =
        b.astro.length > 0 ? b.astro.reduce((a, v) => a + v, 0) / b.astro.length : 0
      return {
        hour: `${String(hour).padStart(2, '0')}시`,
        hourNum: hour,
        saju: Math.round(50 + sajuAvg * 16),
        astro: Math.round(50 + astroAvg * 16),
      }
    })
  }, [importantDate])

  if (hourly.length === 0) return null

  // 빈 시간(둘 다 50 — 중립)이 많으면 차트 약함 — 일단 표시
  return (
    <div className="bg-zinc-900/40 p-5 rounded-2xl border border-white/5">
      <h3 className="text-base font-bold text-zinc-200 mb-3 flex items-center gap-2 tracking-wider uppercase">
        <Clock className="w-5 h-5 text-cyan-400" />
        시간대 흐름 (24시간)
      </h3>
      <p className="text-xs text-zinc-500 mb-3">하루 중 어느 시간에 운이 오는지 — 50점이 기준선</p>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={hourly} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="hour"
            stroke="#a1a1aa"
            fontSize={12}
            fontWeight={600}
            interval={2}
          />
          <YAxis domain={[0, 100]} stroke="#a1a1aa" fontSize={12} />
          <Tooltip
            contentStyle={{
              background: '#09090b',
              border: '1px solid #3f3f46',
              borderRadius: '0.5rem',
              fontSize: '13px',
              padding: '8px 12px',
            }}
            labelStyle={{ color: '#e4e4e7', fontWeight: 700 }}
            itemStyle={{ padding: '2px 0' }}
          />
          <Legend
            iconSize={12}
            wrapperStyle={{ fontSize: '13px', fontWeight: 600, paddingTop: '12px' }}
          />
          <ReferenceLine y={50} stroke="#52525b" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="saju"
            name="사주"
            stroke="#f59e0b"
            strokeWidth={3}
            dot={{ r: 3.5, fill: '#f59e0b', strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="astro"
            name="점성"
            stroke="#22d3ee"
            strokeWidth={3}
            dot={{ r: 3.5, fill: '#22d3ee', strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * 신호 ID에서 시간 추정.
 * 사주 시진: 'saju.hour.YYYY-MM-DD.{branch}.{stem}'
 *   branch → idx → 시간 (자=0, 축=1~2, ..., 해=21~22)
 * 점성 voc/phase: 시간 정보 없으니 정오(12)로 매핑
 */
function inferHourFromSignalId(id: string): number | null {
  const BRANCH_HOUR: Record<string, number> = {
    '子': 0,  '丑': 2,  '寅': 4,  '卯': 6,  '辰': 8,
    '巳': 10, '午': 12, '未': 14, '申': 16, '酉': 18,
    '戌': 20, '亥': 22,
  }
  const sajuMatch = id.match(/^saju\.hour\..+\.([子丑寅卯辰巳午未申酉戌亥])\./)
  if (sajuMatch) {
    const hour = BRANCH_HOUR[sajuMatch[1]]
    return typeof hour === 'number' ? hour : null
  }
  // 점성 VoC / 행성시는 정오 근처로 매핑 (정확한 시간 정보 부재)
  if (id.startsWith('astro.voc') || id.startsWith('astro.moon-phase')) {
    return 12
  }
  return null
}
