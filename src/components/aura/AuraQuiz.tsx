// src/components/aura/AuraQuiz.tsx
import type { RefObject } from 'react';
import type { AuraQuizAnswers } from '@/lib/aura/types';
import { questions, type AuraQuestion, type AuraOption } from '@/lib/aura/questions';
import { useI18n } from '@/i18n/I18nProvider';
import styles from '@/app/personality/Personality.module.css';

interface Props {
  answers: AuraQuizAnswers;
  onAnswerChange: (qId: string, aId: string) => void;
  questionRefs?: RefObject<{ [key: string]: HTMLDivElement | null }>;
}

export default function AuraQuiz({ answers, onAnswerChange, questionRefs }: Props) {
  const { t } = useI18n();

  return (
    <div className={styles.fadeIn}>
      {questions.map((q: AuraQuestion, index: number) => (
        <div
          key={q.id}
          className={styles.questionCard}
          ref={(el) => {
            if (questionRefs) {
              questionRefs.current[q.id] = el;
            }
          }}
        >
          <div className={styles.questionHeader}>
            <span className={styles.questionNumber}>{index + 1}</span>
            <p className={styles.questionText}>
              {t(`personality.questions.${q.id}.text`, q.text)}
            </p>
          </div>
          <div className={styles.optionsGrid}>
            {q.options.map((opt: AuraOption) => {
              const isSelected = answers[q.id] === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => onAnswerChange(q.id, opt.id)}
                  className={`${styles.option} ${isSelected ? styles.optionSelected : ''}`}
                >
                  <span
                    className={`${styles.radioIndicator} ${isSelected ? styles.radioIndicatorSelected : ''}`}
                  >
                    {isSelected && <span className={styles.radioInner} />}
                  </span>
                  <span>{t(`personality.questions.${q.id}.options.${opt.id}`, opt.text)}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
