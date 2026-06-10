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
  /** 과거~미래 교차 타임라인 (사주 대운 × 점성을 한 축에). */
  timeline?: {
    startYear: number
    endYear: number
    nowYear: number
    nowLabel?: string
    points: Array<{ year: number; label: string; system: 'saju' | 'astro'; isNow?: boolean }>
  } | null
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

function shortLabel(s: string): string {
  // "첫 토성 회귀 — 진짜 어른됨의 통과의례" → "첫 토성 회귀" (대시 앞 핵심만, 길면 컷)
  const head = s.includes('—') ? s.split('—')[0].trim() : s
  return head.length > 22 ? head.slice(0, 21).trim() + '…' : head
}

function Timeline({ data }: { data: NonNullable<TierSummaryProps['timeline']> }) {
  const { startYear, endYear, nowYear, nowLabel, points } = data
  const span = endYear - startYear || 1
  const pos = (y: number) => Math.max(0, Math.min(100, ((y - startYear) / span) * 100))
  const sorted = [...points].sort((a, b) => a.year - b.year)
  return (
    <div className={styles.timeline}>
      <div className={styles.tlHead}>
        <span className={styles.tlTitle}>과거 · 미래 흐름</span>
        <span className={styles.tlLegend}>
          <i className={styles.tlSaju} /> 사주 <i className={styles.tlAstro} /> 점성
        </span>
      </div>
      <div className={styles.tlAxis}>
        <div className={styles.tlLine} />
        <div className={styles.tlNow} style={{ left: `${pos(nowYear)}%` }}>
          <span className={styles.tlNowTag}>{nowLabel ?? '지금'}</span>
        </div>
        {sorted.map((p, i) => (
          <span
            key={i}
            className={`${styles.tlDot} ${p.system === 'saju' ? styles.tlDotSaju : styles.tlDotAstro} ${
              p.year < nowYear ? styles.tlPast : ''
            }`}
            style={{ left: `${pos(p.year)}%` }}
            title={`${p.year} · ${p.label}`}
          />
        ))}
      </div>
      <ul className={styles.tlList}>
        {sorted.map((p, i) => (
          <li key={i} className={`${styles.tlItem} ${p.year < nowYear ? styles.tlPast : ''}`}>
            <span className={styles.tlYear}>{p.year}</span>
            <span
              className={`${styles.tlPip} ${p.system === 'saju' ? styles.tlDotSaju : styles.tlDotAstro}`}
            />
            <span className={styles.tlText}>
              {p.isNow ? <b>{shortLabel(p.label)}</b> : shortLabel(p.label)}
            </span>
          </li>
        ))}
      </ul>
    </div>
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
  timeline,
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

      {timeline && timeline.points.length > 0 ? <Timeline data={timeline} /> : null}
    </section>
  )
}

export default TierSummary
