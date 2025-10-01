// src/components/personality/ResultsPage.tsx
'use client';

import { Archetype } from '@/lib/personality/data';

interface ResultsPageProps {
  results: {
    primary: Archetype;
    secondary: Archetype | null;
  };
  onRetake: () => void;
}

export default function ResultsPage({ results, onRetake }: ResultsPageProps) {
  const { primary, secondary } = results;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-indigo-400">Your Archetype</h1>
        <p className="text-lg text-gray-300 mt-2">Based on your answers, here is your personality profile.</p>
      </div>

      {/* Primary and Secondary Archetype Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-12">
        <div className="md:col-span-3 bg-gray-800 p-8 rounded-2xl shadow-lg border border-indigo-500">
          <h2 className="text-3xl font-bold text-white">{primary.archetype_name}</h2>
          <p className="text-xl text-indigo-400 font-semibold mt-1 mb-4">{primary.tagline}</p>
          <p className="text-gray-300">{primary.details.core_motivation}</p>
        </div>
        {secondary && (
          <div className="md:col-span-2 bg-gray-800 p-8 rounded-2xl shadow-md flex flex-col justify-center">
            <h3 className="text-lg font-bold text-gray-400 mb-2">Secondary Archetype</h3>
            <h2 className="text-2xl font-bold text-white">{secondary.archetype_name}</h2>
            <p className="text-md text-indigo-500 font-semibold mt-1">{secondary.tagline}</p>
          </div>
        )}
      </div>

      {/* Detailed Guidance Section */}
      <div className="bg-gray-800 p-8 rounded-2xl shadow-lg">
        <h3 className="text-2xl font-bold mb-6 text-center">Guidance for The {primary.archetype_name}</h3>
        <div className="space-y-6">
          <div>
            <h4 className="text-xl font-semibold text-indigo-400 mb-2">Career Path</h4>
            <p><strong className="text-white">Ideal Roles:</strong> {primary.guidance.career.ideal_roles}</p>
          </div>
          <div>
            <h4 className="text-xl font-semibold text-indigo-400 mb-2">Personal Growth</h4>
            <p><strong className="text-white">Potential Blind Spot:</strong> {primary.guidance.personal_growth.blind_spot}</p>
          </div>
        </div>
      </div>

      {/* Retake Button */}
      <div className="text-center mt-12">
        <button onClick={onRetake} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg transition-transform transform hover:scale-105">
          Retake the Test
        </button>
      </div>
    </div>
  );
}