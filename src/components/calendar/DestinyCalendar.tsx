"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { searchCities } from "@/lib/cities";
import tzLookup from "tz-lookup";
import { getUserProfile } from "@/lib/userProfile";
import BackButton from "@/components/ui/BackButton";
import styles from "./DestinyCalendar.module.css";

type EventCategory = "wealth" | "career" | "love" | "health" | "travel" | "study" | "general";
type ImportanceGrade = 1 | 2 | 3;
type CityHit = { name: string; country: string; lat: number; lon: number; timezone?: string };

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
  gender: 'Male' | 'Female';
  latitude?: number;
  longitude?: number;
  timezone?: string;
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

// 이모지 상수 (hydration 불일치 방지)
const ICONS = {
  calendar: "📅",
  clock: "🕐",
  globe: "🌍",
  gender: "⚧",
  star: "🌟",
  crystal: "🔮",
  sparkle: "✦",
} as const;

function extractCityPart(input: string) {
  const s = String(input || '').trim();
  const idx = s.indexOf(',');
  return (idx >= 0 ? s.slice(0, idx) : s).trim();
}

export default function DestinyCalendar() {
  const { locale, t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null!);

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
    birthTime: "",
    birthPlace: "",
    gender: "Male",
  });
  const [hasBirthInfo, setHasBirthInfo] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // City search
  const [suggestions, setSuggestions] = useState<CityHit[]>([]);
  const [selectedCity, setSelectedCity] = useState<CityHit | null>(null);
  const [openSug, setOpenSug] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [cityErr, setCityErr] = useState<string | null>(null);
  const [genderOpen, setGenderOpen] = useState(false);

  // Load saved profile on mount
  useEffect(() => {
    const profile = getUserProfile();
    if (profile.birthDate) setBirthInfo(prev => ({ ...prev, birthDate: profile.birthDate || '' }));
    if (profile.birthTime) setBirthInfo(prev => ({ ...prev, birthTime: profile.birthTime || '' }));
    if (profile.gender) setBirthInfo(prev => ({ ...prev, gender: profile.gender as 'Male' | 'Female' }));
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Particle animation (only for birth info form)
  useEffect(() => {
    if (hasBirthInfo) return; // Don't run when showing calendar

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const PARTICLE_COUNT = 60;
    const MAX_LINK_DISTANCE = 120;
    const PARTICLE_BASE_SPEED = 0.25;
    const PARTICLE_COLOR = '#63d2ff';

    interface Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;
      update: () => void;
      draw: () => void;
    }

    let particlesArray: Particle[] = [];
    let raf = 0;

    const mouse = {
      x: undefined as number | undefined,
      y: undefined as number | undefined,
      radius: 150,
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.x;
      mouse.y = e.y;
    };
    const handleMouseOut = () => {
      mouse.x = undefined;
      mouse.y = undefined;
    };
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      init();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseOut);
    window.addEventListener('resize', handleResize);

    class ParticleImpl implements Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 1;
        this.speedX = (Math.random() * 2 - 1) * PARTICLE_BASE_SPEED;
        this.speedY = (Math.random() * 2 - 1) * PARTICLE_BASE_SPEED;
        this.color = PARTICLE_COLOR;
      }

      update() {
        if (this.x > canvas.width || this.x < 0) this.speedX = -this.speedX;
        if (this.y > canvas.height || this.y < 0) this.speedY = -this.speedY;
        this.x += this.speedX;
        this.y += this.speedY;

        if (mouse.x !== undefined && mouse.y !== undefined) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < mouse.radius) {
            const forceDirectionX = dx / distance;
            const forceDirectionY = dy / distance;
            const force = (mouse.radius - distance) / mouse.radius;
            this.x -= forceDirectionX * force * 2;
            this.y -= forceDirectionY * force * 2;
          }
        }
      }

      draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function init() {
      particlesArray = [];
      let numberOfParticles = (canvas.height * canvas.width) / 18000;
      numberOfParticles = Math.min(numberOfParticles, PARTICLE_COUNT);
      for (let i = 0; i < numberOfParticles; i++) {
        particlesArray.push(new ParticleImpl());
      }
    }

    function connectParticles() {
      for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
          const dx = particlesArray[a].x - particlesArray[b].x;
          const dy = particlesArray[a].y - particlesArray[b].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < MAX_LINK_DISTANCE) {
            const opacity = 1 - distance / MAX_LINK_DISTANCE;
            ctx.strokeStyle = `rgba(99, 210, 255, ${opacity * 0.4})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
            ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
            ctx.stroke();
          }
        }
      }
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesArray.forEach((p) => {
        p.update();
        p.draw();
      });
      connectParticles();
      raf = requestAnimationFrame(animate);
    }

    init();
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('resize', handleResize);
    };
  }, [hasBirthInfo]);

  // City search effect
  useEffect(() => {
    const raw = birthInfo.birthPlace.trim();
    const q = extractCityPart(raw);
    if (q.length < 1) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const hits = (await searchCities(q, { limit: 8 })) as CityHit[];
        setSuggestions(hits);
        if (isUserTyping) {
          setOpenSug(hits.length > 0);
        }
      } catch {
        setSuggestions([]);
      }
    }, 120);
    return () => clearTimeout(timeout);
  }, [birthInfo.birthPlace, isUserTyping]);

  const onPickCity = (hit: CityHit) => {
    setIsUserTyping(false);
    setBirthInfo(prev => ({
      ...prev,
      birthPlace: `${hit.name}, ${hit.country}`,
      latitude: hit.lat,
      longitude: hit.lon,
      timezone: hit.timezone ?? tzLookup(hit.lat, hit.lon),
    }));
    setSelectedCity({
      ...hit,
      timezone: hit.timezone ?? tzLookup(hit.lat, hit.lon),
    });
    setOpenSug(false);
  };

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
    setCityErr(null);

    if (!birthInfo.birthDate) {
      setCityErr(locale === "ko" ? "생년월일을 입력해주세요" : "Please enter birth date");
      return;
    }
    if (!birthInfo.birthTime) {
      setCityErr(locale === "ko" ? "출생 시간을 입력해주세요" : "Please enter birth time");
      return;
    }
    if (!birthInfo.birthPlace) {
      setCityErr(locale === "ko" ? "출생 도시를 입력해주세요" : "Please enter birth city");
      return;
    }
    if (!selectedCity && !birthInfo.latitude) {
      setCityErr(locale === "ko" ? "목록에서 도시를 선택해주세요" : "Please select a city from the list");
      return;
    }
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

  // 생년월일 입력 폼 - Destiny Map 스타일
  if (!hasBirthInfo) {
    return (
      <div className={styles.introContainer}>
        <canvas ref={canvasRef} className={styles.particleCanvas} />
        <BackButton />

        <main className={styles.introMain}>
          <div className={styles.card}>
            <div className={styles.header}>
              <div className={styles.iconWrapper}>
                <span className={styles.icon}>{ICONS.calendar}</span>
              </div>
              <h1 className={styles.title}>
                {locale === "ko" ? "운명 캘린더" : "Destiny Calendar"}
              </h1>
              <p className={styles.subtitle}>
                {locale === "ko"
                  ? "사주와 점성술을 교차 분석하여 당신만의 중요한 날짜를 찾아드립니다"
                  : "Cross-analyze Saju and Astrology to find your important dates"}
              </p>
            </div>

            <form onSubmit={handleBirthInfoSubmit} className={styles.form}>
              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label className={styles.label}>
                    <span className={styles.labelIcon}>{ICONS.calendar}</span>
                    {locale === "ko" ? "생년월일" : "Birth Date"}
                  </label>
                  <input
                    type="date"
                    className={styles.input}
                    value={birthInfo.birthDate}
                    onChange={(e) => setBirthInfo({ ...birthInfo, birthDate: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>
                    <span className={styles.labelIcon}>{ICONS.clock}</span>
                    {locale === "ko" ? "출생 시간" : "Birth Time"}
                  </label>
                  <input
                    type="time"
                    className={styles.input}
                    value={birthInfo.birthTime}
                    onChange={(e) => setBirthInfo({ ...birthInfo, birthTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className={styles.grid2}>
                <div className={styles.field} style={{ position: 'relative' }}>
                  <label className={styles.label}>
                    <span className={styles.labelIcon}>{ICONS.globe}</span>
                    {locale === "ko" ? "출생 도시" : "Birth City"}
                  </label>
                  <input
                    className={styles.input}
                    placeholder={locale === "ko" ? "도시를 입력하세요" : "Enter your city"}
                    value={birthInfo.birthPlace}
                    onChange={(e) => {
                      setBirthInfo({ ...birthInfo, birthPlace: e.target.value });
                      setIsUserTyping(true);
                      setOpenSug(true);
                    }}
                    onBlur={() => {
                      setTimeout(() => setOpenSug(false), 150);
                      setIsUserTyping(false);
                    }}
                    autoComplete="off"
                    required
                  />
                  {openSug && suggestions.length > 0 && (
                    <ul className={styles.dropdown}>
                      {suggestions.map((s, idx) => (
                        <li
                          key={`${s.name}-${s.country}-${idx}`}
                          className={styles.dropdownItem}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            onPickCity(s);
                          }}
                        >
                          <span className={styles.cityName}>{s.name}</span>
                          <span className={styles.country}>{s.country}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>
                    <span className={styles.labelIcon}>{ICONS.gender}</span>
                    {locale === "ko" ? "성별" : "Gender"}
                  </label>
                  <div className={styles.genderSelectWrapper}>
                    <button
                      type="button"
                      className={`${styles.genderSelect} ${genderOpen ? styles.genderSelectOpen : ''}`}
                      onClick={() => setGenderOpen(!genderOpen)}
                      onBlur={() => setTimeout(() => setGenderOpen(false), 150)}
                    >
                      <span className={styles.genderIcon}>
                        {birthInfo.gender === 'Male' ? '♂' : '♀'}
                      </span>
                      <span className={styles.genderText}>
                        {birthInfo.gender === 'Male'
                          ? (locale === "ko" ? '남성' : 'Male')
                          : (locale === "ko" ? '여성' : 'Female')}
                      </span>
                      <span className={`${styles.genderArrow} ${genderOpen ? styles.genderArrowOpen : ''}`}>
                        ▾
                      </span>
                    </button>
                    {genderOpen && (
                      <div className={styles.genderDropdown}>
                        <button
                          type="button"
                          className={`${styles.genderOption} ${birthInfo.gender === 'Male' ? styles.genderOptionActive : ''}`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setBirthInfo({ ...birthInfo, gender: 'Male' });
                            setGenderOpen(false);
                          }}
                        >
                          <span className={styles.genderOptionIcon}>♂</span>
                          <span className={styles.genderOptionText}>{locale === "ko" ? '남성' : 'Male'}</span>
                          {birthInfo.gender === 'Male' && <span className={styles.genderCheck}>✓</span>}
                        </button>
                        <button
                          type="button"
                          className={`${styles.genderOption} ${birthInfo.gender === 'Female' ? styles.genderOptionActive : ''}`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setBirthInfo({ ...birthInfo, gender: 'Female' });
                            setGenderOpen(false);
                          }}
                        >
                          <span className={styles.genderOptionIcon}>♀</span>
                          <span className={styles.genderOptionText}>{locale === "ko" ? '여성' : 'Female'}</span>
                          {birthInfo.gender === 'Female' && <span className={styles.genderCheck}>✓</span>}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {cityErr && <div className={styles.error}>{cityErr}</div>}

              <button
                type="submit"
                className={styles.submitButton}
                disabled={submitting}
              >
                <span className={styles.buttonText}>
                  {submitting
                    ? (locale === "ko" ? "분석 중..." : "Analyzing...")
                    : (locale === "ko" ? "운명의 날 찾기" : "Find Your Destiny Days")}
                </span>
                <span className={styles.buttonIcon}>→</span>
              </button>
            </form>

            <div className={styles.features}>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>{ICONS.star}</span>
                <span className={styles.featureText}>
                  {locale === "ko" ? "최고의 날" : "Best Days"}
                </span>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>{ICONS.crystal}</span>
                <span className={styles.featureText}>
                  {locale === "ko" ? "사주 분석" : "Saju Analysis"}
                </span>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon}>{ICONS.sparkle}</span>
                <span className={styles.featureText}>
                  {locale === "ko" ? "점성술" : "Astrology"}
                </span>
              </div>
            </div>
          </div>
        </main>
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

              {/* 사주 분석 근거 */}
              {selectedDate.sajuFactors && selectedDate.sajuFactors.length > 0 && (
                <div className={styles.analysisSection}>
                  <h4 className={styles.analysisTitle}>
                    <span className={styles.analysisBadge}>🔮</span>
                    {locale === "ko" ? "사주 분석 근거" : "Saju Analysis"}
                  </h4>
                  <ul className={styles.analysisList}>
                    {selectedDate.sajuFactors.map((factor, i) => (
                      <li key={i} className={styles.analysisItem}>
                        <span className={styles.analysisDot}></span>
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 점성술 분석 근거 */}
              {selectedDate.astroFactors && selectedDate.astroFactors.length > 0 && (
                <div className={styles.analysisSection}>
                  <h4 className={styles.analysisTitle}>
                    <span className={styles.analysisBadge}>✦</span>
                    {locale === "ko" ? "점성술 분석 근거" : "Astrology Analysis"}
                  </h4>
                  <ul className={styles.analysisList}>
                    {selectedDate.astroFactors.map((factor, i) => (
                      <li key={i} className={styles.analysisItem}>
                        <span className={styles.analysisDot}></span>
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

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
                  <div className={styles.highlightHeader}>
                    <span className={styles.highlightDate}>
                      {new Date(d.date).getDate()}{locale === "ko" ? "일" : ""}
                    </span>
                    <div className={styles.highlightBadges}>
                      {d.sajuFactors && d.sajuFactors.length > 0 && (
                        <span className={styles.highlightBadge} title={locale === "ko" ? "사주 근거" : "Saju"}>🔮</span>
                      )}
                      {d.astroFactors && d.astroFactors.length > 0 && (
                        <span className={styles.highlightBadge} title={locale === "ko" ? "점성술 근거" : "Astrology"}>✦</span>
                      )}
                    </div>
                  </div>
                  <span className={styles.highlightTitle}>{d.title}</span>
                  <span className={styles.highlightEmojis}>
                    {d.categories.slice(0, 2).map(c => CATEGORY_EMOJI[c]).join(" ")}
                  </span>
                  {/* 간략한 이유 표시 */}
                  {(d.sajuFactors?.length > 0 || d.astroFactors?.length > 0) && (
                    <div className={styles.highlightReason}>
                      {d.sajuFactors?.[0]?.substring(0, 25) || d.astroFactors?.[0]?.substring(0, 25)}...
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
