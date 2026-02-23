import type { PersonaNarrative } from '@/lib/persona/narrative'

interface HeroProps {
  hero: PersonaNarrative['hero']
  styles: Record<string, string>
}

export function Hero({ hero, styles }: HeroProps) {
  return (
    <section className={styles.heroPanel} aria-labelledby="persona-hero-title">
      <p className={styles.sectionEyebrow}>Nova Persona Result</p>
      <h1 id="persona-hero-title" className={styles.heroTitle}>
        {hero.typeName}
      </h1>
      <p className={styles.heroCode}>{hero.code}</p>
      <p className={styles.heroDefinition}>{hero.oneLineDefinition}</p>
      <div className={styles.heroSubcopy}>
        {hero.subcopy.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <p className={styles.codeSummary}>{hero.codeSummary}</p>
    </section>
  )
}
