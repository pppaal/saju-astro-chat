import type { ReactNode } from 'react'
import { BriefcaseBusiness, Dumbbell, Lightbulb, Theater } from 'lucide-react'

interface TraitsGridProps {
  styles: Record<string, string>
  strengths: string[]
  challenges: string[]
  recommendedRoles: string[]
  career: string
  t: (path: string, fallback?: string) => string
}

export function TraitsGrid({
  styles,
  strengths,
  challenges,
  recommendedRoles,
  career,
  t,
}: TraitsGridProps) {
  return (
    <section className={styles.traitsGrid}>
      <TraitCard
        styles={styles}
        icon={<Dumbbell size={18} aria-hidden="true" />}
        title={t('personality.strengths', 'Strengths')}
        tags={strengths}
        tagClass={styles.tagStrength}
      />
      <TraitCard
        styles={styles}
        icon={<Lightbulb size={18} aria-hidden="true" />}
        title={t('personality.challenges', 'Growth Areas')}
        tags={challenges}
        tagClass={styles.tagChallenge}
      />
      <TraitCard
        styles={styles}
        icon={<Theater size={18} aria-hidden="true" />}
        title={t('personality.roles', 'Ideal Roles')}
        tags={recommendedRoles}
        tagClass={styles.tagRole}
      />
      <div className={styles.traitCard}>
        <div className={styles.traitHeader}>
          <BriefcaseBusiness size={18} aria-hidden="true" />
          <h3>{t('personality.career', 'Career Focus')}</h3>
        </div>
        <p className={styles.traitText}>{career}</p>
      </div>
    </section>
  )
}

function TraitCard({
  styles,
  icon,
  title,
  tags,
  tagClass,
}: {
  styles: Record<string, string>
  icon: ReactNode
  title: string
  tags: string[]
  tagClass: string
}) {
  return (
    <div className={styles.traitCard}>
      <div className={styles.traitHeader}>
        <span className={styles.traitIcon}>{icon}</span>
        <h3>{title}</h3>
      </div>
      <div className={styles.traitTags}>
        {tags.map((tag) => (
          <span key={tag} className={tagClass}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}
