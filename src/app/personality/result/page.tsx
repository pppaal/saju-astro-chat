'use client';

import { useEffect, useState } from 'react';
import AuraQuiz from '@/components/aura/AuraQuiz';
import type { AuraQuizAnswers } from '@/lib/aura/types';

export default function ResultPage() {
  const [answers, setAnswers] = useState<AuraQuizAnswers>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem('aura_answers');
      if (raw) setAnswers(JSON.parse(raw));
    } catch {
      // noop
    }
  }, []);

  const onAnswerChange = (qId: string, aId: string) => {
    setAnswers((prev) => {
      const next = { ...prev, [qId]: aId };
      try {
        localStorage.setItem('aura_answers', JSON.stringify(next));
      } catch {
        // noop
      }
      return next;
    });
  };

  return (
    <main className="px-4 py-8">
      <AuraQuiz answers={answers} onAnswerChange={onAnswerChange} />
    </main>
  );
}