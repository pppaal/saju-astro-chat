/**
 * 60갑자 다이얼 — lib/v9/sixtyDial 의 dialModel 을 SVG 로 그린다. 모델은 호출자가 만든다
 * (서버에서 now·시간대로 계산해 넘겨도 된다 — 이 컴포넌트는 시계를 읽지 않는다). 선·글자는
 * currentColor(dark = --on-dark, light = --ink), 지금 LED 만 --seal. 서버·클라이언트 공용.
 */

import type { DialModel } from '@/lib/v9/sixtyDial'
import s from './SixtyDial.module.css'

interface SixtyDialProps {
  model: DialModel
  theme?: 'dark' | 'light'
  /** 렌더 폭(px). 기본 220. */
  width?: number
  className?: string
}

export default function SixtyDial({
  model,
  theme = 'dark',
  width = 220,
  className,
}: SixtyDialProps) {
  const { ring, ticks, needle, born, turn, labels, centre } = model
  return (
    <figure
      className={[s.dial, theme === 'dark' ? s.dark : s.light, className].filter(Boolean).join(' ')}
      data-dial={`${centre.ganji}`}
    >
      <svg
        viewBox={model.viewBox}
        width={width}
        height={width}
        role="img"
        aria-label={model.ariaLabel}
      >
        <circle
          cx={ring.cx}
          cy={ring.cy}
          r={ring.r}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.2}
          strokeWidth={1}
        />
        {ticks.map((t) => (
          <line
            key={t.n}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke="currentColor"
            strokeOpacity={t.major ? 0.7 : 0.38}
            strokeWidth={t.major ? 1.6 : 1}
            strokeLinecap="round"
          />
        ))}
        <line {...needle.line} stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
        <circle cx={needle.led.cx} cy={needle.led.cy} r={needle.led.r} className={s.led} />
        {turn ? (
          <>
            <line {...turn.line} stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            <rect
              x={turn.rect.x}
              y={turn.rect.y}
              width={turn.rect.size}
              height={turn.rect.size}
              fill="currentColor"
            />
          </>
        ) : null}
        {born ? (
          <circle
            cx={born.cx}
            cy={born.cy}
            r={born.r}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.3}
          />
        ) : null}
        {labels.map((l, i) => (
          <text
            key={`${i}-${l.text}`}
            x={l.x}
            y={l.y}
            textAnchor={l.anchor}
            fontSize={l.fontSize}
            letterSpacing={i === 0 ? 1.2 : 0.5}
            fill="currentColor"
            fillOpacity={l.opacity}
            className={s.mono}
          >
            {l.text}
          </text>
        ))}
        <text
          x={150}
          y={156}
          textAnchor="middle"
          fontSize={40}
          fontWeight={700}
          letterSpacing={2}
          fill="currentColor"
          className={s.hanja}
        >
          {centre.ganji}
        </text>
        <text
          x={150}
          y={180}
          textAnchor="middle"
          fontSize={13}
          fontWeight={500}
          letterSpacing={1.2}
          fill="currentColor"
          className={s.mono}
        >
          {centre.sub}
        </text>
      </svg>
    </figure>
  )
}
