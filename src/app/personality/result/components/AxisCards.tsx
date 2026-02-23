import type { PersonaNarrative } from '@/lib/persona/narrative'

interface AxisCardsProps {
  axes: PersonaNarrative['axes']
  styles: Record<string, string>
}

export function AxisCards({ axes, styles }: AxisCardsProps) {
  return (
    <section className={styles.sectionCard} aria-labelledby="axis-title">
      <h2 id="axis-title" className={styles.sectionTitle}>
        4축 해석
      </h2>
      <p className={styles.hintText}>
        퍼센트는 오른쪽 성향(외향/비전/논리/유동)으로 기운 정도를 의미합니다.
      </p>
      <div className={styles.axisGrid}>
        {axes.map((axis) => (
          <article key={axis.key} className={styles.axisCard}>
            <header className={styles.axisHeader}>
              <h3>{axis.title}</h3>
              <p>
                {axis.score}% ({axis.scoreBandLabel})
              </p>
            </header>
            <p className={styles.axisScale}>
              {axis.leftLabel} ↔ {axis.rightLabel}
            </p>
            <p className={styles.bodyText}>{axis.currentPosition}</p>
            <p className={styles.bodyText}>
              <strong>유리한 상황:</strong> {axis.favorableSituation}
            </p>
            <p className={styles.bodyText}>
              <strong>과하면:</strong> {axis.overdriveRisk}
            </p>
            <p className={styles.miniAction}>{axis.microAdjustment}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
