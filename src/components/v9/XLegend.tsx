/**
 * 타이밍 범례 — 'Timing signals appear only when both systems agree · ▲ Favorable ▼ Adverse'.
 * 교차 행 블록의 맨 아래에 한 번만(행마다 단어를 달지 않는다). 서버·클라이언트 공용.
 */

import { MarkTriangle } from './Glyph'
import { LEGEND, pick, type Lang } from './v9Copy'
import s from './XLegend.module.css'

export default function XLegend({
  theme = 'light',
  locale,
  className,
}: {
  theme?: 'light' | 'dark'
  locale: Lang
  className?: string
}) {
  return (
    <p
      className={[s.legend, theme === 'dark' ? s.dark : '', locale === 'ko' ? s.ko : '', className]
        .filter(Boolean)
        .join(' ')}
      data-legend=""
    >
      <span>{pick(LEGEND.timing, locale)}</span>
      <span className={s.ks}>
        <span className={s.k}>
          <MarkTriangle dir="up" />
          {pick(LEGEND.favorable, locale)}
        </span>
        <span className={s.k}>
          <MarkTriangle dir="down" />
          {pick(LEGEND.adverse, locale)}
        </span>
      </span>
    </p>
  )
}
