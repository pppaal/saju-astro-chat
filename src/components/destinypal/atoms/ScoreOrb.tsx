'use client'

/* ============================================================
   destinypal · ScoreOrb — 인생 종합 점수 원형 게이지
   출처: destinypal-extracted/js/util.jsx ScoreOrb()
   원형 진행률 + 60틱 별 + 중앙 숫자 + 등급.
   ============================================================ */

import styles from '../styles/atoms.module.css'

export interface ScoreOrbProps {
  score: number
  grade: string
  max?: number
  className?: string
}

export function ScoreOrb({ score, grade, max = 100, className }: ScoreOrbProps) {
  const r = 58
  const c = 2 * Math.PI * r
  const frac = Math.max(0, Math.min(1, score / max))
  return (
    <div className={[styles.scoreOrb, className].filter(Boolean).join(' ')}>
      <svg width="132" height="132" viewBox="0 0 132 132">
        <defs>
          <linearGradient id="dp-orbg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2f5bc4" />
            <stop offset="1" stopColor="#8fb6ff" />
          </linearGradient>
        </defs>
        <circle
          cx="66"
          cy="66"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="4"
        />
        <circle
          cx="66"
          cy="66"
          r={r}
          fill="none"
          stroke="url(#dp-orbg)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          transform="rotate(-90 66 66)"
          style={{ filter: 'drop-shadow(0 0 6px rgba(91,141,239,0.6))' }}
        />
        {Array.from({ length: 60 }).map((_, i) => {
          const a = (i / 60) * Math.PI * 2 - Math.PI / 2
          const on = i / 60 <= frac
          return (
            <circle
              key={i}
              cx={66 + Math.cos(a) * 50}
              cy={66 + Math.sin(a) * 50}
              r={on ? 0.9 : 0.5}
              fill={on ? '#8fb6ff' : 'rgba(255,255,255,0.13)'}
            />
          )
        })}
      </svg>
      <div className="num">
        <b>{score}</b>
        <span>SCORE · {grade}</span>
      </div>
    </div>
  )
}

export default ScoreOrb
