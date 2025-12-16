// src/components/persona/PersonaQuiz.tsx
import type { RefObject } from 'react';
import type { PersonaQuizAnswers } from '@/lib/persona/types';
import { questions as allQuestions, type PersonaQuestion, type PersonaOption } from '@/lib/persona/questions';
import { useI18n } from '@/i18n/I18nProvider';
import styles from '@/app/personality/Personality.module.css';

interface Props {
  answers: PersonaQuizAnswers;
  onAnswerChange: (qId: string, aId: string) => void;
  questionRefs?: RefObject<{ [key: string]: HTMLDivElement | null }>;
  questions?: PersonaQuestion[];
  startIndex?: number;
}

export default function PersonaQuiz({ answers, onAnswerChange, questionRefs, questions, startIndex = 0 }: Props) {
  const { t } = useI18n();
  const displayQuestions = questions || allQuestions;

  return (
    <div className={styles.fadeIn}>
      {displayQuestions.map((q: PersonaQuestion, index: number) => (
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
            <span className={styles.questionNumber}>{startIndex + index + 1}</span>
            <p className={styles.questionText}>
              {t(`personality.questions.${q.id}.text`, q.text)}
            </p>
          </div>
          <div className={styles.optionsGrid}>
            {q.options.map((opt: PersonaOption) => {
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
