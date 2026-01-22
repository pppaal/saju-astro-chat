import type { NumerologyContent } from '../../lib';
import styles from '../../history.module.css';

type NumerologyDetailModalProps = {
  detail: NumerologyContent;
};

export function NumerologyDetailModal({ detail }: NumerologyDetailModalProps) {
  return (
    <div className={styles.numerologyDetail}>
      {/* Header */}
      <div className={styles.destinyHeader}>
        <span className={styles.destinyIcon}>🔢</span>
        <div>
          <h2>수비학 분석</h2>
          <p className={styles.destinyTheme}>{detail.name}</p>
        </div>
      </div>

      {/* Core Numbers */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>핵심 숫자</h3>
        <div className={styles.numberGrid}>
          <div className={styles.numberBox}>
            <span className={styles.numberValue}>{detail.lifePath}</span>
            <span className={styles.numberLabel}>Life Path</span>
            <span className={styles.numberKorean}>인생 경로</span>
          </div>
          <div className={styles.numberBox}>
            <span className={styles.numberValue}>{detail.expression}</span>
            <span className={styles.numberLabel}>Expression</span>
            <span className={styles.numberKorean}>표현수</span>
          </div>
          <div className={styles.numberBox}>
            <span className={styles.numberValue}>{detail.soulUrge}</span>
            <span className={styles.numberLabel}>Soul Urge</span>
            <span className={styles.numberKorean}>영혼의 욕구</span>
          </div>
          <div className={styles.numberBox}>
            <span className={styles.numberValue}>{detail.personality}</span>
            <span className={styles.numberLabel}>Personality</span>
            <span className={styles.numberKorean}>인격수</span>
          </div>
        </div>
      </div>

      {/* Personal Year */}
      {detail.personalYear && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>🌟 올해의 테마</h3>
          <div className={styles.personalYearBox}>
            <span className={styles.yearNumber}>{detail.personalYear}</span>
            <span className={styles.yearLabel}>Personal Year Number</span>
          </div>
        </div>
      )}

      {/* Birth Date */}
      <p className={styles.timestamp}>
        생년월일: {new Date(detail.birthDate).toLocaleDateString('ko-KR')}
      </p>
    </div>
  );
}
