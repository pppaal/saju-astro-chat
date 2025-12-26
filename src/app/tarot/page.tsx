"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { motion, AnimatePresence } from "framer-motion";
import BackButton from "@/components/ui/BackButton";
import CreditBadge from "@/components/ui/CreditBadge";
import { recommendSpreads, quickQuestions, checkDangerousQuestion } from "@/lib/Tarot/tarot-recommend";
import styles from "./tarot-home.module.css";

interface AIAnalysisResult {
  isDangerous?: boolean;
  message?: string;
  themeId: string;
  spreadId: string;
  spreadTitle: string;
  cardCount: number;
  userFriendlyExplanation: string;
  path: string;
}

// 키워드 기반 빠른 추천 (미리보기용)
function getQuickRecommendation(question: string): { path: string; cardCount: number; spreadTitle: string } {
  const recommendations = recommendSpreads(question, 1);

  if (recommendations.length > 0) {
    const rec = recommendations[0];
    return {
      path: `/tarot/${rec.themeId}/${rec.spreadId}?question=${encodeURIComponent(question)}`,
      cardCount: rec.spread.cardCount,
      spreadTitle: rec.spread.titleKo || rec.spread.title
    };
  }

  return {
    path: `/tarot/general-insight/past-present-future?question=${encodeURIComponent(question)}`,
    cardCount: 3,
    spreadTitle: "과거-현재-미래"
  };
}

// 최근 질문 관리
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

const pageTransitionVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
};

