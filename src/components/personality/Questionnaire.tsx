// src/components/personality/Questionnaire.tsx
'use client';

import { useState } from 'react';
import { questions } from '@/lib/personality/data';

interface QuestionnaireProps {
  onFinish: (answers: { [key: number]: string }) => void;
}

export default function Questionnaire({ onFinish }: QuestionnaireProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});

  const handleAnswer = (section: string) => {
    const newAnswers = { ...answers, [questions[currentQuestionIndex].id]: section };
    setAnswers(newAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      onFinish(newAnswers);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="w-full max-w-2xl mx-auto p-4 md:p-8">
      {/* Progress Bar */}
      <div className="w-full bg-gray-700 rounded-full h-2.5 mb-6">
        <div
          className="bg-indigo-500 h-2.5 rounded-full"
          style={{ width: `${progress}%`, transition: 'width 0.5s ease-in-out' }}
        />
      </div>
      <p className="text-center text-gray-400 mb-8">Question {currentQuestionIndex + 1} of {questions.length}</p>

      {/* The Question Text */}
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 h-24 flex items-center justify-center">
          {currentQuestion.text}
        </h2>
      </div>

      {/* Answer Buttons */}
      <div className="mt-8 text-center">
        <p className="mb-4 text-lg text-gray-300">Do you agree with this statement?</p>
        <div className="flex justify-center space-x-2 md:space-x-4">
          <button onClick={() => handleAnswer(currentQuestion.section)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105">Agree</button>
          <button onClick={() => handleAnswer('none')} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105">Disagree</button>
        </div>
      </div>
    </div>
  );
}