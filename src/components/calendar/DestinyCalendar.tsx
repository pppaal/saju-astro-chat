"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useI18n } from "@/i18n/I18nProvider";
import { searchCities } from "@/lib/cities";
import tzLookup from "tz-lookup";
import { getUserProfile } from "@/lib/userProfile";
import BackButton from "@/components/ui/BackButton";
import CreditBadge from "@/components/ui/CreditBadge";
import { buildSignInUrl } from "@/lib/auth/signInUrl";
import DateTimePicker from "@/components/ui/DateTimePicker";
import TimePicker from "@/components/ui/TimePicker";
import styles from "./DestinyCalendar.module.css";

type EventCategory = "wealth" | "career" | "love" | "health" | "travel" | "study" | "general";
type ImportanceGrade = 0 | 1 | 2 | 3 | 4;
type CityHit = { name: string; country: string; lat: number; lon: number; timezone?: string };

interface ImportantDate {
  date: string;
  grade: ImportanceGrade;
  score: number;
  categories: EventCategory[];
  title: string;
  description: string;
  summary?: string;
  bestTimes?: string[];
  sajuFactors: string[];
  astroFactors: string[];
  recommendations: string[];
  warnings: string[];
  // 신규 분석 데이터 (확장)
  ganzhi?: string;           // 일주 간지
  transitSunSign?: string;   // 트랜짓 태양 별자리
  crossVerified?: boolean;   // 사주+점성술 교차 검증
}

