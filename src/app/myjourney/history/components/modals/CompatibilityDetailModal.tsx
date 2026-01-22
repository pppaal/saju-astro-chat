import type { PersonalityCompatibilityContent } from '../../lib';
import styles from '../../history.module.css';

type CompatibilityDetailModalProps = {
  detail: PersonalityCompatibilityContent;
};

export function CompatibilityDetailModal({ detail }: CompatibilityDetailModalProps) {
  return (
    <div className={styles.compatibilityDetail}>
      {/* Header */}
      <div className={styles.destinyHeader}>
        <span className={styles.destinyIcon}>💞</span>
        <div>
          <h2>성격 궁합 분석</h2>
          <p className={styles.destinyTheme}>
            {detail.person1.name || 'Person 1'} & {detail.person2.name || 'Person 2'}
          </p>
        </div>
      </div>

      {/* Overall Score */}
      <div className={styles.compatibilityScore}>
        <span className={styles.scoreEmoji}>
          {detail.compatibility.crossSystemScore >= 80 ? "💕" :
           detail.compatibility.crossSystemScore >= 65 ? "💙" :
           detail.compatibility.crossSystemScore >= 50 ? "💛" : "💔"}
        </span>
        <span className={styles.scoreLabel}>종합 궁합 점수</span>
        <span className={styles.scoreText}>{detail.compatibility.crossSystemScore}/100</span>
        <span className={styles.scoreLevel}>
          {detail.compatibility.levelKo || detail.compatibility.level}
        </span>
      </div>

      {/* Description */}
      <div className={styles.section}>
        <p>{detail.compatibility.descriptionKo || detail.compatibility.description}</p>
      </div>

      {/* Person Profiles */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>프로필</h3>
        <div className={styles.personGrid}>
          <div className={styles.personCard}>
            <h4>{detail.person1.name || 'Person 1'}</h4>
            <p className={styles.personLabel}>ICP: {detail.person1.icp.primaryStyle}</p>
            <p className={styles.personLabel}>Persona: {detail.person1.persona.typeCode} - {detail.person1.persona.personaName}</p>
          </div>
          <div className={styles.personCard}>
            <h4>{detail.person2.name || 'Person 2'}</h4>
            <p className={styles.personLabel}>ICP: {detail.person2.icp.primaryStyle}</p>
            <p className={styles.personLabel}>Persona: {detail.person2.persona.typeCode} - {detail.person2.persona.personaName}</p>
          </div>
        </div>
      </div>

      {/* Timestamp */}
      <p className={styles.timestamp}>
        {new Date(detail.createdAt).toLocaleString()}
      </p>
    </div>
  );
}
