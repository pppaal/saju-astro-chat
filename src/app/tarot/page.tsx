"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import BackButton from "@/components/ui/BackButton";
import { tarotThemes } from "@/lib/Tarot/tarot-spreads-data";
import { recommendSpreads, quickQuestions, SpreadRecommendation } from "@/lib/Tarot/tarot-recommend";
import CounselorSelect from "@/components/tarot/CounselorSelect";
import { TarotCounselor, defaultCounselor, recommendCounselorByTheme } from "@/lib/Tarot/tarot-counselors";
import styles from "./tarot-home.module.css";

// 테마별 아이콘과 그라데이션
const themeStyles: Record<string, { icon: string; gradient: string }> = {
  "general-insight": {
    icon: "🔮",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
  },
  "love-relationships": {
    icon: "💕",
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
  },
  "career-work": {
    icon: "💼",
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
  },
  "money-finance": {
    icon: "💰",
    gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
  },
  "well-being-health": {
    icon: "🌿",
    gradient: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)"
  },
  "spiritual-growth": {
    icon: "✨",
    gradient: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)"
  },
  "decisions-crossroads": {
    icon: "⚖️",
    gradient: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)"
  },
  "self-discovery": {
    icon: "🪞",
    gradient: "linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)"
  },
  "daily-reading": {
    icon: "☀️",
    gradient: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)"
  }
};

// 카드 개수별 아이콘
function getCardIcon(count: number): string {
  if (count === 1) return "🃏";
  if (count === 2) return "🃏🃏";
  if (count === 3) return "🃏🃏🃏";
  if (count <= 5) return "🃏×" + count;
  return "🃏×" + count;
}

// 최근 질문 저장/불러오기
const RECENT_QUESTIONS_KEY = "tarot_recent_questions";
const MAX_RECENT_QUESTIONS = 5;