interface CalendarData {
  success: boolean;
  year: number;
  summary?: {
    total: number;
    grade0: number; // 최고의 날 (~5%)
    grade1: number; // 좋은 날 (~15%)
    grade2: number; // 보통 날 (~50%)
    grade3: number; // 안좋은 날 (~25%)
    grade4: number; // 최악의 날 (~5%)
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

/**
 * YYYY-MM-DD 문자열을 로컬 타임존 Date로 파싱
 * new Date("2025-12-31")은 UTC로 파싱되어 타임존에 따라 전날로 계산될 수 있음
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// ============================================================
// 캐싱 유틸리티
// ============================================================
const CACHE_VERSION = 'v1';
const CACHE_EXPIRY_DAYS = 30; // 30일 후 만료

interface CachedCalendarData {
  version: string;
  timestamp: number;
  birthInfo: BirthInfo;
  year: number;
  category: string;
  data: CalendarData;
}

function getCacheKey(birthInfo: BirthInfo, year: number, category: string): string {
  // 생년월일+시간+장소+연도+카테고리로 고유 키 생성
  return `calendar_${birthInfo.birthDate}_${birthInfo.birthTime}_${birthInfo.birthPlace}_${year}_${category}`;
}

function getCachedData(cacheKey: string): CalendarData | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const parsed: CachedCalendarData = JSON.parse(cached);

    // 버전 체크
    if (parsed.version !== CACHE_VERSION) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    // 만료 체크 (30일)
    const now = Date.now();
    const expiryMs = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    if (now - parsed.timestamp > expiryMs) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return parsed.data;
  } catch (err) {
    console.error('[Cache] Failed to get cached data:', err);
    return null;
  }
}

function setCachedData(cacheKey: string, birthInfo: BirthInfo, year: number, category: string, data: CalendarData): void {
  if (typeof window === 'undefined') return;

  try {
    const cacheData: CachedCalendarData = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      birthInfo,
      year,
      category,
      data,
    };

    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (err) {
    console.error('[Cache] Failed to set cached data:', err);
    // localStorage quota exceeded - 오래된 캐시 삭제
    try {
      clearOldCache();
      localStorage.setItem(cacheKey, JSON.stringify({
        version: CACHE_VERSION,
        timestamp: Date.now(),
        birthInfo,
        year,
        category,
        data,
      }));
    } catch (retryErr) {
      console.error('[Cache] Failed to set cached data after cleanup:', retryErr);
    }
  }
}

function clearOldCache(): void {
  if (typeof window === 'undefined') return;

  try {
    const now = Date.now();
    const keys = Object.keys(localStorage);
    const calendarKeys = keys.filter(k => k.startsWith('calendar_'));

    // 만료된 캐시 삭제
    calendarKeys.forEach(key => {
      try {
        const cached = localStorage.getItem(key);
        if (!cached) return;

        const parsed: CachedCalendarData = JSON.parse(cached);
        const expiryMs = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        if (now - parsed.timestamp > expiryMs) {
          localStorage.removeItem(key);
        }
      } catch {
        // 파싱 실패한 캐시는 삭제
        localStorage.removeItem(key);
      }
    });
  } catch (err) {
    console.error('[Cache] Failed to clear old cache:', err);
  }
}

export default function DestinyCalendar() {
  // SessionProvider는 상위 레이아웃에서 이미 제공됨
  return <DestinyCalendarContent />;
}

function DestinyCalendarContent() {
  const { locale, t } = useI18n();
  const { status } = useSession();
  const signInUrl = buildSignInUrl();
  const canvasRef = useRef<HTMLCanvasElement>(null!);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<EventCategory | "all">("all");
  const [selectedDate, setSelectedDate] = useState<ImportantDate | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Theme state
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  // Month transition direction
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);

  // 저장 상태
  const [savedDates, setSavedDates] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // 생년월일 입력
  const [birthInfo, setBirthInfo] = useState<BirthInfo>({
    birthDate: "",
    birthTime: "",
    birthPlace: "",
    gender: "Male",
  });
  const [hasBirthInfo, setHasBirthInfo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeUnknown, setTimeUnknown] = useState(false);

  // 캐시 상태
  const [cacheHit, setCacheHit] = useState(false);

  // City search
  const [suggestions, setSuggestions] = useState<CityHit[]>([]);
  const [selectedCity, setSelectedCity] = useState<CityHit | null>(null);
  const [openSug, setOpenSug] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [cityErr, setCityErr] = useState<string | null>(null);
  const [genderOpen, setGenderOpen] = useState(false);

  // Load profile from DB states
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Load saved profile on mount
  useEffect(() => {
    const profile = getUserProfile();
    if (profile.birthDate) setBirthInfo(prev => ({ ...prev, birthDate: profile.birthDate || '' }));
    if (profile.birthTime) setBirthInfo(prev => ({ ...prev, birthTime: profile.birthTime || '' }));
    if (profile.gender) setBirthInfo(prev => ({ ...prev, gender: profile.gender as 'Male' | 'Female' }));
  }, []);

  // Auto-load/auto-submit disabled - user must click manually

  // Load profile from DB for authenticated users
  const handleLoadProfile = async () => {
    if (status !== 'authenticated') return;

    setLoadingProfile(true);
    setCityErr(null);

    try {
      const res = await fetch('/api/me/profile', { cache: 'no-store' });
      if (!res.ok) {
        setCityErr(t('error.profileLoadFailed') || 'Failed to load profile. Please try again.');
        setLoadingProfile(false);
        return;
      }

      const { user } = await res.json();
      console.log('[DestinyCalendar] Loaded user profile:', user);
      console.log('[DestinyCalendar] birthCity:', user?.birthCity);

      if (!user || !user.birthDate) {
        setCityErr(t('error.noProfileData') || 'No saved profile data found. Please save your info in MyJourney first.');
        setLoadingProfile(false);
        return;
      }

      // Set form fields from DB data
      const updatedBirthInfo: BirthInfo = {
        ...birthInfo,
        birthDate: user.birthDate || '',
        birthTime: user.birthTime || '',
        birthPlace: user.birthCity || '',
        gender: user.gender === 'M' ? 'Male' : user.gender === 'F' ? 'Female' : 'Male',
      };

      // Try to get city coordinates
      if (user.birthCity) {
        const cityName = user.birthCity.split(',')[0]?.trim();
        console.log('[DestinyCalendar] Searching city:', cityName);
        if (cityName) {
          try {
            const hits = await searchCities(cityName, { limit: 1 }) as CityHit[];
            console.log('[DestinyCalendar] City search hits:', hits);
            if (hits && hits[0]) {
              const hit = hits[0];
              const tz = hit.timezone ?? user.tzId ?? tzLookup(hit.lat, hit.lon);
              setSelectedCity({
                ...hit,
                timezone: tz,
              });
              updatedBirthInfo.latitude = hit.lat;
              updatedBirthInfo.longitude = hit.lon;
              updatedBirthInfo.timezone = tz;
            }
          } catch (searchErr) {
            console.warn('[DestinyCalendar] City search failed for:', cityName, searchErr);
          }
        }
      }

      console.log('[DestinyCalendar] Final birthInfo:', updatedBirthInfo);
      setBirthInfo(updatedBirthInfo);
      setProfileLoaded(true);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setCityErr(t('error.profileLoadFailed') || 'Failed to load profile. Please try again.');
    } finally {
      setLoadingProfile(false);
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 로그인 사용자의 저장된 날짜 로드
  useEffect(() => {
    const loadSavedDates = async () => {
      if (status !== 'authenticated') return;
      try {
        const res = await fetch(`/api/calendar/save?year=${year}`);
        if (res.ok) {
          const { savedDates: dates } = await res.json();
          setSavedDates(new Set(dates.map((d: { date: string }) => d.date)));
        }
      } catch (err) {
        console.error('Failed to load saved dates:', err);
      }
    };
    loadSavedDates();
  }, [status, year]);

  // 날짜 저장 함수
  const handleSaveDate = async () => {
    if (!selectedDate || status !== 'authenticated') return;

    setSaving(true);
    setSaveMsg(null);

    try {
      const res = await fetch('/api/calendar/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate.date,
          year,
          grade: selectedDate.grade,
          score: selectedDate.score,
          title: selectedDate.title,
          description: selectedDate.description,
          summary: selectedDate.summary,
          categories: selectedDate.categories,
          bestTimes: selectedDate.bestTimes,
          sajuFactors: selectedDate.sajuFactors,
          astroFactors: selectedDate.astroFactors,
          recommendations: selectedDate.recommendations,
          warnings: selectedDate.warnings,
          birthDate: birthInfo.birthDate,
          birthTime: birthInfo.birthTime,
          birthPlace: birthInfo.birthPlace,
          locale,
        }),
      });

      if (res.ok) {
        setSavedDates(prev => new Set([...prev, selectedDate.date]));
        setSaveMsg(locale === 'ko' ? '저장되었습니다!' : 'Saved!');
      } else {
        const data = await res.json();
        setSaveMsg(data.error || (locale === 'ko' ? '저장 실패' : 'Save failed'));
      }
    } catch (err) {
      console.error('Failed to save date:', err);
      setSaveMsg(locale === 'ko' ? '저장 실패' : 'Save failed');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 2000);
    }
  };

  // 저장된 날짜 삭제 함수
  const handleUnsaveDate = async () => {
    if (!selectedDate || status !== 'authenticated') return;

    setSaving(true);
    setSaveMsg(null);

    try {
      const res = await fetch(`/api/calendar/save?date=${selectedDate.date}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSavedDates(prev => {
          const newSet = new Set(prev);
          newSet.delete(selectedDate.date);
          return newSet;
        });
        setSaveMsg(locale === 'ko' ? '삭제되었습니다!' : 'Removed!');
      } else {
        setSaveMsg(locale === 'ko' ? '삭제 실패' : 'Remove failed');
      }
    } catch (err) {
      console.error('Failed to unsave date:', err);
      setSaveMsg(locale === 'ko' ? '삭제 실패' : 'Remove failed');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 2000);
    }
  };

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
        console.log('[DestinyCalendar] Searching cities for:', q);
        const hits = (await searchCities(q, { limit: 8 })) as CityHit[];
        console.log('[DestinyCalendar] City search results:', hits);
        setSuggestions(hits);
        if (isUserTyping) {
          setOpenSug(hits.length > 0);
        }
      } catch (err) {
        console.error('[DestinyCalendar] City search error:', err);
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
    setCacheHit(false);

    try {
      // 1. 캐시 확인
      const cacheKey = getCacheKey(birthData, year, activeCategory);
      const cachedData = getCachedData(cacheKey);

      if (cachedData) {
        console.log('[Calendar] Cache HIT! 🎯', { year, category: activeCategory });
        setData(cachedData);
        setHasBirthInfo(true);
        setCacheHit(true);
        setLoading(false);
        setSubmitting(false);
        return;
      }

      // 2. 캐시 없으면 API 호출
      console.log('[Calendar] Cache MISS. Fetching from API...', { year, category: activeCategory });

      const params = new URLSearchParams({ year: String(year), locale });
      if (activeCategory !== "all") {
        params.set("category", activeCategory);
      }
      params.set("birthDate", birthData.birthDate);
      params.set("birthTime", birthData.birthTime);
      params.set("birthPlace", birthData.birthPlace);

      const res = await fetch(`/api/calendar?${params}`, {
        headers: {
          'X-API-Token': process.env.NEXT_PUBLIC_API_TOKEN || '',
        },
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || json.message || "Failed to load calendar");
      } else {
        setData(json);
        setHasBirthInfo(true);

        // 3. 성공한 데이터는 캐시에 저장
        setCachedData(cacheKey, birthData, year, activeCategory, json);
        console.log('[Calendar] Data cached successfully ✅', { year, category: activeCategory });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, activeCategory]);

  // 데이터 로드 후 오늘 날짜 자동 선택
  useEffect(() => {
    if (data?.allDates && !selectedDay) {
      const today = new Date();
      // 로컬 타임존 기준 YYYY-MM-DD 문자열 생성
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      const todayInfo = data.allDates.find(d => d.date === todayStr);
      setSelectedDay(today);
      if (todayInfo) {
        setSelectedDate(todayInfo);
      }
    }
  }, [data, selectedDay]);

  const handleBirthInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCityErr(null);

    if (!birthInfo.birthDate) {
      setCityErr(locale === "ko" ? "생년월일을 입력해주세요" : "Please enter birth date");
      return;
    }
    if (!birthInfo.birthTime && !timeUnknown) {
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

    // If time is unknown, set to 12:00 (noon)
    const finalBirthInfo = timeUnknown ? { ...birthInfo, birthTime: "12:00" } : birthInfo;

    setSubmitting(true);
    fetchCalendar(finalBirthInfo);
  };

  const getDateInfo = (date: Date): ImportantDate | undefined => {
    if (!data?.allDates) return undefined;
    // 로컬 타임존 기준 YYYY-MM-DD 문자열 생성 (toISOString은 UTC 기준이라 타임존 문제 발생)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
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
    setSlideDirection('right');
    setCurrentDate(new Date(year, month - 1, 1));
    setTimeout(() => setSlideDirection(null), 300);
  };

  const nextMonth = () => {
    setSlideDirection('left');
    setCurrentDate(new Date(year, month + 1, 1));
    setTimeout(() => setSlideDirection(null), 300);
  };

  const goToToday = () => {
    const today = new Date();
    if (today.getMonth() > month || today.getFullYear() > year) {
      setSlideDirection('left');
    } else if (today.getMonth() < month || today.getFullYear() < year) {
      setSlideDirection('right');
    }
    setCurrentDate(today);
    setTimeout(() => setSlideDirection(null), 300);
  };

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
  };

  const getGradeEmoji = (grade: number): string => {
    switch (grade) {
      case 0: return "🌟"; // 최고의 날
      case 1: return "✨"; // 좋은 날
      case 2: return "⭐"; // 보통 날
      case 3: return "⚠️"; // 안좋은 날
      case 4: return "☠️"; // 최악의 날
      default: return "⭐";
    }
  };

  const getScoreClass = (score: number): string => {
    if (score >= 70) return styles.high;
    if (score >= 50) return styles.medium;
    return styles.low;
  };

  const days = getMonthDays();

  // 생년월일 입력 폼 - Dream 스타일
  if (!hasBirthInfo) {
    return (
      <div className={styles.introContainer}>
        <canvas ref={canvasRef} className={styles.particleCanvas} />
        <BackButton />

        <main className={styles.introMain}>
          <div className={styles.pageHeader}>
            <div className={styles.iconWrapper}>
              <span className={styles.icon}>{ICONS.calendar}</span>
            </div>
            <h1 className={styles.pageTitle}>
              {locale === "ko" ? "운명 캘린더" : "Destiny Calendar"}
            </h1>
            <p className={styles.pageSubtitle}>
              {locale === "ko"
                ? "동서양 운세를 교차 분석하여 당신만의 중요한 날짜를 찾아드립니다"
                : "Cross-analyze Eastern and Western fortune to find your important dates"}
            </p>
          </div>

          <div className={styles.birthFormCard}>
            <div className={styles.formHeader}>
              <span className={styles.formIcon}>🎂</span>
              <h3 className={styles.formTitle}>
                {locale === "ko" ? "생년월일을 입력해주세요" : "Enter Your Birth Info"}
              </h3>
              <p className={styles.formSubtitle}>
                {locale === "ko"
                  ? "정확한 분석을 위해 필요한 정보입니다"
                  : "Required for accurate analysis"}
              </p>
            </div>

            {/* Load Profile Button */}
            {status === 'authenticated' && !profileLoaded && (
              <button
                type="button"
                className={styles.loadProfileButton}
                onClick={handleLoadProfile}
                disabled={loadingProfile}
              >
                <span className={styles.loadProfileIcon}>
                  {loadingProfile ? '⏳' : '👤'}
                </span>
                <span className={styles.loadProfileText}>
                  {loadingProfile
                    ? (locale === 'ko' ? '불러오는 중...' : 'Loading...')
                    : (locale === 'ko' ? '내 프로필 불러오기' : 'Load My Profile')}
                </span>
                <span className={styles.loadProfileArrow}>→</span>
              </button>
            )}

