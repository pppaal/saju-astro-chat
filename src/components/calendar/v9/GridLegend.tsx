/**
 * 그리드 범례 — 뷰모델의 범례 8칸(Good · Best · Caution · Avoid · Calm · Key day · Today · Past)을
 * 그리드·막대와 같은 견본으로. 지난 날은 흐린 견본. 블록마다 한 번. 서버·클라이언트 공용.
 */

import type { LegendKey, MonthViewModel } from '@/lib/calendar-view/monthViewModel'
import s from './calendar.module.css'
import g from './MonthGrid.module.css'

const SWATCH: Record<LegendKey, string> = {
  good: s.swGood,
  best: s.swBest,
  caution: s.swCaution,
  avoid: s.swAvoid,
  calm: '',
  keyDay: s.swKd,
  today: s.swNow,
  past: `${s.swGood} ${s.swPast}`,
}

export default function GridLegend({ legend }: { legend: MonthViewModel['legend'] }) {
  return (
    <div className={g.legend} data-legend="grid">
      {legend.map((item) => (
        <span key={item.key} data-legend-key={item.key}>
          <i className={[s.sw, SWATCH[item.key]].filter(Boolean).join(' ')} aria-hidden="true">
            {item.key === 'today' ? <i className={s.led} /> : null}
          </i>
          {item.label}
        </span>
      ))}
    </div>
  )
}

/** 날 종류 → 견본 클래스(큰 날 행 · 고른 날 읽기 · 날 수 판독이 같이 쓴다). */
export function swatchClass(mark: 'best' | 'good' | 'caution' | 'avoid' | 'calm'): string {
  return [s.sw, SWATCH[mark]].filter(Boolean).join(' ')
}
