//src/components/destiny-map/Display.tsx

"use client";

import React, { useState, useMemo } from "react";
import type { DestinyResult } from "./Analyzer";
import styles from "@/app/destiny-map/result/result.module.css";

// Structured fortune response types
interface ImportantYear {
  year: number;
  age: number;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  sajuReason: string;
  astroReason: string;
  advice?: string;
}

interface CategoryAnalysis {
  icon: string;
  title: string;
  sajuAnalysis: string;
  astroAnalysis: string;
  crossInsight: string;
  keywords?: string[];
  idealPartner?: string;
  timing?: string;
  suitableCareers?: string[];
  wealthType?: string;
  vulnerabilities?: string[];
  advice?: string;
}

interface KeyInsight {
  type: "strength" | "opportunity" | "caution" | "advice";
  text: string;
  icon?: string;
}

interface LuckyElements {
  colors?: string[];
  directions?: string[];
  numbers?: number[];
  items?: string[];
}

interface ThemeSection {
  id: string;
  icon: string;
  title: string;
  titleEn: string;
  content: string;
}

interface StructuredFortune {
  themeSummary?: string;
  sections?: ThemeSection[];
  lifeTimeline?: {
    description?: string;
    importantYears?: ImportantYear[];
  };
  categoryAnalysis?: Record<string, CategoryAnalysis>;
  keyInsights?: KeyInsight[];
  luckyElements?: LuckyElements;
  sajuHighlight?: { pillar: string; element: string; meaning: string };
  astroHighlight?: { planet: string; sign: string; meaning: string };
  crossHighlights?: { summary: string; points?: string[] };
}

type LangKey = "en" | "ko" | "ja" | "zh" | "es";
type ReportType = "core" | "timing" | "compat";

// Theme translations
const THEME_LABELS: Record<string, Record<LangKey, string>> = {
  // Focus themes
  focus_overall: { ko: "운명의 지도", en: "Destiny Map", ja: "運命の地図", zh: "命运地图", es: "Mapa del Destino" },
  focus_love: { ko: "연애운", en: "Love & Romance", ja: "恋愛運", zh: "爱情运", es: "Amor" },
  focus_career: { ko: "직업운", en: "Career & Work", ja: "仕事運", zh: "事业运", es: "Carrera" },
  focus_wealth: { ko: "재물운", en: "Wealth & Finance", ja: "金運", zh: "财运", es: "Riqueza" },
  focus_health: { ko: "건강운", en: "Health & Vitality", ja: "健康運", zh: "健康运", es: "Salud" },
  focus_energy: { ko: "기운/에너지", en: "Energy & Vitality", ja: "エネルギー", zh: "能量", es: "Energía" },
  focus_family: { ko: "가정운", en: "Family & Home", ja: "家庭運", zh: "家庭运", es: "Familia" },
  focus_social: { ko: "대인관계", en: "Social & Relationships", ja: "対人運", zh: "人际关系", es: "Social" },
  // Fortune themes
  fortune_new_year: { ko: "신년 운세", en: "New Year Fortune", ja: "新年運勢", zh: "新年运势", es: "Fortuna de Año Nuevo" },
  fortune_next_year: { ko: "내년 운세", en: "Next Year Fortune", ja: "来年運勢", zh: "明年运势", es: "Fortuna del Próximo Año" },
  fortune_monthly: { ko: "월운", en: "Monthly Fortune", ja: "月運", zh: "月运", es: "Fortuna Mensual" },
  fortune_today: { ko: "오늘의 운세", en: "Today's Fortune", ja: "今日の運勢", zh: "今日运势", es: "Fortuna de Hoy" },
};

const getThemeLabel = (themeKey: string, lang: LangKey): string => {
  // Normalize to lowercase for consistent lookup
  const normalizedKey = themeKey?.toLowerCase?.() || themeKey;
  return THEME_LABELS[normalizedKey]?.[lang] || THEME_LABELS[normalizedKey]?.en || themeKey;
};

