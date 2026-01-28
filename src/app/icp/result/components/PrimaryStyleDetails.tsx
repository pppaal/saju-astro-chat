import type { ICPOctant } from '@/lib/icp/types';

interface PrimaryStyleDetailsProps {
  styles: Record<string, string>;
  isKo: boolean;
  primaryOctant: ICPOctant;
}

export default function PrimaryStyleDetails({ styles, isKo, primaryOctant }: PrimaryStyleDetailsProps) {
  return (
    <section className={styles.detailsSection}>
      <h2 className={styles.sectionTitle}>
        <span className={styles.sectionIcon}>✨</span>
        {isKo ? '주요 스타일 특성' : 'Primary Style Traits'}
      </h2>
      <div className={styles.traitsGrid}>
        {/* Traits */}
        <div className={styles.traitCard}>
          <div className={styles.traitHeader}>
            <span className={styles.traitIcon}>💫</span>
            <h3>{isKo ? '특성' : 'Traits'}</h3>
          </div>
          <div className={styles.traitTags}>
            {(isKo ? primaryOctant.traitsKo : primaryOctant.traits).map((trait) => (
              <span key={trait} className={styles.tagTrait}>{trait}</span>
            ))}
          </div>
        </div>

        {/* Shadow */}
        <div className={styles.traitCard}>
          <div className={styles.traitHeader}>
            <span className={styles.traitIcon}>🌑</span>
            <h3>{isKo ? '그림자 측면' : 'Shadow Side'}</h3>
          </div>
          <p className={styles.traitText}>
            {isKo ? primaryOctant.shadowKo : primaryOctant.shadow}
          </p>
        </div>

        {/* Description */}
        <div className={styles.traitCard}>
          <div className={styles.traitHeader}>
            <span className={styles.traitIcon}>📝</span>
            <h3>{isKo ? '설명' : 'Description'}</h3>
          </div>
          <p className={styles.traitText}>
            {isKo ? primaryOctant.descriptionKo : primaryOctant.description}
          </p>
        </div>
      </div>
    </section>
  );
}
