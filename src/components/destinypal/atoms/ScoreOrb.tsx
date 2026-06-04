'use client'

/**
 * ScoreOrb — Life intro 종합 점수 오브 (원형 SVG 게이지).
 * 포팅 출처: destinypal-extracted/js-ink/util.jsx ScoreOrb
 *
 * 한지 톤 (vermilion gradient + tick stars).
 * 132 × 132 고정 크기 — 다른 크기가 필요하면 wrapper 에서 transform: scale.
 */

import * as React from 'react'
import styles from '../styles/atoms.module.css'

export interface ScoreOrbProps {
  /** 표시 점수. */
  score: number
  /** 등급 라벨 — "S" / "A+" / "F" 등. */
  grade: string
  /** 점수 상한. 기본 100. */
  max?: number
  /** SVG defs 의 linearGradient id — 한 페이지에 여러 ScoreOrb 가 있을 때 충돌 방지. */
  gradientId?: string
}

const R = 58
const C = 2 * Math.PI * R

export function ScoreOrb({
  score,
  grade,
  max = 100,
  gradientId = 'dp-orb-gradient',
}: ScoreOrbProps): React.ReactElement {
  const frac = Math.max(0, Math.min(1, score / max))
  return (
    <div className={styles.scoreOrb}>
      <svg width="132" height="132" viewBox="0 0 132 132" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#b03a22" />
            <stop offset="1" stopColor="#c8492c" />
          </linearGradient>
        </defs>
        <circle
          cx="66"
          cy="66"
          r={R}
          fill="none"
          stroke="rgba(58,46,28,0.14)"
          strokeWidth="4"
        />
        <circle
          cx="66"
          cy="66"
          r={R}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - frac)}
          transform="rotate(-90 66 66)"
        />
        {/* tick marks — 60 dots around */}
        {Array.from({ length: 60 }).map((_, i) => {
          const a = (i / 60) * Math.PI * 2 - Math.PI / 2
          const on = i / 60 <= frac
          return (
            <circle
              key={i}
              cx={66 + Math.cos(a) * 50}
              cy={66 + Math.sin(a) * 50}
              r={on ? 0.9 : 0.5}
              fill={on ? '#c8492c' : 'rgba(58,46,28,0.16)'}
            />
          )
        })}
      </svg>
      <div className={styles.num}>
        <b>{score}</b>
        <span>SCORE · {grade}</span>
      </div>
    </div>
  )
}

export default ScoreOrb