            {/* Profile loaded success message */}
            {status === 'authenticated' && profileLoaded && (
              <div className={styles.profileLoadedMessage}>
                <span className={styles.profileLoadedIcon}>✓</span>
                <span className={styles.profileLoadedText}>
                  {locale === 'ko' ? '프로필 불러오기 완료!' : 'Profile loaded!'}
                </span>
              </div>
            )}

            <form onSubmit={handleBirthInfoSubmit} className={styles.form}>
              {/* Birth Date */}
              <DateTimePicker
                value={birthInfo.birthDate}
                onChange={(date) => setBirthInfo({ ...birthInfo, birthDate: date })}
                label={locale === "ko" ? "생년월일" : "Birth Date"}
                required
                locale={locale}
              />

              {/* Birth Time */}
              <div className={styles.fieldGroup}>
                <TimePicker
                  value={birthInfo.birthTime}
                  onChange={(time) => setBirthInfo({ ...birthInfo, birthTime: time })}
                  label={locale === "ko" ? "출생 시간" : "Birth Time"}
                  required={!timeUnknown}
                  disabled={timeUnknown}
                  locale={locale}
                />
                <div className={styles.checkboxWrapper}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={timeUnknown}
                      onChange={(e) => {
                        setTimeUnknown(e.target.checked);
                        if (e.target.checked) {
                          setBirthInfo({ ...birthInfo, birthTime: "" });
                        }
                      }}
                      className={styles.checkbox}
                    />
                    <span>{locale === "ko" ? "출생 시간을 모름 (정오 12:00으로 설정됩니다)" : "Time unknown (will use 12:00 noon)"}</span>
                  </label>
                </div>
              </div>

