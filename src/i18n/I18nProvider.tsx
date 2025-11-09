"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

/**
 * 다국어 사전: en, ko, zh, ar, es
 * - 타이틀은 모든 언어에서 "destinypal" 고정
 * - 폼에 필요한 키(app.name 등) 포함
 * - 누락되면 영어 → 마지막 세그먼트 순으로 fallback
 */
const dicts = {
  en: {
    app: {
      title: "destinypal",
      subtitle: "Unfold your personal destiny map by analyzing cosmic patterns with AI",
      visitors: "Today's visitors",
      myJourney: "My Journey",
      community: "Community",
      back: "Back",
      // form
      name: "Name",
      namePh: "Your name",
      birthDate: "Birth Date",
      birthTime: "Birth Time",
      birthCity: "Birth City (English)",
      cityPh: "Seoul",
      gender: "Gender",
      male: "Male",
      female: "Female",
      other: "Other",
      preferNot: "Prefer not to say",
      analyze: "Analyze",
    },
    menu: {
      destinyMap: "Destiny Map",
      saju: "Saju",
      astrology: "Astrology",
      iching: "I Ching",
      tarot: "Tarot",
      dream: "Dream",
      numerology: "Numerology",
      compatibility: "Compatibility",
      personality: "Personality",
    },
    emoji: { sparkles: "✨" },
  },
  ko: {
    app: {
      title: "destinypal",
      subtitle: "AI로 우주의 패턴을 분석해 나만의 운명 지도를 펼쳐보세요",
      visitors: "오늘의 방문자",
      myJourney: "나의 여정",
      community: "커뮤니티",
      back: "뒤로",
      // form
      name: "이름",
      namePh: "이름을 입력하세요",
      birthDate: "생년월일",
      birthTime: "출생 시간",
      birthCity: "출생 도시(영문)",
      cityPh: "Seoul",
      gender: "성별",
      male: "남성",
      female: "여성",
      other: "기타",
      preferNot: "응답 안함",
      analyze: "분석하기",
    },
    menu: {
      destinyMap: "운명 지도",
      saju: "사주",
      astrology: "점성술",
      iching: "주역",
      tarot: "타로",
      dream: "꿈 해몽",
      numerology: "수비학",
      compatibility: "궁합",
      personality: "성향",
    },
    emoji: { sparkles: "✨" },
  },
  zh: {
    app: {
      title: "destinypal",
      subtitle: "用 AI 分析宇宙规律，展开你的命运地图",
      visitors: "今日访客",
      myJourney: "我的旅程",
      community: "社区",
      back: "返回",
      // form
      name: "姓名",
      namePh: "请输入姓名",
      birthDate: "出生日期",
      birthTime: "出生时间",
      birthCity: "出生城市（英文）",
      cityPh: "Seoul",
      gender: "性别",
      male: "男",
      female: "女",
      other: "其他",
      preferNot: "不便回答",
      analyze: "开始分析",
    },
    menu: {
      destinyMap: "命运地图",
      saju: "四柱",
      astrology: "占星",
      iching: "易经",
      tarot: "塔罗",
      dream: "解梦",
      numerology: "数字命理",
      compatibility: "配对",
      personality: "性格",
    },
    emoji: { sparkles: "✨" },
  },
  ar: {
    app: {
      title: "destinypal",
      subtitle:
        "افتح خريطة قدرك الشخصية عبر تحليل أنماط الكون بالذكاء الاصطناعي",
      visitors: "زوار اليوم",
      myJourney: "رحلتي",
      community: "المجتمع",
      back: "رجوع",
      // form
      name: "الاسم",
      namePh: "اكتب اسمك",
      birthDate: "تاريخ الميلاد",
      birthTime: "وقت الميلاد",
      birthCity: "مدينة الميلاد (بالإنجليزية)",
      cityPh: "سيول",
      gender: "النوع",
      male: "ذكر",
      female: "أنثى",
      other: "آخر",
      preferNot: "أفضل عدم الإجابة",
      analyze: "تحليل",
    },
    menu: {
      destinyMap: "خريطة القدر",
      saju: "ساجو",
      astrology: "التنجيم",
      iching: "آي تشينغ",
      tarot: "تاروت",
      dream: "تفسير الأحلام",
      numerology: "علم الأعداد",
      compatibility: "التوافق",
      personality: "الشخصية",
    },
    emoji: { sparkles: "✨" },
  },
  es: {
    app: {
      title: "destinypal",
      subtitle:
        "Despliega tu mapa del destino analizando patrones cósmicos con IA",
      visitors: "Visitantes de hoy",
      myJourney: "Mi viaje",
      community: "Comunidad",
      back: "Atrás",
      // form
      name: "Nombre",
      namePh: "Tu nombre",
      birthDate: "Fecha de nacimiento",
      birthTime: "Hora de nacimiento",
      birthCity: "Ciudad de nacimiento (inglés)",
      cityPh: "Seúl",
      gender: "Género",
      male: "Hombre",
      female: "Mujer",
      other: "Otro",
      preferNot: "Prefiero no decirlo",
      analyze: "Analizar",
    },
    menu: {
      destinyMap: "Mapa del destino",
      saju: "Saju",
      astrology: "Astrología",
      iching: "I Ching",
      tarot: "Tarot",
      dream: "Sueños",
      numerology: "Numerología",
      compatibility: "Compatibilidad",
      personality: "Personalidad",
    },
    emoji: { sparkles: "✨" },
  },
} as const;

type Locale = keyof typeof dicts;

type I18nContextType = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (path: string) => string;
  dir: "ltr" | "rtl";
};

const I18nContext = createContext<I18nContextType | null>(null);

const SUPPORTED: Locale[] = ["en", "ko", "zh", "ar", "es"];
const isRtl = (l: Locale) => l === "ar";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // 기본 ko
  const [locale, setLocale] = useState<Locale>("ko");

  // 초기 로드: localStorage → 브라우저 언어 → ko
  useEffect(() => {
    try {
      const stored = localStorage.getItem("locale") as Locale | null;
      if (stored && SUPPORTED.includes(stored)) {
        setLocale(stored);
        return;
      }
    } catch {}
    try {
      const nav2 = navigator.language?.slice(0, 2);
      const guess = SUPPORTED.find((l) => l.startsWith(nav2 as string));
      if (guess) setLocale(guess);
    } catch {}
  }, []);

  // lang/dir 반영 + 저장
  useEffect(() => {
    try {
      localStorage.setItem("locale", locale);
    } catch {}
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtl(locale) ? "rtl" : "ltr";
  }, [locale]);

  // t 함수: 현재 언어 → 영어 → 마지막 세그먼트
  const t = useMemo(() => {
    const getter = (obj: any, p: string) =>
      p.split(".").reduce<any>((acc, key) => (acc && key in acc ? acc[key] : undefined), obj);

    return (path: string) => {
      const cur = dicts[locale];
      const got = getter(cur, path);
      if (typeof got === "string") return got;

      const fb = getter(dicts.en, path);
      if (typeof fb === "string") return fb;

      return path.split(".").pop() || path;
    };
  }, [locale]);

  const value = useMemo<I18nContextType>(
    () => ({ locale, setLocale, t, dir: isRtl(locale) ? "rtl" : "ltr" }),
    [locale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}