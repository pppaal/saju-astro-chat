// src/app/personality/page.tsx
'use client';

import { useState } from 'react';
import Questionnaire from '@/components/personality/Questionnaire';
import ResultsPage from '@/components/personality/ResultsPage';
import { calculateResults } from '@/lib/personality/utils';
import { Archetype } from '@/lib/personality/data';

// This defines the possible states of the test: start, middle, or end.
type TestState = 'not-started' | 'in-progress' | 'finished';

export default function PersonalityPage() {
  // We use 'state' to track which part of the test we're on.
  const [testState, setTestState] = useState<TestState>('not-started');
  
  // This will hold the results once the test is finished.
  const [results, setResults] = useState<{ primary: Archetype; secondary: Archetype | null } | null>(null);

  // This function is called by the Questionnaire when all questions are answered.
  const handleFinish = (answers: { [key: number]: string }) => {
    const calculatedResults = calculateResults(answers); // Calculate the result
    setResults(calculatedResults); // Store the result
    setTestState('finished'); // Change the page to show the results
  };

  // This function is called from the ResultsPage to start over.
  const handleRetake = () => {
    setResults(null); // Clear old results
    setTestState('not-started'); // Go back to the start screen
  };

  // This function decides what to show on the screen based on the current 'testState'.
  const renderContent = () => {
    switch (testState) {
      case 'in-progress':
        // If the test is in progress, show the questions.
        return <Questionnaire onFinish={handleFinish} />;
      
      case 'finished':
        // If the test is finished, show the results page.
        return results ? <ResultsPage results={results} onRetake={handleRetake} /> : null;
      
      case 'not-started':
      default:
        // If the test hasn't started, show the welcome screen.
        return (
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold mb-4">Discover Your Archetype</h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-8">
              This short questionnaire helps you understand your core drivers to make better life choices.
            </p>
            <button
              onClick={() => setTestState('in-progress')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-10 rounded-lg text-lg transition-transform transform hover:scale-105"
            >
              Start the Test
            </button>
          </div>
        );
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-gray-900 text-white">
      {renderContent()}
    </main>
  );
}