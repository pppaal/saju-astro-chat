import type { IcpNarrative } from '@/lib/icp/narrative'

interface SnapshotGridProps {
  snapshot: IcpNarrative['snapshot']
  styles: Record<string, string>
}

export default function SnapshotGrid({ snapshot, styles }: SnapshotGridProps) {
  const cards = [
    { title: '강점 3', items: snapshot.strengths },
    { title: '주의 2', items: snapshot.risks },
    { title: '잘 맞는 상황 2', items: snapshot.bestIn },
    { title: '체크할 패턴 2', items: snapshot.watchFor },
  ]

  return (
    <section className={styles.snapshotSection} aria-label="30초 요약">
      <h2 className={styles.sectionTitlePremium}>30초 요약</h2>
      <div className={styles.snapshotGrid}>
        {cards.map((card) => (
          <article key={card.title} className={styles.snapshotCard}>
            <h3>{card.title}</h3>
            <ul>
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
