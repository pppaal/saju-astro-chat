import React from 'react'
import { ElementBar } from '../shared'
import type { GroupAnalysisData } from '../../lib'
import styles from '../../Compatibility.module.css'

const OHENG_LABELS: Record<string, string> = {
  木: '목(木) Wood',
  火: '화(火) Fire',
  土: '토(土) Earth',
  金: '금(金) Metal',
  水: '수(水) Water',
  Wood: '목(木) Wood',
  Fire: '화(火) Fire',
  Earth: '토(土) Earth',
  Metal: '금(金) Metal',
  Water: '수(水) Water',
  wood: '목(木) Wood',
  fire: '화(火) Fire',
  earth: '토(土) Earth',
  metal: '금(金) Metal',
  water: '수(水) Water',
}

interface ElementDistributionCardProps {
  elementDistribution: NonNullable<GroupAnalysisData['element_distribution']>
  personCount: number
  t: (key: string, fallback: string) => string
}

export const ElementDistributionCard = React.memo<ElementDistributionCardProps>(
  ({ elementDistribution, personCount, t }) => {
    return (
      <div className={styles.resultCard}>
        <div className={styles.resultCardGlow} />
        <div className={styles.resultCardHeader}>
          <span className={styles.resultCardIcon}>??</span>
          <h3 className={styles.resultCardTitle}>
            {t('compatibilityPage.groupElementDistribution', '?? ?? ??')}
          </h3>
        </div>
        <div className={styles.resultCardContent}>
          <div className={styles.elementDistribution}>
            <div className={styles.elementColumn}>
              <h4>?? ?? (??)</h4>
              <div className={styles.elementBars}>
                {Object.entries(elementDistribution.oheng).map(([key, val]) => (
                  <ElementBar
                    key={key}
                    label={OHENG_LABELS[key] || key}
                    value={val}
                    maxValue={personCount}
                  />
                ))}
              </div>
              {elementDistribution.dominant_oheng && (
                <p className={styles.elementNote}>
                  ?? ???:{' '}
                  <strong>
                    {OHENG_LABELS[elementDistribution.dominant_oheng] ||
                      elementDistribution.dominant_oheng}
                  </strong>
                </p>
              )}
              {elementDistribution.lacking_oheng && (
                <p className={styles.elementNote}>
                  ?? ??:{' '}
                  <strong>
                    {OHENG_LABELS[elementDistribution.lacking_oheng] ||
                      elementDistribution.lacking_oheng}
                  </strong>
                </p>
              )}
            </div>
            <div className={styles.elementColumn}>
              <h4>? ?? ??</h4>
              <div className={styles.elementBars}>
                {Object.entries(elementDistribution.astro).map(([key, val]) => {
                  const label =
                    key === 'fire'
                      ? '?? Fire'
                      : key === 'earth'
                        ? '?? Earth'
                        : key === 'air'
                          ? '?? Air'
                          : '?? Water'
                  return <ElementBar key={key} label={label} value={val} maxValue={personCount} />
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
)

ElementDistributionCard.displayName = 'ElementDistributionCard'
