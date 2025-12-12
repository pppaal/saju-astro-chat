import type { ReactNode } from "react";
import styles from "./Section.module.css";

type SectionProps = {
  title?: string;
  eyebrow?: string;
  description?: string;
  className?: string;
  children: ReactNode;
};

export default function Section({ title, eyebrow, description, className, children }: SectionProps) {
  const merged = className ? `${styles.section} ${className}` : styles.section;
  return (
    <section className={merged}>
      <div className={styles.inner}>
        {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
        {title && <h2 className={styles.title}>{title}</h2>}
        {description && <p className={styles.description}>{description}</p>}
        {children}
      </div>
    </section>
  );
}
