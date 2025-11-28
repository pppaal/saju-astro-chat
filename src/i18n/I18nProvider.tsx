"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

/**
 * 다국어 사전: en, ko, zh, ar, es, hi, ru, fr, ja
 * - 타이틀은 모든 언어에서 "destinypal" 고정
 * - 폼/점성 페이지에 필요한 키(ui.*, error.*) 포함
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
    ui: {
      tipChooseCity: "Tip: Choose a city; time zone will be set automatically.",
      timeZone: "Time Zone",
      changeManually: "Change manually",
      generate: "Generate My Chart",
      analyzing: "Analyzing...",
      titleAstrology: "AI Natal Chart",
      subtitleAstrology: "Discover your cosmic map based on your birth information.",
      datePlaceholder: "yyyy-mm-dd",
      timePlaceholder: "--:--",
    },
    error: {
      dateRequired: "Please enter a valid birth date (YYYY-MM-DD).",
      timeRequired: "Please enter a valid birth time (HH:MM).",
      cityRequired: "Please search and select your birth city.",
      timezoneRequired: "Please select a time zone.",
      noData: "No analysis data from server.",
      unknown: "Unknown error.",
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
    ui: {
      tipChooseCity: "도시를 선택하면 시간대가 자동으로 설정됩니다.",
      timeZone: "시간대",
      changeManually: "직접 변경",
      generate: "내 차트 생성",
      analyzing: "분석 중...",
      titleAstrology: "AI Natal Chart",
      subtitleAstrology: "출생 정보를 바탕으로 당신의 우주 지도를 탐험해 보세요.",
      datePlaceholder: "yyyy-mm-dd",
      timePlaceholder: "--:--",
    },
    error: {
      dateRequired: "올바른 생년월일을 입력하세요. (YYYY-MM-DD)",
      timeRequired: "올바른 출생 시간을 입력하세요. (HH:MM)",
      cityRequired: "출생 도시를 검색하여 선택하세요.",
      timezoneRequired: "시간대를 선택하세요.",
      noData: "서버에서 분석 데이터를 받지 못했습니다.",
      unknown: "알 수 없는 오류가 발생했습니다.",
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
    ui: {
      tipChooseCity: "提示：选择城市后，时区会自动设置。",
      timeZone: "时区",
      changeManually: "手动更改",
      generate: "生成我的星盘",
      analyzing: "分析中...",
      titleAstrology: "AI 本命盘",
      subtitleAstrology: "根据你的出生信息探索你的星盘。",
      datePlaceholder: "yyyy-mm-dd",
      timePlaceholder: "--:--",
    },
    error: {
      dateRequired: "请输入有效的出生日期（YYYY-MM-DD）。",
      timeRequired: "请输入有效的出生时间（HH:MM）。",
      cityRequired: "请搜索并选择你的出生城市。",
      timezoneRequired: "请选择一个时区。",
      noData: "服务器没有返回分析数据。",
      unknown: "发生未知错误。",
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
      subtitle: "افتح خريطة قدرك الشخصية عبر تحليل أنماط الكون بالذكاء الاصطناعي",
      visitors: "زوار اليوم",
      myJourney: "رحلتي",
      community: "المجتمع",
      back: "رجوع",
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
    ui: {
      tipChooseCity: "ملاحظة: سيتم تعيين المنطقة الزمنية تلقائياً عند اختيار مدينة.",
      timeZone: "المنطقة الزمنية",
      changeManually: "تغيير يدوي",
      generate: "أنشئ خريطتي",
      analyzing: "جارٍ التحليل...",
      titleAstrology: "خريطة الميلاد بالذكاء الاصطناعي",
      subtitleAstrology: "اكتشف خريطة قدرك بناءً على معلومات ميلادك.",
      datePlaceholder: "yyyy-mm-dd",
      timePlaceholder: "--:--",
    },
    error: {
      dateRequired: "يرجى إدخال تاريخ ميلاد صالح (YYYY-MM-DD).",
      timeRequired: "يرجى إدخال وقت ميلاد صالح (HH:MM).",
      cityRequired: "يرجى البحث واختيار مدينة الميلاد.",
      timezoneRequired: "يرجى اختيار المنطقة الزمنية.",
      noData: "لا توجد بيانات تحليل من الخادم.",
      unknown: "حدث خطأ غير معروف.",
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
      subtitle: "Despliega tu mapa del destino analizando patrones cósmicos con IA",
      visitors: "Visitantes de hoy",
      myJourney: "Mi viaje",
      community: "Comunidad",
      back: "Atrás",
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
    ui: {
      tipChooseCity: "Consejo: Al elegir una ciudad se asignará la zona horaria automáticamente.",
      timeZone: "Zona horaria",
      changeManually: "Cambiar manualmente",
      generate: "Generar mi carta",
      analyzing: "Analizando...",
      titleAstrology: "Carta Natal con IA",
      subtitleAstrology: "Descubre tu mapa cósmico según tu información de nacimiento.",
      datePlaceholder: "yyyy-mm-dd",
      timePlaceholder: "--:--",
    },
    error: {
      dateRequired: "Introduce una fecha de nacimiento válida (YYYY-MM-DD).",
      timeRequired: "Introduce una hora de nacimiento válida (HH:MM).",
      cityRequired: "Busca y selecciona tu ciudad de nacimiento.",
      timezoneRequired: "Selecciona una zona horaria.",
      noData: "No hay datos de análisis del servidor.",
      unknown: "Error desconocido.",
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
  hi: {
    app: {
      title: "destinypal",
      subtitle: "एआई के साथ ब्रह्मांडीय पैटर्न का विश्लेषण करके अपनी नियति का मानचित्र खोलें",
      visitors: "आज के आगंतुक",
      myJourney: "मेरा सफर",
      community: "समुदाय",
      back: "वापस",
      name: "नाम",
      namePh: "आपका नाम",
      birthDate: "जन्म तिथि",
      birthTime: "जन्म समय",
      birthCity: "जन्म शहर (अंग्रेज़ी)",
      cityPh: "Seoul",
      gender: "लिंग",
      male: "पुरुष",
      female: "महिला",
      other: "अन्य",
      preferNot: "कहना नहीं चाहते",
      analyze: "विश्लेषण करें",
    },
    ui: {
      tipChooseCity: "सुझाव: शहर चुनें; समय क्षेत्र स्वतः सेट हो जाएगा।",
      timeZone: "समय क्षेत्र",
      changeManually: "मैन्युअली बदलें",
      generate: "मेरा चार्ट बनाएं",
      analyzing: "विश्लेषण हो रहा है...",
      titleAstrology: "एआई जन्म कुंडली",
      subtitleAstrology: "जन्म जानकारी के आधार पर अपनी कॉस्मिक मैप जानें।",
      datePlaceholder: "yyyy-mm-dd",
      timePlaceholder: "--:--",
    },
    error: {
      dateRequired: "कृपया मान्य जन्म तिथि दर्ज करें (YYYY-MM-DD)।",
      timeRequired: "कृपया मान्य जन्म समय दर्ज करें (HH:MM)।",
      cityRequired: "कृपया जन्म शहर खोजकर चुनें।",
      timezoneRequired: "कृपया समय क्षेत्र चुनें।",
      noData: "सर्वर से विश्लेषण डेटा नहीं मिला।",
      unknown: "अज्ञात त्रुटि।",
    },
    menu: {
      destinyMap: "भाग्य मानचित्र",
      saju: "साजू",
      astrology: "ज्योतिष",
      iching: "आई चिंग",
      tarot: "टैरो",
      dream: "स्वप्न",
      numerology: "अंकज्योतिष",
      compatibility: "मिलान",
      personality: "व्यक्तित्व",
    },
    emoji: { sparkles: "✨" },
  },
  ru: {
    app: {
      title: "destinypal",
      subtitle: "Раскройте свою карту судьбы, анализируя космические узоры с ИИ",
      visitors: "Посетители сегодня",
      myJourney: "Мой путь",
      community: "Сообщество",
      back: "Назад",
      name: "Имя",
      namePh: "Ваше имя",
      birthDate: "Дата рождения",
      birthTime: "Время рождения",
      birthCity: "Город рождения (на англ.)",
      cityPh: "Сеул",
      gender: "Пол",
      male: "Мужчина",
      female: "Женщина",
      other: "Другое",
      preferNot: "Предпочитаю не указывать",
      analyze: "Анализировать",
    },
    ui: {
      tipChooseCity: "Подсказка: выберите город — часовой пояс установится автоматически.",
      timeZone: "Часовой пояс",
      changeManually: "Изменить вручную",
      generate: "Сгенерировать мою карту",
      analyzing: "Анализ...",
      titleAstrology: "Натальная карта ИИ",
      subtitleAstrology: "Исследуйте свою космическую карту по данным о рождении.",
      datePlaceholder: "yyyy-mm-dd",
      timePlaceholder: "--:--",
    },
    error: {
      dateRequired: "Введите корректную дату рождения (YYYY-MM-DD).",
      timeRequired: "Введите корректное время рождения (HH:MM).",
      cityRequired: "Найдите и выберите город рождения.",
      timezoneRequired: "Выберите часовой пояс.",
      noData: "Нет данных анализа с сервера.",
      unknown: "Неизвестная ошибка.",
    },
    menu: {
      destinyMap: "Карта судьбы",
      saju: "Саджу",
      astrology: "Астрология",
      iching: "И-цзин",
      tarot: "Таро",
      dream: "Сны",
      numerology: "Нумерология",
      compatibility: "Совместимость",
      personality: "Личность",
    },
    emoji: { sparkles: "✨" },
  },
  fr: {
    app: {
      title: "destinypal",
      subtitle: "Déployez votre carte du destin en analysant les schémas cosmiques avec l’IA",
      visitors: "Visiteurs aujourd’hui",
      myJourney: "Mon parcours",
      community: "Communauté",
      back: "Retour",
      name: "Nom",
      namePh: "Votre nom",
      birthDate: "Date de naissance",
      birthTime: "Heure de naissance",
      birthCity: "Ville de naissance (anglais)",
      cityPh: "Séoul",
      gender: "Genre",
      male: "Homme",
      female: "Femme",
      other: "Autre",
      preferNot: "Préférer ne pas le dire",
      analyze: "Analyser",
    },
    ui: {
      tipChooseCity: "Astuce : choisissez une ville ; le fuseau horaire sera défini automatiquement.",
      timeZone: "Fuseau horaire",
      changeManually: "Modifier manuellement",
      generate: "Générer ma carte",
      analyzing: "Analyse…",
      titleAstrology: "Carte natale IA",
      subtitleAstrology: "Découvrez votre carte cosmique selon vos informations de naissance.",
      datePlaceholder: "yyyy-mm-dd",
      timePlaceholder: "--:--",
    },
    error: {
      dateRequired: "Veuillez saisir une date de naissance valide (YYYY-MM-DD).",
      timeRequired: "Veuillez saisir une heure de naissance valide (HH:MM).",
      cityRequired: "Veuillez rechercher et sélectionner votre ville de naissance.",
      timezoneRequired: "Veuillez sélectionner un fuseau horaire.",
      noData: "Aucune donnée d’analyse du serveur.",
      unknown: "Erreur inconnue.",
    },
    menu: {
      destinyMap: "Carte du destin",
      saju: "Saju",
      astrology: "Astrologie",
      iching: "Yi Jing",
      tarot: "Tarot",
      dream: "Rêves",
      numerology: "Numérologie",
      compatibility: "Compatibilité",
      personality: "Personnalité",
    },
    emoji: { sparkles: "✨" },
  },
  ja: {
    app: {
      title: "destinypal",
      subtitle: "AIで宇宙のパターンを分析し、あなただけの運命マップを描こう",
      visitors: "本日の訪問者",
      myJourney: "私の旅路",
      community: "コミュニティ",
      back: "戻る",
      name: "名前",
      namePh: "お名前",
      birthDate: "生年月日",
      birthTime: "出生時刻",
      birthCity: "出生都市（英語）",
      cityPh: "Seoul",
      gender: "性別",
      male: "男性",
      female: "女性",
      other: "その他",
      preferNot: "回答しない",
      analyze: "分析する",
    },
    ui: {
      tipChooseCity: "ヒント：都市を選ぶとタイムゾーンは自動設定されます。",
      timeZone: "タイムゾーン",
      changeManually: "手動で変更",
      generate: "マイチャートを作成",
      analyzing: "分析中…",
      titleAstrology: "AIネータルチャート",
      subtitleAstrology: "出生情報に基づくあなたのコズミックマップを探検しよう。",
      datePlaceholder: "yyyy-mm-dd",
      timePlaceholder: "--:--",
    },
    error: {
      dateRequired: "有効な生年月日を入力してください（YYYY-MM-DD）。",
      timeRequired: "有効な出生時刻を入力してください（HH:MM）。",
      cityRequired: "出生都市を検索して選択してください。",
      timezoneRequired: "タイムゾーンを選択してください。",
      noData: "サーバーから分析データがありません。",
      unknown: "不明なエラーです。",
    },
    menu: {
      destinyMap: "運命マップ",
      saju: "四柱推命",
      astrology: "占星術",
      iching: "易経",
      tarot: "タロット",
      dream: "夢解釈",
      numerology: "数秘術",
      compatibility: "相性",
      personality: "性格",
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

// dicts에서 자동 파생하여 타입 안정
const SUPPORTED = Object.keys(dicts) as Locale[];
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
      const nav2 = navigator.language?.slice(0, 2) as Locale | undefined;
      if (nav2 && SUPPORTED.includes(nav2)) setLocale(nav2);
    } catch {}
  }, []);

  // lang/dir 반영 + 저장 (SSR 가드)
  useEffect(() => {
    try {
      localStorage.setItem("locale", locale);
    } catch {}
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      document.documentElement.dir = isRtl(locale) ? "rtl" : "ltr";
    }
  }, [locale]);

  // t 함수: 현재 언어 → 영어 → 마지막 세그먼트
  const t = useMemo(() => {
    const getter = (obj: unknown, path: string) => {
      if (!path) return undefined;
      const parts = path.split(".");
      let cur: unknown = obj;
      for (const k of parts) {
        if (cur !== null && typeof cur === "object" && k in (cur as Record<string, unknown>)) {
          cur = (cur as Record<string, unknown>)[k];
        } else {
          return undefined;
        }
      }
      return cur;
    };

    return (path: string) => {
      const got = getter(dicts[locale], path);
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