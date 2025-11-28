// src/components/aura/AuraQuiz.tsx
import type { AuraQuizAnswers } from '@/lib/aura/types';
import { questions, type AuraQuestion, type AuraOption } from '@/lib/aura/questions';

interface Props {
  answers: AuraQuizAnswers;
  onAnswerChange: (qId: string, aId: string) => void;
}

export default function AuraQuiz({ answers, onAnswerChange }: Props) {
  return (
    <div className="space-y-8 aura-fade-in">
      {questions.map((q: AuraQuestion, index: number) => (
        <div
          key={q.id}
          className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-700/50"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <p className="text-xl font-medium text-white mb-5">{q.text}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {q.options.map((opt: AuraOption) => (
              <button
                key={opt.id}
                onClick={() => onAnswerChange(q.id, opt.id)}
                className={`block w-full text-left p-4 rounded-lg transition-all duration-200 ease-in-out border-2 text-sm sm:text-base ${
                  answers[q.id] === opt.id
                    ? 'bg-blue-600 border-blue-500 text-white font-semibold shadow-blue-500/30 shadow-md'
                    : 'bg-gray-700/50 border-gray-600/80 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                }`}
              >
                {opt.text}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}