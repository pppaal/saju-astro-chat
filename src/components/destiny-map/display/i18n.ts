// src/components/destiny-map/display/i18n.ts

import type { LangKey } from "./types";

// Theme translations
export const THEME_LABELS: Record<string, Record<LangKey, string>> = {
  focus_overall: { ko: "운명의 지도", en: "Destiny Map", ja: "運命の地図", zh: "命运地图", es: "Mapa del Destino" },
  focus_love: { ko: "연애운", en: "Love & Romance", ja: "恋愛運", zh: "爱情运", es: "Amor" },
  focus_career: { ko: "직업운", en: "Career & Work", ja: "仕事運", zh: "事业运", es: "Carrera" },
  focus_wealth: { ko: "재물운", en: "Wealth & Finance", ja: "金運", zh: "财运", es: "Riqueza" },
  focus_health: { ko: "건강운", en: "Health & Vitality", ja: "健康運", zh: "健康运", es: "Salud" },
  focus_energy: { ko: "기운/에너지", en: "Energy & Vitality", ja: "エネルギー", zh: "能量", es: "Energía" },
  focus_family: { ko: "가정운", en: "Family & Home", ja: "家庭運", zh: "家庭运", es: "Familia" },
  focus_social: { ko: "대인관계", en: "Social & Relationships", ja: "対人運", zh: "人际关系", es: "Social" },
  fortune_new_year: { ko: "신년 운세", en: "New Year Fortune", ja: "新年運勢", zh: "新年运势", es: "Fortuna de Año Nuevo" },
  fortune_next_year: { ko: "내년 운세", en: "Next Year Fortune", ja: "来年運勢", zh: "明年运势", es: "Fortuna del Próximo Año" },
  fortune_monthly: { ko: "월운", en: "Monthly Fortune", ja: "月運", zh: "月运", es: "Fortuna Mensual" },
  fortune_today: { ko: "오늘의 운세", en: "Today's Fortune", ja: "今日の運勢", zh: "今日运势", es: "Fortuna de Hoy" },
};

export const getThemeLabel = (themeKey: string, lang: LangKey): string => {
  const normalizedKey = themeKey?.toLowerCase?.() || themeKey;
  return THEME_LABELS[normalizedKey]?.[lang] || THEME_LABELS[normalizedKey]?.en || themeKey;
};

export const I18N: Record<LangKey, {
  userFallback: string;
  analysisFallback: string;
  tagline: string;
  followup: string;
  birthDate: string;
}> = {
  ko: {
    userFallback: "사용자",
    analysisFallback: "분석을 불러오지 못했습니다.",
    tagline: "동양과 서양의 지혜를 융합한 맞춤 운세 분석",
    followup: "후속 질문하기",
    birthDate: "생년월일",
  },
  en: {
    userFallback: "User",
    analysisFallback: "Failed to load analysis.",
    tagline: "Your personalized destiny reading combining Eastern & Western wisdom",
    followup: "Ask a follow-up question",
    birthDate: "Birth Date",
  },
  ja: {
    userFallback: "ユーザー",
    analysisFallback: "分析の読み込みに失敗しました。",
    tagline: "東洋と西洋の知恵を融合したカスタム運勢分析",
    followup: "追加で質問する",
    birthDate: "生年月日",
  },
  zh: {
    userFallback: "用户",
    analysisFallback: "无法加载分析。",
    tagline: "融合东西方智慧的定制命运分析",
    followup: "继续提问",
    birthDate: "出生日期",
  },
  es: {
    userFallback: "Usuario",
    analysisFallback: "Error al cargar el análisis.",
    tagline: "Tu lectura de destino personalizada combinando sabiduría oriental y occidental",
    followup: "Hacer una pregunta de seguimiento",
    birthDate: "Fecha de nacimiento",
  },
};
