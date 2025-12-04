//src/components/ui/BackButton.tsx

"use client";

import { useRouter } from "next/navigation";
import styles from "./BackButton.module.css";

export default function BackButton() {
  const router = useRouter();

  return (
    <button onClick={() => router.back()} aria-label="Go back" className={styles.button}>
      {"< Back"}
    </button>
  );
}
