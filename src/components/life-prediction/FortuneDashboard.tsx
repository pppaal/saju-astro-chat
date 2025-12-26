'use client';

import React, { useState, useMemo } from 'react';
import styles from './FortuneDashboard.module.css';

interface YearlyScore {
  year: number;
  age: number;
  score: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  sibsin: string;
  themes: string[];
  opportunities: string[];
  challenges: string[];
  twelveStage?: { stage: string; energy: string };
}

interface DaeunTransition {
  year: number;
  age: number;
  description: string;
  impact: string;
}

interface MultiYearTrend {
  startYear: number;
  endYear: number;
  overallTrend: 'ascending' | 'descending' | 'stable' | 'volatile';
  peakYears: number[];
  lowYears: number[];
  yearlyScores: YearlyScore[];
  daeunTransitions: DaeunTransition[];
  summary: string;
}

interface FortuneDashboardProps {
  trend: MultiYearTrend;
  locale: 'ko' | 'en';
  onYearClick?: (year: number) => void;
}

// 상수 객체로 분리
const GRADE_COLORS: Record<string, string> = {
  S: '#ffd700',
  A: '#a78bfa',
  B: '#60a5fa',
  C: '#4ade80',
  D: '#fb923c',
  F: '#f87171',
};

const TREND_ICONS: Record<string, string> = {
  ascending: '📈',
  descending: '📉',
  stable: '➡️',
  volatile: '📊',
};

const TREND_LABELS: Record<string, { ko: string; en: string }> = {
  ascending: { ko: '상승세', en: 'Rising' },
  descending: { ko: '하강세', en: 'Declining' },
  stable: { ko: '안정적', en: 'Stable' },
  volatile: { ko: '변동적', en: 'Volatile' },
};

