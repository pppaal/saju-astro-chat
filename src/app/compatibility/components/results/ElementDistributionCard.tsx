import React from 'react'
import { ElementBar } from '../shared'
import type { GroupAnalysisData } from '../../lib'
import styles from '../../Compatibility.module.css'

const OHENG_KEY_MAP: Record<string, string> = {
  木: 'wood',
  火: 'fire',
  土: 'earth',
  金: 'metal',
  水: 'water',
  Wood: 'wood',
  Fire: 'fire',
  Earth: 'earth',
  Metal: 'metal',
  Water: 'water',
  wood: 'wood',
  fire: 'fire',
  earth: 'earth',
  metal: 'metal',
  water: 'water',
}

interface ElementDistributionCardProps {
  elementDistribution: NonNullable<GroupAnalysisData['element_distribution']>
  personCount: number
  t: (key: string, fallback: string) => string
}

export const ElementDistributionCard = React.memo<ElementDistributionCardProps>(
  ({ elementDistribution, personCount, t }) => {
    const getOhengLabel = (value: string) => {
      const key = OHENG_KEY_MAP[value] || value
      if (key === 'wood') return t('compatibilityPage.elements.wood', '목(木)')
      if (key === 'fire') return t('compatibilityPage.elements.fire', '화(火)')
      if (key === 'earth') return t('compatibilityPage.elements.earth', '토(土)')
      if (key === 'metal') return t('compatibilityPage.elements.metal', '금(金)')
      if (key === 'water') return t('compatibilityPage.elements.water', '수(水)')
      return value
    }

    const getAstroLabel = (key: string) => {
      if (key === 'fire') return t('compatibilityPage.astroElements.fire', 'Fire')
      if (key === 'earth') return t('compatibilityPage.astroElements.earth', 'Earth')
      if (key === 'air') return t('compatibilityPage.astroElements.air', 'Air')
      return t('compatibilityPage.astroElements.water', 'Water')
    }

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
              <h4>{t('compatibilityPage.elementTitles.fiveElements', 'Five Elements (오행)')}</h4>
              <div className={styles.elementBars}>
                {Object.entries(elementDistribution.oheng).map(([key, val]) => (
                  <ElementBar
                    key={key}
                    label={getOhengLabel(key)}
                    value={val}
                    maxValue={personCount}
                  />
                ))}
              </div>
              {elementDistribution.dominant_oheng && (
                <p className={styles.elementNote}>
                  {t('compatibilityPage.elementTitles.dominantElement', 'Dominant element')}:{' '}
                  <strong>
                    {getOhengLabel(elementDistribution.dominant_oheng)}
                  </strong>
                </p>
              )}
              {elementDistribution.lacking_oheng && (
                <p className={styles.elementNote}>
                  {t('compatibilityPage.elementTitles.lackingElement', 'Lacking element')}:{' '}
                  <strong>
                    {getOhengLabel(elementDistribution.lacking_oheng)}
                  </strong>
                </p>
              )}
            </div>
            <div className={styles.elementColumn}>
              <h4>{t('compatibilityPage.elementTitles.astroElements', 'Astro Elements')}</h4>
              <div className={styles.elementBars}>
                {Object.entries(elementDistribution.astro).map(([key, val]) => (
                  <ElementBar key={key} label={getAstroLabel(key)} value={val} maxValue={personCount} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
)

ElementDistributionCard.displayName = 'ElementDistributionCard'
