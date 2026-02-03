import React from 'react'
import styles from '../../../tarot-reading.module.css'

interface FollowupSectionProps {
  questions: string[]
  translate: (key: string, fallback: string) => string
}

export function FollowupSection({ questions, translate }: FollowupSectionProps) {
  return (
    <div className={styles.followupSection}>
      <h3 className={styles.sectionTitle}>
        ❓ {translate('tarot.insights.followup', 'Questions for Reflection')}
      </h3>
      <ul className={styles.followupList}>
        {questions.map((q, idx) => (
          <li key={idx} className={styles.followupQuestion}>
            {q}
          </li>
        ))}
      </ul>
    </div>
  )
}
