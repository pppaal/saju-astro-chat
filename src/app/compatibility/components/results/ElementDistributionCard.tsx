import React from 'react'
import { ElementBar } from '../shared'
import type { GroupAnalysisData } from '../../lib'
import styles from '../../Compatibility.module.css'

const OHENG_LABELS: Record<string, string> = {
  木: 'Wood (木)',
  火: 'Fire (火)',
  土: 'Earth (土)',
  金: 'Metal (金)',
  水: 'Water (水)',
  Wood: 'Wood (木)',
  Fire: 'Fire (火)',
  Earth: 'Earth (土)',
  Metal: 'Metal (金)',
  Water: 'Water (水)',
  wood: 'Wood (木)',
  fire: 'Fire (火)',
  earth: 'Earth (土)',
  metal: 'Metal (金)',
  water: 'Water (水)',
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
          <span className={styles.resultCardIcon}>🧪</span>
          <h3 className={styles.resultCardTitle}>
            {t('compatibilityPage.groupElementDistribution', 'Group Element Distribution')}
          </h3>
        </div>
        <div className={styles.resultCardContent}>
          <div className={styles.elementDistribution}>
            <div className={styles.elementColumn}>
              <h4>Five Elements (오행)</h4>
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
                  Dominant element:{' '}
                  <strong>
                    {OHENG_LABELS[elementDistribution.dominant_oheng] ||
                      elementDistribution.dominant_oheng}
                  </strong>
                </p>
              )}
              {elementDistribution.lacking_oheng && (
                <p className={styles.elementNote}>
                  Lacking element:{' '}
                  <strong>
                    {OHENG_LABELS[elementDistribution.lacking_oheng] ||
                      elementDistribution.lacking_oheng}
                  </strong>
                </p>
              )}
            </div>
            <div className={styles.elementColumn}>
              <h4>Astro Elements</h4>
              <div className={styles.elementBars}>
                {Object.entries(elementDistribution.astro).map(([key, val]) => {
                  const label =
                    key === 'fire'
                      ? 'Fire'
                      : key === 'earth'
                        ? 'Earth'
                        : key === 'air'
                          ? 'Air'
                          : 'Water'
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
