"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./ScrollToTop.module.css";

interface ScrollToTopProps {
  threshold?: number;
  label?: string;
  className?: string;
}

export default function ScrollToTop({
  threshold = 500,
  label = "Top",
  className
}: ScrollToTopProps) {
  const [isVisible, setIsVisible] = useState(false);
  const throttleTimeout = useRef<NodeJS.Timeout | null>(null);

  // Show/hide button based on scroll position with throttling
  useEffect(() => {
    const handleScroll = () => {
      // Throttle scroll events to improve performance
      if (throttleTimeout.current) return;

      throttleTimeout.current = setTimeout(() => {
        setIsVisible(window.scrollY > threshold);
        throttleTimeout.current = null;
      }, 100);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (throttleTimeout.current) {
        clearTimeout(throttleTimeout.current);
      }
    };
  }, [threshold]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <button
      className={`${styles.scrollToTop} ${isVisible ? styles.visible : ""} ${className || ""}`}
      onClick={scrollToTop}
      aria-label={label}
    >
      <span className={styles.scrollToTopIcon}>↑</span>
      <span className={styles.scrollToTopText}>{label}</span>
    </button>
  );
}
