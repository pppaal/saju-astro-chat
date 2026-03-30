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

type ActionPlanEngineCard = {
  key: 'action' | 'risk' | 'window' | 'agreement' | 'branch'
  label: string
  summary: string
  tag?: string
  details?: string[]
  visual?:
    | {
        kind: 'agreement'
        agreementPercent: number
        contradictionPercent: number
        leadLagState: 'structure-ahead' | 'trigger-ahead' | 'balanced'
      }
    | {
        kind: 'branch'
        rows: Array<{ label: string; text: string }>
      }
}

type ActionPlanSummaryPanelsProps = {
  isKo: boolean
  todayFocus: string
  todayInsight: string
  todayItems: string[]
  engineCards: ActionPlanEngineCard[]
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

function pickEngineCard(
  engineCards: ActionPlanEngineCard[],
  key: ActionPlanEngineCard['key']
): ActionPlanEngineCard | null {
  return engineCards.find((card) => card.key === key) || null
}

function splitBranchDetails(details: string[] | undefined, isKo: boolean) {
  const fallback = isKo
    ? ['들어가도 되는 조건', '멈춰야 하는 조건', '서두르면 생기는 리스크']
    : ['Entry condition', 'Abort signal', 'Risk of rushing']
  const normalized = (details || []).filter(Boolean).slice(0, 3)
  return fallback.map((label, index) => ({
    label,
    text: normalized[index] || '',
  }))
}

export function ActionPlanSummaryPanels(props: ActionPlanSummaryPanelsProps) {
  const {
    isKo,
    todayFocus,
    todayInsight,
    todayItems,
    engineCards,
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
  const heroCards = ['action', 'risk', 'window']
    .map((key) => pickEngineCard(engineCards, key as ActionPlanEngineCard['key']))
    .filter((card): card is ActionPlanEngineCard => Boolean(card))
  const agreementCard = pickEngineCard(engineCards, 'agreement')
  const branchCard = pickEngineCard(engineCards, 'branch')
  const branchRows = splitBranchDetails(branchCard?.details, isKo)

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
        {heroCards.length > 0 && (
          <div className={styles.actionPlanHeroGrid}>
            {heroCards.map((card) => (
              <div key={card.key} className={styles.actionPlanHeroCard}>
                <div className={styles.actionPlanHeroHeader}>
                  <span className={styles.actionPlanHeroLabel}>{card.label}</span>
                  {card.tag ? <span className={styles.actionPlanHeroTag}>{card.tag}</span> : null}
                </div>
                <p className={styles.actionPlanHeroSummary}>{card.summary}</p>
                {card.details?.[0] ? (
                  <p className={styles.actionPlanHeroDetail}>{card.details[0]}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
        {(agreementCard || branchCard) && (
          <div className={styles.actionPlanEngineGrid}>
            {agreementCard && (
              <div className={styles.actionPlanEngineBlock}>
                <div className={styles.actionPlanEngineHeader}>
                  <span className={styles.actionPlanEngineLabel}>{agreementCard.label}</span>
                  {agreementCard.tag ? (
                    <span className={styles.actionPlanEngineTag}>{agreementCard.tag}</span>
                  ) : null}
                </div>
                <p className={styles.actionPlanEngineSummary}>{agreementCard.summary}</p>
                {agreementCard.visual?.kind === 'agreement' ? (
                  <div className={styles.actionPlanAgreementMeterWrap}>
                    <div className={styles.actionPlanAgreementMeterRow}>
                      <span className={styles.actionPlanAgreementMeterLabel}>
                        {isKo ? '합의' : 'Alignment'}
                      </span>
                      <span className={styles.actionPlanAgreementMeterValue}>
                        {agreementCard.visual.agreementPercent}%
                      </span>
                    </div>
                    <div className={styles.actionPlanAgreementMeterTrack}>
                      <div
                        className={`${styles.actionPlanAgreementMeterFill} ${styles.actionPlanAgreementMeterFillGood}`}
                        style={{ width: `${Math.max(6, agreementCard.visual.agreementPercent)}%` }}
                      />
                    </div>
                    <div className={styles.actionPlanAgreementMeterRow}>
                      <span className={styles.actionPlanAgreementMeterLabel}>
                        {isKo ? '충돌' : 'Conflict'}
                      </span>
                      <span className={styles.actionPlanAgreementMeterValue}>
                        {agreementCard.visual.contradictionPercent}%
                      </span>
                    </div>
                    <div className={styles.actionPlanAgreementMeterTrack}>
                      <div
                        className={`${styles.actionPlanAgreementMeterFill} ${styles.actionPlanAgreementMeterFillRisk}`}
                        style={{ width: `${Math.max(6, agreementCard.visual.contradictionPercent)}%` }}
                      />
                    </div>
                  </div>
                ) : null}
                {agreementCard.details?.length ? (
                  <ul className={styles.actionPlanEngineList}>
                    {agreementCard.details.map((detail) => (
                      <li key={`agreement-${detail}`}>{detail}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
            {branchCard && (
              <div className={styles.actionPlanEngineBlock}>
                <div className={styles.actionPlanEngineHeader}>
                  <span className={styles.actionPlanEngineLabel}>{branchCard.label}</span>
                  {branchCard.tag ? (
                    <span className={styles.actionPlanEngineTag}>{branchCard.tag}</span>
                  ) : null}
                </div>
                <p className={styles.actionPlanEngineSummary}>{branchCard.summary}</p>
                <div className={styles.actionPlanBranchGrid}>
                  {(branchCard.visual?.kind === 'branch' ? branchCard.visual.rows : branchRows).map((row) => (
                    <div key={`${row.label}-${row.text}`} className={styles.actionPlanBranchRow}>
                      <span className={styles.actionPlanBranchLabel}>{row.label}</span>
                      <span className={styles.actionPlanBranchText}>{row.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
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