// Try to parse JSON from interpretation text
function tryParseStructured(text: string): StructuredFortune | null {
  if (!text) return null;

  // Clean the text first
  let cleanText = text
    .replace(/```json\s*/gi, '')  // Remove markdown code blocks
    .replace(/```\s*/g, '')
    .trim();

  try {
    // Try direct JSON parse first
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.lifeTimeline || parsed.categoryAnalysis || parsed.keyInsights) {
        return parsed as StructuredFortune;
      }
    }

    // If no outer braces, try wrapping the content
    if (cleanText.includes('"lifeTimeline"') || cleanText.includes('"categoryAnalysis"')) {
      // Add outer braces if missing
      if (!cleanText.startsWith('{')) {
        cleanText = '{' + cleanText;
      }
      if (!cleanText.endsWith('}')) {
        cleanText = cleanText + '}';
      }

      try {
        const parsed = JSON.parse(cleanText);
        if (parsed.lifeTimeline || parsed.categoryAnalysis || parsed.keyInsights) {
          return parsed as StructuredFortune;
        }
      } catch {
        // Continue to fallback
      }
    }

    return null;
  } catch {
    return null;
  }
}

// Star rating component
function StarRating({ rating }: { rating: number }) {
  return (
    <span style={{ color: "#ffd166", letterSpacing: 2 }}>
      {"★".repeat(rating)}{"☆".repeat(5 - rating)}
    </span>
  );
}

