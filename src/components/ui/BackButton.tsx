//src/components/ui/BackButton.tsx

"use client";

import { useRouter } from "next/navigation";
import styles from "./BackButton.module.css";

type BackButtonProps = {
  onClick?: () => void;
  label?: string;
  className?: string;
};

export default function BackButton({ onClick, label, className }: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    router.back();
  };

  const cls = className ? `${styles.button} ${className}` : styles.button;

  return (
    <button onClick={handleClick} aria-label="Go back" className={cls}>
      {label}
    </button>
  );
}
