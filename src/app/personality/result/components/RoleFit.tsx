import type { PersonaNarrative } from '@/lib/persona/narrative'

interface RoleFitProps {
  roleFit: PersonaNarrative['roleFit']
  styles: Record<string, string>
}

export function RoleFit({ roleFit, styles }: RoleFitProps) {
  return (
    <section className={styles.sectionCard} aria-labelledby="rolefit-title">
      <h2 id="rolefit-title" className={styles.sectionTitle}>
        역할 적합
      </h2>
      <div className={styles.twoColumn}>
        <article>
          <h3>빛나는 역할 3</h3>
          <ul className={styles.compactList}>
            {roleFit.shineRoles.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article>
          <h3>피해야 할 환경 2</h3>
          <ul className={styles.compactList}>
            {roleFit.avoidEnvironments.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>
      <article>
        <h3>운영 체크리스트</h3>
        <ul className={styles.compactList}>
          {roleFit.operatingChecklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>
    </section>
  )
}
