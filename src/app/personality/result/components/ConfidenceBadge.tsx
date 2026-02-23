import type { PersonaNarrative } from '@/lib/persona/narrative'

interface ConfidenceBadgeProps {
  confidence: PersonaNarrative['confidence']
  styles: Record<string, string>
}

export function ConfidenceBadge({ confidence, styles }: ConfidenceBadgeProps) {
  return (
    <section className={styles.sectionCard} aria-labelledby="confidence-title">
      <h2 id="confidence-title" className={styles.sectionTitle}>
        신뢰도
      </h2>
      <p className={styles.confidenceScore}>
        {confidence.score}% ({confidence.levelLabel})
      </p>
      <p className={styles.bodyText}>{confidence.interpretation}</p>
      <ul className={styles.compactList}>
        {confidence.usageGuide.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className={styles.hintText}>{confidence.experimentRule}</p>
    </section>
  )
}