// Life Timeline component (인생 타임라인)
function LifeTimelineSection({
  data,
  lang
}: {
  data: StructuredFortune["lifeTimeline"];
  lang: LangKey;
}) {
  if (!data?.importantYears?.length) return null;

  const labels: Record<LangKey, { title: string; age: string; saju: string; astro: string }> = {
    ko: { title: "📅 인생 주요 시점", age: "세", saju: "사주", astro: "점성" },
    en: { title: "📅 Life Timeline", age: "years old", saju: "Saju", astro: "Astro" },
    ja: { title: "📅 人生のタイムライン", age: "歳", saju: "四柱", astro: "占星" },
    zh: { title: "📅 人生时间线", age: "岁", saju: "四柱", astro: "占星" },
    es: { title: "📅 Línea de Vida", age: "años", saju: "Saju", astro: "Astro" },
  };
  const t = labels[lang] || labels.en;

  return (
    <div className={styles.timelineSection}>
      <h3 className={styles.sectionTitle}>{t.title}</h3>
      {data.description && <p className={styles.timelineDesc}>{data.description}</p>}
      <div className={styles.timeline}>
        {data.importantYears.map((year, i) => (
          <div key={i} className={styles.timelineItem}>
            <div className={styles.timelineYear}>
              <span className={styles.yearValue}>{year.year}</span>
              <span className={styles.yearAge}>({year.age}{t.age})</span>
              <StarRating rating={year.rating} />
            </div>
            <div className={styles.timelineContent}>
              <h4 className={styles.timelineTitle}>{year.title}</h4>
              <div className={styles.timelineReasons}>
                <div className={styles.reasonRow}>
                  <span className={styles.sajuTag}>{t.saju}</span>
                  <span>{year.sajuReason}</span>
                </div>
                <div className={styles.reasonRow}>
                  <span className={styles.astroTag}>{t.astro}</span>
                  <span>{year.astroReason}</span>
                </div>
              </div>
              {year.advice && <p className={styles.timelineAdvice}>💡 {year.advice}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Category Analysis component (카테고리별 분석)
function CategoryAnalysisSection({
  categories,
  lang
}: {
  categories: Record<string, CategoryAnalysis>;
  lang: LangKey;
}) {
  if (!categories || Object.keys(categories).length === 0) return null;

  const labels: Record<LangKey, { saju: string; astro: string; cross: string }> = {
    ko: { saju: "사주 분석", astro: "점성 분석", cross: "교차 인사이트" },
    en: { saju: "Saju Analysis", astro: "Astro Analysis", cross: "Cross Insight" },
    ja: { saju: "四柱分析", astro: "占星分析", cross: "クロス分析" },
    zh: { saju: "四柱分析", astro: "占星分析", cross: "交叉洞察" },
    es: { saju: "Análisis Saju", astro: "Análisis Astro", cross: "Insight Cruzado" },
  };
  const t = labels[lang] || labels.en;

  const categoryOrder = ["personality", "appearance", "love", "family", "friends", "career", "wealth", "health"];
  const sortedCategories = categoryOrder
    .filter(key => categories[key])
    .map(key => ({ key, ...categories[key] }));

  return (
    <div className={styles.categorySection}>
      {sortedCategories.map((cat) => (
        <div key={cat.key} className={styles.categoryCard}>
          <h3 className={styles.categoryTitle}>
            <span className={styles.categoryIcon}>{cat.icon}</span>
            {cat.title}
          </h3>

          <div className={styles.analysisGrid}>
            <div className={styles.analysisBox}>
              <span className={styles.analysisLabel}>{t.saju}</span>
              <p>{cat.sajuAnalysis}</p>
            </div>
            <div className={styles.analysisBox}>
              <span className={styles.analysisLabel}>{t.astro}</span>
              <p>{cat.astroAnalysis}</p>
            </div>
          </div>

          <div className={styles.crossInsight}>
            <span className={styles.crossLabel}>✨ {t.cross}</span>
            <p>{cat.crossInsight}</p>
          </div>

          {cat.keywords && cat.keywords.length > 0 && (
            <div className={styles.keywords}>
              {cat.keywords.map((kw, i) => (
                <span key={i} className={styles.keyword}>{kw}</span>
              ))}
            </div>
          )}

          {cat.suitableCareers && cat.suitableCareers.length > 0 && (
            <div className={styles.careerList}>
              <strong>💼</strong> {cat.suitableCareers.join(", ")}
            </div>
          )}

          {cat.timing && <p className={styles.timing}>⏰ {cat.timing}</p>}
          {cat.idealPartner && <p className={styles.partner}>💕 {cat.idealPartner}</p>}
          {cat.wealthType && <p className={styles.wealthType}>💰 {cat.wealthType}</p>}
          {cat.advice && <p className={styles.catAdvice}>💡 {cat.advice}</p>}
        </div>
      ))}
    </div>
  );
}

// Lucky Elements component (행운의 요소)
function LuckyElementsSection({
  data,
  lang
}: {
  data: LuckyElements;
  lang: LangKey;
}) {
  if (!data) return null;

  const labels: Record<LangKey, { title: string; colors: string; directions: string; numbers: string; items: string }> = {
    ko: { title: "🍀 행운의 요소", colors: "색상", directions: "방향", numbers: "숫자", items: "아이템" },
    en: { title: "🍀 Lucky Elements", colors: "Colors", directions: "Directions", numbers: "Numbers", items: "Items" },
    ja: { title: "🍀 ラッキー要素", colors: "色", directions: "方角", numbers: "数字", items: "アイテム" },
    zh: { title: "🍀 幸运元素", colors: "颜色", directions: "方向", numbers: "数字", items: "物品" },
    es: { title: "🍀 Elementos de Suerte", colors: "Colores", directions: "Direcciones", numbers: "Números", items: "Artículos" },
  };
  const t = labels[lang] || labels.en;

  return (
    <div className={styles.luckySection}>
      <h4>{t.title}</h4>
      <div className={styles.luckyGrid}>
        {data.colors?.length && (
          <div className={styles.luckyItem}>
            <span className={styles.luckyLabel}>🎨 {t.colors}</span>
            <span>{data.colors.join(", ")}</span>
          </div>
        )}
        {data.directions?.length && (
          <div className={styles.luckyItem}>
            <span className={styles.luckyLabel}>🧭 {t.directions}</span>
            <span>{data.directions.join(", ")}</span>
          </div>
        )}
        {data.numbers?.length && (
          <div className={styles.luckyItem}>
            <span className={styles.luckyLabel}>🔢 {t.numbers}</span>
            <span>{data.numbers.join(", ")}</span>
          </div>
        )}
        {data.items?.length && (
          <div className={styles.luckyItem}>
            <span className={styles.luckyLabel}>✨ {t.items}</span>
            <span>{data.items.join(", ")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Key insights component
function KeyInsightsSection({ insights, lang }: { insights: KeyInsight[]; lang: LangKey }) {
  // Filter out insights without actual text content
  const validInsights = insights?.filter(i => i.text && i.text.trim().length > 0);
  if (!validInsights || validInsights.length === 0) return null;

  const typeIcons: Record<string, string> = {
    strength: "💪",
    opportunity: "🚀",
    caution: "⚠️",
    advice: "💡",
  };

  const typeLabels: Record<LangKey, Record<string, string>> = {
    ko: { strength: "강점", opportunity: "기회", caution: "주의", advice: "조언" },
    en: { strength: "Strength", opportunity: "Opportunity", caution: "Caution", advice: "Advice" },
    ja: { strength: "強み", opportunity: "機会", caution: "注意", advice: "アドバイス" },
    zh: { strength: "优势", opportunity: "机会", caution: "注意", advice: "建议" },
    es: { strength: "Fortaleza", opportunity: "Oportunidad", caution: "Precaución", advice: "Consejo" },
  };
  const t = typeLabels[lang] || typeLabels.en;

  return (
    <div className={styles.insightsSection}>
      {validInsights.map((insight, i) => (
        <div key={i} className={`${styles.insightCard} ${styles[`insight_${insight.type}`]}`}>
          <span className={styles.insightIcon}>{insight.icon || typeIcons[insight.type] || "✦"}</span>
          <div>
            <span className={styles.insightType}>{t[insight.type] || insight.type}</span>
            <p className={styles.insightText}>{insight.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Theme Sections component (테마별 섹션 카드)
function ThemeSectionsDisplay({ sections, lang }: { sections: ThemeSection[]; lang: LangKey }) {
  if (!sections || sections.length === 0) return null;

  return (
    <div className={styles.themeSections}>
      {sections.map((section) => (
        <div key={section.id} className={styles.themeSection}>
          <div className={styles.themeSectionHeader}>
            <span className={styles.themeSectionIcon}>{section.icon}</span>
            <h3 className={styles.themeSectionTitle}>
              {lang === "en" ? section.titleEn : section.title}
            </h3>
          </div>
          <div className={styles.themeSectionContent}>
            {section.content.split('\n').map((line, i) => (
              <p key={i}>{line.replace(/\*\*(.*?)\*\*/g, '$1')}</p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

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

// Helper to find theme data with case-insensitive key matching
const findThemeData = (themes: Record<string, unknown> | undefined, themeKey: string) => {
  if (!themes || !themeKey) return undefined;
  // Try exact match first
  if (themes[themeKey]) return { key: themeKey, data: themes[themeKey] };
  // Try case-insensitive match
  const normalizedKey = themeKey.toLowerCase();
  const matchingKey = Object.keys(themes).find(k => k.toLowerCase() === normalizedKey);
  if (matchingKey) return { key: matchingKey, data: themes[matchingKey] };
  return undefined;
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

  // Find theme data with case-insensitive matching
  const themeMatch = findThemeData(result?.themes, activeTheme);
  const themed = themeMatch?.data;
  const name = result?.profile?.name?.trim() || tr.userFallback;
  const interpretationText =
    typeof ((themed as Record<string, unknown>))?.interpretation === "string" ? ((themed as Record<string, unknown>)).interpretation : "";

  // Try to parse structured JSON from interpretation
  const structuredData = useMemo(() => {
    if (!interpretationText.trim()) return null;
    return tryParseStructured(interpretationText);
  }, [interpretationText]);

  const errorMessage = result.errorMessage || result.error;
  if (errorMessage) {
    return (
      <div className={styles.summary}>
        Analysis failed: {errorMessage}
      </div>
    );
  }

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
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px',
          padding: '12px 32px',
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(59, 130, 246, 0.15))',
          borderRadius: '50px',
          border: '1px solid rgba(167, 139, 250, 0.3)',
          backdropFilter: 'blur(10px)',
        }}>
          <span style={{ fontSize: '32px', filter: 'drop-shadow(0 0 10px rgba(167, 139, 250, 0.6))' }}>✨</span>
          <h2 className={styles.title} style={{ margin: 0, fontSize: '2rem', textShadow: 'none' }}>
            {structuredData?.themeSummary || getThemeLabel(activeTheme, lang)}
          </h2>
          <span style={{ fontSize: '32px', filter: 'drop-shadow(0 0 10px rgba(167, 139, 250, 0.6))' }}>✨</span>
        </div>

        <div className={styles.profile}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            width: '100%'
          }}>
            <div className={styles.profileName}>{name}</div>
            {result?.profile?.birthDate && (
              <div className={styles.profileMeta} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '0.95rem',
                color: 'rgba(167, 139, 250, 0.9)'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ opacity: 0.7 }}>📅</span>
                  {result.profile.birthDate}
                </span>
                {result?.profile?.birthTime && (
                  <>
                    <span style={{ opacity: 0.5 }}>•</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ opacity: 0.7 }}>🕐</span>
                      {result.profile.birthTime}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Theme Sections - 테마별 섹션 카드 (새 템플릿 포맷) */}
      {structuredData?.sections && structuredData.sections.length > 0 && (
        <ThemeSectionsDisplay sections={structuredData.sections} lang={lang} />
      )}

      {/* Key Insights - Top summary */}
      {structuredData?.keyInsights && (
        <div className={styles.section}>
          <KeyInsightsSection insights={structuredData.keyInsights} lang={lang} />
        </div>
      )}

      {/* Lucky Elements */}
      {structuredData?.luckyElements && (
        <LuckyElementsSection data={structuredData.luckyElements} lang={lang} />
      )}

      {/* Life Timeline (인생 주요 시점) */}
      {structuredData?.lifeTimeline && (
        <LifeTimelineSection data={structuredData.lifeTimeline} lang={lang} />
      )}

      {/* Category Analysis (카테고리별 분석) */}
      {structuredData?.categoryAnalysis && (
        <CategoryAnalysisSection categories={structuredData.categoryAnalysis} lang={lang} />
      )}

      {/* Saju & Astro Highlights */}
      {(structuredData?.sajuHighlight || structuredData?.astroHighlight) && (
        <div className={styles.highlightsRow}>
          {structuredData.sajuHighlight && (
            <div className={styles.highlightCard}>
              <span className={styles.highlightIcon}>☯️</span>
              <div>
                <div className={styles.highlightTitle}>{structuredData.sajuHighlight.pillar}</div>
                <div className={styles.highlightElement}>{structuredData.sajuHighlight.element}</div>
                <p>{structuredData.sajuHighlight.meaning}</p>
              </div>
            </div>
          )}
          {structuredData.astroHighlight && (
            <div className={styles.highlightCard}>
              <span className={styles.highlightIcon}>✨</span>
              <div>
                <div className={styles.highlightTitle}>{structuredData.astroHighlight.planet}</div>
                <div className={styles.highlightElement}>{structuredData.astroHighlight.sign}</div>
                <p>{structuredData.astroHighlight.meaning}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content - 제거됨: FunInsights 컴포넌트에서 스토리텔링 형식으로 통합 표시 */}

      {/* 후속 질문하기 섹션 제거 - 상담사 페이지에서 동일 기능 제공 */}
    </div>
  );
}
