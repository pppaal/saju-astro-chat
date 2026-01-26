/**
 * Suggested questions component
 * Extracted from TarotChat.tsx lines 868-882
 */

import React from "react";
import type { I18N } from "../data";

interface SuggestedQuestionsProps {
  questions: string[];
  onQuestionClick: (question: string) => void;
  tr: (typeof I18N)['ko'];
  styles: Record<string, string>;
}

/**
 * Display suggested questions as clickable buttons
 */
export const SuggestedQuestions = React.memo(function SuggestedQuestions({
  questions,
  onQuestionClick,
  tr,
  styles
}: SuggestedQuestionsProps) {
  if (questions.length === 0) {return null;}

  return (
    <div className={styles.suggestedSection}>
      <h4 className={styles.suggestedTitle}>{tr.suggestedQuestions}</h4>
      <div className={styles.suggestedGrid}>
        {questions.map((q: string, idx: number) => (
          <button
            key={idx}
            className={styles.suggestedButton}
            onClick={() => onQuestionClick(q)}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
});
