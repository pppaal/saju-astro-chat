import React from 'react'
import styles from '../../../tarot-reading.module.css'

interface CombinationsSectionProps {
  combinations: Array<{ cards: string[]; meaning: string }>
  translate: (key: string, fallback: string) => string
}

export function CombinationsSection({ combinations, translate }: CombinationsSectionProps) {
  return (
    <div className={styles.combinationsSection}>
      <h3 className={styles.sectionTitle}>
        🔗 {translate('tarot.insights.combinations', 'Card Combinations')}
      </h3>
      <div className={styles.combinationsList}>
        {combinations.map((combo, idx) => (
          <div key={idx} className={styles.combinationItem}>
            <span className={styles.comboCards}>{combo.cards.join(' + ')}</span>
            <p className={styles.comboMeaning}>{combo.meaning}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
