/**
 * 04 인생 곡선 — 0–84세 곡선(지난 구간은 옅게), 지금 바늘, 다음 마루 · 정점(채운 점 + 상자 표지),
 * 주의 저점(빈 점 + 한 상자), 축 아래 대운 띠(대운 천간 오행 색 — 색은 데이터일 때만)와 대운
 * 시작 나이 · 연도 눈금. 모눈은 SVG 안에 그려 '1 div = 3 years' 가 어떤 폭에서도 참이다.
 * 표지 상자는 서로 겹치면 위로 비켜 선다. 순수 렌더 — 시계를 읽지 않는다. 서버 컴포넌트.
 */

import { fill, pick, type ElementKey, type Lang } from '@/components/v9/v9Copy'
import type { LifeCurveVM } from '@/lib/calendar-view/lifetimeViewModel'
import { LIFE_COPY } from '../lifeCopy'
import s from '../LifeFlow.module.css'

const VB_W = 348
const VB_H = 188
const X0 = 6
const AXIS_Y = 146.5
const PLOT_TOP = 64
const PLOT_BOTTOM = 122
/** 모눈 한 칸 = 3년. */
const DIV_YEARS = 3
const BOX_H = 15

const ELEMENT_FILL: Record<ElementKey, string> = {
  wood: 'var(--wood)',
  fire: 'var(--fire)',
  earth: 'var(--earth)',
  metal: 'var(--metal)',
  water: 'var(--water)',
}

interface Box {
  x: number
  y: number
  w: number
}

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.w + 3 && b.x < a.x + a.w + 3 && a.y < b.y + BOX_H + 2 && b.y < a.y + BOX_H + 2

/** mono 9px · 자간 0.6 — 글자당 약 6px + 좌우 여백. */
const boxWidth = (text: string) => Math.round(text.length * 6.1 + 12)

