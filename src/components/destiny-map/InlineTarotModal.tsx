"use client";

import React, { useState, useEffect } from "react";
import TarotCard from "@/components/tarot/TarotCard";
import { tarotThemes } from "@/lib/Tarot/tarot-spreads-data";
import { DrawnCard, Spread, CardInsight } from "@/lib/Tarot/tarot.types";
import styles from "./InlineTarotModal.module.css";
import { logger } from "@/lib/logger";
import { useFocusTrap } from "@/hooks/useFocusTrap";

type LangKey = "en" | "ko" | "ja" | "zh" | "es" | "fr" | "de" | "pt" | "ru";

type Step = "concern" | "spread-select" | "card-draw" | "interpreting" | "result";

export interface TarotResultSummary {
  question: string;
  spreadTitle: string;
  cards: Array<{
    name: string;
    isReversed: boolean;
    position: string;
    image: string;
  }>;
  overallMessage: string;
  guidance?: string;
  affirmation?: string;
}

interface InlineTarotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (result: TarotResultSummary) => void;
  lang?: LangKey;
  profile: {
    name?: string;
    birthDate?: string;
    birthTime?: string;
    city?: string;
    gender?: string;
  };
  initialConcern?: string;
  theme?: string;
}

const I18N: Record<string, {
  title: string;
  concernTitle: string;
  concernPlaceholder: string;
  concernHint: string;
  next: string;
  autoSelect: string;
  spreadTitle: string;
  quickTip: string;
  normalTip: string;
  deepTip: string;
  drawCards: string;
  drawing: string;
  interpreting: string;
  overallMessage: string;
  guidance: string;
  affirmation: string;
  cardInsights: string;
  deeperReading: string;
  continueChat: string;
  close: string;
  cards: string;
  drawAgain: string;
  yourConcern: string;
  save: string;
  saved: string;
  analyzing: string;
}> = {
  ko: {
    title: "타로 리딩",
    concernTitle: "어떤 고민이 있으신가요?",
    concernPlaceholder: "고민을 입력해주세요...",
    concernHint: "구체적으로 적을수록 더 정확한 해석이 가능해요",
    next: "직접 선택",
    autoSelect: "🔮 AI가 골라줘",
    spreadTitle: "스프레드를 선택해주세요",
    quickTip: "빠른 답변",
    normalTip: "시간의 흐름",
    deepTip: "깊은 분석",
    drawCards: "카드 뽑기",
    drawing: "카드를 뽑는 중...",
    interpreting: "카드를 해석하고 있어요...",
    overallMessage: "전체 메시지",
    guidance: "조언",
    affirmation: "오늘의 확언",
    cardInsights: "카드별 해석",
    deeperReading: "더 깊은 리딩 받기",
    continueChat: "상담 계속하기",
    close: "닫기",
    cards: "장",
    drawAgain: "🔄 다시 뽑기",
    yourConcern: "나의 고민",
    save: "💾 저장하기",
    saved: "✓ 저장됨",
    analyzing: "질문 분석 중...",
  },
  en: {
    title: "Tarot Reading",
    concernTitle: "What's on your mind?",
    concernPlaceholder: "Enter your concern...",
    concernHint: "The more specific you are, the more accurate the reading",
    next: "Choose Manually",
    autoSelect: "🔮 AI Picks",
    spreadTitle: "Choose a spread",
    quickTip: "Quick answer",
    normalTip: "Timeline view",
    deepTip: "Deep analysis",
    drawCards: "Draw Cards",
    drawing: "Drawing cards...",
    interpreting: "Interpreting your cards...",
    overallMessage: "Overall Message",
    guidance: "Guidance",
    affirmation: "Affirmation",
    cardInsights: "Card Insights",
    deeperReading: "Get Deeper Reading",
    continueChat: "Continue Chat",
    close: "Close",
    cards: "cards",
    drawAgain: "🔄 Draw Again",
    yourConcern: "Your Concern",
    save: "💾 Save",
    saved: "✓ Saved",
    analyzing: "Analyzing question...",
  },
};

// Theme mapping: destiny-map theme -> tarot category
const themeToCategory: Record<string, string> = {
  focus_love: "love-relationships",
  love: "love-relationships",
  focus_career: "career-work",
  career: "career-work",
  focus_energy: "well-being-health",
  health: "well-being-health",
  wealth: "money-finance",
  life: "general-insight",
  life_path: "general-insight",
  chat: "general-insight",
};