export default function FortuneDashboard({ trend, locale, onYearClick }: FortuneDashboardProps) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const currentYear = new Date().getFullYear();

  // O(1) 조회를 위한 Map 캐싱
  const transitionMap = useMemo(
    () => new Map(trend.daeunTransitions.map(t => [t.year, t])),
    [trend.daeunTransitions]
  );

  const peakYearSet = useMemo(() => new Set(trend.peakYears), [trend.peakYears]);
  const lowYearSet = useMemo(() => new Set(trend.lowYears), [trend.lowYears]);

  const handleYearClick = (year: number) => {
    setSelectedYear(year === selectedYear ? null : year);
    onYearClick?.(year);
  };

  const getGradeColor = (grade: string) => GRADE_COLORS[grade] ?? '#9ca3af';
  const getTrendIcon = (t: string) => TREND_ICONS[t] ?? '📊';
  const getTrendLabel = (t: string) => TREND_LABELS[t]?.[locale] ?? (locale === 'ko' ? '분석중' : 'Analyzing');

  const selectedYearData = trend.yearlyScores.find(y => y.year === selectedYear);

  return (
    <div className={styles.dashboard}>
      {/* Header Summary */}
      <div className={styles.header}>
        <div className={styles.trendSummary}>
          <span className={styles.trendIcon}>{getTrendIcon(trend.overallTrend)}</span>
          <div className={styles.trendInfo}>
            <span className={styles.trendLabel}>
              {locale === 'ko' ? '전체 흐름' : 'Overall Trend'}
            </span>
            <span className={styles.trendValue}>{getTrendLabel(trend.overallTrend)}</span>
          </div>
        </div>

        <div className={styles.highlights}>
          <div className={styles.highlight}>
            <span className={styles.highlightIcon}>⭐</span>
            <span className={styles.highlightLabel}>
              {locale === 'ko' ? '최고의 해' : 'Peak Years'}
            </span>
            <span className={styles.highlightValue}>
              {trend.peakYears.slice(0, 2).join(', ')}
            </span>
          </div>
          {trend.daeunTransitions.length > 0 && (
            <div className={styles.highlight}>
              <span className={styles.highlightIcon}>🔄</span>
              <span className={styles.highlightLabel}>
                {locale === 'ko' ? '전환점' : 'Transition'}
              </span>
              <span className={styles.highlightValue}>
                {trend.daeunTransitions[0]?.year}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Year Timeline */}
      <div className={styles.timeline}>
        <div className={styles.timelineScroll}>
          {trend.yearlyScores.map((year) => {
            const isCurrentYear = year.year === currentYear;
            const isSelected = year.year === selectedYear;
            const isPeak = peakYearSet.has(year.year);
            const isLow = lowYearSet.has(year.year);
            const hasTransition = transitionMap.has(year.year);

            return (
              <button
                key={year.year}
                className={`${styles.yearCard} ${isCurrentYear ? styles.currentYear : ''} ${isSelected ? styles.selectedYear : ''} ${isPeak ? styles.peakYear : ''} ${isLow ? styles.lowYear : ''}`}
                onClick={() => handleYearClick(year.year)}
              >
                <div className={styles.yearHeader}>
                  <span className={styles.yearNumber}>{year.year}</span>
                  {hasTransition && <span className={styles.transitionBadge}>🔄</span>}
                </div>
                <div
                  className={styles.gradeCircle}
                  style={{ backgroundColor: getGradeColor(year.grade) }}
                >
                  {year.grade}
                </div>
                <div className={styles.scoreBar}>
                  <div
                    className={styles.scoreBarFill}
                    style={{
                      width: `${year.score}%`,
                      backgroundColor: getGradeColor(year.grade)
                    }}
                  />
                </div>
                <span className={styles.scoreValue}>{Math.round(year.score)}점</span>
                <span className={styles.ageLabel}>{year.age}세</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Year Detail */}
      {selectedYearData && (
        <div className={styles.yearDetail}>
          <div className={styles.detailHeader}>
            <h3 className={styles.detailTitle}>
              {selectedYearData.year}년 ({selectedYearData.age}세)
            </h3>
            <span
              className={styles.detailGrade}
              style={{ backgroundColor: getGradeColor(selectedYearData.grade) }}
            >
              {selectedYearData.grade}등급
            </span>
          </div>

          <div className={styles.detailGrid}>
            <div className={styles.detailSection}>
              <h4 className={styles.sectionTitle}>
                {locale === 'ko' ? '🎯 십신/운세' : '🎯 Fortune'}
              </h4>
              <p className={styles.sectionContent}>
                {selectedYearData.sibsin}
                {selectedYearData.twelveStage && ` • ${selectedYearData.twelveStage.stage}`}
              </p>
            </div>

            {selectedYearData.opportunities.length > 0 && (
              <div className={styles.detailSection}>
                <h4 className={styles.sectionTitle}>
                  {locale === 'ko' ? '💡 기회' : '💡 Opportunities'}
                </h4>
                <ul className={styles.sectionList}>
                  {selectedYearData.opportunities.slice(0, 2).map((opp, i) => (
                    <li key={i}>{opp}</li>
                  ))}
                </ul>
              </div>
            )}

            {selectedYearData.challenges.length > 0 && (
              <div className={styles.detailSection}>
                <h4 className={styles.sectionTitle}>
                  {locale === 'ko' ? '⚠️ 주의' : '⚠️ Cautions'}
                </h4>
                <ul className={styles.sectionList}>
                  {selectedYearData.challenges.slice(0, 2).map((ch, i) => (
                    <li key={i}>{ch}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Transition info if exists */}
          {transitionMap.has(selectedYearData.year) && (
            <div className={styles.transitionInfo}>
              <span className={styles.transitionIcon}>🔄</span>
              <span className={styles.transitionText}>
                {transitionMap.get(selectedYearData.year)?.description}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div className={styles.summarySection}>
        <p className={styles.summaryText}>{trend.summary}</p>
      </div>
    </div>
  );
}