export default function LifeCurve({ curve, locale }: { curve: LifeCurveVM; locale: Lang }) {
  const { span, points } = curve
  const years = span.toAge - span.fromAge || 1
  const pxPerYear = (VB_W - X0 * 2) / years
  const x = (age: number) => X0 + (age - span.fromAge) * pxPerYear
  const values = points.map((p) => p.value)
  const vMin = Math.min(...values)
  const vMax = Math.max(...values)
  const y = (v: number) =>
    vMax - vMin < 1e-6
      ? (PLOT_TOP + PLOT_BOTTOM) / 2
      : PLOT_BOTTOM - ((v - vMin) / (vMax - vMin)) * (PLOT_BOTTOM - PLOT_TOP)
  const valueAt = (age: number): number => {
    let best = points[0]
    for (const p of points) if (Math.abs(p.age - age) < Math.abs(best.age - age)) best = p
    return best.value
  }

  const now = curve.markers.find((m) => m.kind === 'now')
  const crest = curve.markers.find((m) => m.kind === 'crest')
  const peakRaw = curve.markers.find((m) => m.kind === 'peak')
  const peak = peakRaw && peakRaw.age !== crest?.age ? peakRaw : undefined
  const dips = curve.markers.filter((m) => m.kind === 'dip')

  const toPath = (pts: typeof points) =>
    pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.age).toFixed(1)} ${y(p.value).toFixed(1)}`)
      .join(' ')
  const nowAge = now?.age
  const past = nowAge == null ? [] : points.filter((p) => p.age <= nowAge)
  const future = nowAge == null ? points : points.filter((p) => p.age >= nowAge)

  // 모눈 — 3년 간격 세로줄, 같은 간격 가로줄(축 위로).
  const g = DIV_YEARS * pxPerYear
  const grid: string[] = []
  for (let gx = X0; gx <= VB_W; gx += g) grid.push(`M${gx.toFixed(1)} 0 V${VB_H}`)
  for (let gy = AXIS_Y - g; gy > 0; gy -= g) grid.push(`M0 ${gy.toFixed(1)} H${VB_W}`)
  for (let gy = AXIS_Y + g; gy < VB_H; gy += g) grid.push(`M0 ${gy.toFixed(1)} H${VB_W}`)

  // 표지 상자 — 지금(맨 위 고정) → 다음 마루 → 정점. 겹치면 위로 비킨다.
  const placed: Box[] = []
  const nowLabel = now ? `${pick(LIFE_COPY.legendNow, locale).toUpperCase()} · ${now.age}` : ''
  let nowBox: Box | null = null
  if (now) {
    const w = boxWidth(nowLabel)
    nowBox = { x: clamp(x(now.age) - w / 2, 2, VB_W - 2 - w), y: 23.5, w }
    placed.push(nowBox)
  }
  const annotate = (m: { age: number; year: number }) => {
    const label = `${m.age} · ${m.year}`
    const w = boxWidth(label)
    const px = x(m.age)
    const py = y(valueAt(m.age))
    const box: Box = { x: clamp(px - w / 2, 2, VB_W - 2 - w), y: Math.max(4.5, py - 27), w }
    while (placed.some((b) => overlaps(b, box)) && box.y > 4.5) box.y = Math.max(4.5, box.y - 17)
    if (placed.some((b) => overlaps(b, box))) box.y = py + 9
    placed.push(box)
    return { label, box, px, py }
  }
  const crestA = crest ? annotate(crest) : null
  const peakA = peak ? annotate(peak) : null

  // 저점 — 빈 점들 + 아래 상자. 가까운 저점(32px 안)은 한 상자('39 · 42'), 먼 저점은 각자.
  const dipPts = dips.map((d) => ({ age: d.age, px: x(d.age), py: y(valueAt(d.age)) }))
  const dipGroups: Array<typeof dipPts> = []
  for (const d of dipPts) {
    const last = dipGroups[dipGroups.length - 1]
    if (last && d.px - last[last.length - 1].px <= 32) last.push(d)
    else dipGroups.push([d])
  }
  const dipBoxes = dipGroups.map((g) => {
    const label = g.map((d) => d.age).join(' · ')
    const w = boxWidth(label)
    const cx = g.reduce((a, d) => a + d.px, 0) / g.length
    const top = Math.min(AXIS_Y - BOX_H - 4, Math.max(...g.map((d) => d.py)) + 8)
    return { x: clamp(cx - w / 2, 2, VB_W - 2 - w), y: top, w, label }
  })

  const ticks = curve.eras
    .map((e) => ({ age: e.from - span.fromYear + span.fromAge, year: e.from }))
    .filter((t) => t.age > span.fromAge && t.age < span.toAge)
  // 범례 견본 — 곡선 아래 띠에 나온 오행을 처음 나온 순서로 한 번씩.
  const legendEras = curve.eras.filter(
    (e, i, all) => all.findIndex((o) => o.element === e.element) === i
  )

  return (
    <section className={s.sec} data-life-section="curve" aria-labelledby="life-curve">
      <div className={s.lr}>
        <span>{pick(LIFE_COPY.curveLabel, locale)}</span>
        <span>{curve.rangeLabel}</span>
      </div>
      <h2 id="life-curve" className={s.h2}>
        {curve.heading.main}
        {curve.heading.sub ? <span className={s.lt}>{curve.heading.sub}</span> : null}
      </h2>
      <div className={s.chart}>
        <span className={`${s.cl} ${s.clA}`}>{pick(LIFE_COPY.curveFlow, locale)}</span>
        <span className={`${s.cl} ${s.clB}`}>{pick(LIFE_COPY.curveDiv, locale)}</span>
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className={s.chartSvg}
          role="img"
          aria-label={fill(pick(LIFE_COPY.curveAria, locale), { to: span.toAge })}
        >
          <path d={grid.join(' ')} fill="none" className={s.grid} />
          <line x1={X0} y1={AXIS_Y} x2={VB_W - X0} y2={AXIS_Y} className={s.axis} />
          {curve.eras.map((e) => {
            const x1 = x(e.from - span.fromYear + span.fromAge)
            const x2 = x(e.to - span.fromYear + span.fromAge)
            const metal = e.element === 'metal'
            return (
              <rect
                key={`${e.gz}-${e.from}`}
                x={x1 + 0.5}
                y={metal ? 149.5 : 149}
                width={Math.max(0, x2 - x1 - (metal ? 2 : 1))}
                height={metal ? 2 : 3}
                style={{ fill: ELEMENT_FILL[e.element] }}
                className={metal ? s.eraMetal : undefined}
                data-era={e.element}
              />
            )
          })}
          {ticks.length ? (
            <path
              d={ticks.map((t) => `M${(x(t.age) + 0.5).toFixed(1)} 153 V156`).join(' ')}
              className={s.tick}
            />
          ) : null}
          {past.length > 1 ? <path d={toPath(past)} className={s.cvPast} /> : null}
          {future.length > 1 ? <path d={toPath(future)} className={s.cvLine} /> : null}
          {now && nowBox ? (
            <g data-marker="now">
              <line
                x1={x(now.age) + 0.5}
                y1={nowBox.y + BOX_H}
                x2={x(now.age) + 0.5}
                y2={AXIS_Y}
                className={s.needle}
              />
              <rect
                x={nowBox.x + 0.5}
                y={nowBox.y}
                width={nowBox.w}
                height={BOX_H}
                className={s.box}
              />
              <text x={nowBox.x + nowBox.w / 2 + 0.5} y={nowBox.y + 10.5} className={s.boxText}>
                {nowLabel}
              </text>
              <circle cx={x(now.age)} cy={y(valueAt(now.age))} r={3.4} className={s.dotNow} />
            </g>
          ) : null}
          {dipPts.map((d) => (
            <circle
              key={`dip-${d.age}`}
              cx={d.px}
              cy={d.py}
              r={2.8}
              className={s.dotDip}
              data-marker="dip"
            />
          ))}
          {dipBoxes.map((b) => (
            <g key={`dipbox-${b.label}`}>
              <rect x={b.x + 0.5} y={b.y} width={b.w} height={14} className={s.boxMute} />
              <text x={b.x + b.w / 2 + 0.5} y={b.y + 9.8} className={s.boxTextMute}>
                {b.label}
              </text>
            </g>
          ))}
          {[crestA, peakA].map((a, i) =>
            a ? (
              <g key={i} data-marker={i === 0 ? 'crest' : 'peak'}>
                <circle cx={a.px} cy={a.py} r={3.2} className={s.dotCrest} />
                <rect
                  x={a.box.x + 0.5}
                  y={a.box.y}
                  width={a.box.w}
                  height={BOX_H}
                  className={s.box}
                />
                <text x={a.box.x + a.box.w / 2 + 0.5} y={a.box.y + 10.5} className={s.boxText}>
                  {a.label}
                </text>
              </g>
            ) : null
          )}
          {ticks.map((t) => (
            <g key={`t-${t.age}`}>
              <text x={x(t.age) + 0.5} y={168} className={s.tickAge}>
                {t.age}
              </text>
              <text x={x(t.age) + 0.5} y={180} className={s.tickYear}>
                {t.year}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className={s.legend}>
        <span>
          <i className={s.lgDot} aria-hidden="true" />
          {pick(LIFE_COPY.legendCrest, locale)}
        </span>
        {dipPts.length ? (
          <span>
            <i className={`${s.lgDot} ${s.lgHollow}`} aria-hidden="true" />
            {pick(LIFE_COPY.legendDip, locale)}
          </span>
        ) : null}
        {now ? (
          <span>
            <i className={s.lgBar} aria-hidden="true" />
            {pick(LIFE_COPY.legendNow, locale)}
          </span>
        ) : null}
        {legendEras.length ? (
          <span>
            <i className={s.lgEras} aria-hidden="true">
              {legendEras.map((e) => (
                <i
                  key={e.element}
                  className={e.element === 'metal' ? s.lgEraMetal : undefined}
                  style={{ background: ELEMENT_FILL[e.element] }}
                />
              ))}
            </i>
            {pick(LIFE_COPY.legendEra, locale)}
          </span>
        ) : null}
      </div>
      <p className={s.cap}>{curve.caption}</p>
    </section>
  )
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), Math.max(lo, hi))
}
