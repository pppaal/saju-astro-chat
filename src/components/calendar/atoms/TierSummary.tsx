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
  /** 과거~미래 교차 타임라인 — 사주 대운 띠 × 점성 흐름 띠를 두 레인에. */
  timeline?: {
    startYear: number
    endYear: number
    nowYear: number
    nowLabel?: string
    /** 레인별 구간(띠). 보통 [사주 대운, 점성 흐름]. */
    lanes: Array<{
      label: string
      system: 'saju' | 'astro'
      bands: Array<{
        startYear: number
        endYear: number
        label: string
        sub?: string
        now?: boolean
      }>
    }>
    /** 점 이벤트(회귀 등) — 레인 위에 마커로. */
    events?: Array<{ year: number; label: string; system: 'saju' | 'astro'; isNow?: boolean }>
    /** 사주·점성이 같은 시기에 겹치는 "교차 구간" — 세로 띠로 강조. */
    crossings?: Array<{ startYear: number; endYear: number; label?: string }>
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
  const { startYear, endYear, nowYear, nowLabel, events = [], crossings = [] } = data
  const span = endYear - startYear || 1
  const pos = (y: number) => Math.max(0, Math.min(100, ((y - startYear) / span) * 100))
  const nowPct = pos(nowYear)
  const sortedEvents = [...events].sort((a, b) => a.year - b.year)
  return (
    <div className={styles.timeline}>
      <div className={styles.tlHead}>
        <span className={styles.tlTitle}>과거 5년 · 미래 10년 — 사주 × 점성 교차</span>
        <span className={styles.tlLegend}>
          <i className={styles.tlSaju} /> 사주 <i className={styles.tlAstro} /> 점성
        </span>
      </div>

      <div className={styles.tlOne}>
        {/* 교차 구간 — 사주·점성이 같은 시기에 겹치는 구간 강조 */}
        {crossings.map((c, i) => {
          const l = pos(Math.max(c.startYear, startYear))
          const w = Math.max(pos(Math.min(c.endYear, endYear)) - l, 2)
          return (
            <div
              key={`x-${i}`}
              className={styles.tlCross2}
              style={{ left: `${l}%`, width: `${w}%` }}
              title={c.label ?? `${c.startYear}–${c.endYear} 교차`}
            >
              <span className={styles.tlCrossTag2}>✦ 교차</span>
            </div>
          )
        })}

        {/* 사주 — 선 위 (글자칩) */}
        {sortedEvents
          .filter((e) => e.system === 'saju')
          .map((e, i) => (
            <div
              key={`s-${i}`}
              className={`${styles.tlMarkTop} ${i % 2 ? styles.tlFar : ''} ${
                e.year < nowYear ? styles.tlPast : ''
              }`}
              style={{ left: `${pos(e.year)}%` }}
              title={`${e.year} · ${e.label}`}
            >
              <span className={`${styles.tlChip} ${styles.tlChipSaju}`}>
                <b>{e.year}</b> {shortLabel(e.label)}
              </span>
              <span className={styles.tlStem} />
              <span className={`${styles.tlNode} ${styles.tlDotSaju}`} />
            </div>
          ))}

        {/* 중심선 + 지금 */}
        <div className={styles.tlSpine} />
        <div className={styles.tlNow2} style={{ left: `${nowPct}%` }}>
          <span className={styles.tlNowTag}>{nowLabel ?? '지금'}</span>
        </div>

        {/* 점성 — 선 아래 (글자칩) */}
        {sortedEvents
          .filter((e) => e.system === 'astro')
          .map((e, i) => (
            <div
              key={`a-${i}`}
              className={`${styles.tlMarkBot} ${i % 2 ? styles.tlFar : ''} ${
                e.year < nowYear ? styles.tlPast : ''
              }`}
              style={{ left: `${pos(e.year)}%` }}
              title={`${e.year} · ${e.label}`}
            >
              <span className={`${styles.tlNode} ${styles.tlDotAstro}`} />
              <span className={styles.tlStem} />
              <span className={`${styles.tlChip} ${styles.tlChipAstro}`}>
                <b>{e.year}</b> {shortLabel(e.label)}
              </span>
            </div>
          ))}
      </div>

      <div className={styles.tlTicks}>
        <span>{startYear}</span>
        <span className={styles.tlTickNow}>{nowYear} 지금</span>
        <span>{endYear}</span>
      </div>
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

      {timeline && timeline.lanes.length > 0 ? <Timeline data={timeline} /> : null}
    </section>
  )
}

export default TierSummary
