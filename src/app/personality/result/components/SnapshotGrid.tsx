import type { PersonaNarrative } from '@/lib/persona/narrative'

interface SnapshotGridProps {
  snapshot: PersonaNarrative['snapshot']
  styles: Record<string, string>
}

export function SnapshotGrid({ snapshot, styles }: SnapshotGridProps) {
  const cards = [
    { title: '강점 3', items: snapshot.strengths },
    { title: '주의 2', items: snapshot.cautions },
    { title: '잘 맞는 환경 2', items: snapshot.fitEnvironments },
    { title: '흔들리는 조건 2', items: snapshot.wobbleConditions },
  ]

  return (
    <section className={styles.sectionCard} aria-labelledby="snapshot-title">
      <h2 id="snapshot-title" className={styles.sectionTitle}>
        30초 요약
      </h2>
      <p className={styles.hintText}>{snapshot.scoreNote}</p>
      <div className={styles.snapshotGrid}>
        {cards.map((card) => (
          <article key={card.title} className={styles.snapshotCell}>
            <h3>{card.title}</h3>
            <ul className={styles.compactList}>
              {card.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}
