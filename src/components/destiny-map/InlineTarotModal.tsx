"use client";

import React, { useEffect } from "react";
import TarotCard from "@/components/tarot/TarotCard";
import type { Spread } from "@/lib/Tarot/tarot.types";
import styles from "./InlineTarotModal.module.css";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import {
  useInlineTarotState,
  useInlineTarotAPI,
  getTarotTranslations,
  type LangKey,
} from "./hooks";

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

export default function InlineTarotModal({
  isOpen,
  onClose,
  onComplete,
  lang = "ko",
  profile,
  initialConcern = "",
  theme = "general-insight",
}: InlineTarotModalProps) {
  const tr = getTarotTranslations(lang);

  // State management hook
  const stateManager = useInlineTarotState({
    isOpen,
    initialConcern,
    theme,
  });

  const { state, actions, recommendedSpreads } = stateManager;

  // API hook
  const api = useInlineTarotAPI({
    stateManager,
    lang,
    profile,
  });

  // Focus trap for accessibility
  const focusTrapRef = useFocusTrap(isOpen);

  // Keyboard handling and body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      api.cleanup();
    };
  }, [isOpen, onClose, api]);

  // Handle concern submission (manual select)
  const handleConcernNext = () => {
    if (state.concern.trim()) {
      actions.setStep("spread-select");
    }
  };

  // Handle spread selection
  const handleSpreadSelect = (spread: Spread) => {
    actions.setSelectedSpread(spread);
    actions.setStep("card-draw");
  };

  // Go to full tarot page
  const goToFullTarot = () => {
    const tarotContext = {
      profile,
      theme,
      concern: state.concern,
      fromCounselor: true,
      timestamp: Date.now(),
    };
    sessionStorage.setItem("tarotContext", JSON.stringify(tarotContext));
    window.location.href = `/tarot?from=counselor&theme=${encodeURIComponent(theme)}`;
  };

  // Handle completion
  const handleComplete = () => {
    if (onComplete && state.selectedSpread) {
      onComplete({
        question: state.concern,
        spreadTitle: lang === "ko"
          ? state.selectedSpread.titleKo || state.selectedSpread.title
          : state.selectedSpread.title,
        cards: state.drawnCards.map((dc, idx) => ({
          name: lang === "ko" ? dc.card.nameKo || dc.card.name : dc.card.name,
          isReversed: dc.isReversed,
          position: lang === "ko"
            ? state.selectedSpread!.positions[idx]?.titleKo || state.selectedSpread!.positions[idx]?.title
            : state.selectedSpread!.positions[idx]?.title,
          image: dc.card.image,
        })),
        overallMessage: state.overallMessage,
        guidance: state.guidance || undefined,
        affirmation: state.affirmation || undefined,
      });
    }
    onClose();
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
                state.step === s || (state.step === "interpreting" && s === "result") ? styles.active : ""
              } ${
                ["concern", "spread-select", "card-draw", "interpreting", "result"].indexOf(state.step) > i
                  ? styles.completed
                  : ""
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Step 1: Concern Input */}
          {state.step === "concern" && (
            <ConcernStep
              tr={tr}
              concern={state.concern}
              isAnalyzing={state.isAnalyzing}
              onConcernChange={actions.setConcern}
              onNext={handleConcernNext}
              onAutoSelect={api.analyzeQuestion}
            />
          )}

          {/* Step 2: Spread Selection */}
          {state.step === "spread-select" && (
            <SpreadSelectStep
              tr={tr}
              lang={lang}
              recommendedSpreads={recommendedSpreads}
              onSelect={handleSpreadSelect}
            />
          )}

          {/* Step 3: Card Draw */}
          {state.step === "card-draw" && (
            <CardDrawStep
              tr={tr}
              lang={lang}
              selectedSpread={state.selectedSpread}
              aiReason={state.aiReason}
              drawnCards={state.drawnCards}
              revealedCount={state.revealedCount}
              isDrawing={state.isDrawing}
              onDraw={api.drawCards}
            />
          )}

          {/* Step 4: Interpreting */}
          {state.step === "interpreting" && (
            <InterpretingStep tr={tr} overallMessage={state.overallMessage} />
          )}

          {/* Step 5: Result */}
          {state.step === "result" && (
            <ResultStep
              tr={tr}
              lang={lang}
              state={state}
              onDrawAgain={actions.resetForDrawAgain}
              onSave={api.saveReading}
              onComplete={handleComplete}
              onDeeper={goToFullTarot}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Sub-components for each step
// ─────────────────────────────────────────────────────

interface ConcernStepProps {
  tr: ReturnType<typeof getTarotTranslations>;
  concern: string;
  isAnalyzing: boolean;
  onConcernChange: (value: string) => void;
  onNext: () => void;
  onAutoSelect: () => void;
}

function ConcernStep({ tr, concern, isAnalyzing, onConcernChange, onNext, onAutoSelect }: ConcernStepProps) {
  return (
    <div className={styles.stepContent}>
      <h3 className={styles.stepTitle}>{tr.concernTitle}</h3>
      <textarea
        className={styles.concernInput}
        value={concern}
        onChange={(e) => onConcernChange(e.target.value)}
        placeholder={tr.concernPlaceholder}
        rows={3}
        autoFocus
      />
      <p className={styles.hint}>{tr.concernHint}</p>
      <div className={styles.concernButtons}>
        <button
          className={styles.secondaryButton}
          onClick={onNext}
          disabled={!concern.trim() || isAnalyzing}
        >
          {tr.next}
        </button>
        <button
          className={styles.primaryButton}
          onClick={onAutoSelect}
          disabled={!concern.trim() || isAnalyzing}
        >
          {isAnalyzing ? tr.analyzing : tr.autoSelect}
        </button>
      </div>
    </div>
  );
}

interface SpreadSelectStepProps {
  tr: ReturnType<typeof getTarotTranslations>;
  lang: LangKey;
  recommendedSpreads: Spread[];
  onSelect: (spread: Spread) => void;
}

function SpreadSelectStep({ tr, lang, recommendedSpreads, onSelect }: SpreadSelectStepProps) {
  return (
    <div className={styles.stepContent}>
      <h3 className={styles.stepTitle}>{tr.spreadTitle}</h3>
      <div className={styles.spreadGrid}>
        {recommendedSpreads.map((spread) => (
          <button
            key={spread.id}
            className={styles.spreadCard}
            onClick={() => onSelect(spread)}
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
  );
}

interface CardDrawStepProps {
  tr: ReturnType<typeof getTarotTranslations>;
  lang: LangKey;
  selectedSpread: Spread | null;
  aiReason: string;
  drawnCards: Array<{ card: { name: string; nameKo?: string; image: string; upright: { keywords: string[]; keywordsKo?: string[] }; reversed: { keywords: string[]; keywordsKo?: string[] } }; isReversed: boolean }>;
  revealedCount: number;
  isDrawing: boolean;
  onDraw: () => void;
}

function CardDrawStep({ tr, lang, selectedSpread, aiReason, drawnCards, revealedCount, isDrawing, onDraw }: CardDrawStepProps) {
  return (
    <div className={styles.stepContent}>
      <h3 className={styles.stepTitle}>
        {lang === "ko"
          ? selectedSpread?.titleKo || selectedSpread?.title
          : selectedSpread?.title}
      </h3>

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
            onClick={onDraw}
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
  );
}

interface InterpretingStepProps {
  tr: ReturnType<typeof getTarotTranslations>;
  overallMessage: string;
}

function InterpretingStep({ tr, overallMessage }: InterpretingStepProps) {
  return (
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
  );
}

interface ResultStepProps {
  tr: ReturnType<typeof getTarotTranslations>;
  lang: LangKey;
  state: ReturnType<typeof useInlineTarotState>["state"];
  onDrawAgain: () => void;
  onSave: () => void;
  onComplete: () => void;
  onDeeper: () => void;
}

function ResultStep({ tr, lang, state, onDrawAgain, onSave, onComplete, onDeeper }: ResultStepProps) {
  const { concern, selectedSpread, drawnCards, cardInsights, overallMessage, guidance, affirmation, isSaving, isSaved } = state;

  return (
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
        <button className={styles.drawAgainButton} onClick={onDrawAgain}>
          {tr.drawAgain}
        </button>
        <button
          className={`${styles.saveButton} ${isSaved ? styles.saved : ""}`}
          onClick={onSave}
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
        <button className={styles.secondaryButton} onClick={onComplete}>
          {tr.continueChat}
        </button>
        <button className={styles.primaryButton} onClick={onDeeper}>
          {tr.deeperReading}
        </button>
      </div>
    </div>
  );
}
