interface TraitsGridProps {
  styles: Record<string, string>;
  strengths: string[];
  challenges: string[];
  recommendedRoles: string[];
  career: string;
  t: (path: string, fallback?: string) => string;
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
        icon="\uD83D\uDCAA"
        title={t('personality.strengths', 'Strengths')}
        tags={strengths}
        tagClass={styles.tagStrength}
      />
      <TraitCard
        styles={styles}
        icon="\u26A1"
        title={t('personality.challenges', 'Growth Areas')}
        tags={challenges}
        tagClass={styles.tagChallenge}
      />
      <TraitCard
        styles={styles}
        icon="\uD83C\uDFAD"
        title={t('personality.roles', 'Ideal Roles')}
        tags={recommendedRoles}
        tagClass={styles.tagRole}
      />
      <div className={styles.traitCard}>
        <div className={styles.traitHeader}>
          <span className={styles.traitIcon}>{'\uD83D\uDCBC'}</span>
          <h3>{t('personality.career', 'Career Focus')}</h3>
        </div>
        <p className={styles.traitText}>{career}</p>
      </div>
    </section>
  );
}

function TraitCard({
  styles,
  icon,
  title,
  tags,
  tagClass,
}: {
  styles: Record<string, string>;
  icon: string;
  title: string;
  tags: string[];
  tagClass: string;
}) {
  return (
    <div className={styles.traitCard}>
      <div className={styles.traitHeader}>
        <span className={styles.traitIcon}>{icon}</span>
        <h3>{title}</h3>
      </div>
      <div className={styles.traitTags}>
        {tags.map((tag) => (
          <span key={tag} className={tagClass}>{tag}</span>
        ))}
      </div>
    </div>
  );
}
