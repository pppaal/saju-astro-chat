//src/components/ui/HomeButton.tsx

"use client";

import Link from "next/link";
import styles from "./HomeButton.module.css";

type HomeButtonProps = {
  label?: string;
  className?: string;
};

export default function HomeButton({ label = "홈", className }: HomeButtonProps) {
  const cls = className ? `${styles.button} ${className}` : styles.button;

  return (
    <Link href="/" className={cls} aria-label="Home">
      <span className={styles.icon}>🏠</span>
      <span className={styles.label}>{label}</span>
    </Link>
  );
}
