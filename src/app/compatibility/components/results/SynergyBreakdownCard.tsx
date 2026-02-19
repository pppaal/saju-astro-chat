import React from 'react'
import type { SynergyBreakdown } from '../../lib'
import styles from '../../Compatibility.module.css'

interface SynergyBreakdownCardProps {
  synergyBreakdown: SynergyBreakdown
  t: (key: string, fallback: string) => string
}

export const SynergyBreakdownCard = React.memo<SynergyBreakdownCardProps>(
  ({ synergyBreakdown, t }) => {
    return (
      <div className={styles.resultCard}>
        <div className={styles.resultCardGlow} />
        <div className={styles.resultCardHeader}>
          <span className={styles.resultCardIcon}>📊</span>
          <h3 className={styles.resultCardTitle}>
            {t('compatibilityPage.synergyBreakdown', 'Synergy Score Breakdown')}
          </h3>
        </div>
        <div className={styles.resultCardContent}>
          <div className={styles.synergyScore}>
            <div className={styles.totalScore}>
              <span className={styles.totalScoreValue}>
                {synergyBreakdown.overall_score ?? synergyBreakdown.total_score}
              </span>
              <span className={styles.totalScoreLabel}>/100</span>
            </div>
            {synergyBreakdown.special_formations &&
              synergyBreakdown.special_formations.length > 0 && (
                <div className={styles.specialFormations}>
                  {synergyBreakdown.special_formations.map((formation, idx) => (
                    <div key={idx} className={styles.formationItem}>
                      {formation}
                    </div>
                  ))}
                </div>
              )}
            <div className={styles.scoreBreakdown}>
              <div className={styles.breakdownItem}>
                <span>Pair Average</span>
                <span>{synergyBreakdown.avg_pair_score}</span>
              </div>
              {synergyBreakdown.oheng_bonus > 0 && (
                <div className={styles.breakdownItem}>
                  <span>Five Elements Bonus</span>
                  <span className={styles.bonusText}>+{synergyBreakdown.oheng_bonus}</span>
                </div>
              )}
              {synergyBreakdown.astro_bonus > 0 && (
                <div className={styles.breakdownItem}>
                  <span>Astrology Bonus</span>
                  <span className={styles.bonusText}>+{synergyBreakdown.astro_bonus}</span>
                </div>
              )}
              {synergyBreakdown.role_bonus > 0 && (
                <div className={styles.breakdownItem}>
                  <span>Role Bonus</span>
                  <span className={styles.bonusText}>+{synergyBreakdown.role_bonus}</span>
                </div>
              )}
              {synergyBreakdown.samhap_bonus > 0 && (
                <div className={styles.breakdownItem}>
                  <span>Samhap Bonus</span>
                  <span className={styles.bonusText}>+{synergyBreakdown.samhap_bonus}</span>
                </div>
              )}
              {synergyBreakdown.banghap_bonus && synergyBreakdown.banghap_bonus > 0 && (
                <div className={styles.breakdownItem}>
                  <span>Banghap Bonus</span>
                  <span className={styles.bonusText}>+{synergyBreakdown.banghap_bonus}</span>
                </div>
              )}
              {synergyBreakdown.size_adjustment !== 0 && (
                <div className={styles.breakdownItem}>
                  <span>Team Size Adjustment</span>
                  <span
                    className={
                      synergyBreakdown.size_adjustment > 0 ? styles.bonusText : styles.penaltyText
                    }
                  >
                    {synergyBreakdown.size_adjustment}
                  </span>
                </div>
              )}
            </div>
            <div className={styles.pairHighlights}>
              <div className={styles.highlightItem}>
                <span className={styles.highlightIcon}>🏆</span>
                <span className={styles.highlightLabel}>Best Pair</span>
                <span className={styles.highlightPair}>{synergyBreakdown.best_pair.pair}</span>
                <span className={styles.highlightScore}>{synergyBreakdown.best_pair.score}</span>
              </div>
              <div className={styles.highlightItem}>
                <span className={styles.highlightIcon}>⚠️</span>
                <span className={styles.highlightLabel}>Weakest Pair</span>
                <span className={styles.highlightPair}>{synergyBreakdown.weakest_pair.pair}</span>
                <span className={styles.highlightScore}>{synergyBreakdown.weakest_pair.score}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
)

SynergyBreakdownCard.displayName = 'SynergyBreakdownCard'
