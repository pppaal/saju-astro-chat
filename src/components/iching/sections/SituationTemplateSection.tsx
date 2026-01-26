/**
 * Situation Template Section Component
 * Displays situation-specific advice based on user's question
 * @module sections/SituationTemplateSection
 */

import React from "react";
import type { EnhancedHexagramData } from '@/lib/iChing/types';
import styles from "../ResultDisplay.module.css";

/**
 * Component props interface
 */
export interface SituationTemplateSectionProps {
  enhancedData: EnhancedHexagramData | null;
  question: string;
  translate: (key: string, fallback: string) => string;
}

/**
 * Situation Template Section
 * Shows tailored advice for specific question types
 *
 * @param props - Component props
 * @returns JSX element or null if data is missing
 */
export const SituationTemplateSection = React.memo<SituationTemplateSectionProps>(({
  enhancedData,
  question,
  translate,
}) => {
  if (!enhancedData?.situationTemplates || !question) {return null;}

  // For now showing career as example - could be enhanced with question type detection
  const situationTemplate = enhancedData.situationTemplates.career;

  return (
    <div className={styles.situationCard}>
      <div className={styles.situationHeader}>
        <span className={styles.situationIcon}>💬</span>
        <h3 className={styles.situationTitle}>
          {translate("iching.yourQuestion", "Your Question")}
        </h3>
      </div>
      <p className={styles.questionText}>&ldquo;{question}&rdquo;</p>

      <div className={styles.situationAdvice}>
        <div className={styles.situationLabel}>
          {translate("iching.detailedAdvice", "Detailed Advice")}
        </div>
        <p className={styles.situationAnswer}>
          {situationTemplate.advice}
        </p>
        {situationTemplate.warning && (
          <div className={styles.situationWarning}>
            ⚠️ {situationTemplate.warning}
          </div>
        )}
        {situationTemplate.timeline && (
          <div className={styles.situationTimeline}>
            ⏱️ {situationTemplate.timeline}
          </div>
        )}
        <div className={styles.situationActionItems}>
          <div className={styles.actionItemsLabel}>
            {translate("iching.actionItems", "Action Items")}
          </div>
          <ul className={styles.actionItemsList}>
            {situationTemplate.actionItems.map((item: string, idx: number) => (
              <li key={idx} className={styles.actionItemsItem}>
                <span className={styles.actionItemCheck}>✓</span> {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
});

SituationTemplateSection.displayName = "SituationTemplateSection";
