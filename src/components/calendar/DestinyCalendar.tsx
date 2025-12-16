"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import BackButton from "@/components/ui/BackButton";
import styles from "./DestinyCalendar.module.css";

type EventCategory = "wealth" | "career" | "love" | "health" | "travel" | "study" | "general";
type ImportanceGrade = 1 | 2 | 3;

interface ImportantDate {
  date: string;
  grade: ImportanceGrade;
  score: number;
  categories: EventCategory[];
  title: string;
  description: string;
  sajuFactors: string[];
  astroFactors: string[];
  recommendations: string[];
  warnings: string[];
}

interface CalendarData {
  success: boolean;
  year: number;
  summary?: {
    total: number;
    grade1: number;
    grade2: number;
    grade3: number;
  };
  topDates?: ImportantDate[];
  goodDates?: ImportantDate[];
  cautionDates?: ImportantDate[];
  allDates?: ImportantDate[];
  error?: string;
}

interface BirthInfo {
  birthDate: string;
  birthTime: string;
  birthPlace: string;
}

const CATEGORY_EMOJI: Record<EventCategory, string> = {
  wealth: "💰",
  career: "💼",
  love: "💕",
  health: "💪",
  travel: "✈️",
  study: "📚",
  general: "⭐",
};

const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DestinyCalendar() {
  const { locale } = useI18n();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<EventCategory | "all">("all");
  const [selectedDate, setSelectedDate] = useState<ImportantDate | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // 생년월일 입력
  const [birthInfo, setBirthInfo] = useState<BirthInfo>({
    birthDate: "",
    birthTime: "12:00",
    birthPlace: "Seoul",
  });
  const [hasBirthInfo, setHasBirthInfo] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const WEEKDAYS = locale === "ko" ? WEEKDAYS_KO : WEEKDAYS_EN;
  const MONTHS = locale === "ko"
    ? ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"]
    : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const getCategoryLabel = (cat: EventCategory) => {
    const labels: Record<EventCategory, Record<string, string>> = {
      wealth: { ko: "재물", en: "Wealth" },
      career: { ko: "직장", en: "Career" },
      love: { ko: "연애", en: "Love" },
      health: { ko: "건강", en: "Health" },
      travel: { ko: "여행", en: "Travel" },
      study: { ko: "학업", en: "Study" },
      general: { ko: "전반", en: "General" },
    };
    return labels[cat][locale] || labels[cat]["en"];
  };

  // 월의 날짜 배열 생성
  const getMonthDays = () => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: (Date | null)[] = [];

    // 이전 달의 빈 칸
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // 현재 달의 날짜
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const fetchCalendar = useCallback(async (birthData: BirthInfo) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ year: String(year), locale });
      if (activeCategory !== "all") {
        params.set("category", activeCategory);
      }
      params.set("birthDate", birthData.birthDate);
      params.set("birthTime", birthData.birthTime);
      params.set("birthPlace", birthData.birthPlace);

      const res = await fetch(`/api/calendar?${params}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || json.message || "Failed to load calendar");
      } else {
        setData(json);
        setHasBirthInfo(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading calendar");
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  }, [year, activeCategory, locale]);

  // 연도/카테고리 변경시 다시 fetch
  useEffect(() => {
    if (hasBirthInfo && birthInfo.birthDate) {
      fetchCalendar(birthInfo);
    }
  }, [year, activeCategory, hasBirthInfo, birthInfo, fetchCalendar]);

  const handleBirthInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!birthInfo.birthDate) return;
    setSubmitting(true);
    fetchCalendar(birthInfo);
  };

  const getDateInfo = (date: Date): ImportantDate | undefined => {
    if (!data?.allDates) return undefined;
    const dateStr = date.toISOString().split("T")[0];
    return data.allDates.find(d => d.date === dateStr);
  };

  const getDayClassName = (date: Date | null): string => {
    if (!date) return styles.emptyDay;

    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    const isSelected = selectedDay &&
      date.getDate() === selectedDay.getDate() &&
      date.getMonth() === selectedDay.getMonth() &&
      date.getFullYear() === selectedDay.getFullYear();

    const dateInfo = getDateInfo(date);

    let className = styles.day;
    if (isToday) className += ` ${styles.today}`;
    if (isSelected) className += ` ${styles.selected}`;
    if (dateInfo) {
      className += ` ${styles[`dayGrade${dateInfo.grade}`]}`;
    }
    if (date.getDay() === 0) className += ` ${styles.sunday}`;
    if (date.getDay() === 6) className += ` ${styles.saturday}`;

    return className;
  };

  const handleDayClick = (date: Date | null) => {
    if (!date) return;
    setSelectedDay(date);
    const info = getDateInfo(date);
    if (info) {
      setSelectedDate(info);
    } else {
      setSelectedDate(null);
    }
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getGradeEmoji = (grade: ImportanceGrade): string => {
    switch (grade) {
      case 1: return "🌟";
      case 2: return "⭐";
      case 3: return "⚠️";
    }
  };

  const getScoreClass = (score: number): string => {
    if (score >= 70) return styles.high;
    if (score >= 50) return styles.medium;
    return styles.low;
  };

  const days = getMonthDays();

  // 생년월일 입력 폼 (로그인 불필요!)
  if (!hasBirthInfo) {
    return (
      <div className={styles.container}>
        <BackButton />
        <div className={styles.welcomeSection}>
          <div className={styles.calendarIconBig}>📅</div>
          <h1 className={styles.welcomeTitle}>
            {locale === "ko" ? "운명 캘린더" : "Destiny Calendar"}
          </h1>
          <p className={styles.welcomeDesc}>
            {locale === "ko"
              ? "사주와 점성술을 교차 분석하여\n당신만의 중요한 날짜를 찾아드립니다"
              : "Cross-analyze Saju and Astrology\nto find your important dates"}
          </p>

          <form onSubmit={handleBirthInfoSubmit} className={styles.birthForm}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  {locale === "ko" ? "생년월일" : "Birth Date"} *
                </label>
                <input
                  type="date"
                  className={styles.formInput}
                  value={birthInfo.birthDate}
                  onChange={(e) => setBirthInfo({ ...birthInfo, birthDate: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  {locale === "ko" ? "출생 시간" : "Birth Time"}
                </label>
                <input
                  type="time"
                  className={styles.formInput}
                  value={birthInfo.birthTime}
                  onChange={(e) => setBirthInfo({ ...birthInfo, birthTime: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                {locale === "ko" ? "출생 장소" : "Birth Place"}
              </label>
              <select
                className={styles.formInput}
                value={birthInfo.birthPlace}
                onChange={(e) => setBirthInfo({ ...birthInfo, birthPlace: e.target.value })}
              >
                <option value="Seoul">Seoul, Korea</option>
                <option value="Busan">Busan, Korea</option>
                <option value="Tokyo">Tokyo, Japan</option>
                <option value="New York">New York, USA</option>
                <option value="Los Angeles">Los Angeles, USA</option>
                <option value="London">London, UK</option>
                <option value="Paris">Paris, France</option>
                <option value="Beijing">Beijing, China</option>
                <option value="Shanghai">Shanghai, China</option>
              </select>
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={submitting || !birthInfo.birthDate}
            >
              {submitting
                ? (locale === "ko" ? "분석 중..." : "Analyzing...")
                : (locale === "ko" ? "캘린더 보기" : "View Calendar")}
            </button>
          </form>

          <div className={styles.features}>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}>🌟</span>
              <span>{locale === "ko" ? "최고의 날 분석" : "Best Days"}</span>
            </div>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}>⚠️</span>
              <span>{locale === "ko" ? "주의 날짜" : "Caution Days"}</span>
            </div>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}>📊</span>
              <span>{locale === "ko" ? "사주+점성술" : "Saju + Astro"}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 로딩 중
  if (loading) {
    return (
      <div className={styles.container}>
        <BackButton />
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>{locale === "ko" ? "운명 분석 중..." : "Analyzing destiny..."}</p>
        </div>
      </div>
    );
  }

  // 에러
  if (error) {
    return (
      <div className={styles.container}>
        <BackButton />
        <div className={styles.errorState}>
          <div className={styles.errorIcon}>😢</div>
          <p>{error}</p>
          <button
            className={styles.retryBtn}
            onClick={() => setHasBirthInfo(false)}
          >
            {locale === "ko" ? "다시 시도" : "Retry"}
          </button>
        </div>
      </div>
    );
  }

  const CATEGORIES: EventCategory[] = ["wealth", "career", "love", "health", "travel", "study"];

  return (
    <div className={styles.container}>
      <BackButton />

      {/* 헤더 */}
      <div className={styles.calendarHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.calendarTitle}>
            📅 {locale === "ko" ? "운명 캘린더" : "Destiny Calendar"}
          </h1>
          <button className={styles.editBirthBtn} onClick={() => setHasBirthInfo(false)}>
            ✏️ {locale === "ko" ? "생일 수정" : "Edit Birth"}
          </button>
        </div>

        {/* Summary */}
        {data?.summary && (
          <div className={styles.summaryBadges}>
            <span className={styles.summaryBadge}>
              🌟 {data.summary.grade1}
            </span>
            <span className={styles.summaryBadge}>
              ⭐ {data.summary.grade2}
            </span>
            <span className={styles.summaryBadge}>
              ⚠️ {data.summary.grade3}
            </span>
          </div>
        )}
      </div>

      {/* 월 네비게이션 */}
      <div className={styles.monthNav}>
        <button className={styles.navBtn} onClick={prevMonth}>◀</button>
        <div className={styles.monthDisplay}>
          <span className={styles.monthYear}>{year}</span>
          <span className={styles.monthName}>{MONTHS[month]}</span>
        </div>
        <button className={styles.navBtn} onClick={nextMonth}>▶</button>
        <button className={styles.todayBtn} onClick={goToToday}>
          {locale === "ko" ? "오늘" : "Today"}
        </button>
      </div>

      {/* 카테고리 필터 */}
      <div className={styles.filters}>
        <button
          className={`${styles.filterBtn} ${activeCategory === "all" ? styles.active : ""}`}
          onClick={() => setActiveCategory("all")}
        >
          {locale === "ko" ? "전체" : "All"}
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`${styles.filterBtn} ${activeCategory === cat ? styles.active : ""}`}
            onClick={() => setActiveCategory(cat)}
          >
            {CATEGORY_EMOJI[cat]} {getCategoryLabel(cat)}
          </button>
        ))}
      </div>

      {/* 캘린더 그리드 */}
      <div className={styles.calendarWrapper}>
        {/* 요일 헤더 */}
        <div className={styles.weekdaysHeader}>
          {WEEKDAYS.map((day, idx) => (
            <div
              key={day}
              className={`${styles.weekdayCell} ${idx === 0 ? styles.sunday : ""} ${idx === 6 ? styles.saturday : ""}`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className={styles.daysGrid}>
          {days.map((date, idx) => {
            const dateInfo = date ? getDateInfo(date) : undefined;
            return (
              <div
                key={idx}
                className={getDayClassName(date)}
                onClick={() => handleDayClick(date)}
              >
                {date && (
                  <>
                    <span className={styles.dayNumber}>{date.getDate()}</span>
                    {dateInfo && (
                      <div className={styles.dayIndicators}>
                        {dateInfo.categories.slice(0, 2).map((cat, i) => (
                          <span key={i} className={styles.dayEmoji}>{CATEGORY_EMOJI[cat]}</span>
                        ))}
                        <span className={styles.gradeIndicator}>
                          {getGradeEmoji(dateInfo.grade)}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 범례 */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.grade1Dot}`}></span>
          <span>{locale === "ko" ? "최고의 날" : "Best Day"}</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.grade2Dot}`}></span>
          <span>{locale === "ko" ? "좋은 날" : "Good Day"}</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.grade3Dot}`}></span>
          <span>{locale === "ko" ? "주의 날" : "Caution Day"}</span>
        </div>
      </div>

      {/* 선택된 날짜 정보 */}
      {selectedDay && (
        <div className={styles.selectedDayInfo}>
          <div className={styles.selectedDayHeader}>
            <span className={styles.selectedDayDate}>
              {selectedDay.getMonth() + 1}/{selectedDay.getDate()}
              {locale === "ko" && ` (${WEEKDAYS[selectedDay.getDay()]})`}
            </span>
            {selectedDate && (
              <span className={styles.selectedGrade}>{getGradeEmoji(selectedDate.grade)}</span>
            )}
          </div>

          {selectedDate ? (
            <div className={styles.selectedDayContent}>
              <h3 className={styles.selectedTitle}>{selectedDate.title}</h3>
              <p className={styles.selectedDesc}>{selectedDate.description}</p>

              <div className={styles.selectedCategories}>
                {selectedDate.categories.map(cat => (
                  <span key={cat} className={`${styles.categoryTag} ${styles[cat]}`}>
                    {CATEGORY_EMOJI[cat]} {getCategoryLabel(cat)}
                  </span>
                ))}
              </div>

              <div className={styles.scoreBar}>
                <div
                  className={`${styles.scoreFill} ${getScoreClass(selectedDate.score)}`}
                  style={{ width: `${selectedDate.score}%` }}
                />
              </div>
              <span className={styles.scoreText}>
                {locale === "ko" ? "점수" : "Score"}: {selectedDate.score}/100
              </span>

              {selectedDate.recommendations.length > 0 && (
                <div className={styles.infoSection}>
                  <h4>{locale === "ko" ? "✅ 추천 활동" : "✅ Recommendations"}</h4>
                  <ul>
                    {selectedDate.recommendations.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedDate.warnings.length > 0 && (
                <div className={styles.infoSection}>
                  <h4>{locale === "ko" ? "⚠️ 주의사항" : "⚠️ Warnings"}</h4>
                  <ul>
                    {selectedDate.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className={styles.noSpecialDay}>
              {locale === "ko" ? "특별한 운세 정보가 없는 날입니다" : "No special fortune info for this day"}
            </p>
          )}
        </div>
      )}

      {/* 이번 달 중요 날짜 요약 */}
      {data?.topDates && data.topDates.length > 0 && (
        <div className={styles.monthHighlights}>
          <h2 className={styles.highlightsTitle}>
            🌟 {year} {MONTHS[month]} {locale === "ko" ? "주요 날짜" : "Highlights"}
          </h2>
          <div className={styles.highlightsList}>
            {data.topDates
              .filter(d => new Date(d.date).getMonth() === month)
              .slice(0, 5)
              .map((d, i) => (
                <div
                  key={i}
                  className={`${styles.highlightCard} ${styles[`grade${d.grade}`]}`}
                  onClick={() => {
                    setSelectedDay(new Date(d.date));
                    setSelectedDate(d);
                  }}
                >
                  <span className={styles.highlightDate}>
                    {new Date(d.date).getDate()}{locale === "ko" ? "일" : ""}
                  </span>
                  <span className={styles.highlightTitle}>{d.title}</span>
                  <span className={styles.highlightEmojis}>
                    {d.categories.slice(0, 2).map(c => CATEGORY_EMOJI[c]).join(" ")}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