export default function TarotHomePage() {
  const { language } = useI18n();
  const router = useRouter();
  const isKo = language === 'ko';
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [question, setQuestion] = useState("");
  const [recentQuestions, setRecentQuestions] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [previewInfo, setPreviewInfo] = useState<{ cardCount: number; spreadTitle: string } | null>(null);
  const [dangerWarning, setDangerWarning] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);

  useEffect(() => {
    setRecentQuestions(getRecentQuestions());
  }, []);

  // 배경 애니메이션
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let animationId: number;
    let time = 0;

    const animate = () => {
      time += 0.002;

      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, 'rgba(10, 10, 26, 1)');
      gradient.addColorStop(0.5, 'rgba(13, 31, 45, 1)');
      gradient.addColorStop(1, 'rgba(22, 33, 62, 1)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 별 효과
      for (let i = 0; i < 60; i++) {
        const x = (Math.sin(time * 0.3 + i * 1.5) * 0.5 + 0.5) * canvas.width;
        const y = (Math.cos(time * 0.2 + i * 0.9) * 0.5 + 0.5) * canvas.height;
        const opacity = 0.15 + Math.sin(time * 2 + i) * 0.1;

        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99, 210, 255, ${opacity})`;
        ctx.fill();
      }

      // 큰 글로우 원
      for (let i = 0; i < 4; i++) {
        const x = (Math.sin(time + i * 1.5) * 0.25 + 0.5) * canvas.width;
        const y = (Math.cos(time * 0.5 + i * 1.2) * 0.25 + 0.5) * canvas.height;
        const radius = 80 + Math.sin(time + i) * 40;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99, 210, 255, ${0.015 + Math.sin(time + i) * 0.01})`;
        ctx.fill();
      }

      animationId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 질문이 변경될 때 키워드 기반 빠른 미리보기 (즉시 반응)
  useEffect(() => {
    if (question.trim()) {
      // 위험한 질문 체크
      const dangerCheck = checkDangerousQuestion(question);
      if (dangerCheck.isDangerous) {
        setDangerWarning((isKo ? dangerCheck.messageKo : dangerCheck.message) || null);
        setPreviewInfo(null);
        setAiExplanation(null);
      } else {
        setDangerWarning(null);
        const result = getQuickRecommendation(question);
        setPreviewInfo({ cardCount: result.cardCount, spreadTitle: result.spreadTitle });
        setAiExplanation(null);
      }
    } else {
      setPreviewInfo(null);
      setDangerWarning(null);
      setAiExplanation(null);
    }
  }, [question, isKo]);

  // GPT로 질문 분석 (타로 보기 클릭 시)
  const analyzeWithAI = useCallback(async (q: string): Promise<AIAnalysisResult | null> => {
    try {
      const response = await fetch("/api/tarot/analyze-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, language }),
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error("AI analysis failed:", error);
      return null;
    }
  }, [language]);

  // 타로 시작 - GPT 분석 후 이동
  const handleStartReading = useCallback(async () => {
    if (!question.trim() || dangerWarning) return;

    setIsAnalyzing(true);

    try {
      // GPT로 분석
      const aiResult = await analyzeWithAI(question);

      if (aiResult?.isDangerous) {
        setDangerWarning(aiResult.message || "");
        setIsAnalyzing(false);
        return;
      }

      saveRecentQuestion(question);

      if (aiResult) {
        // AI 분석 결과 사용
        setAiExplanation(aiResult.userFriendlyExplanation);
        // 잠깐 설명 보여주고 이동
        setTimeout(() => {
          router.push(aiResult.path);
        }, 800);
      } else {
        // AI 실패시 키워드 기반 폴백
        const result = getQuickRecommendation(question);
        router.push(result.path);
      }
    } catch {
      // 에러시 키워드 기반 폴백
      saveRecentQuestion(question);
      const result = getQuickRecommendation(question);
      router.push(result.path);
    }
  }, [question, dangerWarning, analyzeWithAI, router]);

  // 빠른 질문 선택 - 바로 이동 (GPT 분석 없이)
  const handleQuickQuestion = (q: typeof quickQuestions[0]) => {
    const questionText = isKo ? q.question : q.questionEn;
    setQuestion(questionText);
    saveRecentQuestion(questionText);
    const result = getQuickRecommendation(questionText);
    router.push(result.path);
  };

  // 최근 질문 선택 - 바로 이동
  const handleRecentQuestion = (q: string) => {
    setQuestion(q);
    saveRecentQuestion(q);
    const result = getQuickRecommendation(q);
    router.push(result.path);
  };

  // 최근 질문 삭제
  const handleDeleteRecent = (q: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentQuestions.filter(item => item !== q);
    localStorage.setItem(RECENT_QUESTIONS_KEY, JSON.stringify(updated));
    setRecentQuestions(updated);
  };

  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} className={styles.backgroundCanvas} />

      <div className={styles.backButtonContainer}>
        <BackButton />
      </div>

      <div className={styles.creditBadgeWrapper}>
        <CreditBadge variant="compact" />
      </div>

      <main className={styles.main}>
        <AnimatePresence mode="wait">
          <motion.div
            key="tarot-input"
            variants={pageTransitionVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={styles.contentWrapper}
          >
            {/* 로고/타이틀 */}
            <div className={styles.logoSection}>
              <div className={styles.iconWrapper}>
                <span className={styles.tarotIcon}>🔮</span>
              </div>
              <h1 className={styles.mainTitle}>
                {isKo ? "AI 타로" : "AI Tarot"}
              </h1>
              <p className={styles.subtitle}>
                {isKo
                  ? "무엇이든 물어보세요, 카드가 답합니다"
                  : "Ask anything, the cards will answer"}
              </p>
            </div>

            {/* 검색창 스타일 입력 */}
            <div className={`${styles.searchContainer} ${isFocused ? styles.focused : ''}`}>
              <div className={styles.searchBox}>
                <span className={styles.searchIcon}>✨</span>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder={isKo ? "무엇이 궁금하세요?" : "What's on your mind?"}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && question.trim() && !isAnalyzing) {
                      handleStartReading();
                    }
                  }}
                  disabled={isAnalyzing}
                />
                {question && !isAnalyzing && (
                  <button
                    className={styles.clearButton}
                    onClick={() => setQuestion("")}
                    aria-label="Clear"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* 위험한 질문 경고 */}
              {dangerWarning && (
                <motion.div
                  className={styles.dangerWarning}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <span className={styles.warningIcon}>💙</span>
                  <p>{dangerWarning}</p>
                </motion.div>
              )}

              {/* AI 설명 (분석 완료 후) */}
              {aiExplanation && (
                <motion.div
                  className={styles.aiExplanation}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <span>✨</span> {aiExplanation}
                </motion.div>
              )}

              {/* 타로 보기 버튼 + 스프레드 미리보기 */}
              {question.trim() && previewInfo && !dangerWarning && (
                <motion.div
                  className={styles.readingSection}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className={styles.cardCountPreview}>
                    <span className={styles.previewIcon}>🃏</span>
                    <span>{previewInfo.spreadTitle}</span>
                    <span className={styles.cardCount}>({previewInfo.cardCount}{isKo ? "장" : " cards"})</span>
                  </div>
                  <button
                    className={styles.readingButton}
                    onClick={handleStartReading}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <span className={styles.analyzing}>
                        <span className={styles.dot}></span>
                        <span className={styles.dot}></span>
                        <span className={styles.dot}></span>
                      </span>
                    ) : (
                      <>{isKo ? "타로 보기" : "Read Tarot"} →</>
                    )}
                  </button>
                </motion.div>
              )}
            </div>

            {/* 빠른 질문 태그 */}
            <div className={styles.quickTags}>
              <p className={styles.quickTagsLabel}>{isKo ? "빠른 질문" : "Quick Questions"}</p>
              <div className={styles.quickTagsList}>
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    className={styles.quickTag}
                    onClick={() => handleQuickQuestion(q)}
                    disabled={isAnalyzing}
                  >
                    <span className={styles.tagEmoji}>{q.emoji}</span>
                    <span>{isKo ? q.label : q.labelEn}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 최근 질문 */}
            {recentQuestions.length > 0 && (
              <div className={styles.recentSection}>
                <p className={styles.recentLabel}>{isKo ? "최근 질문" : "Recent"}</p>
                <div className={styles.recentList}>
                  {recentQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      className={styles.recentItem}
                      onClick={() => handleRecentQuestion(q)}
                      disabled={isAnalyzing}
                    >
                      <span className={styles.recentIcon}>🕐</span>
                      <span className={styles.recentText}>{q}</span>
                      <span
                        className={styles.recentDelete}
                        onClick={(e) => handleDeleteRecent(q, e)}
                      >
                        ×
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 하단 설명 */}
            <p className={styles.footerHint}>
              {isKo
                ? "질문을 입력하면 AI가 적절한 카드 배열을 선택해 해석해드려요"
                : "AI will choose the perfect card spread and interpret for you"
              }
            </p>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
