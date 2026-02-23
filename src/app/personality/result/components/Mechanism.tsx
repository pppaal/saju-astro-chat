import type { PersonaNarrative } from '@/lib/persona/narrative'

interface MechanismProps {
  mechanism: PersonaNarrative['mechanism']
  motivations: PersonaNarrative['motivations']
  strengths: PersonaNarrative['strengths']
  risks: PersonaNarrative['risks']
  styles: Record<string, string>
}

export function Mechanism({ mechanism, motivations, strengths, risks, styles }: MechanismProps) {
  return (
    <section className={styles.sectionCard} aria-labelledby="mechanism-title">
      <h2 id="mechanism-title" className={styles.sectionTitle}>
        {mechanism.title}
      </h2>
      <div className={styles.paragraphBlock}>
        {mechanism.lines.map((line) => (
          <p key={line} className={styles.bodyText}>
            {line}
          </p>
        ))}
      </div>
      <div className={styles.twoColumn}>
        <article>
          <h3>핵심 동기</h3>
          <ul className={styles.compactList}>
            {motivations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article>
          <h3>강점/리스크</h3>
          <ul className={styles.compactList}>
            {strengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
            {risks.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  )
}
