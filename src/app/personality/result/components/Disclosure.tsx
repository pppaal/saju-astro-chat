import type { PersonaNarrative } from '@/lib/persona/narrative'

interface DisclosureProps {
  disclosure: PersonaNarrative['disclosure']
  styles: Record<string, string>
}

export function Disclosure({ disclosure, styles }: DisclosureProps) {
  return (
    <section className={styles.sectionCard} aria-labelledby="disclosure-title">
      <h2 id="disclosure-title" className={styles.sectionTitle}>
        고지
      </h2>
      <details className={styles.disclosureBox}>
        <summary>비임상 고지 및 해석 기준 보기</summary>
        <div className={styles.paragraphBlock}>
          <p className={styles.bodyText}>{disclosure.nonClinical}</p>
          <p className={styles.bodyText}>{disclosure.contextImpact}</p>
          <p className={styles.bodyText}>{disclosure.retestCriteria}</p>
          <ul className={styles.compactList}>
            {disclosure.interpretationRules.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </details>
    </section>
  )
}
