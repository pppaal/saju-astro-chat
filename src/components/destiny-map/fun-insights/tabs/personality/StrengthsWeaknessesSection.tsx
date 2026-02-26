import { ensureMinSentenceText } from '../shared/textDepth';

interface StrengthsWeaknessesSectionProps {
  strengthsWeaknesses: {
    strengths: { text: string; source: string }[];
    weaknesses: { text: string; source: string; advice: string }[];
  };
  isKo: boolean;
}

export default function StrengthsWeaknessesSection({ strengthsWeaknesses, isKo }: StrengthsWeaknessesSectionProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-800/80 border border-slate-700/50 p-6">
      {strengthsWeaknesses.strengths.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">💪</span>
            <h3 className="text-lg font-bold text-green-300">{isKo ? "최고의 강점" : "Top Strengths"}</h3>
          </div>
          <div className="space-y-3">
            {strengthsWeaknesses.strengths.slice(0, 3).map((strength, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <span className="text-green-400 mt-0.5">✓</span>
                <p className="text-gray-200 text-sm leading-relaxed">
                  {ensureMinSentenceText(strength.text, isKo, 'personality', 3)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {strengthsWeaknesses.weaknesses.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🎯</span>
            <h3 className="text-lg font-bold text-amber-300">{isKo ? "보완할 점" : "Areas to Improve"}</h3>
          </div>
          <div className="space-y-3">
            {strengthsWeaknesses.weaknesses.slice(0, 2).map((weakness, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-start gap-3 mb-2">
                  <span className="text-amber-400 mt-0.5">!</span>
                  <p className="text-gray-200 text-sm leading-relaxed">
                    {ensureMinSentenceText(weakness.text, isKo, 'personality', 3)}
                  </p>
                </div>
                <div className="ml-6 mt-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-400 text-sm">💡</span>
                    <p className="text-gray-300 text-xs leading-relaxed">
                      {ensureMinSentenceText(weakness.advice, isKo, 'warning', 4)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
