import Image from 'next/image'
import type { PersonaNarrative } from '@/lib/persona/narrative'

interface HeroProps {
  hero: PersonaNarrative['hero']
  styles: Record<string, string>
  avatarSrc: string | null
  avatarError: boolean
  setAvatarError: (value: boolean) => void
  avatarAlt: string
}

export function Hero({
  hero,
  styles,
  avatarSrc,
  avatarError,
  setAvatarError,
  avatarAlt,
}: HeroProps) {
  return (
    <section className={styles.heroPanel} aria-labelledby="persona-hero-title">
      <div className={styles.heroLayout}>
        <div className={styles.heroMedia}>
          {avatarSrc && !avatarError ? (
            <Image
              src={avatarSrc}
              alt={avatarAlt}
              width={220}
              height={330}
              className={styles.heroAvatar}
              unoptimized
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div className={styles.heroAvatarFallback} aria-label={avatarAlt}>
              {hero.code}
            </div>
          )}
        </div>
        <div>
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
        </div>
      </div>
      <p className={styles.codeSummary}>{hero.codeSummary}</p>
    </section>
  )
}
