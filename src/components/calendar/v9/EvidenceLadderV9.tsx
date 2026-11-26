/**
 * 근거 사다리 — 10년 → 올해 → 이달 → 오늘, 시간대마다 가장 센 근거(뷰모델 toLadderRows: 라벨 · 기간 ·
 * 엔진 결론 · SAJU 칸 · STARS 칸). 교차 행이 아니다 — 방향 마크를 달지 않는다(FIX9 A5). 월간 ·
 * 일간 탭이 같은 부품을 쓴다. 서버·클라이언트 공용(훅 없음).
 */

import type { LadderRowVM, SajuCellVM, StarsCellVM } from '@/lib/calendar-view/dayViewModel'
import { Glyph } from '@/components/v9/Glyph'
import { pick, SYSTEMS, type Lang } from '@/components/v9/v9Copy'
import s from './calendar.module.css'
import l from './EvidenceLadderV9.module.css'

interface EvidenceLadderV9Props {
  rows: LadderRowVM[]
  caption: string
  /** 모서리 줄 — '04 / Strongest driver per scale' · '10-yr → today'. */
  label: string
  range: string
  locale: Lang
}

const DOT: Record<LadderRowVM['scale'], string> = {
  decadal: l.lg,
  yearly: '',
  monthly: l.sm,
  daily: '',
}

/** '2024–54' 같은 연도 범위가 대시 뒤에서 줄바꿈되지 않게(단어 결합자). 글자는 그대로. */
const keepRanges = (t: string) => t.replace(/(\d)–(\d)/g, '$1\u2060–\u2060$2')

function SajuCell({ cell, locale }: { cell: SajuCellVM | null; locale: Lang }) {
  return (
    <span className={l.sys} data-cell="saju">
      <span className={l.lbl}>
        {pick(SYSTEMS.saju, locale)}
        {cell?.hanja ? <span className={l.hj}>{cell.hanja}</span> : null}
      </span>
      <span className={[l.val, cell ? '' : l.none].filter(Boolean).join(' ')}>
        {cell?.text || '—'}
      </span>
    </span>
  )
}

function StarsCell({ cell, locale }: { cell: StarsCellVM | null; locale: Lang }) {
  return (
    <span className={l.sys} data-cell="stars">
      <span className={l.lbl}>{pick(SYSTEMS.stars, locale)}</span>
      <span className={[l.val, cell ? '' : l.none].filter(Boolean).join(' ')}>
        {cell?.glyph ? <Glyph name={cell.glyph} className={l.pg} /> : null}
        {cell?.text || '—'}
      </span>
      {cell?.sub ? <span className={l.sub}>{keepRanges(cell.sub)}</span> : null}
    </span>
  )
}

export default function EvidenceLadderV9({
  rows,
  caption,
  label,
  range,
  locale,
}: EvidenceLadderV9Props) {
  if (rows.length === 0) return null
  return (
    <section className={s.sec} data-cal-section="ladder">
      <div className={s.lr}>
        <span>{label}</span>
        <span>{range}</span>
      </div>
      <p className={s.cap}>{caption}</p>
      <ol className={l.ladder}>
        {rows.map((r, i) => (
          <li
            key={`${r.scale}-${i}`}
            className={[
              l.rung,
              i === 0 ? l.first : '',
              i === rows.length - 1 ? l.last : '',
              r.now ? l.now : '',
            ]
              .filter(Boolean)
              .join(' ')}
            data-scale={r.scale}
            data-now={r.now ? '' : undefined}
          >
            {r.now ? (
              <i className={l.led} aria-hidden="true" />
            ) : (
              <i className={[l.nd, DOT[r.scale]].filter(Boolean).join(' ')} aria-hidden="true" />
            )}
            <span className={l.sc}>
              <span>{r.label}</span>
              <span>{r.range}</span>
            </span>
            <p className={l.sn}>{r.sentence}</p>
            <span className={l.cells}>
              <SajuCell cell={r.saju} locale={locale} />
              <span className={l.x} aria-hidden="true" />
              <StarsCell cell={r.stars} locale={locale} />
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
