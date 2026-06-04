'use client'

/**
 * ScoreDial — Day 단의 작은 점수 다이얼.
 * 포팅 출처: destinypal-extracted/js-ink/util.jsx ScoreDial
 *
 * 점수 구간별 색:
 *  - >= 60: pos (green)
 *  - >= 35: ember (vermilion)
 *  - <  35: neg (red)
 */

import * as React from 'react'
import styles from '../styles/atoms.module.css'

export interface ScoreDialProps {
  /** 표시 점수. */
  score: number
  /** 다이얼 라벨 — 기본 '오늘'. */
  label?: string
  /** 점수 상한. 기본 100. */
  max?: number
}

const R = 40
const C = 2 * Math.PI * R

export function ScoreDial({
  score,
  label = '오늘',
  max = 100,
}: ScoreDialProps): React.ReactElement {
  const frac = Math.max(0, Math.min(1, score / max))
  const col =
    score >= 60
      ? 'var(--dp-pos)'
      : score >= 35
        ? 'var(--dp-ember)'
        : 'var(--dp-neg)'
  return (
    <div className={styles.scoreDial}>
      <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true">
        <circle
          cx="48"
          cy="48"
          r={R}
          fill="none"
          stroke="rgba(58,46,28,0.14)"
          strokeWidth="5"
        />
        <circle
          cx="48"
          cy="48"
          r={R}
          fill="none"
          stroke={col}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - frac)}
          transform="rotate(-90 48 48)"
          style={{ filter: `drop-shadow(0 0 6px ${col})` }}
        />
      </svg>
      <div className={styles.inner}>
        <b className={styles.num}>{score}</b>
        <span className={styles.label}>{label}</span>
      </div>
    </div>
  )
}

export default ScoreDial
