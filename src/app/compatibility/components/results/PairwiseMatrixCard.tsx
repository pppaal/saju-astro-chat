import React from 'react'
import type { GroupAnalysisData } from '../../lib'
import styles from '../../Compatibility.module.css'

interface PairwiseMatrixCardProps {
  pairwiseMatrix: NonNullable<GroupAnalysisData['pairwise_matrix']>
  t: (key: string, fallback: string) => string
}

export const PairwiseMatrixCard = React.memo<PairwiseMatrixCardProps>(({ pairwiseMatrix, t }) => {
  if (!pairwiseMatrix || pairwiseMatrix.length === 0) {
    return null
  }

  return (
    <div className={styles.resultCard}>
      <div className={styles.resultCardGlow} />
      <div className={styles.resultCardHeader}>
        <span className={styles.resultCardIcon}>🔗</span>
        <h3 className={styles.resultCardTitle}>
          {t('compatibilityPage.pairwiseMatrix', 'Pairwise Matrix')} ({pairwiseMatrix.length})
        </h3>
      </div>
      <div className={styles.resultCardContent}>
        <div className={styles.pairwiseGrid}>
          {pairwiseMatrix.map((pair, idx) => (
            <div key={idx} className={styles.pairItem}>
              <div className={styles.pairHeader}>
                <span className={styles.pairIcon}>👥</span>
                <span className={styles.pairName}>{pair.pair}</span>
                {pair.score !== undefined && <span className={styles.pairScore}>{pair.score}</span>}
              </div>
              {pair.summary && <p className={styles.pairSummary}>{pair.summary}</p>}
              <div className={styles.pairDetails}>
                <span className={styles.pairSaju}>Saju: {pair.saju}</span>
                <span className={styles.pairAstro}>Astro: {pair.astro}</span>
              </div>
              {pair.saju_details && pair.saju_details.length > 0 && (
                <div className={styles.pairAnalysis}>
                  {pair.saju_details.map((detail, i) => (
                    <p key={i} className={styles.analysisItem}>
                      {detail}
                    </p>
                  ))}
                </div>
              )}
              {pair.astro_details && pair.astro_details.length > 0 && (
                <div className={styles.pairAnalysis}>
                  {pair.astro_details.map((detail, i) => (
                    <p key={i} className={styles.analysisItem}>
                      {detail}
                    </p>
                  ))}
                </div>
              )}
              {pair.fusion_insights && pair.fusion_insights.length > 0 && (
                <div className={styles.fusionInsights}>
                  {pair.fusion_insights.map((insight, i) => (
                    <p key={i} className={styles.fusionItem}>
                      {insight}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})

PairwiseMatrixCard.displayName = 'PairwiseMatrixCard'
