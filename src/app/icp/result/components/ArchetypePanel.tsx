import type { IcpNarrative } from '@/lib/icp/narrative'

interface ArchetypePanelProps {
  archetypes: IcpNarrative['archetypes']
  styles: Record<string, string>
}

export default function ArchetypePanel({ archetypes, styles }: ArchetypePanelProps) {
  return (
    <section className={styles.archetypeSection} aria-labelledby="archetype-heading">
      <h2 id="archetype-heading" className={styles.sectionTitlePremium}>
        원형 분석
      </h2>

      <div className={styles.topArchetypeCards}>
        <article className={styles.topArchetypeCard}>
          <h3>주원형</h3>
          <p className={styles.topArchetypeName}>
            {archetypes.primary.name} ({archetypes.primary.code})
          </p>
          <p className={styles.topArchetypeScore}>{archetypes.primary.score}점</p>
          <p>{archetypes.primary.summary}</p>
        </article>
        {archetypes.secondary && (
          <article className={styles.topArchetypeCard}>
            <h3>보조원형</h3>
            <p className={styles.topArchetypeName}>
              {archetypes.secondary.name} ({archetypes.secondary.code})
            </p>
            <p className={styles.topArchetypeScore}>{archetypes.secondary.score}점</p>
            <p>{archetypes.secondary.summary}</p>
          </article>
        )}
      </div>

      <div className={styles.archetypeBars}>
        {archetypes.ranked.map((item) => (
          <div key={item.code} className={styles.archetypeBarRow}>
            <span className={styles.archetypeLabel}>
              {item.label} ({item.code})
            </span>
            <div className={styles.archetypeTrack} aria-hidden="true">
              <div className={styles.archetypeFill} style={{ width: `${item.score}%` }} />
            </div>
            <span className={styles.archetypeScore}>{item.score}</span>
          </div>
        ))}
      </div>

      <p className={styles.lowestArchetype}>{archetypes.lowest.adjustmentPoint}</p>

      <div className={styles.archetypeTipsGrid}>
        <article className={styles.tipCard}>
          <h3>상황 예시</h3>
          <ul>
            {archetypes.scenarioExamples.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className={styles.tipCard}>
          <h3>왜 이렇게 나왔나</h3>
          <ul>
            {archetypes.whyItShowsUp.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className={styles.tipCard}>
          <h3>협업 팁</h3>
          <ul>
            {archetypes.collaborationTips.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className={styles.tipCard}>
          <h3>갈등 팁</h3>
          <ul>
            {archetypes.conflictTips.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  )
}