export default function InlineTarotModal({
  isOpen,
  onClose,
  onComplete,
  lang = "ko",
  profile,
  initialConcern = "",
  theme = "general-insight",
}: InlineTarotModalProps) {
  const tr = I18N[lang] ?? I18N.ko;

  const [step, setStep] = useState<Step>("concern");
  const [concern, setConcern] = useState(initialConcern);
  const [selectedSpread, setSelectedSpread] = useState<Spread | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);

  // Interpretation state
  const [overallMessage, setOverallMessage] = useState("");
  const [cardInsights, setCardInsights] = useState<CardInsight[]>([]);
  const [guidance, setGuidance] = useState("");
  const [affirmation, setAffirmation] = useState("");

  // Save state
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // AI auto-select state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiReason, setAiReason] = useState("");

  // Focus trap for accessibility
  const focusTrapRef = useFocusTrap(isOpen);

  // Keyboard handling and body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    // Handle Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  // Get recommended spreads based on theme (memoized to avoid re-render)
  const recommendedSpreads = React.useMemo(() => {
    const categoryId = themeToCategory[theme] || "general-insight";
    const category = tarotThemes.find((t) => t.id === categoryId);
    if (!category) return [];
    return [...category.spreads].sort((a, b) => a.cardCount - b.cardCount);
  }, [theme]);

  // Set selectedCategory based on theme (separate effect to avoid state update during render)
  useEffect(() => {
    setSelectedCategory(themeToCategory[theme] || "general-insight");
  }, [theme]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("concern");
      setConcern(initialConcern);
      setSelectedSpread(null);
      setDrawnCards([]);
      setRevealedCount(0);
      setOverallMessage("");
      setCardInsights([]);
      setGuidance("");
      setAffirmation("");
      setIsSaved(false);
      setIsSaving(false);
      setIsAnalyzing(false);
      setAiReason("");
    }
  }, [isOpen, initialConcern]);

  // Handle concern submission (manual select)
  const handleConcernNext = () => {
    if (concern.trim()) {
      setStep("spread-select");
    }
  };

  // AI auto-select spread based on question
  const handleAutoSelect = async () => {
    if (!concern.trim()) return;

    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/tarot/analyze-question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-token": process.env.NEXT_PUBLIC_API_TOKEN || "",
        },
        body: JSON.stringify({
          question: concern,
          language: lang,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to analyze question");
      }

      const data = await res.json();

      // 위험한 질문인 경우
      if (data.isDangerous) {
        alert(data.message);
        setIsAnalyzing(false);
        return;
      }

      const selectedId = data.spreadId;
      const reason = data.reason || data.userFriendlyExplanation || "";

      // Find the spread from recommended spreads first
      let spread = recommendedSpreads.find((s) => s.id === selectedId);

      // If not found in recommended, use the first recommended spread
      // but update category if AI suggested a different theme
      if (!spread && recommendedSpreads.length > 0) {
        // If the AI suggested a different category, try to find it there
        if (data.themeId && data.themeId !== selectedCategory) {
          const newCategory = tarotThemes.find((t) => t.id === data.themeId);
          if (newCategory) {
            spread = newCategory.spreads.find((s) => s.id === selectedId);
            if (spread) {
              setSelectedCategory(data.themeId);
            }
          }
        }

        // Still not found? Use first recommended
        if (!spread) {
          spread = recommendedSpreads[0];
        }
      }

      if (spread) {
        setSelectedSpread(spread);
        setAiReason(reason);
        setStep("card-draw");
      } else {
        // Fallback to manual selection
        setStep("spread-select");
      }
    } catch (err) {
      logger.error("[InlineTarot] auto-select error:", err);
      // Fallback to manual selection
      setStep("spread-select");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Save tarot reading to database
  const handleSave = async () => {
    if (isSaving || isSaved || !selectedSpread) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/tarot/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: concern,
          theme: selectedCategory,
          spreadId: selectedSpread.id,
          spreadTitle: lang === "ko" ? selectedSpread.titleKo || selectedSpread.title : selectedSpread.title,
          cards: drawnCards.map((dc, idx) => ({
            cardId: dc.card.id,
            name: lang === "ko" ? dc.card.nameKo || dc.card.name : dc.card.name,
            image: dc.card.image,
            isReversed: dc.isReversed,
            position: lang === "ko"
              ? selectedSpread.positions[idx]?.titleKo || selectedSpread.positions[idx]?.title
              : selectedSpread.positions[idx]?.title,
          })),
          overallMessage,
          cardInsights,
          guidance,
          affirmation,
          source: "counselor",
          locale: lang,
        }),
      });

      if (res.ok) {
        setIsSaved(true);
      } else {
        const err = await res.json().catch(() => ({}));
        logger.error("[InlineTarot] save error:", err);
      }
    } catch (err) {
      logger.error("[InlineTarot] save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle spread selection
  const handleSpreadSelect = (spread: Spread) => {
    setSelectedSpread(spread);
    setStep("card-draw");
  };

  // Draw cards from API
  const handleDrawCards = async () => {
    if (!selectedSpread) return;

    setIsDrawing(true);
    try {
      const res = await fetch("/api/tarot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-token": process.env.NEXT_PUBLIC_API_TOKEN || "",
        },
        body: JSON.stringify({
          categoryId: selectedCategory,
          spreadId: selectedSpread.id,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        logger.error("[InlineTarot] API error:", { status: res.status, errorData });
        throw new Error(`Failed to draw cards: ${res.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await res.json();
      setDrawnCards(data.drawnCards);

      // Animate card reveals
      for (let i = 0; i < data.drawnCards.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        setRevealedCount((prev) => prev + 1);
      }

      // Start interpretation
      setStep("interpreting");
      await fetchInterpretation(data.drawnCards);
    } catch (err) {
      logger.error("[InlineTarot] draw error:", err);
    } finally {
      setIsDrawing(false);
    }
  };

  // Fetch streaming interpretation
  const fetchInterpretation = async (cards: DrawnCard[]) => {
    if (!selectedSpread) return;

    const payload = {
      categoryId: selectedCategory,
      spreadId: selectedSpread.id,
      spreadTitle: lang === "ko" ? selectedSpread.titleKo || selectedSpread.title : selectedSpread.title,
      cards: cards.map((dc, idx) => ({
        name: lang === "ko" ? dc.card.nameKo || dc.card.name : dc.card.name,
        isReversed: dc.isReversed,
        position: lang === "ko"
          ? selectedSpread.positions[idx]?.titleKo || selectedSpread.positions[idx]?.title
          : selectedSpread.positions[idx]?.title,
        meaning: dc.isReversed
          ? (lang === "ko" ? dc.card.reversed.meaningKo || dc.card.reversed.meaning : dc.card.reversed.meaning)
          : (lang === "ko" ? dc.card.upright.meaningKo || dc.card.upright.meaning : dc.card.upright.meaning),
        keywords: dc.isReversed
          ? (lang === "ko" ? dc.card.reversed.keywordsKo || dc.card.reversed.keywords : dc.card.reversed.keywords)
          : (lang === "ko" ? dc.card.upright.keywordsKo || dc.card.upright.keywords : dc.card.upright.keywords),
      })),
      language: lang,
      userQuestion: concern,
      birthdate: profile.birthDate,
    };

    try {
      const res = await fetch("/api/tarot/interpret/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-token": process.env.NEXT_PUBLIC_API_TOKEN || "",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const tempInsights: CardInsight[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data);

            if (parsed.section === "overall_message") {
              setOverallMessage((prev) => prev + (parsed.content || ""));
            } else if (parsed.section === "card_insight") {
              const idx = parsed.index ?? 0;
              if (!tempInsights[idx]) {
                tempInsights[idx] = {
                  position: selectedSpread.positions[idx]?.title || "",
                  card_name: cards[idx]?.card.name || "",
                  is_reversed: cards[idx]?.isReversed || false,
                  interpretation: "",
                };
              }
              tempInsights[idx].interpretation += parsed.content || "";
              setCardInsights([...tempInsights]);

              // Handle extras (spirit_animal, chakra, etc.)
              if (parsed.extras) {
                Object.assign(tempInsights[idx], parsed.extras);
                setCardInsights([...tempInsights]);
              }
            } else if (parsed.section === "guidance") {
              setGuidance((prev) => prev + (parsed.content || ""));
            } else if (parsed.section === "affirmation") {
              setAffirmation((prev) => prev + (parsed.content || ""));
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      setStep("result");
    } catch (err) {
      logger.error("[InlineTarot] interpret error:", err);
      setStep("result");
    }
  };

  // Go to full tarot page
  const goToFullTarot = () => {
    const tarotContext = {
      profile,
      theme,
      concern,
      fromCounselor: true,
      timestamp: Date.now(),
    };
    sessionStorage.setItem("tarotContext", JSON.stringify(tarotContext));
    window.location.href = `/tarot?from=counselor&theme=${encodeURIComponent(theme)}`;
  };

  // Draw again with same concern
  const handleDrawAgain = () => {
    setDrawnCards([]);
    setRevealedCount(0);
    setOverallMessage("");
    setCardInsights([]);
    setGuidance("");
    setAffirmation("");
    setStep("card-draw");
  };

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tarot-modal-title"
    >
      <div ref={focusTrapRef} className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 id="tarot-modal-title" className={styles.title}>🃏 {tr.title}</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label={tr.close}>
            ✕
          </button>
        </div>

        {/* Step indicator */}
        <div className={styles.stepIndicator}>
          {["concern", "spread-select", "card-draw", "result"].map((s, i) => (
            <div
              key={s}
              className={`${styles.stepDot} ${
                step === s || (step === "interpreting" && s === "result") ? styles.active : ""
              } ${
                ["concern", "spread-select", "card-draw", "interpreting", "result"].indexOf(step) > i
                  ? styles.completed
                  : ""
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Step 1: Concern Input */}
          {step === "concern" && (
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>{tr.concernTitle}</h3>
              <textarea
                className={styles.concernInput}
                value={concern}
                onChange={(e) => setConcern(e.target.value)}
                placeholder={tr.concernPlaceholder}
                rows={3}
                autoFocus
              />
              <p className={styles.hint}>{tr.concernHint}</p>
              <div className={styles.concernButtons}>
                <button
                  className={styles.secondaryButton}
                  onClick={handleConcernNext}
                  disabled={!concern.trim() || isAnalyzing}
                >
                  {tr.next}
                </button>
                <button
                  className={styles.primaryButton}
                  onClick={handleAutoSelect}
                  disabled={!concern.trim() || isAnalyzing}
                >
                  {isAnalyzing ? tr.analyzing : tr.autoSelect}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Spread Selection */}
          {step === "spread-select" && (
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>{tr.spreadTitle}</h3>
              <div className={styles.spreadGrid}>
                {recommendedSpreads.map((spread) => (
                  <button
                    key={spread.id}
                    className={styles.spreadCard}
                    onClick={() => handleSpreadSelect(spread)}
                  >
                    <div className={styles.spreadCardCount}>
                      {spread.cardCount} {tr.cards}
                    </div>
                    <h4 className={styles.spreadTitle}>
                      {lang === "ko" ? spread.titleKo || spread.title : spread.title}
                    </h4>
                    <p className={styles.spreadDesc}>
                      {lang === "ko" ? spread.descriptionKo || spread.description : spread.description}
                    </p>
                    <div className={styles.spreadTip}>
                      {spread.cardCount === 1
                        ? `💡 ${tr.quickTip}`
                        : spread.cardCount <= 3
                        ? `⏳ ${tr.normalTip}`
                        : `🔮 ${tr.deepTip}`}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Card Draw */}
          {step === "card-draw" && (
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>
                {lang === "ko"
                  ? selectedSpread?.titleKo || selectedSpread?.title
                  : selectedSpread?.title}
              </h3>

              {/* AI 선택 이유 표시 */}
              {aiReason && (
                <p className={styles.aiReasonText}>✨ {aiReason}</p>
              )}

              {drawnCards.length === 0 ? (
                <div className={styles.drawArea}>
                  <div className={styles.deckStack}>
                    <div className={styles.deckCard} />
                    <div className={styles.deckCard} />
                    <div className={styles.deckCard} />
                  </div>
                  <button
                    className={styles.drawButton}
                    onClick={handleDrawCards}
                    disabled={isDrawing}
                  >
                    {isDrawing ? tr.drawing : tr.drawCards}
                  </button>
                </div>
              ) : (
                <div className={styles.drawnCardsGrid}>
                  {drawnCards.map((dc, idx) => (
                    <div
                      key={idx}
                      className={`${styles.cardWrapper} ${
                        idx < revealedCount ? styles.revealed : ""
                      }`}
                    >
                      {idx < revealedCount ? (
                        <TarotCard
                          name={lang === "ko" ? dc.card.nameKo || dc.card.name : dc.card.name}
                          image={dc.card.image}
                          isReversed={dc.isReversed}
                          position={
                            lang === "ko"
                              ? selectedSpread?.positions[idx]?.titleKo ||
                                selectedSpread?.positions[idx]?.title
                              : selectedSpread?.positions[idx]?.title
                          }
                          keywords={
                            dc.isReversed
                              ? (lang === "ko"
                                  ? dc.card.reversed.keywordsKo || dc.card.reversed.keywords
                                  : dc.card.reversed.keywords)
                              : (lang === "ko"
                                  ? dc.card.upright.keywordsKo || dc.card.upright.keywords
                                  : dc.card.upright.keywords)
                          }
                          size="small"
                          expandable={false}
                          interactive={false}
                        />
                      ) : (
                        <div className={styles.cardBack}>
                          <span>🃏</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Interpreting */}
          {step === "interpreting" && (
            <div className={styles.stepContent}>
              <div className={styles.interpretingLoader}>
                <div className={styles.crystalBall}>
                  <div className={styles.innerGlow} />
                </div>
                <p className={styles.interpretingText}>{tr.interpreting}</p>
                {overallMessage && (
                  <div className={styles.streamingPreview}>
                    <p>{overallMessage}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Result */}
          {step === "result" && (
            <div className={styles.stepContent}>
              {/* Current Concern Display */}
              {concern && (
                <div className={styles.concernDisplay}>
                  <span className={styles.concernLabel}>💭 {tr.yourConcern}:</span>
                  <span className={styles.concernText}>{concern}</span>
                </div>
              )}

              {/* Cards Display */}
              <div className={styles.resultCardsRow}>
                {drawnCards.map((dc, idx) => (
                  <div key={idx} className={styles.resultCardWrapper}>
                    <TarotCard
                      name={lang === "ko" ? dc.card.nameKo || dc.card.name : dc.card.name}
                      image={dc.card.image}
                      isReversed={dc.isReversed}
                      position={
                        lang === "ko"
                          ? selectedSpread?.positions[idx]?.titleKo ||
                            selectedSpread?.positions[idx]?.title
                          : selectedSpread?.positions[idx]?.title
                      }
                      keywords={
                        dc.isReversed
                          ? (lang === "ko"
                              ? dc.card.reversed.keywordsKo || dc.card.reversed.keywords
                              : dc.card.reversed.keywords)
                          : (lang === "ko"
                              ? dc.card.upright.keywordsKo || dc.card.upright.keywords
                              : dc.card.upright.keywords)
                      }
                      meaning={cardInsights[idx]?.interpretation}
                      size="medium"
                      expandable={true}
                      interactive={true}
                    />
                  </div>
                ))}
              </div>

              {/* Draw Again & Save Buttons */}
              <div className={styles.resultTopActions}>
                <button className={styles.drawAgainButton} onClick={handleDrawAgain}>
                  {tr.drawAgain}
                </button>
                <button
                  className={`${styles.saveButton} ${isSaved ? styles.saved : ""}`}
                  onClick={handleSave}
                  disabled={isSaving || isSaved}
                >
                  {isSaving ? "..." : isSaved ? tr.saved : tr.save}
                </button>
              </div>

              {/* Overall Message */}
              {overallMessage && (
                <div className={styles.resultSection}>
                  <h4 className={styles.resultSectionTitle}>✨ {tr.overallMessage}</h4>
                  <p className={styles.resultText}>{overallMessage}</p>
                </div>
              )}

              {/* Guidance */}
              {guidance && (
                <div className={styles.resultSection}>
                  <h4 className={styles.resultSectionTitle}>💫 {tr.guidance}</h4>
                  <p className={styles.resultText}>{guidance}</p>
                </div>
              )}

              {/* Affirmation */}
              {affirmation && (
                <div className={styles.affirmationBox}>
                  <span className={styles.affirmationIcon}>🌟</span>
                  <p className={styles.affirmationText}>{affirmation}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className={styles.resultActions}>
                <button
                  className={styles.secondaryButton}
                  onClick={() => {
                    // Call onComplete with result summary for chat integration
                    if (onComplete && selectedSpread) {
                      onComplete({
                        question: concern,
                        spreadTitle: lang === "ko"
                          ? selectedSpread.titleKo || selectedSpread.title
                          : selectedSpread.title,
                        cards: drawnCards.map((dc, idx) => ({
                          name: lang === "ko" ? dc.card.nameKo || dc.card.name : dc.card.name,
                          isReversed: dc.isReversed,
                          position: lang === "ko"
                            ? selectedSpread.positions[idx]?.titleKo || selectedSpread.positions[idx]?.title
                            : selectedSpread.positions[idx]?.title,
                          image: dc.card.image,
                        })),
                        overallMessage,
                        guidance: guidance || undefined,
                        affirmation: affirmation || undefined,
                      });
                    }
                    onClose();
                  }}
                >
                  {tr.continueChat}
                </button>
                <button className={styles.primaryButton} onClick={goToFullTarot}>
                  {tr.deeperReading}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
