"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
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

export default function DestinyCalendar() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t, locale } = useI18n();

  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<EventCategory | "all">("all");
  const [selectedDate, setSelectedDate] = useState<ImportantDate | null>(null);

  // 생년월일 입력 폼
  const [needsBirthInfo, setNeedsBirthInfo] = useState(true);
  const [birthInfo, setBirthInfo] = useState<BirthInfo>({
    birthDate: "",
    birthTime: "12:00",
    birthPlace: "Seoul",
  });
  const [submitting, setSubmitting] = useState(false);

  // 월 이름 번역
  const MONTHS = locale === "ko"
    ? ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"]
    : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const getCategoryLabel = (cat: EventCategory) => t(`calendar.categories.${cat}`);

  const fetchCalendar = useCallback(async (birthData?: BirthInfo) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ year: String(year), locale });
      if (activeCategory !== "all") {
        params.set("category", activeCategory);
      }

      // 생년월일 정보 추가
      if (birthData) {
        params.set("birthDate", birthData.birthDate);
        params.set("birthTime", birthData.birthTime);
        params.set("birthPlace", birthData.birthPlace);
      }

      const res = await fetch(`/api/calendar?${params}`);
      const json = await res.json();

      if (!res.ok) {
        if (json.error === "Profile required") {
          setNeedsBirthInfo(true);
        } else {
          setError(json.error || json.message || "Failed to load calendar");
        }
      } else {
        setData(json);
        setNeedsBirthInfo(false);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  }, [year, activeCategory, locale]);

  // 처음 로드시 저장된 프로필이 있는지 체크
  useEffect(() => {
    if (status === "authenticated") {
      fetchCalendar();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status]);

  // 연도나 카테고리 변경시 (생년월일 입력 후)
  useEffect(() => {
    if (!needsBirthInfo && data) {
      fetchCalendar(birthInfo.birthDate ? birthInfo : undefined);
    }
  }, [year, activeCategory]);

  const handleBirthInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!birthInfo.birthDate) return;
    setSubmitting(true);
    fetchCalendar(birthInfo);
  };

  const groupByMonth = (dates: ImportantDate[]): Record<number, ImportantDate[]> => {
    const grouped: Record<number, ImportantDate[]> = {};
    dates.forEach(d => {
      const month = new Date(d.date).getMonth();
      if (!grouped[month]) grouped[month] = [];
      grouped[month].push(d);
    });
    return grouped;
  };

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
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

  // 비로그인 상태
  if (status === "unauthenticated") {
    return (
      <div className={styles.container}>
        <div className={styles.authGate}>
          <div className={styles.authIcon}>🗓️</div>
          <h1 className={styles.authTitle}>
            {locale === "ko" ? "운명 캘린더" : "Destiny Calendar"}
          </h1>
          <p className={styles.authDesc}>
            {locale === "ko"
              ? "사주와 점성술을 교차 분석하여 당신만의 중요한 날짜를 알려드립니다."
              : "Cross-analyze Saju and Astrology to reveal your important dates."}
          </p>
          <p className={styles.authSubDesc}>
            {locale === "ko"
              ? "로그인 후 생년월일을 입력하면 이용할 수 있습니다."
              : "Sign in and enter your birth info to access."}
          </p>
          <button
            className={styles.authBtn}
            onClick={() => router.push("/myjourney")}
          >
            {locale === "ko" ? "로그인하기" : "Sign In"} →
          </button>
          <div className={styles.featureList}>
            <span className={styles.featureItem}>🌟 {locale === "ko" ? "최고의 날 분석" : "Best Days"}</span>
            <span className={styles.featureItem}>⚠️ {locale === "ko" ? "주의 날짜" : "Caution Days"}</span>
            <span className={styles.featureItem}>💼 {locale === "ko" ? "카테고리별 필터" : "Category Filter"}</span>
          </div>
        </div>
      </div>
    );
  }

  // 로딩 중 (세션 확인)
  if (status === "loading") {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p style={{ marginTop: 16, color: "#888" }}>
            {locale === "ko" ? "로딩 중..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  // 생년월일 입력 폼
  if (needsBirthInfo && !loading) {
    return (
      <div className={styles.container}>
        <div className={styles.authGate}>
          <div className={styles.authIcon}>🎂</div>
          <h1 className={styles.authTitle}>
            {locale === "ko" ? "생년월일을 입력하세요" : "Enter Your Birth Info"}
          </h1>
          <p className={styles.authDesc}>
            {locale === "ko"
              ? "사주와 점성술 교차 분석으로 당신에게 중요한 날짜를 찾아드립니다."
              : "We'll find your important dates through Saju & Astrology cross-analysis."}
          </p>

          <form onSubmit={handleBirthInfoSubmit} className={styles.birthForm}>
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
              className={styles.authBtn}
              disabled={submitting || !birthInfo.birthDate}
            >
              {submitting
                ? (locale === "ko" ? "분석 중..." : "Analyzing...")
                : (locale === "ko" ? "캘린더 보기" : "View Calendar")} →
            </button>
          </form>

          <div className={styles.featureList}>
            <span className={styles.featureItem}>🌟 {locale === "ko" ? "최고의 날" : "Best Days"}</span>
            <span className={styles.featureItem}>⚠️ {locale === "ko" ? "주의 날짜" : "Caution Days"}</span>
            <span className={styles.featureItem}>📊 {locale === "ko" ? "사주+점성술" : "Saju+Astro"}</span>
          </div>
        </div>
      </div>
    );
  }

  // 로딩 중 (캘린더 데이터)
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p style={{ marginTop: 16, color: "#888" }}>
            {locale === "ko" ? "운명 분석 중..." : "Analyzing destiny..."}
          </p>
        </div>
      </div>
    );
  }

  // 에러
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>😢</div>
          <p>{error}</p>
          <button
            className={styles.authBtn}
            style={{ marginTop: "1.5rem" }}
            onClick={() => setNeedsBirthInfo(true)}
          >
            {locale === "ko" ? "다시 시도" : "Retry"}
          </button>
        </div>
      </div>
    );
  }

  const allDates = data?.allDates || [];
  const monthlyGroups = groupByMonth(allDates);

  const CATEGORIES: EventCategory[] = ["wealth", "career", "love", "health", "travel", "study", "general"];

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>
          🗓️ {t("calendar.title")}
        </h1>
        <div className={styles.yearNav}>
          <button
            className={styles.yearBtn}
            onClick={() => setYear(y => y - 1)}
          >
            ◀
          </button>
          <span className={styles.yearDisplay}>{year}</span>
          <button
            className={styles.yearBtn}
            onClick={() => setYear(y => y + 1)}
          >
            ▶
          </button>
        </div>
      </div>

      {/* Category Filters */}
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

      {/* Summary */}
      {data?.summary && (
        <div className={styles.section}>
          <p style={{ color: "#aaa", marginBottom: 16 }}>
            {locale === "ko" ? "총" : "Total"} <strong style={{ color: "#fff" }}>{data.summary.total}</strong> {locale === "ko" ? "개의 중요 날짜" : "important dates"} |
            🌟 {locale === "ko" ? "최상" : "Best"} <strong style={{ color: "#eab308" }}>{data.summary.grade1}</strong> |
            ⭐ {locale === "ko" ? "좋음" : "Good"} <strong style={{ color: "#22c55e" }}>{data.summary.grade2}</strong> |
            ⚠️ {locale === "ko" ? "주의" : "Caution"} <strong style={{ color: "#ef4444" }}>{data.summary.grade3}</strong>
          </p>
        </div>
      )}

      {/* Top Dates Section */}
      {data?.topDates && data.topDates.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            🌟 {year} {locale === "ko" ? "최고의 날들" : "Best Days"}
          </h2>
          <div className={styles.datesList}>
            {data.topDates.map((d, i) => (
              <div
                key={i}
                className={`${styles.dateCard} ${styles.grade1}`}
                onClick={() => setSelectedDate(d)}
              >
                <div className={styles.cardHeader}>
                  <span className={styles.cardDate}>{formatDate(d.date)}</span>
                  <span className={styles.cardGrade}>{getGradeEmoji(d.grade)}</span>
                </div>
                <div className={styles.cardTitle}>{d.title}</div>
                <div className={styles.cardDesc}>{d.description}</div>
                <div className={styles.cardCategories}>
                  {d.categories.map(cat => (
                    <span key={cat} className={`${styles.categoryTag} ${styles[cat]}`}>
                      {CATEGORY_EMOJI[cat]} {getCategoryLabel(cat)}
                    </span>
                  ))}
                </div>
                <div className={styles.scoreBar}>
                  <div
                    className={`${styles.scoreFill} ${getScoreClass(d.score)}`}
                    style={{ width: `${d.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Caution Dates Section */}
      {data?.cautionDates && data.cautionDates.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            ⚠️ {locale === "ko" ? "주의가 필요한 날" : "Days Requiring Caution"}
          </h2>
          <div className={styles.datesList}>
            {data.cautionDates.slice(0, 5).map((d, i) => (
              <div
                key={i}
                className={`${styles.dateCard} ${styles.grade3}`}
                onClick={() => setSelectedDate(d)}
              >
                <div className={styles.cardHeader}>
                  <span className={styles.cardDate}>{formatDate(d.date)}</span>
                  <span className={styles.cardGrade}>{getGradeEmoji(d.grade)}</span>
                </div>
                <div className={styles.cardTitle}>{d.title}</div>
                <div className={styles.cardDesc}>{d.description}</div>
                <div className={styles.cardFactors}>
                  {d.warnings.length > 0 && (
                    <span>{d.warnings[0]}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Calendar Grid */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          📅 {locale === "ko" ? "월별 중요 날짜" : "Important Dates by Month"}
        </h2>
        <div className={styles.calendarGrid}>
          {MONTHS.map((monthName, monthIndex) => {
            const monthDates = monthlyGroups[monthIndex] || [];

            return (
              <div key={monthIndex} className={styles.monthCard}>
                <div className={styles.monthHeader}>{monthName}</div>
                <div className={styles.monthDates}>
                  {monthDates.length === 0 ? (
                    <div style={{ color: "#666", fontSize: "0.875rem", textAlign: "center", padding: 8 }}>
                      {locale === "ko" ? "특별한 날 없음" : "No special days"}
                    </div>
                  ) : (
                    monthDates.slice(0, 5).map((d, i) => (
                      <div
                        key={i}
                        className={`${styles.dateItem} ${styles[`grade${d.grade}`]}`}
                        onClick={() => setSelectedDate(d)}
                      >
                        <span className={styles.dateDay}>
                          {new Date(d.date).getDate()}{locale === "ko" ? "일" : ""}
                        </span>
                        <span className={styles.dateInfo}>
                          {d.categories.slice(0, 2).map(c => CATEGORY_EMOJI[c]).join(" ")}
                        </span>
                        <span className={styles.gradeIcon}>
                          {getGradeEmoji(d.grade)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Date Detail Modal */}
      {selectedDate && (
        <div className={styles.modal} onClick={() => setSelectedDate(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {getGradeEmoji(selectedDate.grade)} {formatDate(selectedDate.date)}
              </h3>
              <button className={styles.closeBtn} onClick={() => setSelectedDate(null)}>
                ×
              </button>
            </div>

            <div className={styles.cardTitle}>{selectedDate.title}</div>
            <div className={styles.cardDesc}>{selectedDate.description}</div>

            <div className={styles.cardCategories}>
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
            <div style={{ color: "#888", fontSize: "0.75rem", marginTop: 4 }}>
              {locale === "ko" ? "점수" : "Score"}: {selectedDate.score}/100
            </div>

            {selectedDate.sajuFactors.length > 0 && (
              <div className={styles.modalSection}>
                <div className={styles.modalLabel}>{locale === "ko" ? "사주 분석" : "Saju Analysis"}</div>
                <ul className={styles.modalList}>
                  {selectedDate.sajuFactors.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            {selectedDate.astroFactors.length > 0 && (
              <div className={styles.modalSection}>
                <div className={styles.modalLabel}>{locale === "ko" ? "점성술 분석" : "Astrology Analysis"}</div>
                <ul className={styles.modalList}>
                  {selectedDate.astroFactors.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            {selectedDate.recommendations.length > 0 && (
              <div className={styles.modalSection}>
                <div className={styles.modalLabel}>{locale === "ko" ? "추천 활동" : "Recommendations"}</div>
                <ul className={styles.modalList}>
                  {selectedDate.recommendations.map((r, i) => (
                    <li key={i} className="recommendation">✅ {r}</li>
                  ))}
                </ul>
              </div>
            )}

            {selectedDate.warnings.length > 0 && (
              <div className={styles.modalSection}>
                <div className={styles.modalLabel}>{locale === "ko" ? "주의사항" : "Warnings"}</div>
                <ul className={styles.modalList}>
                  {selectedDate.warnings.map((w, i) => (
                    <li key={i} className="warning">⚠️ {w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
