"use client";

import styles from "./CalendarSkeleton.module.css";
import { useState, useEffect } from "react";

/**
 * 캘린더 페이지 전용 로딩 스켈레톤
 * 실제 캘린더와 똑같은 모양 + 분석 진행 상태 표시
 */
export function CalendarSkeleton() {
  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
  const [currentStep, setCurrentStep] = useState(0);

  // 분석 단계 메시지 (사용자 친화적)
  const analysisSteps = [
    "당신의 생년월일 정보를 확인하고 있어요...",
    "사주 팔자와 대운을 계산하고 있어요...",
    "점성술 천체 배치를 분석하고 있어요...",
    "365일 운세를 종합 분석하고 있어요...",
    "당신에게 특별한 날들을 찾고 있어요...",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % analysisSteps.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [analysisSteps.length]);

  return (
    <div className={styles.container}>
      {/* 배경 */}
      <div className={styles.background} />

      {/* 헤더 */}
      <div className={styles.header}>
        <div className={styles.icon}>CAL</div>
        <div className={styles.title} />
        <div className={styles.subtitle} />
      </div>

      {/* 분석 진행 상태 메시지 */}
      <div style={{
        textAlign: 'center',
        padding: '24px',
        fontSize: '16px',
        color: 'var(--text-secondary, #666)',
        fontWeight: 500,
        animation: 'pulse 1.5s ease-in-out infinite',
        minHeight: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {analysisSteps[currentStep]}
      </div>

      {/* 캘린더 컨트롤 */}
      <div className={styles.calendarBox}>
        {/* 월 네비게이션 */}
        <div className={styles.calendarNav}>
          <div className={styles.navButton} />
          <div className={styles.monthTitle} />
          <div className={styles.navButton} />
        </div>

        {/* 요일 헤더 */}
        <div className={styles.weekDaysHeader}>
          {weekDays.map((day, i) => (
            <div key={i} className={styles.weekDay}>
              {day}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className={styles.daysGrid}>
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className={`${styles.dayCell} ${i % 7 === 0 || i % 7 === 6 ? styles.weekend : ""}`}
            >
              <div className={styles.dayNumber} />
              <div className={styles.gradeIndicator} />
            </div>
          ))}
        </div>

        {/* 범례 */}
        <div className={styles.legend}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={styles.legendItem} />
          ))}
        </div>
      </div>

      {/* 하단 설명 */}
      <div className={styles.hint} />
    </div>
  );
}
