"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./ScrollToTop.module.css";

interface ScrollToTopProps {
  threshold?: number;
  label?: string;
}

export default function ScrollToTop({ threshold = 500, label = "Top" }: ScrollToTopProps) {
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  // Show/hide button based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > threshold);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <button
      className={`${styles.scrollToTop} ${showScrollTop ? styles.visible : ""}`}
      onClick={scrollToTop}
      aria-label={label}
    >
      <span className={styles.scrollToTopIcon}>↑</span>
      <span className={styles.scrollToTopText}>{label}</span>
    </button>
  );
}