function getRecentQuestions(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_QUESTIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentQuestion(question: string) {
  if (typeof window === "undefined" || !question.trim()) return;
  try {
    const recent = getRecentQuestions();
    const filtered = recent.filter(q => q !== question);
    const updated = [question, ...filtered].slice(0, MAX_RECENT_QUESTIONS);
    localStorage.setItem(RECENT_QUESTIONS_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export default function TarotHomePage() {
  const { translate, language } = useI18n();
  const router = useRouter();
  const isKo = language === 'ko';

  // 질문 입력 상태
  const [question, setQuestion] = useState("");
  const [showManualSelection, setShowManualSelection] = useState(false);
  const [activeTheme, setActiveTheme] = useState(tarotThemes[0]?.id || "general-insight");
  const [recentQuestions, setRecentQuestions] = useState<string[]>([]);
  const [animationKey, setAnimationKey] = useState(0);
  const [selectedCounselor, setSelectedCounselor] = useState<TarotCounselor>(defaultCounselor);

  // 최근 질문 불러오기
  useEffect(() => {
    setRecentQuestions(getRecentQuestions());
  }, []);

  // 질문 기반 추천 스프레드
  const recommendations = useMemo(() => {
    return recommendSpreads(question, 3);
  }, [question]);

  // 추천 스프레드에 따라 상담사 자동 추천
  useEffect(() => {
    if (recommendations.length > 0) {
      const topThemeId = recommendations[0].themeId;
      const recommendedCounselor = recommendCounselorByTheme(topThemeId);
      setSelectedCounselor(recommendedCounselor);
    }
  }, [recommendations]);

  // 질문 변경 시 애니메이션 트리거
  const handleQuestionChange = useCallback((newQuestion: string) => {
    setQuestion(newQuestion);
    setAnimationKey(prev => prev + 1);
  }, []);

  // 스프레드 선택 시 리딩 페이지로 이동
  const handleSpreadSelect = (rec: SpreadRecommendation) => {
    const finalQuestion = question || rec.spread.titleKo || rec.spread.title;
    saveRecentQuestion(finalQuestion);
    setRecentQuestions(getRecentQuestions());
    const encodedQuestion = encodeURIComponent(finalQuestion);
    const counselorParam = selectedCounselor ? `&counselor=${selectedCounselor.id}` : '';
    router.push(`/tarot/${rec.themeId}/${rec.spreadId}?question=${encodedQuestion}${counselorParam}`);
  };

  // 상담사 선택 핸들러
  const handleCounselorSelect = useCallback((counselor: TarotCounselor) => {
    setSelectedCounselor(counselor);
  }, []);

  // 빠른 질문 선택
  const handleQuickQuestion = (q: typeof quickQuestions[0]) => {
    handleQuestionChange(isKo ? q.question : q.questionEn);
  };

  // 최근 질문 선택
  const handleRecentQuestion = (q: string) => {
    handleQuestionChange(q);
  };

  // 최근 질문 삭제
  const handleDeleteRecent = (q: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentQuestions.filter(item => item !== q);
    localStorage.setItem(RECENT_QUESTIONS_KEY, JSON.stringify(updated));
    setRecentQuestions(updated);
  };

  const currentTheme = useMemo(() => {
    return tarotThemes.find((t) => t.id === activeTheme) || tarotThemes[0];
  }, [activeTheme]);

  const themeStyle = themeStyles[activeTheme] || themeStyles["general-insight"];

  return (
    <div className={styles.container}>
      <div className={styles.backButtonContainer}>
        <BackButton />
      </div>

      {/* Crystal Ball */}
      <div className={styles.crystalBallContainer}>
        <div className={styles.orbRing}></div>
        <div className={styles.orbRing2}></div>
        <div className={styles.crystalBall}>
          <div className={styles.innerGlow}></div>
          <div className={styles.sparkle} style={{ top: "25%", left: "35%" }}>✦</div>
          <div className={styles.sparkle} style={{ top: "55%", right: "30%" }}>✦</div>
        </div>
        <div className={styles.crystalBallBase}>
          <div className={styles.baseTop}></div>
          <div className={styles.baseMiddle}></div>
        </div>
      </div>

      {/* Counselor Selection */}
      <div className={styles.counselorSection}>
        <p className={styles.counselorLabel}>
          {isKo ? "🔮 상담사 선택" : "🔮 Choose Your Reader"}
        </p>
        <CounselorSelect
          selectedId={selectedCounselor?.id}
          onSelect={handleCounselorSelect}
          language={language as "ko" | "en"}
          recommendedId={recommendations.length > 0 ? recommendCounselorByTheme(recommendations[0].themeId).id : undefined}
        />
      </div>

      {/* Title */}
      <h1 className={styles.title}>
        {translate("tarot.home.title", isKo ? "무엇이 궁금하세요?" : "What's on your mind?")}
      </h1>
      <p className={styles.subtitle}>
        {translate("tarot.home.subtitle", isKo ? "질문을 입력하면 맞춤 스프레드를 추천해드려요" : "Enter your question and we'll recommend the perfect spread")}
      </p>

      {/* Question Input */}
      <div className={styles.questionInputContainer}>
        <div className={styles.questionInputWrapper}>
          <input
            type="text"
            className={styles.questionInput}
            placeholder={isKo ? "고민이나 궁금한 것을 적어보세요..." : "What would you like guidance on?"}
            value={question}
            onChange={(e) => handleQuestionChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && recommendations.length > 0) {
                handleSpreadSelect(recommendations[0]);
              }
            }}
          />
          {question && (
            <button
              className={styles.clearButton}
              onClick={() => handleQuestionChange("")}
              aria-label="Clear"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Recent Questions */}
      {recentQuestions.length > 0 && !question && (
        <div className={styles.recentSection}>
          <p className={styles.recentLabel}>{isKo ? "최근 질문" : "Recent"}</p>
          <div className={styles.recentQuestions}>
            {recentQuestions.map((q, idx) => (
              <button
                key={idx}
                className={styles.recentQuestionButton}
                onClick={() => handleRecentQuestion(q)}
              >
                <span className={styles.recentQuestionText}>{q}</span>
                <span
                  className={styles.recentDeleteButton}
                  onClick={(e) => handleDeleteRecent(q, e)}
                >
                  ×
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Questions */}
      <div className={styles.quickQuestions}>
        {quickQuestions.map((q, idx) => (
          <button
            key={idx}
            className={styles.quickQuestionButton}
            onClick={() => handleQuickQuestion(q)}
          >
            {isKo ? q.label : q.labelEn}
          </button>
        ))}
      </div>

      {/* Recommendations */}
      <div className={styles.recommendationsSection}>
        <h2 className={styles.recommendationsTitle}>
          {question
            ? (isKo ? "✨ 추천 스프레드" : "✨ Recommended Spreads")
            : (isKo ? "✨ 인기 스프레드" : "✨ Popular Spreads")
          }
        </h2>
        <div className={styles.recommendationsGrid} key={animationKey}>
          {recommendations.map((rec, idx) => {
            const style = themeStyles[rec.themeId];
            return (
              <button
                key={rec.spreadId}
                className={styles.recommendationCard}
                onClick={() => handleSpreadSelect(rec)}
                style={{
                  animationDelay: `${idx * 0.1}s`,
                  "--gradient": style?.gradient || themeStyles["general-insight"].gradient
                } as React.CSSProperties}
              >
                <div className={styles.recommendationIcon}>
                  {getCardIcon(rec.spread.cardCount)}
                </div>
                <div className={styles.recommendationContent}>
                  <h3 className={styles.recommendationTitle}>
                    {isKo ? rec.spread.titleKo || rec.spread.title : rec.spread.title}
                  </h3>
                  <span className={styles.recommendationCardCount}>
                    {rec.spread.cardCount} {isKo ? "장" : "cards"}
                  </span>
                  <p className={styles.recommendationReason}>
                    {isKo ? rec.reasonKo : rec.reason}
                  </p>
                </div>
                <div className={styles.recommendationTheme}>
                  <span className={styles.themeTag}>
                    {style?.icon} {isKo ? rec.theme.categoryKo || rec.theme.category : rec.theme.category}
                  </span>
                </div>
                <div className={styles.recommendationArrow}>→</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Toggle Manual Selection */}
      <button
        className={styles.manualToggle}
        onClick={() => setShowManualSelection(!showManualSelection)}
      >
        {showManualSelection
          ? (isKo ? "▲ 접기" : "▲ Collapse")
          : (isKo ? "▼ 직접 스프레드 선택하기" : "▼ Choose spread manually")
        }
      </button>

      {/* Manual Selection (Collapsible) */}
      {showManualSelection && (
        <div className={styles.manualSection}>
          {/* Theme Selector Pills */}
          <div className={styles.themeSelector}>
            {tarotThemes.map((theme) => {
              const style = themeStyles[theme.id];
              return (
                <button
                  key={theme.id}
                  className={`${styles.themeButton} ${theme.id === activeTheme ? styles.active : ""}`}
                  onClick={() => setActiveTheme(theme.id)}
                  style={theme.id === activeTheme ? {
                    background: style?.gradient || "rgba(138, 43, 226, 0.4)"
                  } : undefined}
                >
                  <span className={styles.themeIcon}>{style?.icon || "🔮"}</span>
                  <span className={styles.themeName}>{isKo ? theme.categoryKo || theme.category : theme.category}</span>
                </button>
              );
            })}
          </div>

          {/* Current Theme Info */}
          <div className={styles.themeHeader}>
            <div
              className={styles.themeIconLarge}
              style={{ background: themeStyle.gradient }}
            >
              {themeStyle.icon}
            </div>
            <div className={styles.themeInfo}>
              <h2 className={styles.themeTitleLarge}>{isKo ? currentTheme?.categoryKo || currentTheme?.category : currentTheme?.category}</h2>
              <p className={styles.themeDescription}>{isKo ? currentTheme?.descriptionKo || currentTheme?.description : currentTheme?.description}</p>
            </div>
          </div>

          {/* Spread Cards Grid */}
          <div className={styles.spreadGrid}>
            {currentTheme?.spreads.map((spread, i) => (
              <Link
                key={spread.id}
                href={`/tarot/${activeTheme}/${spread.id}${question ? `?question=${encodeURIComponent(question)}` : ''}`}
                className={styles.spreadCard}
                style={{
                  animationDelay: `${i * 0.1}s`,
                  "--gradient": themeStyle.gradient
                } as React.CSSProperties}
              >
                <div className={styles.spreadCardIcon}>
                  {getCardIcon(spread.cardCount)}
                </div>
                <div className={styles.spreadCardContent}>
                  <h3 className={styles.spreadTitle}>{isKo ? spread.titleKo || spread.title : spread.title}</h3>
                  <span className={styles.spreadCardCount}>
                    {spread.cardCount} {translate("tarot.spread.cards", "cards")}
                  </span>
                  <p className={styles.spreadDescription}>{isKo ? spread.descriptionKo || spread.description : spread.description}</p>
                </div>
                <div className={styles.spreadPositions}>
                  {spread.positions.slice(0, 3).map((pos, idx) => (
                    <span key={idx} className={styles.positionTag}>
                      {isKo ? pos.titleKo || pos.title : pos.title}
                    </span>
                  ))}
                  {spread.positions.length > 3 && (
                    <span className={styles.positionMore}>
                      +{spread.positions.length - 3}
                    </span>
                  )}
                </div>
                <div className={styles.spreadCardArrow}>→</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Tip */}
      <div className={styles.tipContainer}>
        <div className={styles.tipIcon}>💡</div>
        <p className={styles.tipText}>
          {translate(
            "tarot.home.tip",
            isKo ? "카드를 선택하기 전에 마음을 비우고 질문에 집중하세요" : "Clear your mind and focus on your question before selecting cards"
          )}
        </p>
      </div>
    </div>
  );
}
