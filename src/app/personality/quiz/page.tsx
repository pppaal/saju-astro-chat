'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AuraQuiz from '@/components/aura/AuraQuiz';
import AuraRingVisual from '@/components/aura/AuraRingVisual';
import type { AuraQuizAnswers } from '@/lib/aura/types';
import { TOTAL_QUESTIONS } from '@/lib/aura/questions';

export default function QuizPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<AuraQuizAnswers>({});
  const isQuizComplete = Object.keys(answers).length === TOTAL_QUESTIONS;

  const handleAnswerChange = (questionId: string, answerId: string) => {
    setAnswers((prev: AuraQuizAnswers) => ({ ...prev, [questionId]: answerId }));
  };

  const handleViewResults = () => {
    localStorage.setItem('auraQuizAnswers', JSON.stringify(answers));
    router.push('/personality/result');
  };

  const auraColors = useMemo(() => {
    const progress = Object.keys(answers).length;
    const maxProgress = TOTAL_QUESTIONS > 0 ? TOTAL_QUESTIONS : 1;

    // 문자열 템플릿으로 hsl을 감싸야 함
    return [
      `hsl(${220 + (progress / maxProgress) * 90}, 90%, 65%)`,
      `hsl(${300 - (progress / maxProgress) * 70}, 90%, 65%)`,
      `hsl(${180 + (progress / maxProgress) * 50}, 90%, 65%)`,
    ];
  }, [answers]);

  return (
    <>
      <AuraRingVisual colors={auraColors} />
      <main className="relative min-h-screen flex items-center justify-center z-10">
        <div className="container mx-auto py-20 px-4 max-w-3xl">
          <div className="text-center mb-10 aura-fade-in">
            <h1 className="text-4xl font-bold text-white">Aura Discovery Quiz</h1>
            <p className="text-gray-300 mt-2">Answer honestly to reveal your inner landscape.</p>
          </div>

          {/* JSX 외부 토큰 제거: 'handlebars' 삭제 */}

          <AuraQuiz answers={answers} onAnswerChange={handleAnswerChange} />

          {isQuizComplete && (
            <div className="mt-12 text-center aura-fade-in" style={{ animationDelay: '500ms' }}>
              <button
                onClick={handleViewResults}
                className="bg-blue-600 text-white font-bold py-3 px-10 rounded-full text-xl hover:bg-blue-700 transition-transform transform hover:scale-105 shadow-lg animate-pulse"
              >
                Calculate My Aura
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}