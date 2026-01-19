import styles from './SectionHeader.module.css';

interface SectionHeaderProps {
  icon: string;
  title: string;
  badge?: string;
}

export function SectionHeader({ icon, title, badge }: SectionHeaderProps) {
  return (
    <div className={styles.sectionHeader}>
      <span className={styles.sectionIcon}>{icon}</span>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {badge && <span className={styles.sectionBadge}>{badge}</span>}
    </div>
  );
}
