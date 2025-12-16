//src/components/destiny-map/Display.tsx

"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import DOMPurify from "dompurify";
import type { DestinyResult } from "./Analyzer";
import Chat from "./Chat";
import styles from "@/app/destiny-map/result/result.module.css";

type LangKey = "en" | "ko" | "ja" | "zh" | "es";
type ReportType = "core" | "timing" | "compat";

// Theme translations
const THEME_LABELS: Record<string, Record<LangKey, string>> = {
  focus_overall: { ko: "종합 운세", en: "Overall Fortune", ja: "総合運勢", zh: "综合运势", es: "Fortuna General" },
  focus_love: { ko: "연애운", en: "Love & Romance", ja: "恋愛運", zh: "爱情运", es: "Amor" },
  focus_career: { ko: "직업운", en: "Career & Work", ja: "仕事運", zh: "事业运", es: "Carrera" },
  focus_wealth: { ko: "재물운", en: "Wealth & Finance", ja: "金運", zh: "财运", es: "Riqueza" },
  focus_health: { ko: "건강운", en: "Health & Vitality", ja: "健康運", zh: "健康运", es: "Salud" },
  focus_energy: { ko: "기운/에너지", en: "Energy & Vitality", ja: "エネルギー", zh: "能量", es: "Energía" },
  focus_family: { ko: "가정운", en: "Family & Home", ja: "家庭運", zh: "家庭运", es: "Familia" },
  focus_social: { ko: "대인관계", en: "Social & Relationships", ja: "対人運", zh: "人际关系", es: "Social" },
};

const getThemeLabel = (themeKey: string, lang: LangKey): string => {
  return THEME_LABELS[themeKey]?.[lang] || THEME_LABELS[themeKey]?.en || themeKey;
};

const I18N: Record<LangKey, {
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

export default function Display({
  result,
  lang = "ko",
  theme,
  reportType: _reportType = "core",
}: {
  result: DestinyResult;
  lang?: LangKey;
  theme?: string;
  reportType?: ReportType;
}) {
  const themeKeys = Object.keys(result?.themes || {});
  const [activeTheme, setActiveTheme] = useState(
    theme || themeKeys[0] || "focus_overall"
  );
  const tr = I18N[lang] ?? I18N.en;

  if ((result as any)?.error) {
    return (
      <div className={styles.summary}>
        Analysis failed: {(result as any).errorMessage || (result as any).error}
      </div>
    );
  }

  const themed = result?.themes?.[activeTheme];
  const name = result?.profile?.name?.trim() || tr.userFallback;

  const fixedText =
    typeof themed?.interpretation === "string"
      ? themed.interpretation
          .replace(/##+\s*/g, "## ")
      : tr.analysisFallback;

  return (
    <div>
      {themeKeys.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          {themeKeys.map((key) => (
            <button
              key={key}
              onClick={() => setActiveTheme(key)}
              className={styles.badge}
              aria-pressed={activeTheme === key}
              style={{
                background: activeTheme === key ? "#2563eb" : "transparent",
                color: activeTheme === key ? "#fff" : "inherit",
                borderColor: activeTheme === key ? "#2563eb" : "#4b5563",
                padding: "6px 12px",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              {key}
            </button>
          ))}
        </div>
      )}

      <div className={styles.header}>
        <h2 className={styles.title}>{getThemeLabel(activeTheme, lang)}</h2>
        <p className={styles.subtitle}>{tr.tagline}</p>
        <div className={styles.profile}>
          <div className={styles.profileName}>{name}</div>
          {result?.profile?.birthDate && (
            <div className={styles.profileMeta}>
              <span>{tr.birthDate}: {result.profile.birthDate}</span>
              {result?.profile?.birthTime && <span> · {result.profile.birthTime}</span>}
            </div>
          )}
        </div>
      </div>

      <div className={styles.summary}>
        <ReactMarkdown
          skipHtml={true}
          components={{
            h1: (props) => <h2 className={styles.h2} {...props} />,
            h2: (props) => <h3 className={styles.h2} {...props} />,
            ul: (props) => <ul style={{ marginLeft: 20, lineHeight: 1.7 }} {...props} />,
            li: (props) => <li style={{ marginBottom: 6 }} {...props} />,
            p: (props) => <p style={{ marginBottom: 12 }} {...props} />,
          }}
        >
          {DOMPurify.sanitize(fixedText, {
            ALLOWED_TAGS: [],
            ALLOWED_ATTR: [],
            USE_PROFILES: { html: false },
          })}
        </ReactMarkdown>
      </div>

      <div className={styles.section}>
        <h3 className={styles.h2}>{tr.followup}</h3>
        <Chat
          profile={result?.profile as any}
          lang={lang}
          theme={activeTheme}
        />
      </div>
    </div>
  );
}
