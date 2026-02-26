import type { PersonaNarrative } from '@/lib/persona/narrative'

interface PlaybookProps {
  playbook: PersonaNarrative['relationshipPlaybook']
  styles: Record<string, string>
}

export function Playbook({ playbook, styles }: PlaybookProps) {
  return (
    <section className={styles.sectionCard} aria-labelledby="playbook-title">
      <h2 id="playbook-title" className={styles.sectionTitle}>
        관계 플레이북
      </h2>
      <div className={styles.paragraphBlock}>
        <p className={styles.bodyText}>
          <strong>시작:</strong> {playbook.start}
        </p>
        <p className={styles.bodyText}>
          <strong>유지:</strong> {playbook.maintain}
        </p>
        <p className={styles.bodyText}>
          <strong>갈등:</strong> {playbook.conflict}
        </p>
        <p className={styles.bodyText}>
          <strong>회복:</strong> {playbook.recovery}
        </p>
      </div>

      <article>
        <h3>갈등 상황 스크립트</h3>
        <ul className={styles.compactList}>
          {playbook.scripts.map((script) => (
            <li key={script}>{script}</li>
          ))}
        </ul>
      </article>

      <article>
        <h3>궁합 운영 가이드</h3>
        <ul className={styles.compactList}>
          {playbook.compatibility.complementaryTraits.map((item) => (
            <li key={item}>보완적 상대 특징: {item}</li>
          ))}
          {playbook.compatibility.collisionPoints.map((item) => (
            <li key={item}>충돌 지점: {item}</li>
          ))}
        </ul>
        <p className={styles.bodyText}>
          <strong>운영 루틴:</strong> {playbook.compatibility.operatingRoutine}
        </p>
        <p className={styles.hintText}>{playbook.compatibility.optionalCta}</p>
      </article>
    </section>
  )
}
