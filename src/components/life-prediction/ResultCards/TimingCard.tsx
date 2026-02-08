'use client'

import React from 'react'
import { motion } from 'framer-motion'
import styles from './ResultCards.module.css'
import {
  cardVariants,
  badgeVariants,
  scoreBarVariants,
  reasonVariants,
} from '../animations/cardAnimations'

export interface TimingPeriod {
  startDate: string
  endDate: string
  score: number
  grade: 'S' | 'A+' | 'A' | 'B' | 'C' | 'D'
  reasons: string[]
  specificDays?: Array<{
    date: string
    quality: 'excellent' | 'good' | 'neutral'
    reason?: string
  }>
}

interface TimingCardProps {
  period: TimingPeriod
  rank: number
  onClick?: () => void
}

// 공유 상수
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const

// 등급별 라벨
const GRADE_LABELS: Record<string, string> = {
  S: '최적기',
  'A+': '매우 좋음',
  A: '좋음',
  B: '괜찮음',
  C: '보통',
  D: '주의',
}

// 등급별 스타일 키 (타입 안전)
type GradeStyleKey = 'gradeExcellent' | 'gradeGood' | 'gradeNeutral' | 'gradeCaution'
const GRADE_STYLE_KEYS: Record<string, GradeStyleKey> = {
  S: 'gradeExcellent',
  'A+': 'gradeExcellent',
  A: 'gradeGood',
  B: 'gradeNeutral',
  C: 'gradeCaution',
  D: 'gradeCaution',
}

// 점수별 바 스타일 키
type ScoreBarStyleKey = 'scoreBarHigh' | 'scoreBarMedium' | 'scoreBarLow'
function getScoreBarStyleKey(score: number): ScoreBarStyleKey {
  if (score >= 80) {
    return 'scoreBarHigh'
  }
  if (score >= 60) {
    return 'scoreBarMedium'
  }
  return 'scoreBarLow'
}

// 날짜 포맷팅 - 더 명확한 표시
function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const now = new Date()

  const startYear = start.getFullYear()
  const endYear = end.getFullYear()
  const startMonth = start.getMonth() + 1
  const startDay = start.getDate()
  const endMonth = end.getMonth() + 1
  const endDay = end.getDate()
  const currentYear = now.getFullYear()

  // Calculate relative timing
  const monthsFromNow = (startYear - currentYear) * 12 + (startMonth - (now.getMonth() + 1))
  let relativeText = ''
  if (monthsFromNow <= 0) {
    relativeText = ' (현재)'
  } else if (monthsFromNow <= 3) {
    relativeText = ` (${monthsFromNow}개월 후)`
  } else if (monthsFromNow <= 12) {
    relativeText = ` (올해)`
  } else if (monthsFromNow <= 24) {
    relativeText = ` (내년)`
  }

  // Format date range
  if (startYear === endYear) {
    if (startMonth === endMonth) {
      return `${startYear}년 ${startMonth}월 ${startDay}일 ~ ${endDay}일${relativeText}`
    }
    return `${startYear}년 ${startMonth}월 ${startDay}일 ~ ${endMonth}월 ${endDay}일${relativeText}`
  }
  return `${startYear}년 ${startMonth}월 ${startDay}일 ~ ${endYear}년 ${endMonth}월 ${endDay}일${relativeText}`
}

function formatSpecificDay(dateStr: string): string {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekday = WEEKDAYS[date.getDay()]
  return `${month}/${day}(${weekday})`
}

// rank 클래스 배열 (타입 안전)
const RANK_CLASSES = ['rank1', 'rank2', 'rank3'] as const

export const TimingCard = React.memo(function TimingCard({ period, rank, onClick }: TimingCardProps) {
  const rankClass = rank < 3 ? styles[RANK_CLASSES[rank]] : ''

  return (
    <motion.div
      className={`${styles.timingCard} ${rankClass}`}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      whileHover="hover"
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick()
        }
      }}
      role="article"
      tabIndex={onClick ? 0 : undefined}
      aria-label={`${rank + 1}순위 타이밍: ${formatDateRange(period.startDate, period.endDate)}, 점수 ${period.score}점, 등급 ${period.grade}`}
      layout
    >
      {/* 헤더: 순위 배지 + 날짜 정보 + 등급 */}
      <div className={styles.cardHeader}>
        <motion.div className={styles.rankBadge} variants={badgeVariants}>
          {rank + 1}
        </motion.div>

        <div className={styles.dateInfo}>
          <h3 className={styles.datePeriod}>{formatDateRange(period.startDate, period.endDate)}</h3>
          <p className={styles.dateLabel}>추천 기간</p>
        </div>

        <motion.span
          className={`${styles.gradeBadge} ${styles[GRADE_STYLE_KEYS[period.grade]]}`}
          variants={badgeVariants}
        >
          {period.grade}등급 ({GRADE_LABELS[period.grade]})
        </motion.span>
      </div>

      {/* 점수 바 */}
      <div className={styles.scoreSection}>
        <div className={styles.scoreHeader}>
          <span className={styles.scoreLabel}>종합 점수</span>
          <span className={styles.scoreValue}>{period.score}점</span>
        </div>
        <div className={styles.scoreBarContainer}>
          <motion.div
            className={`${styles.scoreBar} ${styles[getScoreBarStyleKey(period.score)]}`}
            variants={scoreBarVariants}
            custom={period.score}
          />
        </div>
      </div>

      {/* 이유 리스트 */}
      {period.reasons.length > 0 && (
        <div className={styles.reasonsSection}>
          <h4 className={styles.reasonsTitle}>분석 결과</h4>
          <motion.ul className={styles.reasonsList}>
            {period.reasons.slice(0, 4).map((reason, index) => (
              <motion.li
                key={index}
                className={styles.reasonItem}
                variants={reasonVariants}
                custom={index}
              >
                <span className={styles.reasonIcon}>✦</span>
                <span>{reason}</span>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      )}

      {/* 특정 추천일 */}
      {period.specificDays && period.specificDays.length > 0 && (
        <div className={styles.specificDays}>
          <h4 className={styles.specificDaysTitle}>특히 좋은 날</h4>
          <div className={styles.daysList}>
            {period.specificDays.slice(0, 5).map((day, index) => (
              <span
                key={index}
                className={`${styles.dayBadge} ${styles[day.quality]}`}
                title={day.reason}
              >
                {formatSpecificDay(day.date)}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
})

export default TimingCard