              {/* Birth City */}
              <div className={styles.fieldGroup} style={{ position: 'relative' }}>
                <label className={styles.label}>
                  {locale === "ko" ? "출생 도시" : "Birth City"}
                  <span className={styles.required}>*</span>
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

              {/* Gender */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  {locale === "ko" ? "성별" : "Gender"}
                  <span className={styles.required}>*</span>
                </label>
                <div className={styles.genderButtons}>
                  <button
                    type="button"
                    className={`${styles.genderBtn} ${birthInfo.gender === 'Male' ? styles.active : ''}`}
                    onClick={() => setBirthInfo({ ...birthInfo, gender: 'Male' })}
                  >
                    <span>👨</span>
                    <span>{locale === "ko" ? "남성" : "Male"}</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.genderBtn} ${birthInfo.gender === 'Female' ? styles.active : ''}`}
                    onClick={() => setBirthInfo({ ...birthInfo, gender: 'Female' })}
                  >
                    <span>👩</span>
                    <span>{locale === "ko" ? "여성" : "Female"}</span>
                  </button>
                </div>
              </div>

              {cityErr && <div className={styles.error}>{cityErr}</div>}

              {/* Submit Button */}
              <button
                type="submit"
                className={styles.submitButton}
                disabled={submitting || !birthInfo.birthDate || (!birthInfo.birthTime && !timeUnknown) || !birthInfo.birthPlace}
              >
                {submitting ? (
                  <>
                    <div className={styles.buttonSpinner} />
                    <span>{locale === "ko" ? "분석 중..." : "Analyzing..."}</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>{locale === "ko" ? "운명의 날 찾기" : "Find Your Destiny Days"}</span>
                  </>
                )}
              </button>
            </form>

            {status === 'unauthenticated' && (
              <div className={styles.loginHint}>
                <p>
                  {locale === "ko"
                    ? "로그인하면 정보가 저장되어 더 편리하게 이용할 수 있어요"
                    : "Log in to save your info for a better experience"}
                </p>
                <a href={signInUrl} className={styles.loginLink}>
                  {locale === "ko" ? "로그인하기" : "Log in"}
                </a>
              </div>
            )}
          </div>

          {/* Quick Tips */}
          <div className={styles.quickTips}>
            <h4>{locale === "ko" ? "💡 이런 분들께 추천해요" : "💡 Recommended for"}</h4>
            <ul>
              <li>{locale === "ko" ? "중요한 일정을 잡아야 할 때" : "Planning important events"}</li>
              <li>{locale === "ko" ? "좋은 날과 조심할 날을 알고 싶을 때" : "Know your best and caution days"}</li>
              <li>{locale === "ko" ? "사주와 점성술을 함께 참고하고 싶을 때" : "Want both Saju and Astrology insights"}</li>
            </ul>
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

  // 월간 운세 그래프 데이터 계산
  const getMonthFortuneData = () => {
    if (!data?.allDates) return [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthData: { day: number; grade: number; score: number }[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dateInfo = data.allDates.find(d => d.date === dateStr);
      monthData.push({
        day,
        grade: dateInfo?.grade ?? 3,
        score: dateInfo?.score ?? 50
      });
    }
    return monthData;
  };

  const fortuneData = getMonthFortuneData();
  const goodDaysCount = fortuneData.filter(d => d.grade <= 2).length;
  const badDaysCount = fortuneData.filter(d => d.grade >= 4).length; // grade 4 + 5

  // 연도별 summary 계산 (allDates에서 직접 계산)
  const getYearSummary = () => {
    if (!data?.allDates) return null;

    const yearDates = data.allDates.filter(d => {
      const dateYear = new Date(d.date).getFullYear();
      return dateYear === year;
    });

    return {
      total: yearDates.length,
      grade0: yearDates.filter(d => d.grade === 0).length,
      grade1: yearDates.filter(d => d.grade === 1).length,
      grade2: yearDates.filter(d => d.grade === 2).length,
      grade3: yearDates.filter(d => d.grade === 3).length,
      grade4: yearDates.filter(d => d.grade === 4).length,
    };
  };

  const yearSummary = getYearSummary();

  return (
    <div className={`${styles.container} ${!isDarkTheme ? styles.lightTheme : ''}`}>
      <BackButton />

      {/* 헤더 - 개선된 디자인 */}
      <div className={styles.calendarHeader}>
        <div className={styles.headerTop}>
          <div className={styles.headerTitleSection}>
            <div className={styles.calendarIconWrapper}>
              <span className={styles.calendarIcon}>📅</span>
            </div>
            <div className={styles.titleGroup}>
              <h1 className={styles.calendarTitle}>
                {locale === "ko" ? "운명 캘린더" : "Destiny Calendar"}
              </h1>
              <p className={styles.calendarSubtitle}>
                {locale === "ko" ? `${year}년 당신만의 특별한 날들` : `Your special days in ${year}`}
              </p>
            </div>
          </div>
          <div className={styles.headerActions}>
            {/* 캐시 상태 표시 - v7 UI/UX 개선 */}
            {cacheHit && (
              <span
                className={styles.cacheIndicator}
                title={locale === "ko" ? "저장된 데이터 사용 중 (빠른 로딩)" : "Using cached data (fast loading)"}
                aria-label={locale === "ko" ? "캐시된 데이터" : "Cached data"}
              >
                <span className={styles.cacheIcon}>⚡</span>
                <span className={styles.cacheText}>
                  {locale === "ko" ? "캐시" : "Cached"}
                </span>
              </span>
            )}
            <button className={styles.editBirthBtn} onClick={() => setHasBirthInfo(false)}>
              <span>✏️</span>
              <span>{locale === "ko" ? "수정" : "Edit"}</span>
            </button>
          </div>
        </div>
        {/* Summary - 5등급 시스템 (연도별) */}
        {yearSummary && (
          <div className={styles.summaryBadges}>
            <span className={styles.summaryBadge} title={locale === "ko" ? "최고의 날 (~5%)" : "Best Days (~5%)"}>
              <span className={styles.badgeEmoji}>🌟</span>
              <span className={styles.badgeLabel}>{locale === "ko" ? "최고" : "Best"}</span>
              <span className={styles.badgeCount}>{yearSummary.grade0}</span>
            </span>
            <span className={styles.summaryBadge} title={locale === "ko" ? "좋은 날 (~15%)" : "Good Days (~15%)"}>
              <span className={styles.badgeEmoji}>✨</span>
              <span className={styles.badgeLabel}>{locale === "ko" ? "좋음" : "Good"}</span>
              <span className={styles.badgeCount}>{yearSummary.grade1}</span>
            </span>
            <span className={`${styles.summaryBadge} ${styles.cautionBadge}`} title={locale === "ko" ? "안좋은 날 (~25%)" : "Bad Days (~25%)"}>
              <span className={styles.badgeEmoji}>⚠️</span>
              <span className={styles.badgeLabel}>{locale === "ko" ? "안좋음" : "Bad"}</span>
              <span className={styles.badgeCount}>{yearSummary.grade3}</span>
            </span>
            {yearSummary.grade4 > 0 && (
              <span className={`${styles.summaryBadge} ${styles.worstBadge}`} title={locale === "ko" ? "최악의 날 (~5%)" : "Worst Days (~5%)"}>
                <span className={styles.badgeEmoji}>☠️</span>
                <span className={styles.badgeLabel}>{locale === "ko" ? "최악" : "Worst"}</span>
                <span className={styles.badgeCount}>{yearSummary.grade4}</span>
              </span>
            )}
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
        <div
          className={`${styles.daysGrid} ${slideDirection === 'left' ? styles.slideLeft : ''} ${slideDirection === 'right' ? styles.slideRight : ''}`}
          role="grid"
          aria-label={locale === "ko" ? `${year}년 ${month + 1}월 캘린더` : `Calendar for ${MONTHS[month]} ${year}`}
        >
          {days.map((date, idx) => {
            const dateInfo = date ? getDateInfo(date) : undefined;
            const isToday = date &&
              date.getDate() === new Date().getDate() &&
              date.getMonth() === new Date().getMonth() &&
              date.getFullYear() === new Date().getFullYear();

            const getGradeLabel = (grade: number) => {
              const labels = {
                0: locale === "ko" ? "최고의 날" : "Best Day",
                1: locale === "ko" ? "좋은 날" : "Good Day",
                2: locale === "ko" ? "보통 날" : "Normal Day",
                3: locale === "ko" ? "안좋은 날" : "Bad Day",
                4: locale === "ko" ? "최악의 날" : "Worst Day",
              };
              return labels[grade as keyof typeof labels] || labels[2];
            };

            return (
              <div
                key={idx}
                className={getDayClassName(date)}
                onClick={() => handleDayClick(date)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleDayClick(date);
                  }
                }}
                role="gridcell"
                tabIndex={date ? 0 : -1}
                aria-label={date ? `${date.getDate()}${locale === "ko" ? "일" : ""}, ${dateInfo ? getGradeLabel(dateInfo.grade) : locale === "ko" ? "정보 없음" : "No info"}${isToday ? (locale === "ko" ? ", 오늘" : ", Today") : ""}` : undefined}
                aria-selected={!!(selectedDay && date &&
                  date.getDate() === selectedDay.getDate() &&
                  date.getMonth() === selectedDay.getMonth() &&
                  date.getFullYear() === selectedDay.getFullYear())}
                aria-current={isToday ? "date" : undefined}
              >
                {date && (
                  <>
                    <span className={styles.dayNumber}>{date.getDate()}</span>
                    {dateInfo && (
                      <div className={styles.dayIndicators} aria-hidden="true">
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

      {/* 범례 - 5등급 시스템 (접근성 개선: 색상 + 패턴 + 텍스트) */}
      <div className={styles.legend} role="list" aria-label={locale === "ko" ? "등급 범례" : "Grade Legend"}>
        <div className={styles.legendItem} role="listitem">
          <span className={`${styles.legendDot} ${styles.grade0Dot}`} aria-hidden="true">
            <span className={styles.legendPattern}>★</span>
          </span>
          <span>{locale === "ko" ? "최고 (72+)" : "Best (72+)"}</span>
        </div>
        <div className={styles.legendItem} role="listitem">
          <span className={`${styles.legendDot} ${styles.grade1Dot}`} aria-hidden="true">
            <span className={styles.legendPattern}>●</span>
          </span>
          <span>{locale === "ko" ? "좋음 (65-71)" : "Good (65-71)"}</span>
        </div>
        <div className={styles.legendItem} role="listitem">
          <span className={`${styles.legendDot} ${styles.grade2Dot}`} aria-hidden="true">
            <span className={styles.legendPattern}>◆</span>
          </span>
          <span>{locale === "ko" ? "보통 (45-64)" : "Normal (45-64)"}</span>
        </div>
        <div className={styles.legendItem} role="listitem">
          <span className={`${styles.legendDot} ${styles.grade3Dot}`} aria-hidden="true">
            <span className={styles.legendPattern}>▲</span>
          </span>
          <span>{locale === "ko" ? "안좋음 (30-44)" : "Bad (30-44)"}</span>
        </div>
        <div className={styles.legendItem} role="listitem">
          <span className={`${styles.legendDot} ${styles.grade4Dot}`} aria-hidden="true">
            <span className={styles.legendPattern}>✕</span>
          </span>
          <span>{locale === "ko" ? "최악 (<30)" : "Worst (<30)"}</span>
        </div>
      </div>

      {/* 월간 운세 그래프 */}
      {fortuneData.length > 0 && (
        <div className={styles.fortuneGraph}>
          <div className={styles.graphHeader}>
            <span className={styles.graphTitle}>
              📊 {locale === "ko" ? "월간 운세 흐름" : "Monthly Fortune Flow"}
            </span>
            <div className={styles.graphStats}>
              <span className={styles.graphStat}>
                <span className={`${styles.graphStatDot} ${styles.good}`}></span>
                {locale === "ko" ? `좋은 날 ${goodDaysCount}일` : `${goodDaysCount} good days`}
              </span>
              <span className={styles.graphStat}>
                <span className={`${styles.graphStatDot} ${styles.bad}`}></span>
                {locale === "ko" ? `주의 ${badDaysCount}일` : `${badDaysCount} caution`}
              </span>
            </div>
          </div>
          <div className={styles.sparkline}>
            {fortuneData.map((d, idx) => {
              const isSelected = selectedDay && selectedDay.getDate() === d.day && selectedDay.getMonth() === month;
              const height = Math.max(10, (100 - d.grade * 20)) + '%';
              return (
                <div
                  key={idx}
                  className={`${styles.sparkBar} ${styles[`grade${d.grade}`]} ${isSelected ? styles.active : ''}`}
                  style={{ height }}
                  onClick={() => {
                    const clickedDate = new Date(year, month, d.day);
                    handleDayClick(clickedDate);
                  }}
                  title={`${d.day}${locale === "ko" ? "일" : ""}: ${d.score}점`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* 선택된 날짜 정보 */}
      {selectedDay && (
        <div className={styles.selectedDayInfo}>
          <div className={styles.selectedDayHeader}>
            <span className={styles.selectedDayDate}>
              {selectedDay.getMonth() + 1}/{selectedDay.getDate()}
              {locale === "ko" && ` (${WEEKDAYS[selectedDay.getDay()]})`}
            </span>
            <div className={styles.headerActions}>
              {selectedDate && (
                <span className={styles.selectedGrade}>{getGradeEmoji(selectedDate.grade)}</span>
              )}
              {/* 저장 버튼 - 로그인 사용자만 */}
              {status === 'authenticated' && selectedDate && (
                <button
                  className={`${styles.saveBtn} ${savedDates.has(selectedDate.date) ? styles.saved : ''}`}
                  onClick={savedDates.has(selectedDate.date) ? handleUnsaveDate : handleSaveDate}
                  disabled={saving}
                  title={savedDates.has(selectedDate.date)
                    ? (locale === 'ko' ? '저장됨 (클릭하여 삭제)' : 'Saved (click to remove)')
                    : (locale === 'ko' ? '이 날짜 저장하기' : 'Save this date')}
                >
                  {saving ? '...' : savedDates.has(selectedDate.date) ? '★' : '☆'}
                </button>
              )}
            </div>
          </div>
          {/* 저장 메시지 */}
          {saveMsg && (
            <div className={styles.saveMsg}>{saveMsg}</div>
          )}

          {selectedDate ? (
            <div className={styles.selectedDayContent}>
              <h3 className={styles.selectedTitle}>{selectedDate.title}</h3>

              {/* 교차 검증 배지 */}
              {selectedDate.crossVerified && (
                <div className={styles.crossVerifiedBadge}>
                  <span className={styles.crossVerifiedIcon}>🔮</span>
                  <span className={styles.crossVerifiedText}>
                    {locale === "ko" ? "사주 + 점성술 교차 검증 완료" : "Saju + Astrology Cross-verified"}
                  </span>
                </div>
              )}

              {/* 한줄 요약 - 가장 눈에 띄게 */}
              {selectedDate.summary && (
                <div className={styles.summaryBox}>
                  <p className={styles.summaryText}>{selectedDate.summary}</p>
                </div>
              )}

              <p className={styles.selectedDesc}>{selectedDate.description}</p>

              {/* 간지 정보 */}
              {selectedDate.ganzhi && (
                <div className={styles.ganzhiBox}>
                  <span className={styles.ganzhiLabel}>
                    {locale === "ko" ? "일주" : "Day Pillar"}
                  </span>
                  <span className={styles.ganzhiValue}>{selectedDate.ganzhi}</span>
                  {selectedDate.transitSunSign && (
                    <>
                      <span className={styles.ganzhiDivider}>|</span>
                      <span className={styles.ganzhiLabel}>
                        {locale === "ko" ? "태양" : "Sun"}
                      </span>
                      <span className={styles.ganzhiValue}>{selectedDate.transitSunSign}</span>
                    </>
                  )}
                </div>
              )}

              {/* 추천 시간대 - 카드 형식으로 개선 */}
              {selectedDate.bestTimes && selectedDate.bestTimes.length > 0 && (
                <div className={styles.bestTimesBox}>
                  <h4 className={styles.bestTimesTitle}>
                    <span className={styles.bestTimesIcon}>⏰</span>
                    {locale === "ko" ? "오늘의 좋은 시간" : "Best Times Today"}
                  </h4>
                  <div className={styles.bestTimesList}>
                    {selectedDate.bestTimes.map((time, i) => (
                      <span key={i} className={styles.bestTimeItem}>
                        <span className={styles.bestTimeNumber}>{i + 1}</span>
                        {time}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.selectedCategories}>
                {selectedDate.categories.map(cat => (
                  <span key={cat} className={`${styles.categoryTag} ${styles[cat]}`}>
                    {CATEGORY_EMOJI[cat]} {getCategoryLabel(cat)}
                  </span>
                ))}
              </div>

              {/* 점수 바 - 애니메이션 추가 */}
              <div className={styles.scoreWrapper}>
                <div className={styles.scoreBar}>
                  <div
                    className={`${styles.scoreFill} ${getScoreClass(selectedDate.score)}`}
                    style={{ width: `${selectedDate.score}%` }}
                  />
                </div>
                <span className={styles.scoreText}>
                  {locale === "ko" ? "점수" : "Score"}: {selectedDate.score}/100
                </span>
              </div>

              {/* 사주 분석 섹션 */}
              {selectedDate.sajuFactors && selectedDate.sajuFactors.length > 0 && (
                <div className={styles.analysisSection}>
                  <h4 className={styles.analysisTitle}>
                    <span className={styles.analysisBadge}>☯️</span>
                    {locale === "ko" ? "사주 분석" : "Saju Analysis"}
                  </h4>
                  <ul className={styles.analysisList}>
                    {selectedDate.sajuFactors.slice(0, 4).map((factor, i) => (
                      <li key={i} className={styles.analysisItem}>
                        <span className={styles.analysisDotSaju}></span>
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 점성술 분석 섹션 */}
              {selectedDate.astroFactors && selectedDate.astroFactors.length > 0 && (
                <div className={styles.analysisSection}>
                  <h4 className={styles.analysisTitle}>
                    <span className={styles.analysisBadge}>🌟</span>
                    {locale === "ko" ? "점성술 분석" : "Astrology Analysis"}
                  </h4>
                  <ul className={styles.analysisList}>
                    {selectedDate.astroFactors.slice(0, 4).map((factor, i) => (
                      <li key={i} className={styles.analysisItem}>
                        <span className={styles.analysisDotAstro}></span>
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 행운 키 - 그리드 레이아웃 */}
              {selectedDate.recommendations.length > 0 && (
                <div className={styles.recommendationsSection}>
                  <h4 className={styles.recommendationsTitle}>
                    <span className={styles.recommendationsIcon}>✨</span>
                    {locale === "ko" ? "오늘의 행운 키" : "Lucky Keys"}
                  </h4>
                  <div className={styles.recommendationsGrid}>
                    {selectedDate.recommendations.slice(0, 4).map((r, i) => (
                      <div key={i} className={styles.recommendationCard}>
                        <span className={styles.recommendationNumber}>{i + 1}</span>
                        <span className={styles.recommendationText}>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 주의사항 - 경고 스타일 */}
              {selectedDate.warnings.length > 0 && (
                <div className={styles.warningsSection}>
                  <h4 className={styles.warningsTitle}>
                    <span className={styles.warningsIcon}>⚡</span>
                    {locale === "ko" ? "오늘의 주의보" : "Today's Alert"}
                  </h4>
                  <ul className={styles.warningsList}>
                    {selectedDate.warnings.slice(0, 3).map((w, i) => (
                      <li key={i} className={styles.warningItem}>
                        <span className={styles.warningDot}></span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 큰 저장 버튼 - 로그인 사용자만 */}
              {status === 'authenticated' && (
                <button
                  className={`${styles.saveBtnLarge} ${savedDates.has(selectedDate.date) ? styles.saved : ''}`}
                  onClick={savedDates.has(selectedDate.date) ? handleUnsaveDate : handleSaveDate}
                  disabled={saving}
                >
                  {saving ? (
                    <span>{locale === 'ko' ? '저장 중...' : 'Saving...'}</span>
                  ) : savedDates.has(selectedDate.date) ? (
                    <>
                      <span className={styles.saveBtnIcon}>★</span>
                      <span>{locale === 'ko' ? '저장됨 (삭제하려면 클릭)' : 'Saved (click to remove)'}</span>
                    </>
                  ) : (
                    <>
                      <span className={styles.saveBtnIcon}>☆</span>
                      <span>{locale === 'ko' ? '이 날짜 저장하기' : 'Save this date'}</span>
                    </>
                  )}
                </button>
              )}
              {status !== 'authenticated' && (
                <p className={styles.loginHint}>
                  {locale === 'ko' ? '로그인하면 이 날짜를 저장할 수 있어요' : 'Login to save this date'}
                </p>
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
      {data?.allDates && data.allDates.length > 0 && (() => {
        const monthDates = data.allDates.filter(d => parseLocalDate(d.date).getMonth() === month);

        // 좋은 날 (grade 0, 1, 2) - 점수 높은 순 3개
        const goodDates = monthDates
          .filter(d => d.grade <= 2)
          .sort((a, b) => a.grade - b.grade || b.score - a.score)
          .slice(0, 3);

        // 나쁜 날 (grade 3, 4) - 점수 낮은 순 2개
        const badDates = monthDates
          .filter(d => d.grade >= 3)
          .sort((a, b) => b.grade - a.grade || a.score - b.score)
          .slice(0, 2);

        // 합쳐서 날짜순 정렬
        const highlightDates = [...goodDates, ...badDates].sort((a, b) =>
          parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()
        );

        if (highlightDates.length === 0) return null;

        return (
        <div className={styles.monthHighlights}>
          <h2 className={styles.highlightsTitle}>
            🌟 {year} {MONTHS[month]} {locale === "ko" ? "주요 날짜" : "Highlights"}
          </h2>
          <div className={styles.highlightsList}>
            {highlightDates.map((d, i) => {
                const gradeClass = d.grade === 0 ? styles.grade0
                  : d.grade === 1 ? styles.grade1
                  : d.grade === 2 ? styles.grade2
                  : d.grade === 3 ? styles.grade3
                  : styles.grade4;
                return (
                <div
                  key={i}
                  className={`${styles.highlightCard} ${gradeClass}`}
                  onClick={() => {
                    setSelectedDay(parseLocalDate(d.date));
                    setSelectedDate(d);
                  }}
                >
                  <div className={styles.highlightHeader}>
                    <span className={styles.highlightDate}>
                      {parseLocalDate(d.date).getDate()}{locale === "ko" ? "일" : ""}
                    </span>
                    <div className={styles.highlightBadges}>
                      {((d.sajuFactors && d.sajuFactors.length > 0) || (d.astroFactors && d.astroFactors.length > 0)) && (
                        <span className={styles.highlightBadge} title={locale === "ko" ? "분석 완료" : "Analyzed"}>✨</span>
                      )}
                    </div>
                  </div>
                  <span className={styles.highlightTitle}>
                    {d.title || (d.grade === 0 ? (locale === "ko" ? "최고의 날" : "Best Day")
                      : d.grade === 1 ? (locale === "ko" ? "좋은 날" : "Good Day")
                      : d.grade === 2 ? (locale === "ko" ? "보통 날" : "Normal Day")
                      : d.grade === 3 ? (locale === "ko" ? "안좋은 날" : "Bad Day")
                      : (locale === "ko" ? "최악의 날" : "Worst Day"))}
                  </span>
                  {d.categories && d.categories.length > 0 && (
                    <span className={styles.highlightEmojis}>
                      {d.categories.slice(0, 2).map(c => CATEGORY_EMOJI[c] || "").join(" ")}
                    </span>
                  )}
                  <span className={styles.highlightScore}>
                    {locale === "ko" ? "점수" : "Score"}: {d.score}
                  </span>
                  {/* 간략한 이유 표시 */}
                  {(d.sajuFactors?.length > 0 || d.astroFactors?.length > 0) && (
                    <div className={styles.highlightReason}>
                      {(d.sajuFactors?.[0] || d.astroFactors?.[0] || "").substring(0, 30)}...
                    </div>
                  )}
                </div>
              );
              })}
          </div>
        </div>
        );
      })()}
    </div>
  );
}
