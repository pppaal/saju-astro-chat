'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './CalendarView.module.css';
import { calendarCellVariants } from '../animations/cardAnimations';

interface DayInfo {
  date: string;
  quality: 'excellent' | 'good' | 'neutral' | 'caution' | 'avoid';
  score?: number;
  reason?: string;
}

interface CalendarViewProps {
  days: DayInfo[];
  selectedMonth?: Date;
  onMonthChange?: (month: Date) => void;
  onDayClick?: (day: DayInfo) => void;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const QUALITY_LABELS: Record<string, string> = {
  excellent: '최상',
  good: '좋음',
  neutral: '보통',
  caution: '주의',
  avoid: '피해야 함',
};

export function CalendarView({
  days,
  selectedMonth: initialMonth,
  onMonthChange,
  onDayClick,
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (initialMonth) {return initialMonth;}
    // 가장 먼저 좋은 날짜가 있는 월로 시작
    if (days.length > 0) {
      return new Date(days[0].date);
    }
    return new Date();
  });

  const [selectedDay, setSelectedDay] = useState<DayInfo | null>(null);

  // days를 Map으로 캐싱하여 O(1) 조회
  const daysMap = useMemo(
    () => new Map(days.map(d => [d.date, d])),
    [days]
  );

  // 현재 월의 날짜들 생성
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();

    const result: Array<{ date: Date | null; info?: DayInfo }> = [];

    // 이전 달의 빈 셀
    for (let i = 0; i < startDayOfWeek; i++) {
      result.push({ date: null });
    }

    // 현재 달의 날짜들
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      const info = daysMap.get(dateStr);
      result.push({ date, info });
    }

    return result;
  }, [currentMonth, daysMap]);

  // 월 변경
  const changeMonth = (delta: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + delta);
    setCurrentMonth(newMonth);
    onMonthChange?.(newMonth);
    setSelectedDay(null);
  };

  // 날짜 클릭
  const handleDayClick = (dayData: { date: Date | null; info?: DayInfo }) => {
    if (dayData.info) {
      setSelectedDay(dayData.info);
      onDayClick?.(dayData.info);
    }
  };

  // 현재 달에 표시된 이벤트 개수 (calendarDays에서 파생하여 중복 필터링 제거)
  const monthStats = useMemo(() => {
    const monthDays = calendarDays
      .filter((d): d is { date: Date; info: DayInfo } => d.info !== undefined);

    return {
      total: monthDays.length,
      excellent: monthDays.filter(d => d.info.quality === 'excellent').length,
      good: monthDays.filter(d => d.info.quality === 'good').length,
    };
  }, [calendarDays]);

  return (
    <div className={styles.calendarContainer}>
      {/* 헤더 */}
      <div className={styles.calendarHeader}>
        <button
          className={styles.monthNavBtn}
          onClick={() => changeMonth(-1)}
          aria-label="이전 달"
        >
          ◀
        </button>
        <h3 className={styles.monthTitle}>
          {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
        </h3>
        <button
          className={styles.monthNavBtn}
          onClick={() => changeMonth(1)}
          aria-label="다음 달"
        >
          ▶
        </button>
      </div>

      {/* 월간 통계 */}
      {monthStats.total > 0 && (
        <div className={styles.monthStats}>
          <span className={styles.statBadge}>
            <span className={styles.statIcon}>⭐</span>
            최상 {monthStats.excellent}일
          </span>
          <span className={styles.statBadge}>
            <span className={styles.statIcon}>✓</span>
            좋음 {monthStats.good}일
          </span>
        </div>
      )}

      {/* 요일 헤더 */}
      <div className={styles.weekdayHeader}>
        {WEEKDAYS.map((day, index) => (
          <div
            key={day}
            className={`${styles.weekdayCell} ${
              index === 0 ? styles.sunday : index === 6 ? styles.saturday : ''
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 캘린더 그리드 */}
      <motion.div
        className={styles.calendarGrid}
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.02 },
          },
        }}
      >
        {calendarDays.map((dayData, index) => {
          const isToday = dayData.date?.toDateString() === new Date().toDateString();
          const hasEvent = !!dayData.info;
          const quality = dayData.info?.quality;

          return (
            <motion.div
              key={index}
              className={`${styles.dayCell} ${
                !dayData.date ? styles.empty : ''
              } ${isToday ? styles.today : ''} ${
                hasEvent ? styles[quality || ''] : ''
              } ${selectedDay?.date === dayData.info?.date ? styles.selected : ''}`}
              variants={calendarCellVariants}
              whileHover={hasEvent ? { scale: 1.1 } : undefined}
              whileTap={hasEvent ? { scale: 0.95 } : undefined}
              onClick={() => handleDayClick(dayData)}
              style={{ cursor: hasEvent ? 'pointer' : 'default' }}
            >
              {dayData.date && (
                <>
                  <span className={styles.dayNumber}>{dayData.date.getDate()}</span>
                  {hasEvent && (
                    <span className={styles.qualityDot} />
                  )}
                </>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* 선택된 날짜 상세 정보 */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            className={styles.dayDetail}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className={styles.dayDetailHeader}>
              <span className={styles.dayDetailDate}>
                {new Date(selectedDay.date).toLocaleDateString('ko-KR', {
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                })}
              </span>
              <span className={`${styles.qualityBadge} ${styles[selectedDay.quality]}`}>
                {QUALITY_LABELS[selectedDay.quality]}
              </span>
            </div>
            {selectedDay.score && (
              <div className={styles.dayDetailScore}>
                종합 점수: <strong>{selectedDay.score}점</strong>
              </div>
            )}
            {selectedDay.reason && (
              <p className={styles.dayDetailReason}>{selectedDay.reason}</p>
            )}
            <button
              className={styles.closeDetailBtn}
              onClick={() => setSelectedDay(null)}
            >
              닫기
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 범례 */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.excellent}`} />
          <span>최상</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.good}`} />
          <span>좋음</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.neutral}`} />
          <span>보통</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.caution}`} />
          <span>주의</span>
        </div>
      </div>
    </div>
  );
}

export default CalendarView;
