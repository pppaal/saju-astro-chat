import { CATEGORY_EMOJI } from './constants'
import type { EventCategory } from './types'
import styles from './DestinyCalendar.module.css'

type ActionPlanInsights = {
  ifThenRules: string[]
  situationTriggers: string[]
  actionFramework: {
    do: string[]
    dont: string[]
    alternative: string[]
  }
  riskTriggers: string[]
  successKpi: string[]
  deltaToday: string
}

type ActionPlanSummaryPanelsProps = {
  isKo: boolean
  todayFocus: string
  todayInsight: string
  todayItems: string[]
  evidenceBadges: string[]
  evidenceLines: string[]
  todayTiming: string | null
  todayCaution: string | null
  weekTitle: string
  weekFocus: string
  weekInsight: string
  weekItems: string[]
  topCategory: EventCategory | null
  categoryLabel: (category: EventCategory) => string
}

export function ActionPlanSummaryPanels(props: ActionPlanSummaryPanelsProps) {
  const {
    isKo,
    todayFocus,
    todayInsight,
    todayItems,
    evidenceBadges,
    evidenceLines,
    todayTiming,
    todayCaution,
    weekTitle,
    weekFocus,
    weekInsight,
    weekItems,
    topCategory,
    categoryLabel,
  } = props

  return (
    <>
      <div className={styles.actionPlanCard}>
        <div className={styles.actionPlanCardHeader}>
          <span className={styles.actionPlanCardTitle}>
            {isKo ? '오늘 체크리스트' : 'Today Checklist'}
          </span>
          <span className={styles.actionPlanCardFocus}>{todayFocus}</span>
        </div>
        <p className={styles.actionPlanInsightLine}>{todayInsight}</p>
        <ul className={styles.actionPlanList}>
          {todayItems.map((item, idx) => (
            <li key={idx} className={styles.actionPlanItem}>
              <span className={styles.actionPlanItemCheck}>✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <div className={styles.actionPlanEvidence}>
          <div className={styles.actionPlanEvidenceBadges}>
            {evidenceBadges.map((badge) => (
              <span key={badge} className={styles.actionPlanEvidenceBadge}>
                {badge}
              </span>
            ))}
          </div>
          <ul className={styles.actionPlanEvidenceList}>
            {evidenceLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        {todayTiming && (
          <div className={styles.actionPlanTiming}>
            ⏰ {isKo ? '추천 시간' : 'Best timing'}: {todayTiming}
          </div>
        )}
        {todayCaution && (
          <div className={styles.actionPlanCaution}>
            ⚠ {isKo ? '주의' : 'Caution'}: {todayCaution}
          </div>
        )}
      </div>

      <div className={styles.actionPlanCard}>
        <div className={styles.actionPlanCardHeader}>
          <span className={styles.actionPlanCardTitle}>{weekTitle}</span>
          <span className={styles.actionPlanCardFocus}>{weekFocus}</span>
        </div>
        <p className={styles.actionPlanInsightLine}>{weekInsight}</p>
        <ul className={styles.actionPlanList}>
          {weekItems.map((item, idx) => (
            <li key={idx} className={styles.actionPlanItem}>
              <span className={styles.actionPlanItemCheck}>✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        {topCategory && (
          <div className={styles.actionPlanTiming}>
            🎯 {isKo ? '주간 포커스' : 'Weekly focus'}: {CATEGORY_EMOJI[topCategory]}{' '}
            {categoryLabel(topCategory)}
          </div>
        )}
      </div>
    </>
  )
}

type ActionPlanInsightsPanelProps = {
  isKo: boolean
  actionPlanInsights: ActionPlanInsights
}

export function ActionPlanInsightsPanel({
  isKo,
  actionPlanInsights,
}: ActionPlanInsightsPanelProps) {
  return (
    <div className={`${styles.actionPlanCard} ${styles.actionPlanInsightsCard}`}>
      <div className={styles.actionPlanCardHeader}>
        <span className={styles.actionPlanCardTitle}>
          {isKo ? '전략 인사이트' : 'Strategic Insights'}
        </span>
        <span className={styles.actionPlanCardFocus}>
          {isKo ? 'If-Then 규칙과 리스크 대비 플로우' : 'If-Then rules and risk-response flow'}
        </span>
      </div>

      <div className={styles.actionPlanInsightSection}>
        <p className={styles.actionPlanInsightSectionTitle}>
          {isKo ? 'ΔToday (평소 대비)' : 'ΔToday (vs usual)'}
        </p>
        <p className={styles.actionPlanInsightLine}>{actionPlanInsights.deltaToday}</p>
      </div>

      <div className={styles.actionPlanInsightSection}>
        <p className={styles.actionPlanInsightSectionTitle}>
          {isKo ? 'If-Then 규칙' : 'If-Then Rules'}
        </p>
        <ul className={styles.actionPlanList}>
          {actionPlanInsights.ifThenRules.map((item) => (
            <li key={`if-then-${item}`} className={styles.actionPlanItem}>
              <span className={styles.actionPlanItemCheck}>→</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.actionPlanInsightSection}>
        <p className={styles.actionPlanInsightSectionTitle}>
          {isKo ? '상황 트리거 If-Then' : 'Situation Triggers'}
        </p>
        <ul className={styles.actionPlanList}>
          {actionPlanInsights.situationTriggers.map((item) => (
            <li key={`trigger-${item}`} className={styles.actionPlanItem}>
              <span className={styles.actionPlanItemCheck}>⚡</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.actionPlanInsightTriple}>
        <div className={styles.actionPlanInsightSection}>
          <p className={styles.actionPlanInsightSectionTitle}>DO</p>
          <ul className={styles.actionPlanList}>
            {actionPlanInsights.actionFramework.do.map((item) => (
              <li key={`do-${item}`} className={styles.actionPlanItem}>
                <span className={styles.actionPlanItemCheck}>✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.actionPlanInsightSection}>
          <p className={styles.actionPlanInsightSectionTitle}>DON&apos;T</p>
          <ul className={styles.actionPlanList}>
            {actionPlanInsights.actionFramework.dont.map((item) => (
              <li key={`dont-${item}`} className={styles.actionPlanItem}>
                <span className={styles.actionPlanItemCheck}>!</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.actionPlanInsightSection}>
          <p className={styles.actionPlanInsightSectionTitle}>
            {isKo ? '대안 플랜' : 'Alternative'}
          </p>
          <ul className={styles.actionPlanList}>
            {actionPlanInsights.actionFramework.alternative.map((item) => (
              <li key={`alt-${item}`} className={styles.actionPlanItem}>
                <span className={styles.actionPlanItemCheck}>↺</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.actionPlanInsightTriple}>
        <div className={styles.actionPlanInsightSection}>
          <p className={styles.actionPlanInsightSectionTitle}>
            {isKo ? '리스크 트리거' : 'Risk Triggers'}
          </p>
          <ul className={styles.actionPlanList}>
            {actionPlanInsights.riskTriggers.map((item) => (
              <li key={`risk-${item}`} className={styles.actionPlanItem}>
                <span className={styles.actionPlanItemCheck}>⚠</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.actionPlanInsightSection}>
          <p className={styles.actionPlanInsightSectionTitle}>
            {isKo ? '성공 KPI' : 'Success KPI'}
          </p>
          <ul className={styles.actionPlanList}>
            {actionPlanInsights.successKpi.map((item) => (
              <li key={`kpi-${item}`} className={styles.actionPlanItem}>
                <span className={styles.actionPlanItemCheck}>📍</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
