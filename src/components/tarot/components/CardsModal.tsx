/**
 * Cards modal component for displaying drawn cards
 * Extracted from TarotChat.tsx lines 743-805
 */

import React from "react";
import type { ReadingResponse, InterpretationResult } from "../types";
import type { LangKey } from "../data";
import type { I18N } from "../data";

interface CardsModalProps {
  show: boolean;
  onClose: () => void;
  readingResult: ReadingResponse;
  interpretation: InterpretationResult | null;
  language: LangKey;
  tr: (typeof I18N)['ko'];
  styles: Record<string, string>;
}

/**
 * Modal for displaying all drawn cards with details
 */
export const CardsModal = React.memo(function CardsModal({
  show,
  onClose,
  readingResult,
  interpretation,
  language,
  tr,
  styles
}: CardsModalProps) {
  if (!show) {return null;}

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{tr.cardContextTitle}</h3>
          <button
            className={styles.modalCloseBtn}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className={styles.modalCardGrid}>
          {readingResult.drawnCards.map((dc, idx) => {
            const pos = language === 'ko'
              ? (readingResult.spread.positions[idx]?.titleKo || readingResult.spread.positions[idx]?.title || `카드 ${idx + 1}`)
              : (readingResult.spread.positions[idx]?.title || `Card ${idx + 1}`);
            const orient = dc.isReversed ? (language === "ko" ? "역위" : "reversed") : (language === "ko" ? "정위" : "upright");
            const keywords = dc.isReversed ? (dc.card.reversed.keywordsKo || dc.card.reversed.keywords) : (dc.card.upright.keywordsKo || dc.card.upright.keywords);
            // Use AI interpretation if available, otherwise fall back to default meaning
            const aiInterpretation = interpretation?.card_insights?.[idx]?.interpretation;
            const defaultMeaning = dc.isReversed ? (dc.card.reversed.meaningKo || dc.card.reversed.meaning) : (dc.card.upright.meaningKo || dc.card.upright.meaning);
            const meaning = aiInterpretation || defaultMeaning;
            return (
              <div key={idx} className={styles.modalCardItem}>
                <div className={styles.modalCardLeft}>
                  <div className={styles.modalCardImageWrapper}>
                    <img
                      src={dc.card.image}
                      alt={dc.card.name}
                      className={`${styles.modalCardImage} ${dc.isReversed ? styles.reversed : ''}`}
                    />
                    {dc.isReversed && (
                      <div className={styles.reversedBadge}>
                        {language === 'ko' ? '역위' : 'Reversed'}
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.modalCardRight}>
                  <div className={styles.modalCardHeader}>
                    <span className={styles.modalCardNumber}>{idx + 1}</span>
                    <span className={styles.modalCardPosition}>{pos}</span>
                  </div>
                  <div className={styles.modalCardName}>{language === 'ko' ? dc.card.nameKo : dc.card.name}</div>
                  <div className={styles.modalCardOrient}>{orient}</div>
                  {keywords && keywords.length > 0 && (
                    <div className={styles.modalCardKeywords}>
                      {keywords.slice(0, 5).map((kw, i) => (
                        <span key={i} className={styles.modalKeywordTag}>{kw}</span>
                      ))}
                    </div>
                  )}
                  <div className={styles.modalCardMeaning}>{meaning}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
