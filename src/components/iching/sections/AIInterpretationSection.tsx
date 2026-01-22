/**
 * AI Interpretation Section Component
 * Displays AI-generated personalized reading with streaming support
 * @module sections/AIInterpretationSection
 */

import React from "react";
import { AiStatus } from "../hooks/useAiStreaming";
import styles from "../ResultDisplay.module.css";

/**
 * Component props interface
 */
export interface AIInterpretationSectionProps {
  aiStatus: AiStatus;
  currentSection: string;
  overviewText: string;
  changingText: string;
  adviceText: string;
  aiError: string;
  startAiInterpretation: () => void;
  translate: (key: string, fallback: string) => string;
}

/**
 * AI Interpretation Section
 * Shows AI-powered personalized reading with real-time streaming
 *
 * @param props - Component props
 * @returns JSX element with AI interpretation UI
 */
export const AIInterpretationSection: React.FC<AIInterpretationSectionProps> = React.memo(({
  aiStatus,
  currentSection,
  overviewText,
  changingText,
  adviceText,
  aiError,
  startAiInterpretation,
  translate,
}) => {
  return (
    <div className={styles.aiInterpretationCard}>
      <div className={styles.aiHeader}>
        <span className={styles.aiIcon}>✨</span>
        <h3 className={styles.aiTitle}>
          {translate("iching.aiInterpretation", "AI Personalized Reading")}
        </h3>
        {aiStatus === "done" && (
          <span className={styles.aiSubtitle}>GPT-4o-mini</span>
        )}
      </div>

      {aiStatus === "idle" && (
        <button
          className={styles.aiStartButton}
          onClick={startAiInterpretation}
        >
          <span className={styles.aiButtonIcon}>🔮</span>
          {translate("iching.startAi", "Get AI Interpretation")}
        </button>
      )}

      {aiStatus === "loading" && (
        <div className={styles.aiLoadingState}>
          <div className={styles.aiLoadingDots}>
            <span className={styles.aiLoadingDot}></span>
            <span className={styles.aiLoadingDot}></span>
            <span className={styles.aiLoadingDot}></span>
          </div>
          <span className={styles.aiLoadingText}>
            {translate("iching.aiLoading", "Preparing your personalized reading...")}
          </span>
        </div>
      )}

      {(aiStatus === "streaming" || aiStatus === "done") && (
        <div className={styles.aiSectionContainer}>
          {/* Overview Section */}
          {(overviewText || currentSection === "overview") && (
            <div className={`${styles.aiSection} ${currentSection === "overview" ? styles.active : ""}`}>
              <div className={styles.aiSectionLabel}>
                {translate("iching.overview", "Overall Interpretation")}
              </div>
              <div className={styles.aiSectionContent}>
                {overviewText}
                {currentSection === "overview" && <span className={styles.streamingCursor} />}
              </div>
            </div>
          )}

          {/* Changing Lines Section */}
          {(changingText || currentSection === "changing") && (
            <div className={`${styles.aiSection} ${currentSection === "changing" ? styles.active : ""}`}>
              <div className={styles.aiSectionLabel}>
                {translate("iching.changingAnalysis", "Changing Lines Analysis")}
              </div>
              <div className={styles.aiSectionContent}>
                {changingText}
                {currentSection === "changing" && <span className={styles.streamingCursor} />}
              </div>
            </div>
          )}

          {/* Advice Section */}
          {(adviceText || currentSection === "advice") && (
            <div className={`${styles.aiSection} ${currentSection === "advice" ? styles.active : ""}`}>
              <div className={styles.aiSectionLabel}>
                {translate("iching.practicalAdvice", "Practical Guidance")}
              </div>
              <div className={styles.aiSectionContent}>
                {adviceText}
                {currentSection === "advice" && <span className={styles.streamingCursor} />}
              </div>
            </div>
          )}
        </div>
      )}

      {aiStatus === "error" && (
        <div className={styles.aiError}>
          <p>{aiError || translate("iching.aiError", "An error occurred while generating the interpretation.")}</p>
          <button
            className={styles.aiStartButton}
            onClick={startAiInterpretation}
            style={{ marginTop: "1rem" }}
          >
            {translate("iching.retry", "Try Again")}
          </button>
        </div>
      )}
    </div>
  );
});

AIInterpretationSection.displayName = "AIInterpretationSection";
