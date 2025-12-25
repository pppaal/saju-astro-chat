"use client";

import { useState, useEffect } from "react";
import { tarotCounselors, TarotCounselor, defaultCounselor } from "@/lib/Tarot/tarot-counselors";
import styles from "./CounselorSelect.module.css";

interface CounselorSelectProps {
  selectedId?: string;
  onSelect: (counselor: TarotCounselor) => void;
  language?: "ko" | "en";
  recommendedId?: string; // 추천 상담사 ID
}

const STORAGE_KEY = "tarot_selected_counselor";

export default function CounselorSelect({ selectedId, onSelect, language = "ko", recommendedId }: CounselorSelectProps) {
  const isKo = language === "ko";
  const [selected, setSelected] = useState<string>(selectedId || defaultCounselor.id);
  const [isExpanded, setIsExpanded] = useState(false);

  // Load saved counselor on mount
  useEffect(() => {
    if (typeof window !== "undefined" && !selectedId) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const counselor = tarotCounselors.find(c => c.id === saved);
        if (counselor) {
          setSelected(saved);
          onSelect(counselor);
        }
      }
    }
  }, [selectedId, onSelect]);

  const handleSelect = (counselor: TarotCounselor) => {
    setSelected(counselor.id);
    onSelect(counselor);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, counselor.id);
    }
    setIsExpanded(false);
  };

  const currentCounselor = tarotCounselors.find(c => c.id === selected) || defaultCounselor;

  return (
    <div className={styles.container}>
      {/* Current Selection / Toggle Button */}
      <button
        className={styles.toggleButton}
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          "--counselor-color": currentCounselor.color,
          "--counselor-gradient": currentCounselor.gradient,
        } as React.CSSProperties}
      >
        <div className={styles.currentCounselor}>
          <span className={styles.avatar}>{currentCounselor.avatar}</span>
          <div className={styles.info}>
            <span className={styles.name}>{isKo ? currentCounselor.nameKo : currentCounselor.name}</span>
            <span className={styles.title}>{isKo ? currentCounselor.titleKo : currentCounselor.title}</span>
          </div>
        </div>
        <span className={`${styles.chevron} ${isExpanded ? styles.expanded : ""}`}>▼</span>
      </button>

      {/* Counselor Grid */}
      {isExpanded && (
        <div className={styles.counselorGrid}>
          {tarotCounselors.map((counselor) => (
            <button
              key={counselor.id}
              className={`${styles.counselorCard} ${selected === counselor.id ? styles.selected : ""}`}
              onClick={() => handleSelect(counselor)}
              style={{
                "--counselor-color": counselor.color,
                "--counselor-gradient": counselor.gradient,
              } as React.CSSProperties}
            >
              <div className={styles.cardHeader}>
                <span className={styles.cardAvatar}>{counselor.avatar}</span>
                <div className={styles.cardInfo}>
                  <span className={styles.cardName}>
                    {isKo ? counselor.nameKo : counselor.name}
                    {recommendedId === counselor.id && (
                      <span className={styles.recommendedBadge}>
                        {isKo ? "추천" : "Recommended"}
                      </span>
                    )}
                  </span>
                  <span className={styles.cardTitle}>{isKo ? counselor.titleKo : counselor.title}</span>
                </div>
                {selected === counselor.id && (
                  <span className={styles.checkmark}>✓</span>
                )}
              </div>

              <p className={styles.personality}>
                {isKo ? counselor.personalityKo : counselor.personality}
              </p>

              <div className={styles.specialties}>
                {(isKo ? counselor.specialtyKo : counselor.specialty).map((spec, idx) => (
                  <span key={idx} className={styles.specialty}>{spec}</span>
                ))}
              </div>

              <p className={styles.greeting}>
                &quot;{isKo ? counselor.greetingKo : counselor.greeting}&quot;
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
