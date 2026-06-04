'use client'

/* ============================================================
   destinypal · ScoreDial — 일(日) 단 점수 다이얼
   출처: destinypal-extracted/js/util.jsx ScoreDial()
   임계: >=60 pos / >=35 ember / 그 외 neg.
   ============================================================ */

import styles from '../styles/atoms.module.css'

export interface ScoreDialProps {
  score: number
  label?: string
  max?: number
  className?: string
}

export function ScoreDial({
  score,
  label = '오늘',
  max = 100,
  className,
}: ScoreDialProps) {
  const r = 40
  const c = 2 * Math.PI * r
  const frac = Math.max(0, Math.min(1, score / max))
  const col =
    score >= 60
      ? 'var(--dp-pos)'
      : score >= 35
        ? 'var(--dp-ember)'
        : 'var(--dp-neg)'
  return (
    <div
      className={[styles.scoreDialWrap, className].filter(Boolean).join(' ')}
      style={{ width: 96, height: 96 }}
    >
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="5"
        />
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke={col}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          transform="rotate(-90 48 48)"
          style={{ filter: `drop-shadow(0 0 6px ${col})` }}
        />
      </svg>
      <div className={styles.scoreDialNum}>
        <b style={{ fontSize: 30 }}>{score}</b>
        <span style={{ fontSize: 8.5, marginTop: 3 }}>{label}</span>
      </div>
    </div>
  )
}

export default ScoreDial
