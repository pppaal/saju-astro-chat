'use client'

// 재사용 "쉬운 요약" 블록 — 모든 tier(인생·대운·년·월·일) 상단에 동일하게 얹어
// "이 시기는 ~한 때"를 3초 안에 전달한다. 전문용어/한자/숫자는 이 위가 아니라
// 아래 <details>(자세히 보기)에 둔다. 데이터는 각 tier 가 기존 필드에서 만들어 넘김.

import styles from './TierSummary.module.css'

export interface SummaryCard {
  icon: string
  label: string
  body: string
}
export interface SummaryStage {
  label: string
  tone: string
  now?: boolean
  nowLabel?: string
}
export interface TierSummaryProps {
  /** 한 줄 제목 — 용어 없이. 예: "천천히 무르익는 타입". */
  headline: string
  /** 부연 한두 문장. */
  sub?: string
  /** 흐름 곡선값(−2..+2). 있으면 미니 스파크라인. */
  curve?: number[]
  /** 곡선상 "지금" 인덱스. */
  curveNowIndex?: number
  /** 핵심 카드 2~3개 (강점/조심/리듬 등). */
  cards?: SummaryCard[]
  /** 단계 스트립 (4구간 등). */
  stages?: SummaryStage[]
  /** 다음 전환점 1건. */
  nextPoint?: { when: string; label: string } | null
}

function Sparkline({ values, nowIndex }: { values: number[]; nowIndex?: number }) {
  if (!values || values.length < 2) return null
  const W = 240
  const H = 46
  const pad = 7
  const min = -2
  const max = 2
  const pts = values.map((v, i) => {
    const x = pad + (i * (W - 2 * pad)) / (values.length - 1)
    const clamped = Math.max(min, Math.min(max, v))
    const y = pad + ((max - clamped) * (H - 2 * pad)) / (max - min)
    return [x, y] as const
  })
  const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ')
  const now = typeof nowIndex === 'number' && nowIndex >= 0 ? pts[nowIndex] : null
  return (
    <svg className={styles.spark} viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
      <line
        x1={pad}
        y1={H / 2}
        x2={W - pad}
        y2={H / 2}
        stroke="var(--dp-line-soft)"
        strokeWidth="1"
        strokeDasharray="2 3"
      />
      <path
        d={d}
        fill="none"
        stroke="var(--dp-accent)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {now && <circle cx={now[0]} cy={now[1]} r="4.5" fill="var(--dp-accent)" />}
    </svg>
  )
}

export function TierSummary({
  headline,
  sub,
  curve,
  curveNowIndex,
  cards,
  stages,
  nextPoint,
}: TierSummaryProps) {
  return (
    <section className={styles.summary}>
      <div className={styles.hero}>
        <h2 className={styles.headline}>{headline}</h2>
        {sub ? <p className={styles.sub}>{sub}</p> : null}
        {curve && curve.length > 1 ? <Sparkline values={curve} nowIndex={curveNowIndex} /> : null}
      </div>

      {cards && cards.length > 0 ? (
        <div className={styles.cards}>
          {cards.map((c, i) => (
            <div className={styles.card} key={i}>
              <div className={styles.cardLabel}>
                <span className={styles.cardIcon}>{c.icon}</span>
                {c.label}
              </div>
              <p className={styles.cardBody}>{c.body}</p>
            </div>
          ))}
        </div>
      ) : null}

      {stages && stages.length > 0 ? (
        <div className={styles.stages}>
          {stages.map((s, i) => (
            <div className={`${styles.stage} ${s.now ? styles.stageNow : ''}`} key={i}>
              <div className={styles.stageLabel}>
                {s.label}
                {s.now ? <span className={styles.nowBadge}>{s.nowLabel ?? '지금'}</span> : null}
              </div>
              <div className={styles.stageTone}>{s.tone}</div>
            </div>
          ))}
        </div>
      ) : null}

      {nextPoint ? (
        <div className={styles.nextPoint}>
          <span className={styles.nextWhen}>{nextPoint.when}</span>
          <span className={styles.nextLabel}>{nextPoint.label}</span>
        </div>
      ) : null}
    </section>
  )
}

export default TierSummary
