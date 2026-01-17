import styles from "./CalendarSkeleton.module.css";

/**
 * 캘린더 페이지 전용 로딩 스켈레톤
 * 실제 캘린더와 똑같은 모양
 */
export function CalendarSkeleton() {
  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className={styles.container}>
      {/* 배경 */}
      <div className={styles.background} />

      {/* 헤더 */}
      <div className={styles.header}>
        <div className={styles.icon}>📅</div>
        <div className={styles.title} />
        <div className={styles.subtitle} />
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