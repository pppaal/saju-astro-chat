import React from 'react'
import { relationIcons, type Relation } from '../../lib'
import styles from '../../Compatibility.module.css'

interface PersonCardHeaderProps {
  // Person index (0-based)
  index: number
  // Relation type for non-first persons
  relation?: Relation
  // Translation function
  t: (key: string, fallback: string) => string
  // My Circle import button
  circleImportButton?: React.ReactNode
}

/**
 * Displays the header of a person card:
 * - Person icon (based on index and relation)
 * - Person number
 * - Optional My Circle import button
 */
export const PersonCardHeader: React.FC<PersonCardHeaderProps> = React.memo(
  ({ index, relation, t, circleImportButton }) => {
    return (
      <div className={styles.personTitleRow}>
        <h3 className={styles.personTitle}>
          <span className={styles.personIcon}>
            {index === 0 ? '\u{1F464}' : relationIcons[relation || 'friend']}
          </span>
          {t('compatibilityPage.person', 'Person')} {index + 1}
        </h3>
        {circleImportButton}
      </div>
    )
  }
)

PersonCardHeader.displayName = 'PersonCardHeader'
